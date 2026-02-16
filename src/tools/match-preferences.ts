import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { apiClient } from "../services/api-client.js";
import { formatDogsListMarkdown } from "../services/formatters.js";
import { fetchDogImages } from "../services/image-service.js";
import { MatchPreferencesInputSchema } from "../schemas/index.js";
import type { EnhancedDogData } from "../types.js";
import {
  normalizeCountryForApi,
  HOME_TYPE_MAP,
  ENERGY_LEVEL_MAP,
  EXPERIENCE_MAP,
} from "../utils/mappings.js";
import { DISPLAY_LIMITS } from "../constants.js";

export function registerMatchPreferencesTool(server: McpServer): void {
  server.tool(
    "rescuedogs_match_preferences",
    "Find dogs that match your lifestyle preferences. Translates your living situation, activity level, and experience into appropriate filters.",
    MatchPreferencesInputSchema.shape,
    async (input) => {
      try {
        const parsed = MatchPreferencesInputSchema.parse(input);

        const dogs = await apiClient.searchDogs({
          home_type: HOME_TYPE_MAP[parsed.living_situation],
          energy_level: ENERGY_LEVEL_MAP[parsed.activity_level],
          experience_level: EXPERIENCE_MAP[parsed.experience],
          available_to_country: normalizeCountryForApi(
            parsed.adoptable_to_country
          ),
          good_with_kids: parsed.has_children,
          good_with_dogs: parsed.has_other_dogs,
          good_with_cats: parsed.has_cats,
          limit: parsed.limit,
        });

        // Fetch enhanced data
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
                    matched_criteria: {
                      home_type: HOME_TYPE_MAP[parsed.living_situation],
                      energy_level: ENERGY_LEVEL_MAP[parsed.activity_level],
                      experience_level: EXPERIENCE_MAP[parsed.experience],
                      ...(parsed.has_children !== undefined && {
                        good_with_kids: parsed.has_children,
                      }),
                      ...(parsed.has_other_dogs !== undefined && {
                        good_with_dogs: parsed.has_other_dogs,
                      }),
                      ...(parsed.has_cats !== undefined && {
                        good_with_cats: parsed.has_cats,
                      }),
                    },
                    dogs: dogs.map((d) => ({
                      ...d,
                      enhanced: enhancedMap?.get(d.id) || null,
                    })),
                  },
                  null,
                  2
                ),
              },
            ],
          };
        }

        const content: Array<
          | { type: "text"; text: string }
          | { type: "image"; data: string; mimeType: "image/jpeg" }
        > = [];

        // Add header with matched criteria
        const compatibilityLines = [
          parsed.has_children !== undefined
            ? `- Has Children: ${parsed.has_children ? "Yes" : "No"}`
            : "",
          parsed.has_other_dogs !== undefined
            ? `- Has Other Dogs: ${parsed.has_other_dogs ? "Yes" : "No"}`
            : "",
          parsed.has_cats !== undefined
            ? `- Has Cats: ${parsed.has_cats ? "Yes" : "No"}`
            : "",
        ]
          .filter(Boolean)
          .join("\n");

        const header = `# Dogs Matching Your Preferences

**Your Profile:**
- Living Situation: ${parsed.living_situation.replace(/_/g, " ")}
- Activity Level: ${parsed.activity_level}
- Experience: ${parsed.experience.replace(/_/g, " ")}
${parsed.adoptable_to_country ? `- Adopting to: ${parsed.adoptable_to_country}` : ""}
${compatibilityLines}

`;

        content.push({
          type: "text" as const,
          text:
            header +
            formatDogsListMarkdown(dogs, enhancedMap, {
              offset: 0,
              limit: parsed.limit ?? 5,
            }),
        });

        // Add images if requested
        if (parsed.include_images && dogs.length > 0) {
          const images = await fetchDogImages(
            dogs.slice(0, DISPLAY_LIMITS.MAX_IMAGES).map((d) => d.primary_image_url),
            "thumbnail"
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
