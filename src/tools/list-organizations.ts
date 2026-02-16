import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { apiClient } from "../services/api-client.js";
import { cacheService } from "../services/cache-service.js";
import { formatOrganizationsListMarkdown } from "../services/formatters.js";
import { ListOrganizationsInputSchema } from "../schemas/index.js";
import { normalizeCountryForApi } from "../utils/mappings.js";

export function registerListOrganizationsTool(server: McpServer): void {
  server.tool(
    "rescuedogs_list_organizations",
    "List rescue organizations with their statistics and available dogs count.",
    ListOrganizationsInputSchema.shape,
    async (input) => {
      try {
        const parsed = ListOrganizationsInputSchema.parse(input);

        // Check cache first (only for unfiltered requests)
        let orgs: Awaited<ReturnType<typeof apiClient.getOrganizations>> | undefined;

        if (!parsed.country) {
          orgs = cacheService.getOrganizations<typeof orgs>();
        }

        if (!orgs) {
          orgs = await apiClient.getOrganizations({
            country: normalizeCountryForApi(parsed.country),
            active_only: parsed.active_only,
            limit: parsed.limit,
          });

          if (!parsed.country) {
            cacheService.setOrganizations(orgs);
          }
        }

        if (parsed.response_format === "json") {
          return {
            content: [
              {
                type: "text" as const,
                text: JSON.stringify(orgs, null, 2),
              },
            ],
          };
        }

        return {
          content: [
            {
              type: "text" as const,
              text: formatOrganizationsListMarkdown(orgs),
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
