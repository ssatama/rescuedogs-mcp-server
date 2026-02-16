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
      tool: vi.fn(
        (name: string, _desc: string, _schema: unknown, handler: ToolHandler) => {
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
    (mockServer.tool as unknown as Function)(
      "test_tool",
      "description",
      {},
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
    expect(typeof logLine.duration_ms).toBe("number");
    expect(logLine.duration_ms).toBeGreaterThanOrEqual(0);
  });

  it("logs structured JSON with status error when result has isError", async () => {
    wrapWithLogging(mockServer);

    (mockServer.tool as unknown as Function)(
      "failing_tool",
      "description",
      {},
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
    expect(typeof logLine.duration_ms).toBe("number");
  });
});
