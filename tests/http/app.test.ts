import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import type { Server } from "node:http";
import { AddressInfo } from "node:net";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { createHttpApp } from "../../src/http-app.js";

vi.mock("../../src/services/api-client.js", () => ({
  apiClient: {
    searchDogs: vi.fn().mockResolvedValue([]),
    getDogBySlug: vi.fn(),
    getBreedStats: vi.fn(),
    getStatistics: vi.fn(),
    getFilterCounts: vi.fn(),
    getOrganizations: vi.fn().mockResolvedValue([]),
  },
}));

function listen(app: ReturnType<typeof createHttpApp>): Promise<{
  server: Server;
  url: string;
}> {
  return new Promise((resolve) => {
    const server = app.listen(0, "127.0.0.1", () => {
      const { port } = server.address() as AddressInfo;
      resolve({ server, url: `http://127.0.0.1:${port}` });
    });
  });
}

const close = (server: Server) =>
  new Promise<void>((resolve) => server.close(() => resolve()));

describe("http app", () => {
  let server: Server;
  let url: string;

  beforeAll(async () => {
    ({ server, url } = await listen(createHttpApp({ rateLimit: false })));
  });

  afterAll(async () => {
    await close(server);
  });

  it("serves a health check", async () => {
    const res = await fetch(`${url}/health`);
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toMatchObject({ status: "ok" });
  });

  it("completes an MCP handshake over streamable HTTP", async () => {
    const client = new Client({ name: "test", version: "1.0.0" });
    await client.connect(new StreamableHTTPClientTransport(new URL(`${url}/mcp`)));

    const { tools } = await client.listTools();
    expect(tools).toHaveLength(8);

    const search = tools.find((t) => t.name === "rescuedogs_search_dogs")!;
    expect(search.title).toBe("Search rescue dogs");
    expect(search.annotations).toMatchObject({
      readOnlyHint: true,
      openWorldHint: true,
    });

    await client.close();
  });

  it("calls a tool over streamable HTTP", async () => {
    const client = new Client({ name: "test", version: "1.0.0" });
    await client.connect(new StreamableHTTPClientTransport(new URL(`${url}/mcp`)));

    const result = await client.callTool({
      name: "rescuedogs_get_adoption_guide",
      arguments: { topic: "fees" },
    });
    const content = result.content as Array<{ type: string; text: string }>;
    expect(content[0]!.text).toContain("Adoption Fees");

    await client.close();
  });

  it("isolates concurrent requests from each other", async () => {
    // Stateless mode builds a server per request; a shared one would collide
    // on JSON-RPC request ids under concurrency.
    const results = await Promise.all(
      Array.from({ length: 5 }, async () => {
        const client = new Client({ name: "test", version: "1.0.0" });
        await client.connect(
          new StreamableHTTPClientTransport(new URL(`${url}/mcp`))
        );
        const { tools } = await client.listTools();
        await client.close();
        return tools.length;
      })
    );
    expect(results).toEqual([8, 8, 8, 8, 8]);
  });

  it("rejects a non-POST request to /mcp", async () => {
    const res = await fetch(`${url}/mcp`, { method: "DELETE" });
    expect(res.status).toBeGreaterThanOrEqual(400);
  });
});

describe("domain verification", () => {
  it("serves the challenge token when one is configured", async () => {
    const { server, url } = await listen(
      createHttpApp({ rateLimit: false, challengeToken: "tok_abc123" })
    );
    const res = await fetch(`${url}/.well-known/openai-apps-challenge`);
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("text/plain");
    await expect(res.text()).resolves.toBe("tok_abc123");
    await close(server);
  });

  it("404s when no token is configured", async () => {
    const { server, url } = await listen(createHttpApp({ rateLimit: false }));
    const res = await fetch(`${url}/.well-known/openai-apps-challenge`);
    expect(res.status).toBe(404);
    await close(server);
  });
});

describe("rate limiting", () => {
  it("returns 429 once the burst allowance is spent", async () => {
    const { server, url } = await listen(
      createHttpApp({ rateLimit: { burst: 3, burstWindowMs: 60_000 } })
    );

    const statuses: number[] = [];
    for (let i = 0; i < 5; i++) {
      const res = await fetch(`${url}/mcp`, {
        method: "POST",
        headers: { "content-type": "application/json", accept: "application/json, text/event-stream" },
        body: JSON.stringify({ jsonrpc: "2.0", id: i, method: "ping" }),
      });
      statuses.push(res.status);
    }

    expect(statuses.filter((s) => s === 429).length).toBeGreaterThan(0);
    expect(statuses.slice(0, 3).every((s) => s !== 429)).toBe(true);
    await close(server);
  });

  it("does not rate limit the health check", async () => {
    const { server, url } = await listen(
      createHttpApp({ rateLimit: { burst: 2, burstWindowMs: 60_000 } })
    );
    for (let i = 0; i < 5; i++) {
      expect((await fetch(`${url}/health`)).status).toBe(200);
    }
    await close(server);
  });
});
