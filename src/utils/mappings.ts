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
