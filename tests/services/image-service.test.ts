import { describe, it, expect, vi, beforeEach } from "vitest";
import { buildVariantUrl } from "../../src/services/image-service.js";

// Mock axios and cache-service before importing the functions that use them
vi.mock("axios", () => ({
  default: {
    get: vi.fn(),
  },
}));

vi.mock("../../src/services/cache-service.js", () => ({
  cacheService: {
    getImage: vi.fn(),
    setImage: vi.fn(),
  },
}));

// Import after mocks are set up
import axios from "axios";
import { cacheService } from "../../src/services/cache-service.js";
import { fetchDogImage, fetchDogImages } from "../../src/services/image-service.js";

const mockedAxios = vi.mocked(axios);
const mockedCache = vi.mocked(cacheService);

// Pre-generated WebP variants: Cloudflare bills every /cdn-cgi/image/ transformation
describe("buildVariantUrl", () => {
  it("points a thumbnail at the 320px variant", () => {
    expect(buildVariantUrl("https://images.rescuedogs.me/dogs/buddy.jpg", "thumbnail")).toBe(
      "https://images.rescuedogs.me/dogs/buddy_w320.webp"
    );
  });

  it("points a medium image at the 640px variant", () => {
    expect(buildVariantUrl("https://images.rescuedogs.me/dogs/buddy.jpg", "medium")).toBe(
      "https://images.rescuedogs.me/dogs/buddy_w640.webp"
    );
  });

  it("only replaces the file extension, not dots in folder names", () => {
    expect(
      buildVariantUrl("https://images.rescuedogs.me/rescue_dogs/tierschutzverein_europa_e.v./rex_1.jpg", "thumbnail")
    ).toBe("https://images.rescuedogs.me/rescue_dogs/tierschutzverein_europa_e.v./rex_1_w320.webp");
  });

  it("unwraps an old transformation URL", () => {
    expect(
      buildVariantUrl("https://images.rescuedogs.me/cdn-cgi/image/w=200,f=jpeg/dogs/buddy.jpg", "thumbnail")
    ).toBe("https://images.rescuedogs.me/dogs/buddy_w320.webp");
  });

  it("returns original URL for non-CDN images", () => {
    const externalUrl = "https://external-site.com/images/dog.jpg";
    expect(buildVariantUrl(externalUrl, "thumbnail")).toBe(externalUrl);
  });

  it("returns null for empty string", () => {
    expect(buildVariantUrl("", "thumbnail")).toBeNull();
  });

  it("returns original URL for invalid URL format", () => {
    expect(buildVariantUrl("not-a-url", "thumbnail")).toBe("not-a-url");
  });
});

describe("fetchDogImage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns null for null imageUrl", async () => {
    const result = await fetchDogImage(null);
    expect(result).toBeNull();
    expect(mockedAxios.get).not.toHaveBeenCalled();
  });

  it("returns null for undefined imageUrl", async () => {
    const result = await fetchDogImage(undefined);
    expect(result).toBeNull();
  });

  it("returns cached data without making axios call", async () => {
    mockedCache.getImage.mockReturnValue(JSON.stringify({ data: "cached-base64", mimeType: "image/webp" }));

    const result = await fetchDogImage("https://images.rescuedogs.me/dogs/buddy.jpg");

    expect(result).toEqual({
      type: "image",
      data: "cached-base64",
      mimeType: "image/webp",
    });
    expect(mockedAxios.get).not.toHaveBeenCalled();
  });

  it("fetches image and returns base64 content", async () => {
    mockedCache.getImage.mockReturnValue(undefined);
    const fakeBuffer = Buffer.from("fake-image-data");
    mockedAxios.get.mockResolvedValue({ data: fakeBuffer, headers: { "content-type": "image/webp" } });

    const result = await fetchDogImage("https://images.rescuedogs.me/dogs/buddy.jpg");

    expect(result).toEqual({
      type: "image",
      data: fakeBuffer.toString("base64"),
      mimeType: "image/webp",
    });
    expect(mockedAxios.get).toHaveBeenCalledOnce();
    expect(mockedAxios.get.mock.calls[0]?.[0]).toBe("https://images.rescuedogs.me/dogs/buddy_w320.webp");
    expect(mockedCache.setImage).toHaveBeenCalledOnce();
  });

  it("falls back to the original when the variant is missing", async () => {
    mockedCache.getImage.mockReturnValue(undefined);
    const fakeBuffer = Buffer.from("original");
    mockedAxios.get
      .mockRejectedValueOnce(new Error("404"))
      .mockResolvedValueOnce({ data: fakeBuffer, headers: { "content-type": "image/jpeg" } });

    const result = await fetchDogImage("https://images.rescuedogs.me/dogs/buddy.jpg");

    expect(result).toEqual({ type: "image", data: fakeBuffer.toString("base64"), mimeType: "image/jpeg" });
    expect(mockedAxios.get.mock.calls[1]?.[0]).toBe("https://images.rescuedogs.me/dogs/buddy.jpg");
  });

  it("returns null when axios throws", async () => {
    mockedCache.getImage.mockReturnValue(undefined);
    mockedAxios.get.mockRejectedValue(new Error("Network error"));

    const result = await fetchDogImage("https://images.rescuedogs.me/dogs/buddy.jpg");
    expect(result).toBeNull();
  });
});

describe("fetchDogImages", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetches multiple images in parallel", async () => {
    mockedCache.getImage.mockReturnValue(undefined);
    const fakeBuffer = Buffer.from("image-data");
    mockedAxios.get.mockResolvedValue({ data: fakeBuffer });

    const results = await fetchDogImages([
      "https://images.rescuedogs.me/dogs/a.jpg",
      "https://images.rescuedogs.me/dogs/b.jpg",
    ]);

    expect(results).toHaveLength(2);
    expect(results[0]).not.toBeNull();
    expect(results[1]).not.toBeNull();
  });

  it("handles mixed results (some null, some success)", async () => {
    mockedCache.getImage.mockReturnValue(undefined);
    const fakeBuffer = Buffer.from("image-data");
    mockedAxios.get.mockResolvedValue({ data: fakeBuffer });

    const results = await fetchDogImages([
      "https://images.rescuedogs.me/dogs/a.jpg",
      null,
      undefined,
    ]);

    expect(results).toHaveLength(3);
    expect(results[0]).not.toBeNull();
    expect(results[1]).toBeNull();
    expect(results[2]).toBeNull();
  });

  it("returns empty array for empty input", async () => {
    const results = await fetchDogImages([]);
    expect(results).toEqual([]);
  });
});
