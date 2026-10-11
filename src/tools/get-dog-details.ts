import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { apiClient } from "../services/api-client.js";
import { formatDogMarkdown } from "../services/formatters.js";
import { fetchDogImage, fetchDogImages } from "../services/image-service.js";
import { toPublicDog } from "../services/projection.js";
import { GetDogDetailsInputSchema } from "../schemas/index.js";
import { GetDogDetailsOutputShape } from "../schemas/output.js";
import type { ImagePreset } from "../types.js";
import { DISPLAY_LIMITS } from "../constants.js";

export function registerGetDogDetailsTool(server: McpServer): void {
  server.registerTool(
    "rescuedogs_get_dog_details",
    {
      title: "Get dog details",
      description:
        "Get the full profile of one rescue dog by its slug, taken from rescuedogs_search_dogs or rescuedogs_match_preferences results. Returns the listing details, compatibility with children, dogs and cats, owner requirements, the rescuing organization, and the rescue's adoption_url, where applications are made. The personality profile is AI-generated from the listing text and can be incomplete; the rescue is the authority on the dog. Includes the main photo by default, or up to 5 gallery photos with include_gallery. An unknown slug returns an error.",
      inputSchema: GetDogDetailsInputSchema.shape,
      outputSchema: GetDogDetailsOutputShape,
      annotations: {
        title: "Get dog details",
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async (input) => {
      try {
        const parsed = GetDogDetailsInputSchema.parse(input);

        const dog = await apiClient.getDogBySlug(parsed.slug);

        const structured = { dog: toPublicDog(dog) };

        if (parsed.response_format === "json") {
          return {
            structuredContent: structured,
            content: [
              { type: "text" as const, text: JSON.stringify(structured.dog, null, 2) },
            ],
          };
        }

        // Build response content
        const content: Array<
          | { type: "text"; text: string }
          | { type: "image"; data: string; mimeType: "image/jpeg" }
        > = [];

        // Add images first if requested; include_image: false means none
        if (parsed.include_image && parsed.include_gallery) {
          const urls = dog.images?.length
            ? dog.images.map((image) => image.url)
            : [dog.primary_image_url];
          const images = await fetchDogImages(
            urls.slice(0, DISPLAY_LIMITS.MAX_IMAGES),
            parsed.image_preset as ImagePreset
          );
          for (const image of images) {
            if (image) content.push(image);
          }
        } else if (parsed.include_image) {
          const image = await fetchDogImage(
            dog.primary_image_url,
            parsed.image_preset as ImagePreset
          );
          if (image) {
            content.push(image);
          }
        }

        // Add text content
        content.push({
          type: "text" as const,
          text: formatDogMarkdown(dog),
        });

        return { structuredContent: structured, content };
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
