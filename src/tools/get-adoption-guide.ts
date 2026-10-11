import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { GetAdoptionGuideInputSchema } from "../schemas/index.js";
import { GetAdoptionGuideOutputShape } from "../schemas/output.js";
import {
  ADOPTION_GUIDES,
  COUNTRY_SPECIFIC_GUIDES,
} from "../data/adoption-guides.js";

export function registerGetAdoptionGuideTool(server: McpServer): void {
  server.registerTool(
    "rescuedogs_get_adoption_guide",
    {
      title: "Get adoption guide",
      description:
        "Get general guidance on adopting a rescue dog from abroad, by topic: overview, transport, fees, requirements or timeline. With country, adds entry rules for GB (UK also accepted), IE, DE or FR; for any other country the general guide is returned alone, and the response's country field is set only when country rules were added. The content is static and bundled with this server, so for a specific dog's fee and process the rescue's adoption page is the authority.",
      inputSchema: GetAdoptionGuideInputSchema.shape,
      outputSchema: GetAdoptionGuideOutputShape,
      annotations: {
        title: "Get adoption guide",
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        // Static guide content bundled with the server, no external calls.
        openWorldHint: false,
      },
    },
    async (input) => {
      try {
        const parsed = GetAdoptionGuideInputSchema.parse(input);

        const topic = parsed.topic || "overview";
        const guide = ADOPTION_GUIDES[topic] || ADOPTION_GUIDES.overview;

        // Add country-specific info if provided
        let countryInfo = "";
        let appliedCountry: string | undefined;
        if (parsed.country) {
          // Allow both GB (ISO standard) and UK (common user input)
          const normalizedCode =
            parsed.country.toUpperCase() === "UK"
              ? "GB"
              : parsed.country.toUpperCase();
          countryInfo = COUNTRY_SPECIFIC_GUIDES[normalizedCode] || "";
          // Only report a country when guidance for it was actually found, and
          // report the normalized code that was looked up rather than the raw
          // input, so a consumer can tell whether it applied.
          if (countryInfo) appliedCountry = normalizedCode;
        }

        const text = guide + countryInfo;

        return {
          structuredContent: {
            topic,
            ...(appliedCountry && { country: appliedCountry }),
            guide: text,
          },
          content: [{ type: "text" as const, text }],
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
