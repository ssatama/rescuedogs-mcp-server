import type {
  AdoptionFees,
  Compatibility,
  Dog,
  DogProfilerData,
  Organization,
} from "../types.js";

/**
 * Allowlisted views of the API records.
 *
 * The raw responses carry scraper bookkeeping (last_scraped_at,
 * consecutive_scrapes_missing, adoption_check_data) and LLM provenance
 * (model_used, prompt_version, processing_time_ms, confidence_scores). None of
 * it helps a reader choose a dog, it inflates every response, and OpenAI's
 * plugin policy prohibits returning diagnostic or internal metadata that is
 * not required to answer the query.
 *
 * Allowlist rather than denylist: a new upstream field should be invisible
 * until someone decides it belongs, not leak by default.
 */

interface PublicProfile {
  tagline?: string;
  description?: string;
  personality_traits?: string[];
  favorite_activities?: string[];
  unique_quirk?: string;
  special_needs?: string;
  medical_needs?: string;
  energy_level?: string;
  exercise_needs?: string;
  home_type?: string;
  experience_level?: string;
  sociability?: string;
  trainability?: string;
  grooming_needs?: string;
  good_with_children?: Compatibility;
  good_with_dogs?: Compatibility;
  good_with_cats?: Compatibility;
}

export interface PublicOrganization {
  id: number;
  name: string;
  description?: string;
  country?: string;
  city?: string;
  website_url?: string;
  ships_to?: string[];
  adoption_fees?: AdoptionFees;
  total_dogs?: number;
  new_this_week?: number;
}

export interface PublicDog {
  slug: string;
  name: string;
  breed?: string;
  breed_group?: string;
  age_text?: string;
  age_min_months?: number;
  age_max_months?: number;
  sex?: string;
  size?: string;
  adoption_url: string;
  primary_image_url?: string;
  profile?: PublicProfile;
  organization?: PublicOrganization;
}

/** Drops null, undefined and empty arrays so absent data stays absent. */
function compact<T extends object>(value: T): T {
  return Object.fromEntries(
    Object.entries(value).filter(
      ([, v]) =>
        v !== null && v !== undefined && !(Array.isArray(v) && v.length === 0),
    ),
  ) as T;
}

function toPublicProfile(profile: DogProfilerData): PublicProfile | undefined {
  const projected = compact<PublicProfile>({
    tagline: profile.tagline ?? undefined,
    description: profile.description ?? undefined,
    personality_traits: profile.personality_traits ?? undefined,
    favorite_activities: profile.favorite_activities ?? undefined,
    unique_quirk: profile.unique_quirk ?? undefined,
    special_needs: profile.special_needs ?? undefined,
    medical_needs: profile.medical_needs ?? undefined,
    energy_level: profile.energy_level ?? undefined,
    exercise_needs: profile.exercise_needs ?? undefined,
    home_type: profile.home_type ?? undefined,
    experience_level: profile.experience_level ?? undefined,
    sociability: profile.sociability ?? undefined,
    trainability: profile.trainability ?? undefined,
    grooming_needs: profile.grooming_needs ?? undefined,
    good_with_children: profile.good_with_children ?? undefined,
    good_with_dogs: profile.good_with_dogs ?? undefined,
    good_with_cats: profile.good_with_cats ?? undefined,
  });
  return Object.keys(projected).length > 0 ? projected : undefined;
}

// The numeric id is deliberately absent: slug is the handle every tool takes.
//
// Required fields are set outside compact(): compact strips nullish values, so
// routing them through it would let a null adoption_url silently disappear
// while the type still claims it is there - and the server instructions tell
// the model to always surface that link.
export function toPublicDog(dog: Dog): PublicDog {
  return {
    slug: dog.slug,
    name: dog.name,
    adoption_url: dog.adoption_url,
    ...compact({
      breed: dog.standardized_breed ?? dog.breed ?? undefined,
      breed_group: dog.breed_group ?? undefined,
      age_text: dog.age_text ?? undefined,
      age_min_months: dog.age_min_months ?? undefined,
      age_max_months: dog.age_max_months ?? undefined,
      sex: dog.sex ?? undefined,
      size: dog.standardized_size ?? dog.size ?? undefined,
      primary_image_url: dog.primary_image_url ?? undefined,
      profile: dog.dog_profiler_data
        ? toPublicProfile(dog.dog_profiler_data)
        : undefined,
      organization: dog.organization
        ? toPublicOrganization(dog.organization)
        : undefined,
    }),
  };
}

export interface PublicDogSummary {
  slug: string;
  name: string;
  breed?: string;
  age_text?: string;
  sex?: string;
  size?: string;
  adoption_url: string;
  tagline?: string;
  energy_level?: string;
  experience_level?: string;
  organization?: string;
  organization_id?: number;
}

/**
 * The list-result form. Search can return 50 dogs, and the full record runs
 * ~1,400 characters each - 70KB of structured output on top of a text block
 * the server deliberately caps at CHARACTER_LIMIT. A summary keeps list
 * results proportionate; callers follow the slug to rescuedogs_get_dog_details
 * for everything else.
 */
export function toPublicDogSummary(dog: Dog): PublicDogSummary {
  const profile = dog.dog_profiler_data;
  return {
    slug: dog.slug,
    name: dog.name,
    adoption_url: dog.adoption_url,
    ...compact({
      breed: dog.standardized_breed ?? dog.breed ?? undefined,
      age_text: dog.age_text ?? undefined,
      sex: dog.sex ?? undefined,
      size: dog.standardized_size ?? dog.size ?? undefined,
      tagline: profile?.tagline ?? undefined,
      energy_level: profile?.energy_level ?? undefined,
      experience_level: profile?.experience_level ?? undefined,
      organization: dog.organization?.name ?? undefined,
      organization_id: dog.organization?.id ?? undefined,
    }),
  };
}

// id is kept here: organization_id is a documented rescuedogs_search_dogs
// filter, so it is needed to answer a follow-up query.
export function toPublicOrganization(org: Organization): PublicOrganization {
  return {
    id: org.id,
    name: org.name,
    ...compact({
      description: org.description ?? undefined,
      country: org.country ?? undefined,
      city: org.city ?? undefined,
      website_url: org.website_url ?? undefined,
      ships_to: org.ships_to ?? undefined,
      adoption_fees: org.adoption_fees ?? undefined,
      total_dogs: org.total_dogs ?? undefined,
      new_this_week: org.new_this_week ?? undefined,
    }),
  };
}
