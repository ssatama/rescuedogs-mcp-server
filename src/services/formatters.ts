import { CHARACTER_LIMIT, DISPLAY_LIMITS } from "../constants.js";
import type {
  Compatibility,
  Dog,
  DogProfilerData,
  Organization,
  BreedStats,
  QualifyingBreed,
  Statistics,
  FilterCountsResponse,
} from "../types.js";

// Formats the AI profiler block that the API returns inline on every animal.
function formatProfileSections(data: DogProfilerData, parts: string[]): void {
  if (data.description) {
    parts.push("## About");
    parts.push("");
    parts.push(data.description);
    parts.push("");
  }

  if (data.personality_traits && data.personality_traits.length > 0) {
    parts.push("## Personality");
    parts.push("");
    parts.push(data.personality_traits.map((t) => `- ${t}`).join("\n"));
    parts.push("");
  }

  if (data.favorite_activities && data.favorite_activities.length > 0) {
    parts.push("## Favourite Activities");
    parts.push("");
    parts.push(data.favorite_activities.map((i) => `- ${i}`).join("\n"));
    parts.push("");
  }

  const requirements: string[] = [];
  if (data.energy_level) {
    requirements.push(`- **Energy Level:** ${formatEnumValue(data.energy_level)}`);
  }
  if (data.exercise_needs) {
    requirements.push(`- **Exercise Needs:** ${formatEnumValue(data.exercise_needs)}`);
  }
  if (data.home_type) {
    requirements.push(`- **Home Type:** ${formatEnumValue(data.home_type)}`);
  }
  if (data.experience_level) {
    requirements.push(
      `- **Experience Needed:** ${formatEnumValue(data.experience_level)}`
    );
  }
  if (data.trainability) {
    requirements.push(`- **Trainability:** ${formatEnumValue(data.trainability)}`);
  }
  if (data.grooming_needs) {
    requirements.push(`- **Grooming:** ${formatEnumValue(data.grooming_needs)}`);
  }
  if (requirements.length > 0) {
    parts.push("## Requirements");
    parts.push("");
    parts.push(...requirements);
    parts.push("");
  }

  const compatibility = formatCompatibility(data);
  if (compatibility.length > 0) {
    parts.push("## Gets On With");
    parts.push("");
    parts.push(...compatibility);
    parts.push("");
  }

  // special_needs and medical_needs are semicolon-separated prose, not arrays
  const notes = [data.special_needs, data.medical_needs].filter(
    (n): n is string => Boolean(n)
  );
  if (notes.length > 0) {
    parts.push("## Important Notes");
    parts.push("");
    parts.push(
      notes
        .flatMap((n) => n.split(";"))
        .map((n) => n.trim())
        .filter(Boolean)
        .map((n) => `- ${n}`)
        .join("\n")
    );
    parts.push("");
  }

  if (data.unique_quirk) {
    parts.push("## Fun Fact");
    parts.push("");
    parts.push(data.unique_quirk);
    parts.push("");
  }
}

// The API reports compatibility as "yes" | "no" | "unknown". "unknown" is
// omitted rather than rendered, so the model never reads absence of data as a no.
function formatCompatibility(data: DogProfilerData): string[] {
  const label = (v: Compatibility | null | undefined): string | null =>
    v === "yes" ? "Yes" : v === "no" ? "No" : null;

  return (
    [
      ["Children", label(data.good_with_children)],
      ["Dogs", label(data.good_with_dogs)],
      ["Cats", label(data.good_with_cats)],
    ] as const
  )
    .filter(([, v]) => v !== null)
    .map(([name, v]) => `- **${name}:** ${v}`);
}

export function truncateIfNeeded(text: string): string {
  if (text.length <= CHARACTER_LIMIT) {
    return text;
  }
  const truncated = text.slice(0, CHARACTER_LIMIT - 100);
  return `${truncated}\n\n... (truncated due to length limit)`;
}

export function formatDogMarkdown(dog: Dog): string {
  const parts: string[] = [];
  const profile = dog.dog_profiler_data;

  // Header with name
  parts.push(`# ${dog.name}`);
  parts.push("");

  // Tagline if available
  if (profile?.tagline) {
    parts.push(`*${profile.tagline}*`);
    parts.push("");
  }

  // Basic info
  parts.push("## Basic Information");
  parts.push("");
  if (dog.breed || dog.standardized_breed) {
    parts.push(`- **Breed:** ${dog.standardized_breed || dog.breed}`);
  }
  if (dog.age_text) {
    parts.push(`- **Age:** ${dog.age_text}`);
  }
  if (dog.sex) {
    parts.push(`- **Sex:** ${dog.sex}`);
  }
  if (dog.standardized_size || dog.size) {
    parts.push(`- **Size:** ${dog.standardized_size || dog.size}`);
  }
  if (dog.breed_group) {
    parts.push(`- **Breed Group:** ${dog.breed_group}`);
  }
  parts.push("");

  if (profile) {
    formatProfileSections(profile, parts);
  }

  // Organization info
  if (dog.organization) {
    parts.push("## Rescue Organization");
    parts.push("");
    parts.push(`- **Name:** ${dog.organization.name}`);
    if (dog.organization.city && dog.organization.country) {
      parts.push(`- **Location:** ${dog.organization.city}, ${dog.organization.country}`);
    }
    if (dog.organization.website_url) {
      parts.push(`- **Website:** ${dog.organization.website_url}`);
    }
    parts.push("");
  }

  // Adoption link (CRITICAL: traffic driver)
  parts.push("## Adoption");
  parts.push("");
  parts.push(`**Apply to adopt ${dog.name}:** ${dog.adoption_url}`);
  parts.push("");
  parts.push(`*View full profile on rescuedogs.me: https://www.rescuedogs.me/dogs/${dog.slug}*`);

  return truncateIfNeeded(parts.join("\n"));
}

export function formatDogsListMarkdown(
  dogs: Dog[],
  pagination?: { offset: number; limit: number }
): string {
  if (dogs.length === 0) {
    return `# No Dogs Found

No dogs found matching your criteria.

**Suggestions:**
- Use \`rescuedogs_get_filter_counts\` to see available filter options
- Try removing some filters to broaden your search
- Check \`rescuedogs_list_organizations\` to find organizations with available dogs

*Note: We aggregate dogs from European and UK rescues only.*`;
  }

  const parts: string[] = [];
  parts.push(`# Search Results (${dogs.length} dogs)`);
  parts.push("");

  for (const dog of dogs) {
    parts.push(`## ${dog.name}`);
    if (dog.dog_profiler_data?.tagline) {
      parts.push(`*${dog.dog_profiler_data.tagline}*`);
    }
    parts.push("");

    const details: string[] = [];
    if (dog.standardized_breed || dog.breed) {
      details.push(`**Breed:** ${dog.standardized_breed || dog.breed}`);
    }
    if (dog.age_text) details.push(`**Age:** ${dog.age_text}`);
    if (dog.sex) details.push(`**Sex:** ${dog.sex}`);
    if (dog.standardized_size) details.push(`**Size:** ${dog.standardized_size}`);

    parts.push(details.join(" | "));
    parts.push("");

    if (dog.organization) {
      parts.push(`**From:** ${dog.organization.name} (${dog.organization.country})`);
    }

    parts.push(`**Details:** \`rescuedogs_get_dog_details(slug: "${dog.slug}")\``);
    parts.push(`**Adopt:** ${dog.adoption_url}`);
    parts.push("");
    parts.push("---");
    parts.push("");
  }

  // Add pagination indicator if provided
  if (pagination) {
    const start = pagination.offset + 1;
    const end = pagination.offset + dogs.length;
    const hasMore = dogs.length === pagination.limit;
    parts.push(
      `*Showing ${start}-${end}.${hasMore ? " More results available - increase offset to see more." : ""}*`
    );
    parts.push("");
  }

  parts.push("*Use rescuedogs_get_dog_details to see the full profile for any dog.*");

  return truncateIfNeeded(parts.join("\n"));
}

export function formatBreedStatsMarkdown(
  stats: BreedStats,
  limit?: number
): string {
  const parts: string[] = [];

  parts.push("# Available Breeds");
  parts.push("");
  parts.push(`**Total Dogs:** ${stats.total_dogs.toLocaleString()}`);
  parts.push(`**Unique Breeds:** ${stats.unique_breeds.toLocaleString()}`);
  parts.push(`**Purebred:** ${stats.purebred_count.toLocaleString()}`);
  parts.push(`**Crossbreed/Mixed:** ${stats.crossbreed_count.toLocaleString()}`);
  parts.push("");

  if (stats.breed_groups.length > 0) {
    parts.push("## Breed Groups");
    parts.push("");
    for (const group of stats.breed_groups) {
      parts.push(`- **${group.name}:** ${group.count} dogs`);
    }
    parts.push("");
  }

  const breeds = limit
    ? stats.qualifying_breeds.slice(0, limit)
    : stats.qualifying_breeds;

  if (breeds.length > 0) {
    parts.push("## Top Breeds");
    parts.push("");
    for (const breed of breeds) {
      parts.push(`### ${breed.primary_breed} (${breed.count} dogs)`);
      parts.push("");
      formatBreedDetails(breed, parts);
      parts.push("");
    }
  }

  return truncateIfNeeded(parts.join("\n"));
}

function formatBreedDetails(breed: QualifyingBreed, parts: string[]): void {
  if (breed.breed_group) {
    parts.push(`- **Group:** ${breed.breed_group}`);
  }
  if (breed.breed_type) {
    parts.push(`- **Type:** ${breed.breed_type}`);
  }
  if (breed.personality_traits.length > 0) {
    parts.push(`- **Traits:** ${breed.personality_traits.slice(0, DISPLAY_LIMITS.MAX_BREED_TRAITS).join(", ")}`);
  }
  if (breed.organization_count > 0) {
    parts.push(`- **Available from:** ${breed.organization_count} organizations`);
  }
}

export function formatOrganizationMarkdown(org: Organization): string {
  const parts: string[] = [];

  parts.push(`## ${org.name}`);
  parts.push("");
  if (org.description) {
    parts.push(org.description);
    parts.push("");
  }

  parts.push("### Details");
  parts.push("");
  parts.push(`- **Location:** ${org.city}, ${org.country}`);
  parts.push(`- **Dogs Available:** ${org.total_dogs}`);
  if (org.new_this_week > 0) {
    parts.push(`- **New This Week:** ${org.new_this_week}`);
  }
  if (org.ships_to.length > 0) {
    parts.push(`- **Ships To:** ${org.ships_to.join(", ")}`);
  }
  if (org.website_url) {
    parts.push(`- **Website:** ${org.website_url}`);
  }
  parts.push("");

  return parts.join("\n");
}

export function formatOrganizationsListMarkdown(orgs: Organization[]): string {
  if (orgs.length === 0) {
    return "No organizations found matching your criteria.";
  }

  const parts: string[] = [];
  parts.push(`# Rescue Organizations (${orgs.length})`);
  parts.push("");

  for (const org of orgs) {
    parts.push(formatOrganizationMarkdown(org));
    parts.push("---");
    parts.push("");
  }

  return truncateIfNeeded(parts.join("\n"));
}

export function formatStatisticsMarkdown(stats: Statistics): string {
  const parts: string[] = [];

  // Calculate derived stats
  const newThisWeek = stats.organizations.reduce((sum, org) => sum + org.new_this_week, 0);
  const totalCountries = stats.countries.length;

  parts.push("# Rescue Dogs Statistics");
  parts.push("");
  parts.push("## Overview");
  parts.push("");
  parts.push(`- **Available Dogs:** ${stats.total_dogs.toLocaleString()}`);
  parts.push(`- **Rescue Organizations:** ${stats.total_organizations}`);
  parts.push(`- **Countries Covered:** ${totalCountries}`);
  parts.push(`- **New This Week:** ${newThisWeek}`);
  parts.push("");

  if (stats.countries.length > 0) {
    parts.push("## Dogs by Country");
    parts.push("");
    for (const country of stats.countries.slice(0, DISPLAY_LIMITS.MAX_STATS_COUNTRIES)) {
      parts.push(`- **${country.country}:** ${country.count} dogs`);
    }
    parts.push("");
  }

  if (stats.organizations.length > 0) {
    parts.push("## Top Organizations");
    parts.push("");
    for (const org of stats.organizations.slice(0, DISPLAY_LIMITS.MAX_STATS_ORGANIZATIONS)) {
      parts.push(`- **${org.name}** (${org.country}): ${org.dog_count} dogs`);
    }
    parts.push("");
  }

  parts.push("*Data from rescuedogs.me - European & UK rescue dog aggregator*");

  return parts.join("\n");
}

export function formatFilterCountsMarkdown(counts: FilterCountsResponse): string {
  const parts: string[] = [];

  parts.push("# Available Filter Options");
  parts.push("");

  if (counts.size_options.length > 0) {
    parts.push("## Size");
    for (const opt of counts.size_options) {
      parts.push(`- ${opt.label}: ${opt.count} dogs`);
    }
    parts.push("");
  }

  if (counts.age_options.length > 0) {
    parts.push("## Age");
    for (const opt of counts.age_options) {
      parts.push(`- ${opt.label}: ${opt.count} dogs`);
    }
    parts.push("");
  }

  if (counts.sex_options.length > 0) {
    parts.push("## Sex");
    for (const opt of counts.sex_options) {
      parts.push(`- ${opt.label}: ${opt.count} dogs`);
    }
    parts.push("");
  }

  if (counts.available_country_options.length > 0) {
    parts.push("## Available To (Countries)");
    // Sort countries by count (descending) to show most relevant first
    // This ensures UK appears prominently if many dogs ship there
    const sortedCountries = [...counts.available_country_options].sort(
      (a, b) => b.count - a.count
    );
    for (const opt of sortedCountries.slice(0, DISPLAY_LIMITS.MAX_FILTER_COUNTRIES)) {
      parts.push(`- ${opt.label}: ${opt.count} dogs`);
    }
    if (sortedCountries.length > DISPLAY_LIMITS.MAX_FILTER_COUNTRIES) {
      parts.push(`- *...and ${sortedCountries.length - DISPLAY_LIMITS.MAX_FILTER_COUNTRIES} more countries*`);
    }
    parts.push("");
  }

  if (counts.breed_options.length > 0) {
    parts.push("## Top Breeds");
    for (const opt of counts.breed_options.slice(0, DISPLAY_LIMITS.MAX_FILTER_BREEDS)) {
      parts.push(`- ${opt.label}: ${opt.count} dogs`);
    }
    parts.push("");
  }

  return truncateIfNeeded(parts.join("\n"));
}

function formatEnumValue(value: string): string {
  return value
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}