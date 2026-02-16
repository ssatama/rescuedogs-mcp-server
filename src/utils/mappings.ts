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

// Country code normalization: backend stores "UK", ISO standard is "GB"
export function normalizeCountryForApi(
  code: string | undefined
): string | undefined {
  if (!code) return undefined;
  const upper = code.toUpperCase();
  return upper === "GB" ? "UK" : upper;
}
