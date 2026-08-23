#!/usr/bin/env node

import { createHttpApp } from "./http-app.js";

const port = Number(process.env.PORT ?? 3000);
const host = process.env.HOST ?? "0.0.0.0";

const app = createHttpApp({
  challengeToken: process.env.OPENAI_APPS_CHALLENGE,
});

const server = app.listen(port, host, () => {
  console.error(`rescuedogs-mcp-server listening on http://${host}:${port}/mcp`);
});

for (const signal of ["SIGTERM", "SIGINT"] as const) {
  process.on(signal, () => {
    server.close(() => process.exit(0));
  });
}
