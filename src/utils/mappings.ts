// Age category mapping: MCP uses lowercase, backend expects capitalized
export const AGE_CATEGORY_MAP: Record<string, string> = {
  puppy: "Puppy",
  young: "Young",
  adult: "Adult",
  senior: "Senior",
};

// Sex mapping: MCP schema uses lowercase, backend expects capitalized
export const SEX_MAP: Record<string, string> = {
  male: "Male",
  female: "Female",
};

// The API has one size scale, Small to XLarge (shown as Giant): it folded Tiny
// into Small, and a Tiny filter alone matches only the few dogs still stored so.
export function normalizeSizeForApi(
  size: string | undefined
): string | undefined {
  return size === "Tiny" ? "Small" : size;
}

// The site's size labels: Tiny is shown as Small and XLarge as Giant
export function sizeLabel(size: string): string {
  if (size === "Tiny") return "Small";
  if (size === "XLarge") return "Giant";
  return size;
}

// Sort mapping: MCP uses plain names, backend expects its sort keys
export const SORT_MAP: Record<string, string> = {
  recommended: "recommended",
  newest: "newest",
  waiting_longest: "oldest",
  youngest: "age-asc",
  oldest: "age-desc",
};

// Preference mappings: MCP uses user-friendly values, backend expects internal values
export const HOME_TYPE_MAP: Record<string, string> = {
  apartment: "apartment_ok",
  house_small_garden: "house_preferred",
  house_large_garden: "house_preferred",
  rural: "house_required",
};

export const ENERGY_LEVEL_MAP: Record<string, string> = {
  sedentary: "low",
  moderate: "medium",
  active: "high",
  very_active: "very_high",
};

export const EXPERIENCE_MAP: Record<string, string> = {
  first_time: "first_time_ok",
  some: "some_experience",
  experienced: "experienced_only",
};

// Country code normalization: backend stores "UK", ISO standard is "GB"
export function normalizeCountryForApi(
  code: string | undefined
): string | undefined {
  if (!code) return undefined;
  const upper = code.toUpperCase();
  return upper === "GB" ? "UK" : upper;
}
