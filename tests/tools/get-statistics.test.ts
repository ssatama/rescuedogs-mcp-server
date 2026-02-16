import { describe, it, expect, beforeEach, vi } from "vitest";
import { createMockServer } from "../helpers/mock-server.js";
import { mockStatistics } from "../fixtures/dogs.js";

// Mock services at module level
vi.mock("../../src/services/api-client.js", () => ({
  apiClient: {
    getStatistics: vi.fn(),
  },
}));

vi.mock("../../src/services/cache-service.js", () => ({
  cacheService: {
    getStatistics: vi.fn(),
    setStatistics: vi.fn(),
  },
}));

import { apiClient } from "../../src/services/api-client.js";
import { cacheService } from "../../src/services/cache-service.js";
import { registerGetStatisticsTool } from "../../src/tools/get-statistics.js";

describe("rescuedogs_get_statistics handler", () => {
  let getHandler: ReturnType<typeof createMockServer>["getHandler"];

  beforeEach(() => {
    vi.clearAllMocks();
    const { server, getHandler: gh } = createMockServer();
    getHandler = gh;
    registerGetStatisticsTool(server as any);
  });

  it("returns cached data without calling API", async () => {
    vi.mocked(cacheService.getStatistics).mockReturnValue(mockStatistics);

    const handler = getHandler("rescuedogs_get_statistics");
    const result = await handler({});

    expect(cacheService.getStatistics).toHaveBeenCalled();
    expect(apiClient.getStatistics).not.toHaveBeenCalled();
    expect(result.content[0]!.text).toContain("Rescue Dogs Statistics");
  });

  it("fetches from API on cache miss and caches result", async () => {
    vi.mocked(cacheService.getStatistics).mockReturnValue(undefined);
    vi.mocked(apiClient.getStatistics).mockResolvedValue(mockStatistics);

    const handler = getHandler("rescuedogs_get_statistics");
    await handler({});

    expect(apiClient.getStatistics).toHaveBeenCalledOnce();
    expect(cacheService.setStatistics).toHaveBeenCalledWith(mockStatistics);
  });

  it("returns JSON format when requested", async () => {
    vi.mocked(cacheService.getStatistics).mockReturnValue(mockStatistics);

    const handler = getHandler("rescuedogs_get_statistics");
    const result = await handler({ response_format: "json" });

    const parsed = JSON.parse(result.content[0]!.text!);
    expect(parsed.total_dogs).toBe(2500);
    expect(parsed.total_organizations).toBe(15);
  });

  it("returns markdown format with formatted stats", async () => {
    vi.mocked(cacheService.getStatistics).mockReturnValue(mockStatistics);

    const handler = getHandler("rescuedogs_get_statistics");
    const result = await handler({});

    const text = result.content[0]!.text!;
    expect(text).toContain("Rescue Dogs Statistics");
    expect(text).toContain("2,500");
    expect(text).toContain("Spain");
  });

  it("returns isError on API failure", async () => {
    vi.mocked(cacheService.getStatistics).mockReturnValue(undefined);
    vi.mocked(apiClient.getStatistics).mockRejectedValue(
      new Error("API unavailable")
    );

    const handler = getHandler("rescuedogs_get_statistics");
    const result = await handler({});

    expect(result.isError).toBe(true);
    expect(result.content[0]!.text).toContain("API unavailable");
  });
});
