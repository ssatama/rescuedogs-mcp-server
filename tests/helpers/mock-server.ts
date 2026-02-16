import { vi } from "vitest";

type ToolHandler = (input: Record<string, unknown>) => Promise<{
  content: Array<{ type: string; text?: string; data?: string; mimeType?: string }>;
  isError?: boolean;
}>;

interface RegisteredTool {
  name: string;
  description: string;
  schema: unknown;
  handler: ToolHandler;
}

export function createMockServer() {
  const tools = new Map<string, RegisteredTool>();

  const server = {
    tool: vi.fn(
      (
        name: string,
        description: string,
        schema: unknown,
        handler: ToolHandler
      ) => {
        tools.set(name, { name, description, schema, handler });
      }
    ),
  };

  function getHandler(toolName: string): ToolHandler {
    const tool = tools.get(toolName);
    if (!tool) {
      throw new Error(
        `Tool "${toolName}" not registered. Registered: ${[...tools.keys()].join(", ")}`
      );
    }
    return tool.handler;
  }

  return { server, getHandler };
}
