import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { apiClient } from "../services/api-client.js";
import { cacheService } from "../services/cache-service.js";
import { formatStatisticsMarkdown } from "../services/formatters.js";
import { GetStatisticsInputSchema } from "../schemas/index.js";
import { GetStatisticsOutputShape } from "../schemas/output.js";

export function registerGetStatisticsTool(server: McpServer): void {
  server.registerTool(
    "rescuedogs_get_statistics",
    {
      title: "Get platform statistics",
      description: "Get overall statistics about available rescue dogs on the platform.",
      inputSchema: GetStatisticsInputSchema.shape,
      outputSchema: GetStatisticsOutputShape,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async (input) => {
      try {
        const parsed = GetStatisticsInputSchema.parse(input);

        // Check cache first
        let stats =
          cacheService.getStatistics<
            Awaited<ReturnType<typeof apiClient.getStatistics>>
          >();

        if (!stats) {
          stats = await apiClient.getStatistics();
          cacheService.setStatistics(stats);
        }

        const structured = {
          total_dogs: stats.total_dogs,
          total_organizations: stats.total_organizations,
          countries: stats.countries.map((c) => ({
            country: c.country,
            count: c.count,
          })),
        };

        return {
          structuredContent: structured,
          content: [
            {
              type: "text" as const,
              // Unchanged from 2.0.0 - structuredContent is additive, so the
              // text payload must not shift under existing consumers.
              text:
                parsed.response_format === "json"
                  ? JSON.stringify(stats, null, 2)
                  : formatStatisticsMarkdown(stats),
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
