import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { apiClient } from "../services/api-client.js";
import { cacheService } from "../services/cache-service.js";
import { formatDogsListMarkdown } from "../services/formatters.js";
import { fetchDogImages } from "../services/image-service.js";
import { toPublicDog } from "../services/projection.js";
import { SearchDogsInputSchema } from "../schemas/index.js";
import type { ImagePreset, Organization } from "../types.js";
import {
  AGE_CATEGORY_MAP,
  SEX_MAP,
  normalizeCountryForApi,
} from "../utils/mappings.js";
import { DISPLAY_LIMITS } from "../constants.js";

function normalizeOrgName(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

// The forms a user plausibly types for an organization: its full name, the
// name without a trailing German "e.V.", and an acronym that precedes a
// parenthetical expansion. Matching stays exact against this set — substring
// matching is what made a dog named "Daisy" resolve to "Daisy Family Rescue".
function orgNameAliases(name: string): string[] {
  return [
    name,
    name.replace(/\s*\(.*?\)\s*/g, " "),
    name.replace(/[\s,]*e\.?\s*v\.?\s*$/i, ""),
  ]
    .map(normalizeOrgName)
    .filter(Boolean);
}

export function registerSearchDogsTool(server: McpServer): void {
  server.registerTool(
    "rescuedogs_search_dogs",
    {
      title: "Search rescue dogs",
      description: "Search for rescue dogs available for adoption from European and UK organizations. Returns matching dogs with basic info. Use rescuedogs_get_dog_details for full profiles.",
      inputSchema: SearchDogsInputSchema.shape,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async (input) => {
      try {
        const parsed = SearchDogsInputSchema.parse(input);

        // Map age_category to capitalized form for backend
        const mappedAgeCategory = parsed.age_category
          ? AGE_CATEGORY_MAP[parsed.age_category]
          : undefined;

        // A query that is exactly an organization's name is a request for that
        // organization's dogs, so swap it for an organization_id filter. The
        // match must be exact: substring matching treated a dog named "Daisy"
        // as a request for "Daisy Family Rescue e.V.", returning that org's
        // whole roster and hiding every actual Daisy.
        let organizationId = parsed.organization_id;
        let searchQuery = parsed.query;

        if (searchQuery && !organizationId) {
          let orgs = cacheService.getOrganizations<Organization[]>();
          if (!orgs) {
            orgs = await apiClient.getOrganizations({ active_only: true });
            cacheService.setOrganizations(orgs);
          }

          const normalizedQuery = normalizeOrgName(searchQuery);
          const matchedOrg = orgs.find((o) =>
            orgNameAliases(o.name).includes(normalizedQuery)
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

        if (parsed.response_format === "json") {
          return {
            content: [
              {
                type: "text" as const,
                text: JSON.stringify(
                  {
                    count: dogs.length,
                    dogs: dogs.map(toPublicDog),
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
          text: formatDogsListMarkdown(dogs, {
            offset: parsed.offset ?? 0,
            limit: parsed.limit ?? 10,
          }),
        });

        // Add images if requested
        if (parsed.include_images && dogs.length > 0) {
          const images = await fetchDogImages(
            dogs.slice(0, DISPLAY_LIMITS.MAX_IMAGES).map((d) => d.primary_image_url),
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
