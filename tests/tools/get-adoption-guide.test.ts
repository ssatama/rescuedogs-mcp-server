import { describe, it, expect, beforeEach, vi } from "vitest";
import { createMockServer } from "../helpers/mock-server.js";
import { registerGetAdoptionGuideTool } from "../../src/tools/get-adoption-guide.js";

describe("rescuedogs_get_adoption_guide handler", () => {
  let getHandler: ReturnType<typeof createMockServer>["getHandler"];

  beforeEach(() => {
    vi.clearAllMocks();
    const { server, getHandler: gh } = createMockServer();
    getHandler = gh;
    registerGetAdoptionGuideTool(server);
  });

  it("returns overview content by default", async () => {
    const handler = getHandler("rescuedogs_get_adoption_guide");
    const result = await handler({});

    expect(result.isError).toBeUndefined();
    expect(result.content[0]!.text).toContain("How Rescue Dog Adoption Works");
  });

  it("returns transport topic content", async () => {
    const handler = getHandler("rescuedogs_get_adoption_guide");
    const result = await handler({ topic: "transport" });

    expect(result.content[0]!.text).toContain("Dog Transport Options");
  });

  it("returns fees topic content", async () => {
    const handler = getHandler("rescuedogs_get_adoption_guide");
    const result = await handler({ topic: "fees" });

    expect(result.content[0]!.text).toContain("Adoption Fees Explained");
  });

  it("returns requirements topic content", async () => {
    const handler = getHandler("rescuedogs_get_adoption_guide");
    const result = await handler({ topic: "requirements" });

    expect(result.content[0]!.text).toContain("Adoption Requirements");
  });

  it("returns timeline topic content", async () => {
    const handler = getHandler("rescuedogs_get_adoption_guide");
    const result = await handler({ topic: "timeline" });

    expect(result.content[0]!.text).toContain("Typical Adoption Timeline");
  });

  it("returns isError for invalid topic (Zod validation)", async () => {
    const handler = getHandler("rescuedogs_get_adoption_guide");
    const result = await handler({ topic: "nonexistent_topic" });

    expect(result.isError).toBe(true);
  });

  it('normalizes country "UK" to "GB" for country-specific lookup', async () => {
    const handler = getHandler("rescuedogs_get_adoption_guide");
    const resultUK = await handler({ country: "UK" });
    const resultGB = await handler({ country: "GB" });

    expect(resultUK.content[0]!.text).toContain("UK-Specific Information");
    expect(resultGB.content[0]!.text).toContain("UK-Specific Information");
    expect(resultUK.content[0]!.text).toBe(resultGB.content[0]!.text);
  });
});
