import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { apiClient } from "../services/api-client.js";
import { cacheService } from "../services/cache-service.js";
import { formatBreedStatsMarkdown } from "../services/formatters.js";
import { ListBreedsInputSchema } from "../schemas/index.js";

export function registerListBreedsTool(server: McpServer): void {
  server.tool(
    "rescuedogs_list_breeds",
    "Get available breeds with counts and statistics. Shows which breeds have dogs available for adoption.",
    ListBreedsInputSchema.shape,
    async (input) => {
      try {
        const parsed = ListBreedsInputSchema.parse(input);

        // Check cache first
        let stats =
          cacheService.getBreedStats<
            Awaited<ReturnType<typeof apiClient.getBreedStats>>
          >();

        if (!stats) {
          stats = await apiClient.getBreedStats();
          cacheService.setBreedStats(stats);
        }

        // Filter by breed group if specified
        if (parsed.breed_group) {
          stats = {
            ...stats,
            qualifying_breeds: stats.qualifying_breeds.filter(
              (b) =>
                b.breed_group?.toLowerCase() ===
                parsed.breed_group?.toLowerCase()
            ),
          };
        }

        // Filter by min count
        if (parsed.min_count && parsed.min_count > 1) {
          stats = {
            ...stats,
            qualifying_breeds: stats.qualifying_breeds.filter(
              (b) => b.count >= (parsed.min_count || 1)
            ),
          };
        }

        if (parsed.response_format === "json") {
          return {
            content: [
              {
                type: "text" as const,
                text: JSON.stringify(stats, null, 2),
              },
            ],
          };
        }

        return {
          content: [
            {
              type: "text" as const,
              text: formatBreedStatsMarkdown(stats, parsed.limit),
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
