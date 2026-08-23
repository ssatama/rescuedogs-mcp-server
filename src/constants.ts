export const API_BASE_URL =
  process.env.RESCUEDOGS_API_URL || "https://api.rescuedogs.me";

export const CHARACTER_LIMIT = 25000;

export const CACHE_TTL = {
  BREEDS: 10 * 60 * 1000, // 10 minutes
  STATISTICS: 10 * 60 * 1000, // 10 minutes
  ORGANIZATIONS: 10 * 60 * 1000, // 10 minutes
  FILTER_COUNTS: 5 * 60 * 1000, // 5 minutes
  IMAGES: 30 * 60 * 1000, // 30 minutes
} as const;

export const IMAGE_TRANSFORMS = {
  thumbnail: "w=200,h=200,fit=cover,q=70,f=jpeg",
  medium: "w=400,h=400,fit=cover,q=75,f=jpeg",
} as const;

export const IMAGE_BASE_URL =
  process.env.RESCUEDOGS_IMAGE_URL || "https://images.rescuedogs.me";

export const DISPLAY_LIMITS = {
  MAX_IMAGES: 5,
  MAX_BREED_TRAITS: 3,
  MAX_STATS_COUNTRIES: 8,
  MAX_STATS_ORGANIZATIONS: 5,
  MAX_FILTER_COUNTRIES: 15,
  MAX_FILTER_BREEDS: 10,
} as const;

// Guards a public, unauthenticated endpoint that fronts the rescuedogs API.
export const RATE_LIMITS = {
  BURST: 20,
  BURST_WINDOW_MS: 60 * 1000,
  SUSTAINED: 300,
  SUSTAINED_WINDOW_MS: 60 * 60 * 1000,
} as const;
