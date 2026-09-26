# For rescues and shelters: publish your own MCP server

This server is listed in the
[Claude Connectors Directory](https://claude.ai/directory/connectors/rescue-dogs).
Anyone using Claude can switch it on and ask "which rescue dogs would suit a
first-time owner in a flat?" and get real, adoptable dogs back, each linked to
the rescue's own adoption page.

It covers 11 organizations. There are thousands more, and most of their
animals sit on small websites that people never find. This page is for anyone
at a rescue, shelter or rescue network who wants their animals to be findable
the same way. It is a small job: a few hundred lines of code, running on
infrastructure you probably already pay for.

## What an MCP server is, in one paragraph

The [Model Context Protocol](https://modelcontextprotocol.io) is an open
standard that lets AI assistants call tools on your server. You describe a
handful of tools ("search animals", "get one animal's details"), host them at
an HTTPS URL, and any MCP-capable assistant (Claude, ChatGPT, Cursor and
others) can use them to answer people's questions with your live data. The
person still applies through your website; the assistant just helps them find
the right animal and sends them there.

## What you need

- **Your listings in a structured form.** If your website is built on a
  database, a CMS, or a shelter-management system with an export or API, you
  already have this. If your listings only exist as web pages, start there:
  a nightly export to JSON is enough.
- **A stable adoption URL for every animal.** This is the most important
  field. Every result should send people to *your* page, where your process,
  home checks and fees apply.
- **Somewhere to host a small Node.js or Python service** with an HTTPS
  address. Any platform that runs a web app works (Railway, Fly.io, Render, a
  VPS, your existing web host).

## What to expose

Start small. Two tools cover most questions:

| Tool | Returns |
|------|---------|
| `search_animals` | A short list matching filters: species, size, age, sex, good with children, dogs or cats, and where you can rehome to |
| `get_animal_details` | One animal's full profile: description, needs, medical notes you already publish, and the adoption URL |

Useful later: a list of your branches or foster regions, and a static guide to
your adoption process (fees, home checks, transport).

Only expose what is already public on your website. Never include adopter,
fosterer, donor or staff data.

## A minimal server

This is a complete, working read-only server in TypeScript using the official
[MCP SDK](https://github.com/modelcontextprotocol/typescript-sdk). Replace
`loadAnimals()` with a call to your own database or API.

```ts
import express from "express";
import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";

type Animal = {
  id: string;
  name: string;
  species: "dog" | "cat";
  size: "small" | "medium" | "large";
  goodWithChildren: boolean;
  description: string;
  adoptionUrl: string; // your own adoption page for this animal
};

async function loadAnimals(): Promise<Animal[]> {
  // Replace with your database query or API call.
  return [];
}

function createServer(): McpServer {
  const server = new McpServer({ name: "example-rescue", version: "1.0.0" });

  server.registerTool(
    "search_animals",
    {
      title: "Search adoptable animals",
      description:
        "Search animals currently available for adoption at Example Rescue.",
      inputSchema: {
        species: z.enum(["dog", "cat"]).optional(),
        size: z.enum(["small", "medium", "large"]).optional(),
        good_with_children: z.boolean().optional(),
      },
      annotations: {
        title: "Search adoptable animals",
        readOnlyHint: true,
        destructiveHint: false,
        openWorldHint: false,
      },
    },
    async ({ species, size, good_with_children }) => {
      const matches = (await loadAnimals()).filter(
        (a) =>
          (!species || a.species === species) &&
          (!size || a.size === size) &&
          (good_with_children === undefined ||
            a.goodWithChildren === good_with_children)
      );
      const text = matches.length
        ? matches
            .slice(0, 10)
            .map((a) => `${a.name} (${a.species}, ${a.size}): ${a.adoptionUrl}`)
            .join("\n")
        : "No animals match those filters right now.";
      return { content: [{ type: "text", text }] };
    }
  );

  return server;
}

const app = express();
app.post("/mcp", express.json(), async (req, res) => {
  // Stateless: a fresh server per request, nothing to share or expire.
  const server = createServer();
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
  });
  // An unhandled rejection here would crash the whole process.
  res.on("close", () => {
    transport.close().catch(console.error);
    server.close().catch(console.error);
  });
  try {
    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  } catch (error) {
    console.error(error);
    if (!res.headersSent) {
      res.status(500).json({
        jsonrpc: "2.0",
        error: { code: -32603, message: "Internal server error" },
        id: null,
      });
    }
  }
});
// MCP clients probe GET /mcp for a stream. 405 tells them there isn't one;
// Express's default 404 would surface as a transport error instead.
app.all("/mcp", (_req, res) => {
  res.set("Allow", "POST").status(405).json({
    jsonrpc: "2.0",
    error: { code: -32000, message: "Method not allowed. Use POST." },
    id: null,
  });
});
app.listen(Number(process.env.PORT ?? 3000));
```

Install with `npm install @modelcontextprotocol/sdk express zod`. The same
shape works in Python with the
[Python SDK](https://github.com/modelcontextprotocol/python-sdk).

This repository is a fuller example of the same idea, with input validation,
caching, rate limiting, logging and tests. See
[`src/tools/`](src/tools) and [`src/http-app.ts`](src/http-app.ts), and reuse
anything under the MIT licence.

## Test it

1. Run it locally and point the
   [MCP Inspector](https://modelcontextprotocol.io/docs/tools/inspector) at
   `http://localhost:3000/mcp` with transport "Streamable HTTP". Call each
   tool.
2. Deploy it, then add the public `https://.../mcp` URL to Claude as a custom
   connector (Settings → Connectors) and ask it about your animals.

## List it in the Claude directory

Once it works, submit it at
[claude.ai/directory/manage](https://claude.ai/directory/manage) (needs a paid
Claude plan). What Anthropic checks is in their
[submission guide](https://claude.com/docs/connectors/building/submission) and
[review criteria](https://claude.com/docs/connectors/building/review-criteria).
For a public, read-only server like this the essentials are:

- Every tool has a `title` inside `annotations` (the portal reads it from
  there) and `readOnlyHint: true`.
- A public privacy policy and documentation page. This repository's
  [PRIVACY.md](PRIVACY.md) is a reasonable starting point for a server that
  stores nothing.
- No authentication is needed for public data.
- Tool descriptions say what the tool does, and nothing else.

Our submission was approved by automated review the same day.

## Not ready to run your own?

If your listings are public, they may already be in
[rescuedogs.me](https://www.rescuedogs.me) and therefore in this server. To be
added, corrected or removed, open an issue on
[rescue-dog-aggregator](https://github.com/ssatama/rescue-dog-aggregator/issues).
Running your own server is still better: you control the data, it is always
current, and you can cover every animal you care for, not only dogs.
