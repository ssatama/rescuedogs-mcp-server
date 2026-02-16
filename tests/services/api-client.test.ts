import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import axios from "axios";

// Use vi.hoisted so the mock fn is available when vi.mock factory runs (hoisted)
const { mockRequest } = vi.hoisted(() => ({
  mockRequest: vi.fn(),
}));

vi.mock("axios", async () => {
  const actual = await vi.importActual<typeof import("axios")>("axios");
  return {
    ...actual,
    default: {
      ...actual.default,
      create: vi.fn(() => ({
        request: mockRequest,
      })),
    },
  };
});

// Import after mock setup — triggers constructor which calls axios.create
import { apiClient } from "../../src/services/api-client.js";

describe("ApiClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("searchDogs happy path", () => {
    it("calls correct URL with query params and returns data", async () => {
      const mockDogs = [{ id: 1, name: "Buddy" }];
      mockRequest.mockResolvedValue({ data: mockDogs });

      const result = await apiClient.searchDogs({
        breed: "Golden Retriever",
        limit: 5,
      });

      expect(result).toEqual(mockDogs);
      expect(mockRequest).toHaveBeenCalledOnce();

      const config = mockRequest.mock.calls[0]![0];
      expect(config.method).toBe("GET");
      expect(config.url).toContain("/api/animals/");
      expect(config.url).toContain("status=available");
      expect(config.url).toContain("availability_confidence=high%2Cmedium");
      expect(config.url).toContain("breed=Golden+Retriever");
      expect(config.url).toContain("limit=5");
    });

    it("always includes status and availability_confidence filters", async () => {
      mockRequest.mockResolvedValue({ data: [] });

      await apiClient.searchDogs({});

      const config = mockRequest.mock.calls[0]![0];
      expect(config.url).toContain("status=available");
      expect(config.url).toContain("availability_confidence=high%2Cmedium");
    });
  });

  describe("getDogBySlug", () => {
    it("calls correct URL with slug", async () => {
      const mockDog = { id: 1, name: "Buddy" };
      mockRequest.mockResolvedValue({ data: mockDog });

      const result = await apiClient.getDogBySlug("buddy-golden");

      expect(result).toEqual(mockDog);
      const config = mockRequest.mock.calls[0]![0];
      expect(config.url).toBe("/api/animals/buddy-golden/");
    });
  });

  describe("getEnhancedDogData", () => {
    it("calls correct URL with animal ID", async () => {
      const mockData = { id: 101, bio: "A friendly dog" };
      mockRequest.mockResolvedValue({ data: mockData });

      const result = await apiClient.getEnhancedDogData(101);

      expect(result).toEqual(mockData);
      const config = mockRequest.mock.calls[0]![0];
      expect(config.url).toBe("/api/enhanced_animals/101/enhanced/");
    });
  });

  describe("getBulkEnhancedData", () => {
    it("sends POST with animal IDs array", async () => {
      const mockData = [{ id: 101 }, { id: 102 }];
      mockRequest.mockResolvedValue({ data: mockData });

      const result = await apiClient.getBulkEnhancedData([101, 102]);

      expect(result).toEqual(mockData);
      const config = mockRequest.mock.calls[0]![0];
      expect(config.method).toBe("POST");
      expect(config.url).toBe("/api/enhanced_animals/enhanced/bulk/");
      expect(config.data).toEqual({ animal_ids: [101, 102] });
    });
  });

  describe("getBreedStats", () => {
    it("calls correct URL", async () => {
      const mockStats = { total_dogs: 1500 };
      mockRequest.mockResolvedValue({ data: mockStats });

      const result = await apiClient.getBreedStats();

      expect(result).toEqual(mockStats);
      const config = mockRequest.mock.calls[0]![0];
      expect(config.url).toBe("/api/animals/breeds/stats/");
    });
  });

  describe("getStatistics", () => {
    it("calls correct URL", async () => {
      const mockStats = { total_dogs: 2500 };
      mockRequest.mockResolvedValue({ data: mockStats });

      const result = await apiClient.getStatistics();

      expect(result).toEqual(mockStats);
      const config = mockRequest.mock.calls[0]![0];
      expect(config.url).toBe("/api/animals/statistics/");
    });
  });

  describe("getFilterCounts", () => {
    it("calls correct URL with filters", async () => {
      const mockCounts = { size_options: [] };
      mockRequest.mockResolvedValue({ data: mockCounts });

      const result = await apiClient.getFilterCounts({
        breed: "Golden Retriever",
        sex: "Male",
      });

      expect(result).toEqual(mockCounts);
      const config = mockRequest.mock.calls[0]![0];
      expect(config.url).toContain("/api/animals/meta/filter_counts/");
      expect(config.url).toContain("status=available");
      expect(config.url).toContain("breed=Golden+Retriever");
      expect(config.url).toContain("sex=Male");
    });

    it("always includes status=available filter", async () => {
      mockRequest.mockResolvedValue({ data: {} });

      await apiClient.getFilterCounts();

      const config = mockRequest.mock.calls[0]![0];
      expect(config.url).toContain("status=available");
    });
  });

  describe("getOrganizations", () => {
    it("constructs correct URL with filters", async () => {
      mockRequest.mockResolvedValue({ data: [] });

      await apiClient.getOrganizations({
        country: "UK",
        active_only: true,
        limit: 10,
      });

      const config = mockRequest.mock.calls[0]![0];
      expect(config.url).toContain("country=UK");
      expect(config.url).toContain("active_only=true");
      expect(config.url).toContain("limit=10");
    });

    it("calls bare URL when no params provided", async () => {
      mockRequest.mockResolvedValue({ data: [] });

      await apiClient.getOrganizations();

      const config = mockRequest.mock.calls[0]![0];
      expect(config.url).toBe("/api/organizations/");
    });
  });

  describe("error handling", () => {
    it("throws 'Not found' for 404 response", async () => {
      const error = createAxiosError(404, { detail: "Dog not found" });
      mockRequest.mockRejectedValue(error);

      await expect(apiClient.searchDogs({})).rejects.toThrow("Not found:");
    });

    it("throws 'Invalid request' for 422 response", async () => {
      const error = createAxiosError(422, { detail: "Validation error" });
      mockRequest.mockRejectedValue(error);

      await expect(apiClient.searchDogs({})).rejects.toThrow("Invalid request:");
    });

    it("throws 'Rate limited' for 429 response", async () => {
      vi.useFakeTimers();
      const error = createAxiosError(429);
      mockRequest.mockRejectedValue(error);

      const promise = apiClient.searchDogs({});
      promise.catch(() => {});
      await vi.runAllTimersAsync();
      await expect(promise).rejects.toThrow("Rate limited:");
      vi.useRealTimers();
    });

    it("throws 'Server error' for 500 response", async () => {
      vi.useFakeTimers();
      const error = createAxiosError(500);
      mockRequest.mockRejectedValue(error);

      const promise = apiClient.searchDogs({});
      promise.catch(() => {});
      await vi.runAllTimersAsync();
      await expect(promise).rejects.toThrow("Server error:");
      vi.useRealTimers();
    });

    it("throws 'Request timeout' for ECONNABORTED", async () => {
      vi.useFakeTimers();
      const error = createAxiosNetworkError("ECONNABORTED");
      mockRequest.mockRejectedValue(error);

      const promise = apiClient.searchDogs({});
      promise.catch(() => {});
      await vi.runAllTimersAsync();
      await expect(promise).rejects.toThrow("Request timeout:");
      vi.useRealTimers();
    });

    it("throws 'Connection error' for ECONNREFUSED", async () => {
      vi.useFakeTimers();
      const error = createAxiosNetworkError("ECONNREFUSED");
      mockRequest.mockRejectedValue(error);

      const promise = apiClient.searchDogs({});
      promise.catch(() => {});
      await vi.runAllTimersAsync();
      await expect(promise).rejects.toThrow("Connection error:");
      vi.useRealTimers();
    });

    it("passes through non-axios errors", async () => {
      mockRequest.mockRejectedValue(new Error("Something unexpected"));

      await expect(apiClient.searchDogs({})).rejects.toThrow(
        "Something unexpected"
      );
    });
  });

  describe("retry logic", () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("retries on 500 and succeeds on second try", async () => {
      const error500 = createAxiosError(500);
      mockRequest
        .mockRejectedValueOnce(error500)
        .mockResolvedValueOnce({ data: [{ id: 1 }] });

      const promise = apiClient.searchDogs({});
      await vi.runAllTimersAsync();
      const result = await promise;

      expect(result).toEqual([{ id: 1 }]);
      expect(mockRequest).toHaveBeenCalledTimes(2);
    });

    it("retries on 429 and succeeds on second try", async () => {
      const error429 = createAxiosError(429);
      mockRequest
        .mockRejectedValueOnce(error429)
        .mockResolvedValueOnce({ data: [{ id: 2 }] });

      const promise = apiClient.searchDogs({});
      await vi.runAllTimersAsync();
      const result = await promise;

      expect(result).toEqual([{ id: 2 }]);
      expect(mockRequest).toHaveBeenCalledTimes(2);
    });

    it("retries on ECONNABORTED and succeeds on second try", async () => {
      const errorTimeout = createAxiosNetworkError("ECONNABORTED");
      mockRequest
        .mockRejectedValueOnce(errorTimeout)
        .mockResolvedValueOnce({ data: [{ id: 3 }] });

      const promise = apiClient.searchDogs({});
      await vi.runAllTimersAsync();
      const result = await promise;

      expect(result).toEqual([{ id: 3 }]);
      expect(mockRequest).toHaveBeenCalledTimes(2);
    });

    it("retries on ECONNREFUSED and succeeds on second try", async () => {
      const errorRefused = createAxiosNetworkError("ECONNREFUSED");
      mockRequest
        .mockRejectedValueOnce(errorRefused)
        .mockResolvedValueOnce({ data: [{ id: 4 }] });

      const promise = apiClient.searchDogs({});
      await vi.runAllTimersAsync();
      const result = await promise;

      expect(result).toEqual([{ id: 4 }]);
      expect(mockRequest).toHaveBeenCalledTimes(2);
    });

    it("does NOT retry on 404", async () => {
      const error404 = createAxiosError(404, { detail: "Not found" });
      mockRequest.mockRejectedValueOnce(error404);

      await expect(apiClient.searchDogs({})).rejects.toThrow("Not found:");
      expect(mockRequest).toHaveBeenCalledTimes(1);
    });

    it("does NOT retry on 422", async () => {
      const error422 = createAxiosError(422, { detail: "Validation error" });
      mockRequest.mockRejectedValueOnce(error422);

      await expect(apiClient.searchDogs({})).rejects.toThrow("Invalid request:");
      expect(mockRequest).toHaveBeenCalledTimes(1);
    });

    it("throws after both attempts fail (two 500s)", async () => {
      const error500a = createAxiosError(500);
      const error500b = createAxiosError(500);
      mockRequest
        .mockRejectedValueOnce(error500a)
        .mockRejectedValueOnce(error500b);

      const promise = apiClient.searchDogs({});
      promise.catch(() => {}); // Prevent unhandled rejection during timer advancement
      await vi.runAllTimersAsync();

      await expect(promise).rejects.toThrow("Server error:");
      expect(mockRequest).toHaveBeenCalledTimes(2);
    });

    it("does NOT retry non-axios errors", async () => {
      mockRequest.mockRejectedValueOnce(new Error("Something unexpected"));

      await expect(apiClient.searchDogs({})).rejects.toThrow(
        "Something unexpected"
      );
      expect(mockRequest).toHaveBeenCalledTimes(1);
    });
  });
});

// Helper to create axios-like errors
type AxiosErrorType = import("axios").AxiosError<{ detail?: string }>;

function createAxiosError(
  status: number,
  data?: { detail: string }
): AxiosErrorType {
  const error = new axios.AxiosError(
    `Request failed with status ${status}`,
    undefined,
    {} as any,
    {},
    {
      status,
      data: data || {},
      statusText: "",
      headers: {} as any,
      config: {} as any,
    }
  ) as AxiosErrorType;
  return error;
}

function createAxiosNetworkError(code: string): AxiosErrorType {
  const error = new axios.AxiosError(
    "Network Error",
    code,
    {} as any,
    {}
  ) as AxiosErrorType;
  return error;
}
