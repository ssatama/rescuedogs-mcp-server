import { vi } from "vitest";
import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ToolAnnotations } from "@modelcontextprotocol/sdk/types.js";

type ToolHandler = (input: Record<string, unknown>) => Promise<{
  content: Array<{ type: string; text?: string; data?: string; mimeType?: string }>;
  structuredContent?: Record<string, unknown>;
  isError?: boolean;
}>;

export interface ToolConfig {
  title?: string;
  description?: string;
  inputSchema?: unknown;
  outputSchema?: unknown;
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

  /**
   * Wraps the handler the way the SDK does: when a tool declares an
   * outputSchema, every non-error result must carry structuredContent that
   * parses against it, or the real server throws. Without this the suite
   * passes while the tool errors for every real client.
   */
  function getHandler(toolName: string): ToolHandler {
    const { config, handler } = getTool(toolName);
    const shape = config.outputSchema as z.ZodRawShape | undefined;
    if (!shape) return handler;

    const schema = z.object(shape);
    return async (input) => {
      const result = await handler(input);
      if (result.isError) return result;

      if (!result.structuredContent) {
        throw new Error(
          `Tool "${toolName}" declares an outputSchema but returned no structuredContent`
        );
      }
      const parsed = schema.safeParse(result.structuredContent);
      if (!parsed.success) {
        throw new Error(
          `Tool "${toolName}" structuredContent does not match its outputSchema: ${parsed.error.message}`
        );
      }
      return result;
    };
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
