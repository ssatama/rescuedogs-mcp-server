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
      description: "List rescue organizations with their statistics and available dogs count.",
      inputSchema: ListOrganizationsInputSchema.shape,
      outputSchema: ListOrganizationsOutputShape,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
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
