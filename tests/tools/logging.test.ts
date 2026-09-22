import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { wrapWithLogging } from "../../src/tools/index.js";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

type ToolHandler = (...args: unknown[]) => Promise<{
  content: Array<{ type: string; text?: string }>;
  isError?: boolean;
}>;

describe("wrapWithLogging", () => {
  let registeredHandlers: Map<string, ToolHandler>;
  let mockServer: McpServer;
  let stderrSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    registeredHandlers = new Map();

    mockServer = {
      registerTool: vi.fn(
        (name: string, _config: unknown, handler: ToolHandler) => {
          registeredHandlers.set(name, handler);
        }
      ),
    } as unknown as McpServer;

    stderrSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("logs structured JSON with status ok on successful tool call", async () => {
    wrapWithLogging(mockServer);

    // Register a tool through the wrapped server
    (mockServer.registerTool as unknown as Function)(
      "test_tool",
      { title: "Test tool", description: "description" },
      async () => ({
        content: [{ type: "text", text: "success" }],
      })
    );

    const handler = registeredHandlers.get("test_tool")!;
    await handler({});

    expect(stderrSpy).toHaveBeenCalledOnce();
    const logLine = JSON.parse(stderrSpy.mock.calls[0]![0] as string);
    expect(logLine.tool).toBe("test_tool");
    expect(logLine.status).toBe("ok");
    expect(logLine.level).toBe("info");
    expect(logLine.message).toBe("tool test_tool ok");
    expect(typeof logLine.duration_ms).toBe("number");
    expect(logLine.duration_ms).toBeGreaterThanOrEqual(0);
  });

  it("logs structured JSON with status error when result has isError", async () => {
    wrapWithLogging(mockServer);

    (mockServer.registerTool as unknown as Function)(
      "failing_tool",
      { title: "Failing tool", description: "description" },
      async () => ({
        isError: true,
        content: [{ type: "text", text: "Error: something broke" }],
      })
    );

    const handler = registeredHandlers.get("failing_tool")!;
    await handler({});

    expect(stderrSpy).toHaveBeenCalledOnce();
    const logLine = JSON.parse(stderrSpy.mock.calls[0]![0] as string);
    expect(logLine.tool).toBe("failing_tool");
    expect(logLine.status).toBe("error");
    expect(logLine.level).toBe("warn");
    expect(typeof logLine.duration_ms).toBe("number");
  });

  it("logs at error level and rethrows when the handler throws", async () => {
    wrapWithLogging(mockServer);

    (mockServer.registerTool as unknown as Function)(
      "throwing_tool",
      { title: "Throwing tool", description: "description" },
      async () => {
        throw new Error("boom");
      }
    );

    const handler = registeredHandlers.get("throwing_tool")!;
    await expect(handler({})).rejects.toThrow("boom");

    expect(stderrSpy).toHaveBeenCalledOnce();
    const logLine = JSON.parse(stderrSpy.mock.calls[0]![0] as string);
    expect(logLine.tool).toBe("throwing_tool");
    expect(logLine.status).toBe("error");
    expect(logLine.level).toBe("error");
    expect(logLine.error).toBe("boom");
  });
});
