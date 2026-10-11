import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { apiClient } from "../services/api-client.js";
import { cacheService } from "../services/cache-service.js";
import { formatOrganizationsListMarkdown } from "../services/formatters.js";
import { ListOrganizationsInputSchema } from "../schemas/index.js";
import { ListOrganizationsOutputShape } from "../schemas/output.js";
import { normalizeCountryForApi } from "../utils/mappings.js";
import { toPublicOrganization } from "../services/projection.js";

export function registerListOrganizationsTool(server: McpServer): void {
  server.registerTool(
    "rescuedogs_list_organizations",
    {
      title: "List rescue organizations",
      description:
        "List rescue organizations with each one's country and city, the countries it adopts to, its adoption fees, website and number of available dogs. Each has a numeric id to pass as organization_id to rescuedogs_search_dogs. Filter by the organization's country with an ISO code (GB and UK both work); active_only (default true) returns active organizations only. Returns up to 50 (default 20).",
      inputSchema: ListOrganizationsInputSchema.shape,
      outputSchema: ListOrganizationsOutputShape,
      annotations: {
        title: "List rescue organizations",
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async (input) => {
      try {
        const parsed = ListOrganizationsInputSchema.parse(input);

        // The cache entry is shared with search_dogs' organization-name
        // matching, so it only ever holds the full active list: limit is
        // applied below, and other filters bypass the cache.
        const useCache = !parsed.country && parsed.active_only;
        let orgs: Awaited<ReturnType<typeof apiClient.getOrganizations>> | undefined;

        if (useCache) {
          orgs = cacheService.getOrganizations<typeof orgs>();
        }

        if (!orgs) {
          orgs = await apiClient.getOrganizations({
            country: normalizeCountryForApi(parsed.country),
            active_only: parsed.active_only,
            ...(!useCache && { limit: parsed.limit }),
          });

          if (useCache) {
            cacheService.setOrganizations(orgs);
          }
        }

        orgs = orgs.slice(0, parsed.limit);

        const structured = {
          count: orgs.length,
          organizations: orgs.map(toPublicOrganization),
        };

        return {
          structuredContent: structured,
          content: [
            {
              type: "text" as const,
              text:
                parsed.response_format === "json"
                  ? JSON.stringify(structured.organizations, null, 2)
                  : formatOrganizationsListMarkdown(orgs),
            },
          ],
        };
      } catch (error) {
        return {
          isError: true,
          content: [
            {
              type: "text" as const,
              text: `Error: ${error instanceof Error ? error.message : "An unexpected error occurred"}`,
            },
          ],
        };
      }
    }
  );
}
