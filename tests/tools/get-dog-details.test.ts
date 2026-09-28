import { describe, it, expect, beforeEach, vi } from "vitest";
import { createMockServer } from "../helpers/mock-server.js";
import {
  mockDog,
  mockImageContent,
} from "../fixtures/dogs.js";

vi.mock("../../src/services/api-client.js", () => ({
  apiClient: {
    getDogBySlug: vi.fn(),
  },
}));

vi.mock("../../src/services/image-service.js", () => ({
  fetchDogImage: vi.fn(),
  fetchDogImages: vi.fn(),
}));

import { apiClient } from "../../src/services/api-client.js";
import { fetchDogImage, fetchDogImages } from "../../src/services/image-service.js";
import { registerGetDogDetailsTool } from "../../src/tools/get-dog-details.js";

describe("rescuedogs_get_dog_details handler", () => {
  let getHandler: ReturnType<typeof createMockServer>["getHandler"];

  beforeEach(() => {
    vi.clearAllMocks();
    const { server, getHandler: gh } = createMockServer();
    getHandler = gh;
    registerGetDogDetailsTool(server);
  });

  it("returns markdown with image when include_image is true", async () => {
    vi.mocked(apiClient.getDogBySlug).mockResolvedValue(mockDog);
    vi.mocked(fetchDogImage).mockResolvedValue(mockImageContent);

    const handler = getHandler("rescuedogs_get_dog_details");
    const result = await handler({ slug: "buddy-golden-retriever" });

    expect(result.isError).toBeUndefined();
    // Should have image first, then text
    expect(result.content).toHaveLength(2);
    expect(result.content[0]!.type).toBe("image");
    expect(result.content[1]!.type).toBe("text");
    expect(result.content[1]!.text).toContain("Buddy");
  });

  it("returns only text when include_image is false", async () => {
    vi.mocked(apiClient.getDogBySlug).mockResolvedValue(mockDog);

    const handler = getHandler("rescuedogs_get_dog_details");
    const result = await handler({
      slug: "buddy-golden-retriever",
      include_image: false,
    });

    expect(result.content).toHaveLength(1);
    expect(result.content[0]!.type).toBe("text");
    expect(fetchDogImage).not.toHaveBeenCalled();
  });

  it("returns the photo gallery, capped at five, when include_gallery is true", async () => {
    const images = Array.from({ length: 7 }, (_, i) => ({
      url: `https://images.rescuedogs.me/dogs/buddy-${i}.jpg`,
    }));
    vi.mocked(apiClient.getDogBySlug).mockResolvedValue({ ...mockDog, images });
    vi.mocked(fetchDogImages).mockResolvedValue([mockImageContent, null, mockImageContent, mockImageContent, mockImageContent]);

    const handler = getHandler("rescuedogs_get_dog_details");
    const result = await handler({
      slug: "buddy-golden-retriever",
      include_gallery: true,
      image_preset: "thumbnail",
    });

    expect(fetchDogImages).toHaveBeenCalledWith(
      images.slice(0, 5).map((i) => i.url),
      "thumbnail"
    );
    expect(fetchDogImage).not.toHaveBeenCalled();
    // Four photos that loaded, then the text
    expect(result.content.map((c) => c.type)).toEqual([
      "image", "image", "image", "image", "text",
    ]);
  });

  it("falls back to the main photo for include_gallery when the API sends no gallery", async () => {
    vi.mocked(apiClient.getDogBySlug).mockResolvedValue(mockDog);
    vi.mocked(fetchDogImages).mockResolvedValue([mockImageContent]);

    const handler = getHandler("rescuedogs_get_dog_details");
    await handler({ slug: "buddy-golden-retriever", include_gallery: true });

    expect(fetchDogImages).toHaveBeenCalledWith([mockDog.primary_image_url], "medium");
  });

  it("passes image_preset correctly to fetchDogImage", async () => {
    vi.mocked(apiClient.getDogBySlug).mockResolvedValue(mockDog);
    vi.mocked(fetchDogImage).mockResolvedValue(null);

    const handler = getHandler("rescuedogs_get_dog_details");
    await handler({
      slug: "buddy-golden-retriever",
      include_image: true,
      image_preset: "thumbnail",
    });

    expect(fetchDogImage).toHaveBeenCalledWith(
      mockDog.primary_image_url,
      "thumbnail"
    );
  });

  it("continues with null enhanced data on enhanced fetch failure", async () => {
    vi.mocked(apiClient.getDogBySlug).mockResolvedValue(mockDog);

    const handler = getHandler("rescuedogs_get_dog_details");
    const result = await handler({
      slug: "buddy-golden-retriever",
      include_image: false,
    });

    expect(result.isError).toBeUndefined();
    expect(result.content[0]!.text).toContain("Buddy");
  });

  it("returns JSON carrying the inline profiler data", async () => {
    vi.mocked(apiClient.getDogBySlug).mockResolvedValue(mockDog);

    const handler = getHandler("rescuedogs_get_dog_details");
    const result = await handler({
      slug: "buddy-golden-retriever",
      response_format: "json",
    });

    const parsed = JSON.parse(result.content[0]!.text!);
    expect(parsed.name).toBe("Buddy");
    expect(parsed.profile.tagline).toBe("Your new best friend!");
    // Projected, not raw: scraper and LLM bookkeeping must not ship.
    expect(parsed).not.toHaveProperty("last_scraped_at");
    expect(parsed).not.toHaveProperty("dog_profiler_data");
  });

  it("fetches the dog in a single request", async () => {
    vi.mocked(apiClient.getDogBySlug).mockResolvedValue(mockDog);

    const handler = getHandler("rescuedogs_get_dog_details");
    await handler({ slug: "buddy-golden-retriever" });

    expect(apiClient.getDogBySlug).toHaveBeenCalledOnce();
  });

  it("returns isError when slug is missing (Zod validation)", async () => {
    const handler = getHandler("rescuedogs_get_dog_details");
    const result = await handler({});

    expect(result.isError).toBe(true);
  });

  it("returns isError when dog not found", async () => {
    vi.mocked(apiClient.getDogBySlug).mockRejectedValue(
      new Error("Not found: Dog not found")
    );

    const handler = getHandler("rescuedogs_get_dog_details");
    const result = await handler({ slug: "nonexistent-dog" });

    expect(result.isError).toBe(true);
    expect(result.content[0]!.text).toContain("Not found");
  });
});
