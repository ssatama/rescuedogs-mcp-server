import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerSearchDogsTool } from "./search-dogs.js";
import { registerGetDogDetailsTool } from "./get-dog-details.js";
import { registerListBreedsTool } from "./list-breeds.js";
import { registerGetStatisticsTool } from "./get-statistics.js";
import { registerGetFilterCountsTool } from "./get-filter-counts.js";
import { registerListOrganizationsTool } from "./list-organizations.js";
import { registerMatchPreferencesTool } from "./match-preferences.js";
import { registerGetAdoptionGuideTool } from "./get-adoption-guide.js";

export function registerAllTools(server: McpServer): void {
  registerSearchDogsTool(server);
  registerGetDogDetailsTool(server);
  registerListBreedsTool(server);
  registerGetStatisticsTool(server);
  registerGetFilterCountsTool(server);
  registerListOrganizationsTool(server);
  registerMatchPreferencesTool(server);
  registerGetAdoptionGuideTool(server);
}
