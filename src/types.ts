export interface Dog {
  id: number;
  slug: string;
  name: string;
  animal_type: string;
  breed: string | null;
  standardized_breed: string | null;
  breed_group: string | null;
  primary_breed: string | null;
  secondary_breed: string | null;
  breed_type: string | null;
  breed_slug: string | null;
  age_text: string | null;
  age_min_months: number | null;
  age_max_months: number | null;
  sex: string | null;
  size: string | null;
  standardized_size: string | null;
  status: string;
  primary_image_url: string | null;
  adoption_url: string;
  organization_id: number;
  external_id: string | null;
  language: string;
  properties: Record<string, unknown>;
  dog_profiler_data: DogProfilerData | null;
  created_at: string;
  updated_at: string;
  last_scraped_at: string | null;
  availability_confidence: string;
  organization: Organization | null;
}

export interface DogProfilerData {
  tagline?: string | null;
  description?: string | null;
  personality_traits?: string[] | null;
  favorite_activities?: string[] | null;
  unique_quirk?: string | null;
  special_needs?: string | null;
  medical_needs?: string | null;
  energy_level?: EnergyLevel | null;
  home_type?: HomeType | null;
  experience_level?: ExperienceLevel | null;
  sociability?: string | null;
  trainability?: string | null;
  exercise_needs?: string | null;
  grooming_needs?: string | null;
  good_with_children?: Compatibility | null;
  good_with_dogs?: Compatibility | null;
  good_with_cats?: Compatibility | null;
}

export interface Organization {
  id: number;
  slug: string;
  name: string;
  website_url: string;
  description: string;
  country: string;
  city: string;
  logo_url: string | null;
  social_media: Record<string, string>;
  active: boolean;
  ships_to: string[];
  service_regions: ServiceRegion[];
  adoption_fees: AdoptionFees | null;
  established_year: number | null;
  total_dogs: number;
  new_this_week: number;
  created_at: string;
  updated_at: string;
}

interface ServiceRegion {
  country: string;
  region: string;
}

export interface AdoptionFees {
  currency: string;
  amount: number;
  notes: string;
}

export interface BreedStats {
  total_dogs: number;
  unique_breeds: number;
  purebred_count: number;
  crossbreed_count: number;
  breed_groups: BreedGroupCount[];
  qualifying_breeds: QualifyingBreed[];
}

interface BreedGroupCount {
  name: string;
  count: number;
}

export interface QualifyingBreed {
  primary_breed: string;
  breed_slug: string;
  breed_type: string;
  breed_group: string;
  count: number;
  average_age_months: number;
  organization_count: number;
  organizations: string[];
  age_distribution: AgeDistribution;
  size_distribution: SizeDistribution;
  sex_distribution: SexDistribution;
  personality_traits: string[];
  experience_distribution: ExperienceDistribution;
  personality_metrics: PersonalityMetrics;
}

interface AgeDistribution {
  puppy: number;
  young: number;
  adult: number;
  senior: number;
}

interface SizeDistribution {
  tiny: number;
  small: number;
  medium: number;
  large: number;
  xlarge: number;
}

interface SexDistribution {
  male: number;
  female: number;
}

interface ExperienceDistribution {
  first_time_ok: number;
  some_experience: number;
  experienced: number;
}

interface PersonalityMetrics {
  energy_level: MetricValue;
  affection: MetricValue;
  trainability: MetricValue;
  independence: MetricValue;
}

interface MetricValue {
  percentage: number;
  label: string;
}

interface CountryStats {
  country: string;
  count: number;
}

interface OrganizationStats {
  id: number;
  name: string;
  slug: string;
  dog_count: number;
  new_this_week: number;
  logo_url: string | null;
  country: string;
  city: string;
  ships_to: string[];
  service_regions: string[];
  social_media: Record<string, string>;
  website_url: string;
  description: string;
}

export interface Statistics {
  total_dogs: number;
  total_organizations: number;
  countries: CountryStats[];
  organizations: OrganizationStats[];
}

interface FilterOption {
  value: string;
  label: string;
  count: number;
}

export interface FilterCountsResponse {
  size_options: FilterOption[];
  age_options: FilterOption[];
  sex_options: FilterOption[];
  breed_options: FilterOption[];
  organization_options: FilterOption[];
  location_country_options: FilterOption[];
  available_country_options: FilterOption[];
  available_region_options: FilterOption[];
}

// Enum types for profiler data
type EnergyLevel = "low" | "medium" | "high" | "very_high";
type HomeType = "apartment_ok" | "house_preferred" | "house_required";
type ExperienceLevel =
  | "first_time_ok"
  | "some_experience"
  | "experienced_only";
export type ImagePreset = "thumbnail" | "medium";
// Values observed across the live catalogue. "older_children" and "selective"
// are real qualified answers, not variants of "unknown".
export type Compatibility =
  | "yes"
  | "no"
  | "unknown"
  | "older_children"
  | "selective";

export interface ApiError {
  detail: string;
  error_code: string;
  status_code: number;
}
