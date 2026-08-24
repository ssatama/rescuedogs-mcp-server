import cors from "cors";
import express, {
  type Express,
  type NextFunction,
  type Request,
  type Response,
} from "express";
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
const DEFAULT_PORT = 3000;

/**
 * PORT="" or any non-numeric value coerces to 0 or NaN, both of which Node
 * binds to a random free port. The process then logs "listening" and looks
 * healthy while the platform health check fails against the expected port.
 */
export function resolvePort(value: string | undefined): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 && parsed < 65536
    ? parsed
    : DEFAULT_PORT;
}

export function createHttpApp(options: HttpAppOptions = {}): Express {
  const app = express();

  // Railway terminates TLS upstream, so the client IP arrives in
  // X-Forwarded-For. Trust exactly one proxy hop: trusting all of them would
  // let a caller spoof the header and walk straight past the rate limiter.
  app.set("trust proxy", 1);

  // Browser-resident clients (the MCP Inspector among them) preflight the
  // POST. mcp-session-id is exposed because the spec carries it in a header.
  app.use(
    cors({
      origin: true,
      methods: ["POST", "OPTIONS"],
      allowedHeaders: ["content-type", "accept", "mcp-session-id", "mcp-protocol-version", "last-event-id"],
      exposedHeaders: ["mcp-session-id"],
      maxAge: 86400,
    })
  );

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

  // The SDK client opens a standalone SSE stream with GET /mcp after a
  // notifications-only POST. It treats 405 as "this server has no GET stream"
  // and moves on; any other status, 404 included, surfaces as a transport
  // error on every session. Answer explicitly rather than letting Express 404.
  app.all("/mcp", (_req: Request, res: Response) => {
    res.set("Allow", "POST").status(405).json({
      jsonrpc: "2.0",
      error: { code: -32000, message: "Method Not Allowed. Use POST." },
      id: null,
    });
  });

  app.use(handleBodyParseError);

  return app;
}

/**
 * express.json() rejects malformed and oversized bodies by handing an error to
 * Express's default handler, which renders HTML - and a stack trace outside
 * production. An MCP client expects a JSON-RPC error object.
 */
function handleBodyParseError(
  err: unknown,
  _req: Request,
  res: Response,
  next: NextFunction
): void {
  if (!err || res.headersSent) {
    next(err);
    return;
  }
  const status = (err as { status?: number }).status ?? 500;
  const tooLarge = (err as { type?: string }).type === "entity.too.large";
  res.status(status === 500 ? 500 : status).json({
    jsonrpc: "2.0",
    error: tooLarge
      ? { code: -32600, message: "Request body too large." }
      : { code: -32700, message: "Parse error: request body is not valid JSON." },
    id: null,
  });
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
