import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { apiClient } from "../services/api-client.js";
import { cacheService } from "../services/cache-service.js";
import { formatStatisticsMarkdown } from "../services/formatters.js";
import { GetStatisticsInputSchema } from "../schemas/index.js";

export function registerGetStatisticsTool(server: McpServer): void {
  server.tool(
    "rescuedogs_get_statistics",
    "Get overall statistics about available rescue dogs on the platform.",
    GetStatisticsInputSchema.shape,
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
              text: formatStatisticsMarkdown(stats),
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
