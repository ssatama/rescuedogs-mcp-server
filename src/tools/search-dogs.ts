import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { apiClient } from "../services/api-client.js";
import { cacheService } from "../services/cache-service.js";
import { formatDogsListMarkdown } from "../services/formatters.js";
import { fetchDogImages } from "../services/image-service.js";
import { SearchDogsInputSchema } from "../schemas/index.js";
import type { EnhancedDogData, ImagePreset, Organization } from "../types.js";
import {
  AGE_CATEGORY_MAP,
  SEX_MAP,
  normalizeCountryForApi,
} from "../utils/mappings.js";

export function registerSearchDogsTool(server: McpServer): void {
  server.tool(
    "rescuedogs_search_dogs",
    "Search for rescue dogs available for adoption from European and UK organizations. Returns matching dogs with basic info. Use rescuedogs_get_dog_details for full profiles.",
    SearchDogsInputSchema.shape,
    async (input) => {
      try {
        const parsed = SearchDogsInputSchema.parse(input);

        // Map age_category to capitalized form for backend
        const mappedAgeCategory = parsed.age_category
          ? AGE_CATEGORY_MAP[parsed.age_category]
          : undefined;

        // Check if query matches an organization name
        let organizationId = parsed.organization_id;
        let searchQuery = parsed.query;

        if (searchQuery && !organizationId) {
          let orgs = cacheService.getOrganizations<Organization[]>();
          if (!orgs) {
            orgs = await apiClient.getOrganizations({ active_only: true });
            cacheService.setOrganizations(orgs);
          }

          const queryLower = searchQuery.toLowerCase();
          const matchedOrg = orgs.find(
            (o) =>
              o.name.toLowerCase().includes(queryLower) ||
              queryLower.includes(o.name.toLowerCase())
          );

          if (matchedOrg) {
            organizationId = matchedOrg.id;
            searchQuery = undefined;
          }
        }

        const dogs = await apiClient.searchDogs({
          search: searchQuery,
          breed: parsed.breed,
          breed_group: parsed.breed_group,
          standardized_size: parsed.size,
          age_category: mappedAgeCategory,
          sex: parsed.sex ? SEX_MAP[parsed.sex] : undefined,
          energy_level: parsed.energy_level,
          home_type: parsed.home_type,
          experience_level: parsed.experience_level,
          available_to_country: normalizeCountryForApi(
            parsed.adoptable_to_country
          ),
          organization_id: organizationId,
          good_with_kids: parsed.good_with_kids,
          good_with_dogs: parsed.good_with_dogs,
          good_with_cats: parsed.good_with_cats,
          limit: parsed.limit,
          offset: parsed.offset,
        });

        // Fetch enhanced data for all dogs in parallel
        let enhancedMap: Map<number, EnhancedDogData> | undefined;
        if (dogs.length > 0) {
          try {
            const enhancedData = await apiClient.getBulkEnhancedData(
              dogs.map((d) => d.id)
            );
            enhancedMap = new Map(enhancedData.map((e) => [e.id, e]));
          } catch (error) {
            console.error(
              "Enhanced data fetch failed:",
              error instanceof Error ? error.message : error
            );
          }
        }

        if (parsed.response_format === "json") {
          return {
            content: [
              {
                type: "text" as const,
                text: JSON.stringify(
                  {
                    count: dogs.length,
                    dogs: dogs.map((d) => ({
                      ...d,
                      enhanced: enhancedMap?.get(d.id) || null,
                    })),
                    has_more: dogs.length === parsed.limit,
                  },
                  null,
                  2
                ),
              },
            ],
          };
        }

        // Build response content
        const content: Array<
          | { type: "text"; text: string }
          | { type: "image"; data: string; mimeType: "image/jpeg" }
        > = [];

        // Add text content
        content.push({
          type: "text" as const,
          text: formatDogsListMarkdown(dogs, enhancedMap, {
            offset: parsed.offset ?? 0,
            limit: parsed.limit ?? 10,
          }),
        });

        // Add images if requested
        if (parsed.include_images && dogs.length > 0) {
          const images = await fetchDogImages(
            dogs.slice(0, 5).map((d) => d.primary_image_url),
            parsed.image_preset as ImagePreset
          );

          for (let i = 0; i < images.length; i++) {
            const img = images[i];
            if (img) {
              content.push({
                type: "text" as const,
                text: `\n**${dogs[i]?.name}:**`,
              });
              content.push(img);
            }
          }
        }

        return { content };
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
