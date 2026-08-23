import { describe, it, expect, beforeEach } from "vitest";
import { createMockServer } from "../helpers/mock-server.js";
import { registerAllTools } from "../../src/tools/index.js";

/**
 * Every tool must carry a title and complete safety annotations. OpenAI's
 * plugin submission requires readOnlyHint, destructiveHint and openWorldHint
 * on each tool, and locks names and descriptions at publish.
 */
describe("tool registration metadata", () => {
  let mock: ReturnType<typeof createMockServer>;

  beforeEach(() => {
    mock = createMockServer();
    registerAllTools(mock.server);
  });

  const EXPECTED = [
    "rescuedogs_search_dogs",
    "rescuedogs_get_dog_details",
    "rescuedogs_list_breeds",
    "rescuedogs_get_statistics",
    "rescuedogs_get_filter_counts",
    "rescuedogs_list_organizations",
    "rescuedogs_match_preferences",
    "rescuedogs_get_adoption_guide",
  ];

  it("registers exactly the eight documented tools", () => {
    expect(mock.toolNames().sort()).toEqual([...EXPECTED].sort());
  });

  it.each(EXPECTED)("%s has a human-readable title", (name) => {
    const title = mock.getConfig(name).title;
    expect(title).toBeTruthy();
    expect(title).not.toBe(name);
  });

  it.each(EXPECTED)("%s describes when to use it", (name) => {
    expect(mock.getConfig(name).description?.length ?? 0).toBeGreaterThan(20);
  });

  it.each(EXPECTED)("%s is annotated as a safe read-only tool", (name) => {
    // Every handler is a GET against the public catalogue or a static lookup.
    expect(mock.getConfig(name).annotations).toMatchObject({
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    });
  });

  it.each(EXPECTED)("%s declares an input schema object", (name) => {
    expect(mock.getConfig(name).inputSchema).toBeTypeOf("object");
  });
});
