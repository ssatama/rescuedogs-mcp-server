import { describe, it, expect, beforeEach, vi } from "vitest";
import { createMockServer } from "../helpers/mock-server.js";
import { mockFilterCounts } from "../fixtures/dogs.js";

vi.mock("../../src/services/api-client.js", () => ({
  apiClient: {
    getFilterCounts: vi.fn(),
  },
}));

vi.mock("../../src/services/cache-service.js", () => ({
  cacheService: {
    getFilterCounts: vi.fn(),
    setFilterCounts: vi.fn(),
  },
}));

import { apiClient } from "../../src/services/api-client.js";
import { cacheService } from "../../src/services/cache-service.js";
import { registerGetFilterCountsTool } from "../../src/tools/get-filter-counts.js";

describe("rescuedogs_get_filter_counts handler", () => {
  let getHandler: ReturnType<typeof createMockServer>["getHandler"];

  beforeEach(() => {
    vi.clearAllMocks();
    const { server, getHandler: gh } = createMockServer();
    getHandler = gh;
    registerGetFilterCountsTool(server as any);
  });

  it("returns cached data without calling API", async () => {
    vi.mocked(cacheService.getFilterCounts).mockReturnValue(mockFilterCounts);

    const handler = getHandler("rescuedogs_get_filter_counts");
    const result = await handler({});

    expect(cacheService.getFilterCounts).toHaveBeenCalled();
    expect(apiClient.getFilterCounts).not.toHaveBeenCalled();
    expect(result.content[0]!.text).toContain("Available Filter Options");
  });

  it("fetches from API on cache miss and caches with hash key", async () => {
    vi.mocked(cacheService.getFilterCounts).mockReturnValue(undefined);
    vi.mocked(apiClient.getFilterCounts).mockResolvedValue(mockFilterCounts);

    const handler = getHandler("rescuedogs_get_filter_counts");
    await handler({});

    expect(apiClient.getFilterCounts).toHaveBeenCalledOnce();
    expect(cacheService.setFilterCounts).toHaveBeenCalledWith(
      expect.any(String),
      mockFilterCounts
    );
  });

  it("normalizes filter values for API call", async () => {
    vi.mocked(cacheService.getFilterCounts).mockReturnValue(undefined);
    vi.mocked(apiClient.getFilterCounts).mockResolvedValue(mockFilterCounts);

    const handler = getHandler("rescuedogs_get_filter_counts");
    await handler({
      current_filters: { age_category: "puppy", sex: "male" },
    });

    expect(apiClient.getFilterCounts).toHaveBeenCalledWith(
      expect.objectContaining({
        age_category: "Puppy",
        sex: "Male",
      })
    );
  });

  it("produces deterministic cache key from sorted filter keys", async () => {
    vi.mocked(cacheService.getFilterCounts).mockReturnValue(undefined);
    vi.mocked(apiClient.getFilterCounts).mockResolvedValue(mockFilterCounts);

    const handler = getHandler("rescuedogs_get_filter_counts");

    // Call with filters in different order
    await handler({
      current_filters: { sex: "male", age_category: "puppy" },
    });
    const firstCacheKey = vi.mocked(cacheService.setFilterCounts).mock
      .calls[0]![0];

    vi.clearAllMocks();
    vi.mocked(cacheService.getFilterCounts).mockReturnValue(undefined);
    vi.mocked(apiClient.getFilterCounts).mockResolvedValue(mockFilterCounts);

    await handler({
      current_filters: { age_category: "puppy", sex: "male" },
    });
    const secondCacheKey = vi.mocked(cacheService.setFilterCounts).mock
      .calls[0]![0];

    expect(firstCacheKey).toBe(secondCacheKey);
  });

  it("sorts available_country_options by count descending in JSON format", async () => {
    vi.mocked(cacheService.getFilterCounts).mockReturnValue(mockFilterCounts);

    const handler = getHandler("rescuedogs_get_filter_counts");
    const result = await handler({ response_format: "json" });

    const parsed = JSON.parse(result.content[0]!.text!);
    const countries = parsed.available_country_options;
    // UK=1200, DE=800 → UK should be first
    expect(countries[0].value).toBe("UK");
    expect(countries[0].count).toBeGreaterThanOrEqual(countries[1].count);
  });

  it("works with empty/undefined current_filters", async () => {
    vi.mocked(cacheService.getFilterCounts).mockReturnValue(undefined);
    vi.mocked(apiClient.getFilterCounts).mockResolvedValue(mockFilterCounts);

    const handler = getHandler("rescuedogs_get_filter_counts");
    const result = await handler({});

    expect(result.isError).toBeUndefined();
    expect(result.content[0]!.text).toContain("Available Filter Options");
  });

  it("returns isError on API failure", async () => {
    vi.mocked(cacheService.getFilterCounts).mockReturnValue(undefined);
    vi.mocked(apiClient.getFilterCounts).mockRejectedValue(
      new Error("Timeout")
    );

    const handler = getHandler("rescuedogs_get_filter_counts");
    const result = await handler({});

    expect(result.isError).toBe(true);
    expect(result.content[0]!.text).toContain("Timeout");
  });
});
