import axios from "axios";
import { IMAGE_BASE_URL, IMAGE_VARIANT_WIDTHS } from "../constants.js";
import { cacheService } from "./cache-service.js";
import type { ImagePreset } from "../types.js";

const IMAGE_TIMEOUT = 5000; // 5 seconds

type ImageMimeType = "image/jpeg" | "image/png" | "image/webp" | "image/gif";

export interface ImageContent {
  type: "image";
  data: string;
  mimeType: ImageMimeType;
}

const KNOWN_MIME_TYPES: readonly ImageMimeType[] = ["image/jpeg", "image/png", "image/webp", "image/gif"];

function mimeTypeOf(contentType: unknown): ImageMimeType {
  const type = (String(contentType ?? "").split(";")[0] ?? "").trim().toLowerCase();
  return (KNOWN_MIME_TYPES as readonly string[]).includes(type) ? (type as ImageMimeType) : "image/jpeg";
}

/**
 * The pre-generated WebP variant of an images.rescuedogs.me photo:
 * https://images.rescuedogs.me/a/rex_1.jpg -> https://images.rescuedogs.me/a/rex_1_w320.webp
 * Other hosts are returned unchanged.
 * @internal Exported for unit testing only.
 */
export function buildVariantUrl(
  originalUrl: string,
  preset: ImagePreset
): string | null {
  if (!originalUrl) return null;

  try {
    const url = new URL(originalUrl);
    if (!url.hostname.includes("rescuedogs.me")) {
      return originalUrl;
    }

    // An old transformation URL: keep only the original path
    const path = url.pathname.replace(/^\/cdn-cgi\/image\/[^/]+/, "");
    const slash = path.lastIndexOf("/");
    const dot = path.lastIndexOf(".");
    const base = dot > slash ? path.slice(0, dot) : path;
    return `${IMAGE_BASE_URL}${base}_w${IMAGE_VARIANT_WIDTHS[preset]}.webp`;
  } catch {
    return originalUrl;
  }
}

async function download(url: string): Promise<{ data: string; mimeType: ImageMimeType }> {
  const response = await axios.get(url, {
    responseType: "arraybuffer",
    timeout: IMAGE_TIMEOUT,
    headers: { Accept: "image/webp,image/jpeg,image/png,image/*" },
  });
  return {
    data: Buffer.from(response.data).toString("base64"),
    mimeType: mimeTypeOf(response.headers?.["content-type"]),
  };
}

export async function fetchDogImage(
  imageUrl: string | null | undefined,
  preset: ImagePreset = "thumbnail"
): Promise<ImageContent | null> {
  if (!imageUrl) return null;

  const cacheKey = `${imageUrl}:${preset}:variant`;

  // Check cache first
  const cached = cacheService.getImage(cacheKey);
  if (cached) {
    return { type: "image", ...(JSON.parse(cached) as { data: string; mimeType: ImageMimeType }) };
  }

  const variantUrl = buildVariantUrl(imageUrl, preset);
  if (!variantUrl) return null;

  // The variant, else the original (a photo whose variants are missing)
  for (const url of variantUrl === imageUrl ? [imageUrl] : [variantUrl, imageUrl]) {
    try {
      const image = await download(url);
      cacheService.setImage(cacheKey, JSON.stringify(image));
      return { type: "image", ...image };
    } catch {
      // Try the next URL
    }
  }
  // Graceful degradation - return null if image fetch fails
  return null;
}

export async function fetchDogImages(
  imageUrls: (string | null | undefined)[],
  preset: ImagePreset = "thumbnail"
): Promise<(ImageContent | null)[]> {
  // Use Promise.all for parallel fetching
  return Promise.all(imageUrls.map((url) => fetchDogImage(url, preset)));
}
