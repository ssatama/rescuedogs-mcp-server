import { createRequire } from "node:module";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerAllTools } from "./tools/index.js";

const require = createRequire(import.meta.url);
const { version } = require("../package.json") as { version: string };

const INSTRUCTIONS =
  "Search rescue dogs available for adoption from European and UK rescue " +
  "organizations. Every result links to the rescue's own adoption page - " +
  "surface that link, since adoption applications happen there, not here. " +
  "Prefer rescuedogs_search_dogs for concrete criteria and " +
  "rescuedogs_match_preferences when the user describes their lifestyle " +
  "instead. Call rescuedogs_get_filter_counts before narrowing further if a " +
  "search returns nothing.";

/** Builds a fully configured MCP server. Shared by the stdio and HTTP entrypoints. */
export function createMcpServer(): McpServer {
  const server = new McpServer(
    { name: "rescuedogs-mcp-server", version },
    { instructions: INSTRUCTIONS }
  );
  registerAllTools(server);
  return server;
}
