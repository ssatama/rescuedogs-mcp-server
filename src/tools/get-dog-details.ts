import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { apiClient } from "../services/api-client.js";
import { formatDogMarkdown } from "../services/formatters.js";
import { fetchDogImage } from "../services/image-service.js";
import { GetDogDetailsInputSchema } from "../schemas/index.js";
import type { ImagePreset } from "../types.js";

export function registerGetDogDetailsTool(server: McpServer): void {
  server.registerTool(
    "rescuedogs_get_dog_details",
    {
      title: "Get dog details",
      description: "Get full details for a specific rescue dog including AI-generated personality profile, requirements, and adoption info.",
      inputSchema: GetDogDetailsInputSchema.shape,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async (input) => {
      try {
        const parsed = GetDogDetailsInputSchema.parse(input);

        const dog = await apiClient.getDogBySlug(parsed.slug);

        if (parsed.response_format === "json") {
          return {
            content: [
              {
                type: "text" as const,
                text: JSON.stringify(dog, null, 2),
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
          text: formatDogMarkdown(dog),
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
