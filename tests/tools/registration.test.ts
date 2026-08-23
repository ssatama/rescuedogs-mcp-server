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

  it.each(EXPECTED)("%s is annotated read-only and non-destructive", (name) => {
    // Every handler is a GET against the public catalogue or a static lookup.
    expect(mock.getConfig(name).annotations).toMatchObject({
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
    });
  });

  // Per the MCP spec, openWorldHint is about the domain of interaction, not
  // about mutation: "the world of a web search tool is open, whereas that of
  // a memory tool is not". It defaults to true, so declaring false is an
  // active claim that the domain is closed.
  const CLOSED_WORLD = ["rescuedogs_get_adoption_guide"];

  it.each(EXPECTED)("%s declares its world accurately", (name) => {
    const expected = !CLOSED_WORLD.includes(name);
    expect(mock.getConfig(name).annotations?.openWorldHint).toBe(expected);
  });

  it("only the static guide tool claims a closed world", () => {
    const closed = EXPECTED.filter(
      (n) => mock.getConfig(n).annotations?.openWorldHint === false
    );
    expect(closed).toEqual(CLOSED_WORLD);
  });

  it.each(EXPECTED)("%s declares an input schema object", (name) => {
    expect(mock.getConfig(name).inputSchema).toBeTypeOf("object");
  });
});
