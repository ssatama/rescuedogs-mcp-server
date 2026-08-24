import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { apiClient } from "../services/api-client.js";
import { cacheService } from "../services/cache-service.js";
import { formatBreedStatsMarkdown } from "../services/formatters.js";
import { ListBreedsInputSchema } from "../schemas/index.js";
import { ListBreedsOutputShape } from "../schemas/output.js";

export function registerListBreedsTool(server: McpServer): void {
  server.registerTool(
    "rescuedogs_list_breeds",
    {
      title: "List available breeds",
      description: "Get available breeds with counts and statistics. Shows which breeds have dogs available for adoption.",
      inputSchema: ListBreedsInputSchema.shape,
      outputSchema: ListBreedsOutputShape,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
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

        const structured = {
          total_dogs: stats.total_dogs,
          unique_breeds: stats.unique_breeds,
          breeds: stats.qualifying_breeds.slice(0, parsed.limit).map((b) => ({
            primary_breed: b.primary_breed,
            breed_slug: b.breed_slug,
            breed_group: b.breed_group ?? undefined,
            breed_type: b.breed_type ?? undefined,
            count: b.count,
            organization_count: b.organization_count ?? undefined,
            personality_traits: b.personality_traits ?? undefined,
          })),
        };

        return {
          structuredContent: structured,
          content: [
            {
              type: "text" as const,
              text:
                parsed.response_format === "json"
                  ? JSON.stringify(stats, null, 2)
                  : formatBreedStatsMarkdown(stats, parsed.limit),
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
