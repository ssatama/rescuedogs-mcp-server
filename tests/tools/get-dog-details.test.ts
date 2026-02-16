import { describe, it, expect, beforeEach, vi } from "vitest";
import { createMockServer } from "../helpers/mock-server.js";
import {
  mockDog,
  mockEnhancedData,
  mockImageContent,
} from "../fixtures/dogs.js";

vi.mock("../../src/services/api-client.js", () => ({
  apiClient: {
    getDogBySlug: vi.fn(),
    getEnhancedDogData: vi.fn(),
  },
}));

vi.mock("../../src/services/image-service.js", () => ({
  fetchDogImage: vi.fn(),
}));

import { apiClient } from "../../src/services/api-client.js";
import { fetchDogImage } from "../../src/services/image-service.js";
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
    vi.mocked(apiClient.getEnhancedDogData).mockResolvedValue(mockEnhancedData);
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
    vi.mocked(apiClient.getEnhancedDogData).mockResolvedValue(mockEnhancedData);

    const handler = getHandler("rescuedogs_get_dog_details");
    const result = await handler({
      slug: "buddy-golden-retriever",
      include_image: false,
    });

    expect(result.content).toHaveLength(1);
    expect(result.content[0]!.type).toBe("text");
    expect(fetchDogImage).not.toHaveBeenCalled();
  });

  it("passes image_preset correctly to fetchDogImage", async () => {
    vi.mocked(apiClient.getDogBySlug).mockResolvedValue(mockDog);
    vi.mocked(apiClient.getEnhancedDogData).mockResolvedValue(mockEnhancedData);
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
    vi.mocked(apiClient.getEnhancedDogData).mockRejectedValue(
      new Error("Enhanced API down")
    );

    const handler = getHandler("rescuedogs_get_dog_details");
    const result = await handler({
      slug: "buddy-golden-retriever",
      include_image: false,
    });

    expect(result.isError).toBeUndefined();
    expect(result.content[0]!.text).toContain("Buddy");
  });

  it("returns JSON format with enhanced field", async () => {
    vi.mocked(apiClient.getDogBySlug).mockResolvedValue(mockDog);
    vi.mocked(apiClient.getEnhancedDogData).mockResolvedValue(mockEnhancedData);

    const handler = getHandler("rescuedogs_get_dog_details");
    const result = await handler({
      slug: "buddy-golden-retriever",
      response_format: "json",
    });

    const parsed = JSON.parse(result.content[0]!.text!);
    expect(parsed.name).toBe("Buddy");
    expect(parsed.enhanced).toBeTruthy();
    expect(parsed.enhanced.tagline).toBe("Your new best friend!");
  });

  it("returns JSON with enhanced: null on enhanced failure", async () => {
    vi.mocked(apiClient.getDogBySlug).mockResolvedValue(mockDog);
    vi.mocked(apiClient.getEnhancedDogData).mockRejectedValue(
      new Error("fail")
    );

    const handler = getHandler("rescuedogs_get_dog_details");
    const result = await handler({
      slug: "buddy-golden-retriever",
      response_format: "json",
    });

    const parsed = JSON.parse(result.content[0]!.text!);
    expect(parsed.enhanced).toBeNull();
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
