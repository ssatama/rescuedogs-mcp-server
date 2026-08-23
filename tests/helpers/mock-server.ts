import { vi } from "vitest";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ToolAnnotations } from "@modelcontextprotocol/sdk/types.js";

type ToolHandler = (input: Record<string, unknown>) => Promise<{
  content: Array<{ type: string; text?: string; data?: string; mimeType?: string }>;
  isError?: boolean;
}>;

export interface ToolConfig {
  title?: string;
  description?: string;
  inputSchema?: unknown;
  annotations?: ToolAnnotations;
}

interface RegisteredTool {
  name: string;
  config: ToolConfig;
  handler: ToolHandler;
}

export function createMockServer() {
  const tools = new Map<string, RegisteredTool>();

  const server = {
    registerTool: vi.fn(
      (name: string, config: ToolConfig, handler: ToolHandler) => {
        tools.set(name, { name, config, handler });
        // Mirror the real signature, which returns a RegisteredTool.
        return { update: vi.fn(), enable: vi.fn(), disable: vi.fn(), remove: vi.fn() };
      }
    ),
  } as unknown as McpServer;

  function getHandler(toolName: string): ToolHandler {
    return getTool(toolName).handler;
  }

  function getConfig(toolName: string): ToolConfig {
    return getTool(toolName).config;
  }

  function getTool(toolName: string): RegisteredTool {
    const tool = tools.get(toolName);
    if (!tool) {
      throw new Error(
        `Tool "${toolName}" not registered. Registered: ${[...tools.keys()].join(", ")}`
      );
    }
    return tool;
  }

  return { server, getHandler, getConfig, toolNames: () => [...tools.keys()] };
}
