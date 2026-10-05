import { defineRailway, github, project, service } from "railway/iac";

// Railway Infrastructure as Code for the hosted HTTP server, replacing
// railway.json (Config as Code, unsupported from 2026-12-01). Railway doesn't
// read this file on deploy: after changing it, run `railway config plan` and
// `railway config apply`. Settings changed in the dashboard drift from it;
// `railway config plan --detailed-exit-code` exits 2 when they differ.
//
// Owns only this service; the aggregator, Browserless and Postgres in the same
// project are managed elsewhere. Declare every variable the service needs in
// `env` (use `preserve()` to keep a dashboard value): apply treats a variable
// missing here as one to delete.
export const partial = "rescuedogs-mcp-server";

// The app listens on PORT; the domains route to the same port.
const PORT = 3000;

export default defineRailway(() => {
  // Must match the existing service's name, or apply creates a new one.
  const mcp = service("rescuedogs-mcp", {
    source: github("ssatama/rescuedogs-mcp-server", { branch: "main" }),
    // Without these Railway uses its defaults, which build the root
    // Dockerfile (the Smithery stdio image, which never listens) or Railpack,
    // never Dockerfile.http. Dockerfile.http's CMD is the start command.
    build: { builder: "DOCKERFILE", dockerfilePath: "Dockerfile.http" },
    deploy: {
      healthcheckPath: "/health",
      restartPolicyType: "ON_FAILURE",
      restartPolicyMaxRetries: 10,
    },
    networking: {
      customDomains: { "mcp.rescuedogs.me": { port: PORT } },
      serviceDomains: { "rescuedogs-mcp-production.up.railway.app": { port: PORT } },
    },
    env: { PORT: String(PORT) },
  });
  return project("jubilant-serenity", { resources: [mcp] });
});
