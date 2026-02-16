import { describe, it, expect, beforeEach, vi } from "vitest";
import { createMockServer } from "../helpers/mock-server.js";
import { mockDog, mockEnhancedData, mockImageContent } from "../fixtures/dogs.js";

vi.mock("../../src/services/api-client.js", () => ({
  apiClient: {
    searchDogs: vi.fn(),
    getBulkEnhancedData: vi.fn(),
  },
}));

vi.mock("../../src/services/image-service.js", () => ({
  fetchDogImages: vi.fn(),
}));

import { apiClient } from "../../src/services/api-client.js";
import { fetchDogImages } from "../../src/services/image-service.js";
import { registerMatchPreferencesTool } from "../../src/tools/match-preferences.js";

const baseInput = {
  living_situation: "apartment",
  activity_level: "moderate",
  experience: "first_time",
};

describe("rescuedogs_match_preferences handler", () => {
  let getHandler: ReturnType<typeof createMockServer>["getHandler"];

  beforeEach(() => {
    vi.clearAllMocks();
    const { server, getHandler: gh } = createMockServer();
    getHandler = gh;
    registerMatchPreferencesTool(server);
  });

  it('maps living_situation "apartment" to home_type "apartment_ok"', async () => {
    vi.mocked(apiClient.searchDogs).mockResolvedValue([mockDog]);
    vi.mocked(apiClient.getBulkEnhancedData).mockResolvedValue([
      mockEnhancedData,
    ]);

    const handler = getHandler("rescuedogs_match_preferences");
    await handler({ ...baseInput, living_situation: "apartment" });

    expect(apiClient.searchDogs).toHaveBeenCalledWith(
      expect.objectContaining({ home_type: "apartment_ok" })
    );
  });

  it('maps living_situation "rural" to home_type "house_required"', async () => {
    vi.mocked(apiClient.searchDogs).mockResolvedValue([mockDog]);
    vi.mocked(apiClient.getBulkEnhancedData).mockResolvedValue([
      mockEnhancedData,
    ]);

    const handler = getHandler("rescuedogs_match_preferences");
    await handler({ ...baseInput, living_situation: "rural" });

    expect(apiClient.searchDogs).toHaveBeenCalledWith(
      expect.objectContaining({ home_type: "house_required" })
    );
  });

  it('maps activity_level "very_active" to energy_level "very_high"', async () => {
    vi.mocked(apiClient.searchDogs).mockResolvedValue([mockDog]);
    vi.mocked(apiClient.getBulkEnhancedData).mockResolvedValue([
      mockEnhancedData,
    ]);

    const handler = getHandler("rescuedogs_match_preferences");
    await handler({ ...baseInput, activity_level: "very_active" });

    expect(apiClient.searchDogs).toHaveBeenCalledWith(
      expect.objectContaining({ energy_level: "very_high" })
    );
  });

  it('maps experience "first_time" to experience_level "first_time_ok"', async () => {
    vi.mocked(apiClient.searchDogs).mockResolvedValue([mockDog]);
    vi.mocked(apiClient.getBulkEnhancedData).mockResolvedValue([
      mockEnhancedData,
    ]);

    const handler = getHandler("rescuedogs_match_preferences");
    await handler({ ...baseInput, experience: "first_time" });

    expect(apiClient.searchDogs).toHaveBeenCalledWith(
      expect.objectContaining({ experience_level: "first_time_ok" })
    );
  });

  it("passes compatibility params (has_children → good_with_kids)", async () => {
    vi.mocked(apiClient.searchDogs).mockResolvedValue([mockDog]);
    vi.mocked(apiClient.getBulkEnhancedData).mockResolvedValue([
      mockEnhancedData,
    ]);

    const handler = getHandler("rescuedogs_match_preferences");
    await handler({ ...baseInput, has_children: true });

    expect(apiClient.searchDogs).toHaveBeenCalledWith(
      expect.objectContaining({ good_with_kids: true })
    );
  });

  it("returns JSON with matched_criteria including only defined flags", async () => {
    vi.mocked(apiClient.searchDogs).mockResolvedValue([mockDog]);
    vi.mocked(apiClient.getBulkEnhancedData).mockResolvedValue([
      mockEnhancedData,
    ]);

    const handler = getHandler("rescuedogs_match_preferences");
    const result = await handler({
      ...baseInput,
      has_children: true,
      response_format: "json",
    });

    const parsed = JSON.parse(result.content[0]!.text!);
    expect(parsed.matched_criteria.good_with_kids).toBe(true);
    expect(parsed.matched_criteria).not.toHaveProperty("good_with_dogs");
    expect(parsed.matched_criteria).not.toHaveProperty("good_with_cats");
  });

  it('returns markdown with "Your Profile" section', async () => {
    vi.mocked(apiClient.searchDogs).mockResolvedValue([mockDog]);
    vi.mocked(apiClient.getBulkEnhancedData).mockResolvedValue([
      mockEnhancedData,
    ]);

    const handler = getHandler("rescuedogs_match_preferences");
    const result = await handler(baseInput);

    const text = result.content[0]!.text!;
    expect(text).toContain("Dogs Matching Your Preferences");
    expect(text).toContain("Your Profile");
    expect(text).toContain("apartment");
  });

  it('normalizes adoptable_to_country "GB" to "UK"', async () => {
    vi.mocked(apiClient.searchDogs).mockResolvedValue([]);
    vi.mocked(apiClient.getBulkEnhancedData).mockResolvedValue([]);

    const handler = getHandler("rescuedogs_match_preferences");
    await handler({ ...baseInput, adoptable_to_country: "GB" });

    expect(apiClient.searchDogs).toHaveBeenCalledWith(
      expect.objectContaining({ available_to_country: "UK" })
    );
  });

  it("includes images when include_images is true", async () => {
    vi.mocked(apiClient.searchDogs).mockResolvedValue([mockDog]);
    vi.mocked(apiClient.getBulkEnhancedData).mockResolvedValue([
      mockEnhancedData,
    ]);
    vi.mocked(fetchDogImages).mockResolvedValue([mockImageContent]);

    const handler = getHandler("rescuedogs_match_preferences");
    const result = await handler({ ...baseInput, include_images: true });

    expect(fetchDogImages).toHaveBeenCalledWith(
      [mockDog.primary_image_url],
      "thumbnail"
    );
    expect(result.content.some((c) => c.type === "image")).toBe(true);
  });

  it("returns isError when required fields are missing (Zod validation)", async () => {
    const handler = getHandler("rescuedogs_match_preferences");
    const result = await handler({});

    expect(result.isError).toBe(true);
  });
});
