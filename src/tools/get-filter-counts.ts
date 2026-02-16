import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { apiClient } from "../services/api-client.js";
import { cacheService } from "../services/cache-service.js";
import { formatFilterCountsMarkdown } from "../services/formatters.js";
import { GetFilterCountsInputSchema } from "../schemas/index.js";
import {
  AGE_CATEGORY_MAP,
  SEX_MAP,
  normalizeCountryForApi,
} from "../utils/mappings.js";

export function registerGetFilterCountsTool(server: McpServer): void {
  server.tool(
    "rescuedogs_get_filter_counts",
    "Get available filter options with counts based on current filter context. Use this to show users valid filter choices that won't result in empty searches.",
    GetFilterCountsInputSchema.shape,
    async (input) => {
      try {
        const parsed = GetFilterCountsInputSchema.parse(input);

        // Build deterministic cache key from filters (sorted keys)
        const filters = parsed.current_filters || {};
        const filterHash = JSON.stringify(
          Object.keys(filters)
            .sort()
            .reduce<Record<string, unknown>>((acc, key) => {
              acc[key] = filters[key as keyof typeof filters];
              return acc;
            }, {})
        );
        let counts =
          cacheService.getFilterCounts<
            Awaited<ReturnType<typeof apiClient.getFilterCounts>>
          >(filterHash);

        if (!counts) {
          counts = await apiClient.getFilterCounts({
            breed: parsed.current_filters?.breed,
            standardized_size: parsed.current_filters?.size,
            age_category: parsed.current_filters?.age_category
              ? AGE_CATEGORY_MAP[parsed.current_filters.age_category]
              : undefined,
            sex: parsed.current_filters?.sex
              ? SEX_MAP[parsed.current_filters.sex]
              : undefined,
            available_to_country: normalizeCountryForApi(
              parsed.current_filters?.adoptable_to_country
            ),
          });
          cacheService.setFilterCounts(filterHash, counts);
        }

        if (parsed.response_format === "json") {
          // Sort available_country_options by count descending (most relevant first)
          const sortedCounts = {
            ...counts,
            available_country_options: [
              ...counts.available_country_options,
            ].sort((a, b) => b.count - a.count),
          };
          return {
            content: [
              {
                type: "text" as const,
                text: JSON.stringify(sortedCounts, null, 2),
              },
            ],
          };
        }

        return {
          content: [
            {
              type: "text" as const,
              text: formatFilterCountsMarkdown(counts),
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
