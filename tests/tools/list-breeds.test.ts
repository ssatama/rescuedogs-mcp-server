import { describe, it, expect, beforeEach, vi } from "vitest";
import { createMockServer } from "../helpers/mock-server.js";
import { mockBreedStats } from "../fixtures/dogs.js";

vi.mock("../../src/services/api-client.js", () => ({
  apiClient: {
    getBreedStats: vi.fn(),
  },
}));

vi.mock("../../src/services/cache-service.js", () => ({
  cacheService: {
    getBreedStats: vi.fn(),
    setBreedStats: vi.fn(),
  },
}));

import { apiClient } from "../../src/services/api-client.js";
import { cacheService } from "../../src/services/cache-service.js";
import { registerListBreedsTool } from "../../src/tools/list-breeds.js";

describe("rescuedogs_list_breeds handler", () => {
  let getHandler: ReturnType<typeof createMockServer>["getHandler"];

  beforeEach(() => {
    vi.clearAllMocks();
    const { server, getHandler: gh } = createMockServer();
    getHandler = gh;
    registerListBreedsTool(server as any);
  });

  it("returns cached data without calling API", async () => {
    vi.mocked(cacheService.getBreedStats).mockReturnValue(mockBreedStats);

    const handler = getHandler("rescuedogs_list_breeds");
    const result = await handler({});

    expect(cacheService.getBreedStats).toHaveBeenCalled();
    expect(apiClient.getBreedStats).not.toHaveBeenCalled();
    expect(result.content[0]!.text).toContain("Available Breeds");
  });

  it("fetches from API on cache miss and caches result", async () => {
    vi.mocked(cacheService.getBreedStats).mockReturnValue(undefined);
    vi.mocked(apiClient.getBreedStats).mockResolvedValue(mockBreedStats);

    const handler = getHandler("rescuedogs_list_breeds");
    await handler({});

    expect(apiClient.getBreedStats).toHaveBeenCalledOnce();
    expect(cacheService.setBreedStats).toHaveBeenCalledWith(mockBreedStats);
  });

  it("filters by breed_group (case-insensitive)", async () => {
    vi.mocked(cacheService.getBreedStats).mockReturnValue(mockBreedStats);

    const handler = getHandler("rescuedogs_list_breeds");
    const result = await handler({
      breed_group: "retrievers",
      response_format: "json",
    });

    const parsed = JSON.parse(result.content[0]!.text!);
    expect(parsed.qualifying_breeds).toHaveLength(1);
    expect(parsed.qualifying_breeds[0].primary_breed).toBe("Golden Retriever");
  });

  it("filters by min_count", async () => {
    vi.mocked(cacheService.getBreedStats).mockReturnValue(mockBreedStats);

    const handler = getHandler("rescuedogs_list_breeds");
    const result = await handler({ min_count: 100, response_format: "json" });

    const parsed = JSON.parse(result.content[0]!.text!);
    // Only Golden Retriever has count 120, German Shepherd has 95
    expect(parsed.qualifying_breeds).toHaveLength(1);
    expect(parsed.qualifying_breeds[0].primary_breed).toBe("Golden Retriever");
  });

  it("applies both breed_group and min_count filters", async () => {
    vi.mocked(cacheService.getBreedStats).mockReturnValue(mockBreedStats);

    const handler = getHandler("rescuedogs_list_breeds");
    const result = await handler({
      breed_group: "Shepherds",
      min_count: 100,
      response_format: "json",
    });

    const parsed = JSON.parse(result.content[0]!.text!);
    // German Shepherd is in Shepherds group but has count 95 < 100
    expect(parsed.qualifying_breeds).toHaveLength(0);
  });

  it("returns JSON format with breed stats object", async () => {
    vi.mocked(cacheService.getBreedStats).mockReturnValue(mockBreedStats);

    const handler = getHandler("rescuedogs_list_breeds");
    const result = await handler({ response_format: "json" });

    const parsed = JSON.parse(result.content[0]!.text!);
    expect(parsed.total_dogs).toBe(1500);
    expect(parsed.qualifying_breeds).toHaveLength(2);
  });

  it("returns isError on API failure", async () => {
    vi.mocked(cacheService.getBreedStats).mockReturnValue(undefined);
    vi.mocked(apiClient.getBreedStats).mockRejectedValue(
      new Error("Server error")
    );

    const handler = getHandler("rescuedogs_list_breeds");
    const result = await handler({});

    expect(result.isError).toBe(true);
    expect(result.content[0]!.text).toContain("Server error");
  });
});
