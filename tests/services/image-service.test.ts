import { describe, it, expect, vi, beforeEach } from "vitest";
import { buildTransformUrl } from "../../src/services/image-service.js";

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

describe("buildTransformUrl", () => {
  it("transforms CDN URL with thumbnail preset", () => {
    const result = buildTransformUrl(
      "https://images.rescuedogs.me/dogs/buddy.jpg",
      "thumbnail"
    );
    expect(result).toBe(
      "https://images.rescuedogs.me/cdn-cgi/image/w=200,h=200,fit=cover,q=70,f=jpeg/dogs/buddy.jpg"
    );
  });

  it("transforms CDN URL with medium preset", () => {
    const result = buildTransformUrl(
      "https://images.rescuedogs.me/dogs/buddy.jpg",
      "medium"
    );
    expect(result).toBe(
      "https://images.rescuedogs.me/cdn-cgi/image/w=400,h=400,fit=cover,q=75,f=jpeg/dogs/buddy.jpg"
    );
  });

  it("returns original URL for non-CDN images", () => {
    const externalUrl = "https://external-site.com/images/dog.jpg";
    const result = buildTransformUrl(externalUrl, "thumbnail");
    expect(result).toBe(externalUrl);
  });

  it("returns null for empty string", () => {
    const result = buildTransformUrl("", "thumbnail");
    expect(result).toBeNull();
  });

  it("returns original URL for invalid URL format", () => {
    const result = buildTransformUrl("not-a-url", "thumbnail");
    // Invalid URL falls through to catch block, returns original
    expect(result).toBe("not-a-url");
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
    mockedCache.getImage.mockReturnValue("cached-base64");

    const result = await fetchDogImage("https://images.rescuedogs.me/dogs/buddy.jpg");

    expect(result).toEqual({
      type: "image",
      data: "cached-base64",
      mimeType: "image/jpeg",
    });
    expect(mockedAxios.get).not.toHaveBeenCalled();
  });

  it("fetches image and returns base64 content", async () => {
    mockedCache.getImage.mockReturnValue(undefined);
    const fakeBuffer = Buffer.from("fake-image-data");
    mockedAxios.get.mockResolvedValue({ data: fakeBuffer });

    const result = await fetchDogImage("https://images.rescuedogs.me/dogs/buddy.jpg");

    expect(result).toEqual({
      type: "image",
      data: fakeBuffer.toString("base64"),
      mimeType: "image/jpeg",
    });
    expect(mockedAxios.get).toHaveBeenCalledOnce();
    expect(mockedCache.setImage).toHaveBeenCalledOnce();
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
