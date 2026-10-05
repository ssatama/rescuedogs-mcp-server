import { defineRailway, github, preserve, project, service } from "railway/iac";

// Railway Infrastructure as Code for the hosted HTTP server. Replaces
// railway.json (Config as Code, unsupported from 2026-12-01). Railway doesn't
// read this file on deploy: change it, then `railway config plan` and
// `railway config apply`.
//
// Owns only this service; the aggregator, Browserless and Postgres in the same
// project are managed elsewhere.
export const partial = "rescuedogs-mcp-server";

export default defineRailway(() => {
  // Must match the existing service's name, or apply creates a new one.
  const mcp = service("rescuedogs-mcp", {
    source: github("ssatama/rescuedogs-mcp-server", { branch: "main" }),
    // Without these Railway falls back to Railpack and never builds
    // Dockerfile.http (the root Dockerfile is the Smithery stdio image).
    build: { builder: "DOCKERFILE", dockerfilePath: "Dockerfile.http" },
    deploy: {
      startCommand: "node dist/http.js",
      healthcheckPath: "/health",
      restartPolicyType: "ON_FAILURE",
      restartPolicyMaxRetries: 10,
    },
    networking: {
      customDomains: { "mcp.rescuedogs.me": { port: 3000 } },
      serviceDomains: { "rescuedogs-mcp-production.up.railway.app": { port: 3000 } },
    },
    env: { PORT: preserve() },
  });
  return project("jubilant-serenity", { resources: [mcp] });
});
