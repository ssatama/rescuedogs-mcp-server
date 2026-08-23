import express, { type Express, type Request, type Response } from "express";
import rateLimit from "express-rate-limit";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { createMcpServer } from "./server.js";
import { RATE_LIMITS } from "./constants.js";

interface RateLimitOptions {
  burst?: number;
  burstWindowMs?: number;
  sustained?: number;
  sustainedWindowMs?: number;
}

export interface HttpAppOptions {
  /** `false` disables limiting entirely - for tests only, never in production. */
  rateLimit?: RateLimitOptions | false;
  /** Token served at /.well-known/openai-apps-challenge for domain verification. */
  challengeToken?: string;
}

const JSON_BODY_LIMIT = "1mb";

export function createHttpApp(options: HttpAppOptions = {}): Express {
  const app = express();

  // Railway terminates TLS upstream, so the client IP arrives in
  // X-Forwarded-For. Trust exactly one proxy hop: trusting all of them would
  // let a caller spoof the header and walk straight past the rate limiter.
  app.set("trust proxy", 1);

  app.get("/health", (_req: Request, res: Response) => {
    res.json({ status: "ok" });
  });

  if (options.challengeToken) {
    const token = options.challengeToken;
    app.get("/.well-known/openai-apps-challenge", (_req, res) => {
      res.type("text/plain").send(token);
    });
  }

  const limiters = buildLimiters(options.rateLimit);
  app.post(
    "/mcp",
    ...limiters,
    express.json({ limit: JSON_BODY_LIMIT }),
    handleMcpRequest
  );

  return app;
}

function buildLimiters(config: RateLimitOptions | false | undefined) {
  if (config === false) return [];

  const {
    burst = RATE_LIMITS.BURST,
    burstWindowMs = RATE_LIMITS.BURST_WINDOW_MS,
    sustained = RATE_LIMITS.SUSTAINED,
    sustainedWindowMs = RATE_LIMITS.SUSTAINED_WINDOW_MS,
  } = config ?? {};

  const common = {
    standardHeaders: "draft-8" as const,
    legacyHeaders: false,
    message: {
      jsonrpc: "2.0",
      error: {
        code: -32000,
        message: "Rate limit exceeded. Please retry in a moment.",
      },
      id: null,
    },
  };

  return [
    rateLimit({ ...common, windowMs: burstWindowMs, limit: burst }),
    rateLimit({ ...common, windowMs: sustainedWindowMs, limit: sustained }),
  ];
}

async function handleMcpRequest(req: Request, res: Response): Promise<void> {
  // Stateless: a fresh server and transport per request. There is no
  // per-user state to keep, and sharing one instance across concurrent
  // requests would collide on JSON-RPC request ids.
  const server = createMcpServer();
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
  });

  res.on("close", () => {
    void transport.close();
    void server.close();
  });

  try {
    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  } catch (error) {
    console.error(
      JSON.stringify({
        event: "mcp_request_failed",
        message: error instanceof Error ? error.message : String(error),
      })
    );
    if (!res.headersSent) {
      res.status(500).json({
        jsonrpc: "2.0",
        error: { code: -32603, message: "Internal server error" },
        id: null,
      });
    }
  }
}
