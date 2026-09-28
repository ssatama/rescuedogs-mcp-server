import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { apiClient } from "../services/api-client.js";
import { cacheService } from "../services/cache-service.js";
import { formatFilterCountsMarkdown } from "../services/formatters.js";
import { GetFilterCountsInputSchema } from "../schemas/index.js";
import { GetFilterCountsOutputShape } from "../schemas/output.js";
import {
  AGE_CATEGORY_MAP,
  SEX_MAP,
  normalizeCountryForApi,
  normalizeSize,
} from "../utils/mappings.js";

export function registerGetFilterCountsTool(server: McpServer): void {
  server.registerTool(
    "rescuedogs_get_filter_counts",
    {
      title: "Get filter options",
      description: "Get available filter options with counts based on current filter context, plus the number of matching dogs and how many are good with children, dogs or cats, suit first-time owners, or have low, medium or high energy. Use this to show users valid filter choices that won't result in empty searches.",
      inputSchema: GetFilterCountsInputSchema.shape,
      outputSchema: GetFilterCountsOutputShape,
      annotations: {
        title: "Get filter options",
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async (input) => {
      try {
        const parsed = GetFilterCountsInputSchema.parse(input);

        const raw = parsed.current_filters || {};
        const params: Parameters<typeof apiClient.getFilterCounts>[0] = {
          breed: raw.breed,
          standardized_size: normalizeSize(raw.size),
          age_category: raw.age_category
            ? AGE_CATEGORY_MAP[raw.age_category]
            : undefined,
          sex: raw.sex ? SEX_MAP[raw.sex] : undefined,
          available_to_country: normalizeCountryForApi(raw.adoptable_to_country),
          // The API filters on true only
          good_with_kids: raw.good_with_kids || undefined,
          good_with_dogs: raw.good_with_dogs || undefined,
          good_with_cats: raw.good_with_cats || undefined,
        };

        // Deterministic cache key: the params actually sent, sorted, unset dropped
        const filterHash = JSON.stringify(
          Object.fromEntries(
            Object.entries(params)
              .filter(([, value]) => value)
              .sort(([a], [b]) => a.localeCompare(b))
          )
        );
        let counts =
          cacheService.getFilterCounts<
            Awaited<ReturnType<typeof apiClient.getFilterCounts>>
          >(filterHash);

        if (!counts) {
          counts = await apiClient.getFilterCounts(params);
          cacheService.setFilterCounts(filterHash, counts);
        }

        // Countries sorted by count so the most useful choices come first
        const structured = {
          ...(counts.total !== undefined && { total: counts.total }),
          ...(counts.lifestyle && { lifestyle: counts.lifestyle }),
          size_options: counts.size_options,
          age_options: counts.age_options,
          sex_options: counts.sex_options,
          breed_options: counts.breed_options,
          organization_options: counts.organization_options,
          available_country_options: [...counts.available_country_options].sort(
            (a, b) => b.count - a.count
          ),
          location_country_options: counts.location_country_options,
          available_region_options: counts.available_region_options,
        };

        return {
          structuredContent: structured,
          content: [
            {
              type: "text" as const,
              text:
                parsed.response_format === "json"
                  ? JSON.stringify(
                      {
                        ...counts,
                        available_country_options:
                          structured.available_country_options,
                      },
                      null,
                      2
                    )
                  : formatFilterCountsMarkdown(counts),
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
