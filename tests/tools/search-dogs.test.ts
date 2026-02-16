import { describe, it, expect, beforeEach, vi } from "vitest";
import { createMockServer } from "../helpers/mock-server.js";
import {
  mockDog,
  mockDog2,
  mockEnhancedData,
  mockEnhancedData2,
  mockOrganization,
  mockImageContent,
} from "../fixtures/dogs.js";

vi.mock("../../src/services/api-client.js", () => ({
  apiClient: {
    searchDogs: vi.fn(),
    getBulkEnhancedData: vi.fn(),
    getOrganizations: vi.fn(),
  },
}));

vi.mock("../../src/services/cache-service.js", () => ({
  cacheService: {
    getOrganizations: vi.fn(),
    setOrganizations: vi.fn(),
  },
}));

vi.mock("../../src/services/image-service.js", () => ({
  fetchDogImages: vi.fn(),
}));

import { apiClient } from "../../src/services/api-client.js";
import { cacheService } from "../../src/services/cache-service.js";
import { fetchDogImages } from "../../src/services/image-service.js";
import { registerSearchDogsTool } from "../../src/tools/search-dogs.js";

describe("rescuedogs_search_dogs handler", () => {
  let getHandler: ReturnType<typeof createMockServer>["getHandler"];

  beforeEach(() => {
    vi.clearAllMocks();
    const { server, getHandler: gh } = createMockServer();
    getHandler = gh;
    registerSearchDogsTool(server as any);
  });

  it("calls searchDogs with correct params", async () => {
    vi.mocked(apiClient.searchDogs).mockResolvedValue([mockDog]);
    vi.mocked(apiClient.getBulkEnhancedData).mockResolvedValue([
      mockEnhancedData,
    ]);

    const handler = getHandler("rescuedogs_search_dogs");
    const result = await handler({ breed: "Golden Retriever" });

    expect(apiClient.searchDogs).toHaveBeenCalledWith(
      expect.objectContaining({ breed: "Golden Retriever" })
    );
    expect(result.isError).toBeUndefined();
  });

  it('maps age_category "puppy" to "Puppy"', async () => {
    vi.mocked(apiClient.searchDogs).mockResolvedValue([]);
    vi.mocked(apiClient.getBulkEnhancedData).mockResolvedValue([]);

    const handler = getHandler("rescuedogs_search_dogs");
    await handler({ age_category: "puppy" });

    expect(apiClient.searchDogs).toHaveBeenCalledWith(
      expect.objectContaining({ age_category: "Puppy" })
    );
  });

  it('maps sex "male" to "Male"', async () => {
    vi.mocked(apiClient.searchDogs).mockResolvedValue([]);
    vi.mocked(apiClient.getBulkEnhancedData).mockResolvedValue([]);

    const handler = getHandler("rescuedogs_search_dogs");
    await handler({ sex: "male" });

    expect(apiClient.searchDogs).toHaveBeenCalledWith(
      expect.objectContaining({ sex: "Male" })
    );
  });

  it("matches org name from cache and converts to organization_id", async () => {
    vi.mocked(cacheService.getOrganizations).mockReturnValue([
      mockOrganization,
    ]);
    vi.mocked(apiClient.searchDogs).mockResolvedValue([mockDog]);
    vi.mocked(apiClient.getBulkEnhancedData).mockResolvedValue([
      mockEnhancedData,
    ]);

    const handler = getHandler("rescuedogs_search_dogs");
    await handler({ query: "Happy Paws" });

    expect(apiClient.searchDogs).toHaveBeenCalledWith(
      expect.objectContaining({
        organization_id: 1,
        search: undefined,
      })
    );
  });

  it("fetches orgs on cache miss, caches, then matches", async () => {
    vi.mocked(cacheService.getOrganizations).mockReturnValue(undefined);
    vi.mocked(apiClient.getOrganizations).mockResolvedValue([
      mockOrganization,
    ]);
    vi.mocked(apiClient.searchDogs).mockResolvedValue([mockDog]);
    vi.mocked(apiClient.getBulkEnhancedData).mockResolvedValue([
      mockEnhancedData,
    ]);

    const handler = getHandler("rescuedogs_search_dogs");
    await handler({ query: "Happy Paws" });

    expect(apiClient.getOrganizations).toHaveBeenCalledWith({
      active_only: true,
    });
    expect(cacheService.setOrganizations).toHaveBeenCalled();
    expect(apiClient.searchDogs).toHaveBeenCalledWith(
      expect.objectContaining({ organization_id: 1 })
    );
  });

  it("continues without enhanced data on failure", async () => {
    vi.mocked(apiClient.searchDogs).mockResolvedValue([mockDog]);
    vi.mocked(apiClient.getBulkEnhancedData).mockRejectedValue(
      new Error("Enhanced API down")
    );

    const handler = getHandler("rescuedogs_search_dogs");
    const result = await handler({});

    expect(result.isError).toBeUndefined();
    expect(result.content[0]!.text).toContain("Buddy");
  });

  it("calls fetchDogImages when include_images is true", async () => {
    vi.mocked(apiClient.searchDogs).mockResolvedValue([mockDog, mockDog2]);
    vi.mocked(apiClient.getBulkEnhancedData).mockResolvedValue([
      mockEnhancedData,
      mockEnhancedData2,
    ]);
    vi.mocked(fetchDogImages).mockResolvedValue([mockImageContent, null]);

    const handler = getHandler("rescuedogs_search_dogs");
    const result = await handler({ include_images: true });

    expect(fetchDogImages).toHaveBeenCalledWith(
      [mockDog.primary_image_url, mockDog2.primary_image_url],
      "thumbnail"
    );
    // Should have text + image label + image for first dog
    expect(result.content.length).toBeGreaterThan(1);
  });

  it('returns "No Dogs Found" message for empty results', async () => {
    vi.mocked(apiClient.searchDogs).mockResolvedValue([]);

    const handler = getHandler("rescuedogs_search_dogs");
    const result = await handler({});

    expect(result.content[0]!.text).toContain("No Dogs Found");
  });

  it("returns JSON format with count, dogs, and has_more", async () => {
    vi.mocked(apiClient.searchDogs).mockResolvedValue([mockDog, mockDog2]);
    vi.mocked(apiClient.getBulkEnhancedData).mockResolvedValue([
      mockEnhancedData,
      mockEnhancedData2,
    ]);

    const handler = getHandler("rescuedogs_search_dogs");
    const result = await handler({ response_format: "json" });

    const parsed = JSON.parse(result.content[0]!.text!);
    expect(parsed.count).toBe(2);
    expect(parsed.dogs).toHaveLength(2);
    expect(parsed.dogs[0].enhanced).toBeTruthy();
    expect(parsed).toHaveProperty("has_more");
  });

  it("forwards pagination params to API and formatter", async () => {
    vi.mocked(apiClient.searchDogs).mockResolvedValue([mockDog]);
    vi.mocked(apiClient.getBulkEnhancedData).mockResolvedValue([
      mockEnhancedData,
    ]);

    const handler = getHandler("rescuedogs_search_dogs");
    const result = await handler({ offset: 10, limit: 5 });

    expect(apiClient.searchDogs).toHaveBeenCalledWith(
      expect.objectContaining({ offset: 10, limit: 5 })
    );
    // Markdown should show pagination info
    expect(result.content[0]!.text).toContain("Showing 11-11");
  });

  it("returns isError on API failure", async () => {
    vi.mocked(apiClient.searchDogs).mockRejectedValue(
      new Error("Server error")
    );

    const handler = getHandler("rescuedogs_search_dogs");
    const result = await handler({});

    expect(result.isError).toBe(true);
    expect(result.content[0]!.text).toContain("Server error");
  });
});
