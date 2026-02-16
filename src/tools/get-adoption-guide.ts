import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { GetAdoptionGuideInputSchema } from "../schemas/index.js";
import {
  ADOPTION_GUIDES,
  COUNTRY_SPECIFIC_GUIDES,
} from "../data/adoption-guides.js";

export function registerGetAdoptionGuideTool(server: McpServer): void {
  server.tool(
    "rescuedogs_get_adoption_guide",
    "Get information about the rescue dog adoption process including transport, fees, requirements, and timeline.",
    GetAdoptionGuideInputSchema.shape,
    async (input) => {
      try {
        const parsed = GetAdoptionGuideInputSchema.parse(input);

        const topic = parsed.topic || "overview";
        const guide = ADOPTION_GUIDES[topic] || ADOPTION_GUIDES.overview;

        // Add country-specific info if provided
        let countryInfo = "";
        if (parsed.country) {
          // Allow both GB (ISO standard) and UK (common user input)
          const normalizedCode =
            parsed.country.toUpperCase() === "UK"
              ? "GB"
              : parsed.country.toUpperCase();
          countryInfo = COUNTRY_SPECIFIC_GUIDES[normalizedCode] || "";
        }

        return {
          content: [
            {
              type: "text" as const,
              text: guide + countryInfo,
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
