import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerSearchDogsTool } from "./search-dogs.js";
import { registerGetDogDetailsTool } from "./get-dog-details.js";
import { registerListBreedsTool } from "./list-breeds.js";
import { registerGetStatisticsTool } from "./get-statistics.js";
import { registerGetFilterCountsTool } from "./get-filter-counts.js";
import { registerListOrganizationsTool } from "./list-organizations.js";
import { registerMatchPreferencesTool } from "./match-preferences.js";
import { registerGetAdoptionGuideTool } from "./get-adoption-guide.js";

type ToolResult = {
  content: Array<{ type: string; text?: string; data?: string; mimeType?: string }>;
  isError?: boolean;
};

type ToolHandler = (...args: unknown[]) => Promise<ToolResult>;

export function wrapWithLogging(server: McpServer): McpServer {
  const originalTool = server.tool.bind(server) as (...args: unknown[]) => void;

  (server as unknown as { tool: (...args: unknown[]) => void }).tool = (
    ...args: unknown[]
  ): void => {
    // server.tool has multiple overloads; the handler is always the last argument
    const handler = args[args.length - 1] as ToolHandler;
    const toolName = args[0] as string;

    const wrappedHandler: ToolHandler = async (...handlerArgs: unknown[]) => {
      const start = Date.now();
      try {
        const result = await handler(...handlerArgs);
        const duration_ms = Date.now() - start;
        const status = result.isError ? "error" : "ok";
        console.error(JSON.stringify({ tool: toolName, duration_ms, status }));
        return result;
      } catch (error) {
        const duration_ms = Date.now() - start;
        console.error(JSON.stringify({ tool: toolName, duration_ms, status: "error" }));
        throw error;
      }
    };

    args[args.length - 1] = wrappedHandler;
    originalTool(...args);
  };

  return server;
}

export function registerAllTools(server: McpServer): void {
  wrapWithLogging(server);
  registerSearchDogsTool(server);
  registerGetDogDetailsTool(server);
  registerListBreedsTool(server);
  registerGetStatisticsTool(server);
  registerGetFilterCountsTool(server);
  registerListOrganizationsTool(server);
  registerMatchPreferencesTool(server);
  registerGetAdoptionGuideTool(server);
}
