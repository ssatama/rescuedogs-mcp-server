import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { apiClient } from "../services/api-client.js";
import { formatDogMarkdown } from "../services/formatters.js";
import { fetchDogImage } from "../services/image-service.js";
import { GetDogDetailsInputSchema } from "../schemas/index.js";
import type { EnhancedDogData, ImagePreset } from "../types.js";

export function registerGetDogDetailsTool(server: McpServer): void {
  server.tool(
    "rescuedogs_get_dog_details",
    "Get full details for a specific rescue dog including AI-generated personality profile, requirements, and adoption info.",
    GetDogDetailsInputSchema.shape,
    async (input) => {
      try {
        const parsed = GetDogDetailsInputSchema.parse(input);

        const dog = await apiClient.getDogBySlug(parsed.slug);

        // Fetch enhanced data
        let enhanced: EnhancedDogData | null = null;
        try {
          enhanced = await apiClient.getEnhancedDogData(dog.id);
        } catch (error) {
          console.error(
            "Enhanced data fetch failed:",
            error instanceof Error ? error.message : error
          );
        }

        if (parsed.response_format === "json") {
          return {
            content: [
              {
                type: "text" as const,
                text: JSON.stringify({ ...dog, enhanced }, null, 2),
              },
            ],
          };
        }

        // Build response content
        const content: Array<
          | { type: "text"; text: string }
          | { type: "image"; data: string; mimeType: "image/jpeg" }
        > = [];

        // Add image first if requested
        if (parsed.include_image) {
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
          text: formatDogMarkdown(dog, enhanced),
        });

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
