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
  description?: string;
  tagline?: string;
  bio?: string;
  looking_for?: string;
  personality_traits?: string[];
  interests?: string[];
  deal_breakers?: string[];
  fun_fact?: string;
  energy_level?: EnergyLevel;
  home_type?: HomeType;
  experience_level?: ExperienceLevel;
  quality_score?: number;
}

export interface EnhancedDogData {
  id: number;
  enhanced_description: string | null;
  tagline: string | null;
  bio: string | null;
  looking_for: string | null;
  personality_traits: string[] | null;
  interests: string[] | null;
  deal_breakers: string[] | null;
  fun_fact: string | null;
  energy_level: string | null;
  home_type: string | null;
  experience_level: string | null;
  quality_score: number | null;
  good_with_kids: boolean | null;
  good_with_dogs: boolean | null;
  good_with_cats: boolean | null;
  good_with_strangers: boolean | null;
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

export interface ServiceRegion {
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

export interface BreedGroupCount {
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

export interface AgeDistribution {
  puppy: number;
  young: number;
  adult: number;
  senior: number;
}

export interface SizeDistribution {
  tiny: number;
  small: number;
  medium: number;
  large: number;
  xlarge: number;
}

export interface SexDistribution {
  male: number;
  female: number;
}

export interface ExperienceDistribution {
  first_time_ok: number;
  some_experience: number;
  experienced: number;
}

export interface PersonalityMetrics {
  energy_level: MetricValue;
  affection: MetricValue;
  trainability: MetricValue;
  independence: MetricValue;
}

export interface MetricValue {
  percentage: number;
  label: string;
}

export interface CountryStats {
  country: string;
  count: number;
}

export interface OrganizationStats {
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

export interface FilterOption {
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
export type EnergyLevel = "low" | "medium" | "high" | "very_high";
export type HomeType = "apartment_ok" | "house_preferred" | "house_required";
export type ExperienceLevel =
  | "first_time_ok"
  | "some_experience"
  | "experienced_only";
export type ImagePreset = "thumbnail" | "medium";

// API Response wrappers
export interface PaginatedResponse<T> {
  data: T[];
  has_more: boolean;
  total?: number;
  next_offset?: number;
}

export interface ApiError {
  detail: string;
  error_code: string;
  status_code: number;
}
