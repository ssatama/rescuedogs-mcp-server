import { describe, it, expect, beforeEach, vi } from "vitest";
import { createMockServer } from "../helpers/mock-server.js";
import { mockOrganization } from "../fixtures/dogs.js";

vi.mock("../../src/services/api-client.js", () => ({
  apiClient: {
    getOrganizations: vi.fn(),
  },
}));

vi.mock("../../src/services/cache-service.js", () => ({
  cacheService: {
    getOrganizations: vi.fn(),
    setOrganizations: vi.fn(),
  },
}));

import { apiClient } from "../../src/services/api-client.js";
import { cacheService } from "../../src/services/cache-service.js";
import { registerListOrganizationsTool } from "../../src/tools/list-organizations.js";

const mockOrgs = [mockOrganization];

describe("rescuedogs_list_organizations handler", () => {
  let getHandler: ReturnType<typeof createMockServer>["getHandler"];

  beforeEach(() => {
    vi.clearAllMocks();
    const { server, getHandler: gh } = createMockServer();
    getHandler = gh;
    registerListOrganizationsTool(server as any);
  });

  it("returns cached data when no country filter", async () => {
    vi.mocked(cacheService.getOrganizations).mockReturnValue(mockOrgs);

    const handler = getHandler("rescuedogs_list_organizations");
    const result = await handler({});

    expect(cacheService.getOrganizations).toHaveBeenCalled();
    expect(apiClient.getOrganizations).not.toHaveBeenCalled();
    expect(result.content[0]!.text).toContain("Happy Paws Rescue");
  });

  it("fetches and caches on cache miss with no country filter", async () => {
    vi.mocked(cacheService.getOrganizations).mockReturnValue(undefined);
    vi.mocked(apiClient.getOrganizations).mockResolvedValue(mockOrgs);

    const handler = getHandler("rescuedogs_list_organizations");
    await handler({});

    expect(apiClient.getOrganizations).toHaveBeenCalledOnce();
    expect(cacheService.setOrganizations).toHaveBeenCalledWith(mockOrgs);
  });

  it("skips cache when country filter is provided", async () => {
    vi.mocked(apiClient.getOrganizations).mockResolvedValue(mockOrgs);

    const handler = getHandler("rescuedogs_list_organizations");
    await handler({ country: "ES" });

    expect(cacheService.getOrganizations).not.toHaveBeenCalled();
    expect(cacheService.setOrganizations).not.toHaveBeenCalled();
  });

  it('normalizes country "GB" to "UK" for API call', async () => {
    vi.mocked(apiClient.getOrganizations).mockResolvedValue(mockOrgs);

    const handler = getHandler("rescuedogs_list_organizations");
    await handler({ country: "GB" });

    expect(apiClient.getOrganizations).toHaveBeenCalledWith(
      expect.objectContaining({ country: "UK" })
    );
  });

  it("passes active_only default of true", async () => {
    vi.mocked(cacheService.getOrganizations).mockReturnValue(undefined);
    vi.mocked(apiClient.getOrganizations).mockResolvedValue(mockOrgs);

    const handler = getHandler("rescuedogs_list_organizations");
    await handler({});

    expect(apiClient.getOrganizations).toHaveBeenCalledWith(
      expect.objectContaining({ active_only: true })
    );
  });

  it("returns JSON format as array", async () => {
    vi.mocked(cacheService.getOrganizations).mockReturnValue(mockOrgs);

    const handler = getHandler("rescuedogs_list_organizations");
    const result = await handler({ response_format: "json" });

    const parsed = JSON.parse(result.content[0]!.text!);
    expect(Array.isArray(parsed)).toBe(true);
    expect(parsed[0].name).toBe("Happy Paws Rescue");
  });

  it("returns isError on API failure", async () => {
    vi.mocked(cacheService.getOrganizations).mockReturnValue(undefined);
    vi.mocked(apiClient.getOrganizations).mockRejectedValue(
      new Error("Connection failed")
    );

    const handler = getHandler("rescuedogs_list_organizations");
    const result = await handler({});

    expect(result.isError).toBe(true);
    expect(result.content[0]!.text).toContain("Connection failed");
  });
});
