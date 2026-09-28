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
  normalizeSizeForApi,
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

        // Build deterministic cache key from normalized filters (sorted keys)
        const raw = parsed.current_filters || {};
        const normalized: Record<string, unknown> = {
          ...(raw.breed && { breed: raw.breed }),
          ...(raw.size && { size: normalizeSizeForApi(raw.size) }),
          ...(raw.age_category && {
            age_category: AGE_CATEGORY_MAP[raw.age_category],
          }),
          ...(raw.sex && { sex: SEX_MAP[raw.sex] }),
          ...(raw.adoptable_to_country && {
            adoptable_to_country: normalizeCountryForApi(
              raw.adoptable_to_country
            ),
          }),
          ...(raw.good_with_kids && { good_with_kids: true }),
          ...(raw.good_with_dogs && { good_with_dogs: true }),
          ...(raw.good_with_cats && { good_with_cats: true }),
        };
        const filterHash = JSON.stringify(
          Object.keys(normalized)
            .sort()
            .reduce<Record<string, unknown>>((acc, key) => {
              acc[key] = normalized[key];
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
            standardized_size: normalizeSizeForApi(parsed.current_filters?.size),
            age_category: parsed.current_filters?.age_category
              ? AGE_CATEGORY_MAP[parsed.current_filters.age_category]
              : undefined,
            sex: parsed.current_filters?.sex
              ? SEX_MAP[parsed.current_filters.sex]
              : undefined,
            available_to_country: normalizeCountryForApi(
              parsed.current_filters?.adoptable_to_country
            ),
            good_with_kids: raw.good_with_kids,
            good_with_dogs: raw.good_with_dogs,
            good_with_cats: raw.good_with_cats,
          });
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
