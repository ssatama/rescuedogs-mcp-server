import { z } from "zod";

/**
 * Output schemas for structured tool results.
 *
 * Declaring one obliges every non-error return path to carry
 * `structuredContent`; the SDK throws otherwise. Text content is still
 * returned alongside, so clients that ignore structured output are unaffected.
 *
 * These mirror the projected shapes in services/projection.ts rather than the
 * raw API records - the same allowlist, so nothing internal leaks here either.
 */

const CompatibilitySchema = z.enum([
  "yes",
  "no",
  "unknown",
  "older_children",
  "selective",
]);

const ProfileSchema = z
  .object({
    tagline: z.string().optional(),
    description: z.string().optional(),
    personality_traits: z.array(z.string()).optional(),
    favorite_activities: z.array(z.string()).optional(),
    unique_quirk: z.string().optional(),
    special_needs: z.string().optional(),
    medical_needs: z.string().optional(),
    energy_level: z.string().optional(),
    exercise_needs: z.string().optional(),
    home_type: z.string().optional(),
    experience_level: z.string().optional(),
    sociability: z.string().optional(),
    trainability: z.string().optional(),
    grooming_needs: z.string().optional(),
    good_with_children: CompatibilitySchema.optional(),
    good_with_dogs: CompatibilitySchema.optional(),
    good_with_cats: CompatibilitySchema.optional(),
  })
  .describe("AI-generated personality profile derived from the listing text");

const OrganizationSchema = z.object({
  id: z.number().int().describe("Use as organization_id when searching"),
  name: z.string(),
  description: z.string().optional(),
  country: z.string().optional(),
  city: z.string().optional(),
  website_url: z.string().optional(),
  ships_to: z.array(z.string()).optional().describe("ISO codes it adopts to"),
  adoption_fees: z
    .object({
      currency: z.string().optional(),
      usual_fee: z.number().optional(),
    })
    .optional()
    .describe("Typical adoption fee. Confirm with the organization."),
  total_dogs: z.number().int().optional(),
  new_this_week: z.number().int().optional(),
});

const DogSchema = z.object({
  slug: z.string().describe("Pass to rescuedogs_get_dog_details"),
  name: z.string(),
  breed: z.string().optional(),
  breed_group: z.string().optional(),
  age_text: z.string().optional(),
  age_min_months: z.number().optional(),
  age_max_months: z.number().optional(),
  sex: z.string().optional(),
  size: z.string().optional(),
  adoption_url: z.string().describe("The rescue's own page - always surface this"),
  primary_image_url: z.string().optional(),
  profile: ProfileSchema.optional(),
  organization: OrganizationSchema.optional(),
});

const FilterOptionSchema = z.object({
  value: z.string(),
  label: z.string(),
  count: z.number().int(),
});

export const SearchDogsOutputShape = {
  count: z.number().int().describe("Dogs returned by this call"),
  has_more: z.boolean().describe("Whether increasing offset may return more"),
  dogs: z.array(DogSchema),
};

export const MatchPreferencesOutputShape = {
  count: z.number().int(),
  matched_criteria: z
    .object({
      home_type: z.string(),
      energy_level: z.string(),
      experience_level: z.string(),
      good_with_kids: z.boolean().optional(),
      good_with_dogs: z.boolean().optional(),
      good_with_cats: z.boolean().optional(),
    })
    .describe("Filters derived from the stated lifestyle"),
  dogs: z.array(DogSchema),
};

export const GetDogDetailsOutputShape = { dog: DogSchema };

export const ListOrganizationsOutputShape = {
  count: z.number().int(),
  organizations: z.array(OrganizationSchema),
};

export const GetStatisticsOutputShape = {
  total_dogs: z.number().int(),
  total_organizations: z.number().int(),
  countries: z.array(z.object({ country: z.string(), count: z.number().int() })),
};

export const ListBreedsOutputShape = {
  total_dogs: z.number().int(),
  unique_breeds: z.number().int(),
  breeds: z.array(
    z.object({
      primary_breed: z.string(),
      breed_slug: z.string(),
      breed_group: z.string().optional(),
      breed_type: z.string().optional(),
      count: z.number().int(),
      organization_count: z.number().int().optional(),
      personality_traits: z.array(z.string()).optional(),
    })
  ),
};

export const GetFilterCountsOutputShape = {
  size_options: z.array(FilterOptionSchema),
  age_options: z.array(FilterOptionSchema),
  sex_options: z.array(FilterOptionSchema),
  breed_options: z.array(FilterOptionSchema),
  organization_options: z.array(FilterOptionSchema),
  available_country_options: z
    .array(FilterOptionSchema)
    .describe("Countries a dog can be adopted to, most available first"),
};

export const GetAdoptionGuideOutputShape = {
  topic: z.string(),
  country: z.string().optional(),
  guide: z.string().describe("Markdown guide content"),
};
