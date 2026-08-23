import { describe, it, expect } from "vitest";
import {
  truncateIfNeeded,
  formatDogMarkdown,
  formatDogsListMarkdown,
  formatBreedStatsMarkdown,
  formatOrganizationMarkdown,
  formatOrganizationsListMarkdown,
  formatStatisticsMarkdown,
  formatFilterCountsMarkdown,
} from "../../src/services/formatters.js";
import {
  mockDog,
  mockDogMinimal,
  mockOrganization,
  mockBreedStats,
  mockStatistics,
  mockFilterCounts,
} from "../fixtures/dogs.js";
import type { FilterCountsResponse } from "../../src/types.js";

describe("truncateIfNeeded", () => {
  it("returns short text unchanged", () => {
    const text = "Hello, world!";
    expect(truncateIfNeeded(text)).toBe(text);
  });

  it("truncates text exceeding CHARACTER_LIMIT", () => {
    const text = "x".repeat(30000);
    const result = truncateIfNeeded(text);
    expect(result.length).toBeLessThan(30000);
    expect(result).toContain("truncated due to length limit");
  });

  it("returns text at exactly CHARACTER_LIMIT unchanged", () => {
    const text = "x".repeat(25000);
    expect(truncateIfNeeded(text)).toBe(text);
  });
});

describe("formatDogMarkdown", () => {
  it("includes dog name, breed, age, and adoption URL", () => {
    const result = formatDogMarkdown(mockDog);
    expect(result).toContain("# Buddy");
    expect(result).toContain("Golden Retriever");
    expect(result).toContain("2 years");
    expect(result).toContain(mockDog.adoption_url);
  });

  it("renders every profiler section from inline dog_profiler_data", () => {
    const result = formatDogMarkdown(mockDog);
    expect(result).toContain("Your new best friend!");
    expect(result).toContain("Buddy is a friendly golden retriever.");
    expect(result).toContain("Friendly");
    expect(result).toContain("Fetch");
    expect(result).toContain("Can catch a frisbee mid-air!");
  });

  it("splits semicolon-separated special_needs into bullets", () => {
    const result = formatDogMarkdown(mockDog);
    expect(result).toContain("- Needs a garden");
    expect(result).toContain("- not good with cats");
  });

  it("renders yes/no compatibility and omits unknown", () => {
    const result = formatDogMarkdown(mockDog);
    expect(result).toContain("**Children:** Yes");
    expect(result).toContain("**Cats:** No");
    // "unknown" must not be rendered at all - absence of data is not a "No"
    expect(result).not.toContain("**Dogs:**");
  });

  it("renders the qualified compatibility values the API also returns", () => {
    const result = formatDogMarkdown({
      ...mockDog,
      dog_profiler_data: {
        ...mockDog.dog_profiler_data,
        good_with_children: "older_children",
        good_with_dogs: "selective",
      },
    });
    // Dropping these would make a child-safety caveat indistinguishable from
    // having no data at all.
    expect(result).toContain("**Children:** Older children only");
    expect(result).toContain("**Dogs:** Selective");
  });

  it("includes requirements section with formatted enum values", () => {
    const result = formatDogMarkdown(mockDog);
    expect(result).toContain("Energy Level");
    expect(result).toContain("High");
    expect(result).toContain("Home Type");
    expect(result).toContain("House Preferred");
  });

  it("handles a dog with no profiler data", () => {
    const result = formatDogMarkdown(mockDogMinimal);
    expect(result).toContain("# Rex");
    expect(result).toContain(mockDogMinimal.adoption_url);
    expect(result).not.toContain("## About");
  });

  it("handles minimal dog with no optional fields", () => {
    const result = formatDogMarkdown(mockDogMinimal);
    expect(result).toContain("# Rex");
    expect(result).toContain(mockDogMinimal.adoption_url);
    // Should not crash on null breed, age, etc.
    expect(result).not.toContain("undefined");
  });

  it("includes rescuedogs.me profile link", () => {
    const result = formatDogMarkdown(mockDog);
    expect(result).toContain(`https://www.rescuedogs.me/dogs/${mockDog.slug}`);
  });

  it("includes organization info when present", () => {
    const result = formatDogMarkdown(mockDog);
    expect(result).toContain("Happy Paws Rescue");
    expect(result).toContain("Barcelona, Spain");
  });
});

describe("formatDogsListMarkdown", () => {
  it("shows dog count and dog names", () => {
    const result = formatDogsListMarkdown([mockDog, mockDogMinimal]);
    expect(result).toContain("2 dogs");
    expect(result).toContain("Buddy");
    expect(result).toContain("Rex");
  });

  it("includes tagline from inline profiler data when available", () => {
    const result = formatDogsListMarkdown([mockDog]);
    expect(result).toContain("Your new best friend!");
  });

  it("shows pagination info with more results available", () => {
    const result = formatDogsListMarkdown([mockDog], {
      offset: 0,
      limit: 1,
    });
    expect(result).toContain("Showing 1-1");
    expect(result).toContain("More results available");
  });

  it("shows pagination info without more results", () => {
    const result = formatDogsListMarkdown([mockDog], {
      offset: 0,
      limit: 10,
    });
    expect(result).toContain("Showing 1-1");
    expect(result).not.toContain("More results available");
  });

  it("returns no-results message for empty array", () => {
    const result = formatDogsListMarkdown([]);
    expect(result).toContain("No Dogs Found");
    expect(result).toContain("rescuedogs_get_filter_counts");
  });

  it("includes adoption URLs for each dog", () => {
    const result = formatDogsListMarkdown([mockDog, mockDogMinimal]);
    expect(result).toContain(mockDog.adoption_url);
    expect(result).toContain(mockDogMinimal.adoption_url);
  });
});

describe("formatBreedStatsMarkdown", () => {
  it("includes total dogs and breed counts", () => {
    const result = formatBreedStatsMarkdown(mockBreedStats);
    expect(result).toContain("1,500");
    expect(result).toContain("120");
    expect(result).toContain("600");
    expect(result).toContain("900");
  });

  it("includes breed group names", () => {
    const result = formatBreedStatsMarkdown(mockBreedStats);
    expect(result).toContain("Retrievers");
    expect(result).toContain("Shepherds");
  });

  it("includes breed names in top breeds section", () => {
    const result = formatBreedStatsMarkdown(mockBreedStats);
    expect(result).toContain("Golden Retriever");
    expect(result).toContain("German Shepherd");
  });

  it("respects limit parameter", () => {
    const result = formatBreedStatsMarkdown(mockBreedStats, 1);
    expect(result).toContain("Golden Retriever");
    expect(result).not.toContain("German Shepherd");
  });

  it("shows all breeds when no limit", () => {
    const result = formatBreedStatsMarkdown(mockBreedStats);
    expect(result).toContain("Golden Retriever");
    expect(result).toContain("German Shepherd");
  });
});

describe("formatOrganizationMarkdown", () => {
  it("includes organization name as heading", () => {
    const result = formatOrganizationMarkdown(mockOrganization);
    expect(result).toContain("## Happy Paws Rescue");
  });

  it("includes location, dogs available, and website", () => {
    const result = formatOrganizationMarkdown(mockOrganization);
    expect(result).toContain("Barcelona, Spain");
    expect(result).toContain("42");
    expect(result).toContain("https://happypaws.org");
  });

  it("includes ships_to countries", () => {
    const result = formatOrganizationMarkdown(mockOrganization);
    expect(result).toContain("UK, DE, FR");
  });

  it("includes new this week when positive", () => {
    const result = formatOrganizationMarkdown(mockOrganization);
    expect(result).toContain("New This Week");
    expect(result).toContain("3");
  });

  it("includes description when present", () => {
    const result = formatOrganizationMarkdown(mockOrganization);
    expect(result).toContain("A rescue organization in Spain");
  });
});

describe("formatOrganizationsListMarkdown", () => {
  it("includes organization names and countries", () => {
    const result = formatOrganizationsListMarkdown([mockOrganization]);
    expect(result).toContain("Happy Paws Rescue");
    expect(result).toContain("Spain");
    expect(result).toContain("Barcelona");
  });

  it("shows count in header", () => {
    const result = formatOrganizationsListMarkdown([mockOrganization]);
    expect(result).toContain("Rescue Organizations (1)");
  });

  it("includes ships_to countries", () => {
    const result = formatOrganizationsListMarkdown([mockOrganization]);
    expect(result).toContain("UK, DE, FR");
  });

  it("returns no-results message for empty array", () => {
    const result = formatOrganizationsListMarkdown([]);
    expect(result).toContain("No organizations found");
  });

  it("includes total dogs count", () => {
    const result = formatOrganizationsListMarkdown([mockOrganization]);
    expect(result).toContain("42");
  });
});

describe("formatStatisticsMarkdown", () => {
  it("includes total dogs and organizations", () => {
    const result = formatStatisticsMarkdown(mockStatistics);
    expect(result).toContain("2,500");
    expect(result).toContain("15");
  });

  it("includes country information", () => {
    const result = formatStatisticsMarkdown(mockStatistics);
    expect(result).toContain("Spain");
    expect(result).toContain("Romania");
    expect(result).toContain("Greece");
  });

  it("includes countries covered count", () => {
    const result = formatStatisticsMarkdown(mockStatistics);
    expect(result).toContain("Countries Covered");
    expect(result).toContain("3");
  });

  it("calculates new this week across orgs", () => {
    const result = formatStatisticsMarkdown(mockStatistics);
    // 3 + 5 = 8
    expect(result).toContain("8");
  });

  it("includes top organizations", () => {
    const result = formatStatisticsMarkdown(mockStatistics);
    expect(result).toContain("Happy Paws Rescue");
    expect(result).toContain("Dog Haven");
  });
});

describe("formatFilterCountsMarkdown", () => {
  it("includes filter option sections", () => {
    const result = formatFilterCountsMarkdown(mockFilterCounts);
    expect(result).toContain("## Size");
    expect(result).toContain("## Age");
    expect(result).toContain("## Sex");
  });

  it("includes filter option labels and counts", () => {
    const result = formatFilterCountsMarkdown(mockFilterCounts);
    expect(result).toContain("Small: 300 dogs");
    expect(result).toContain("Medium: 500 dogs");
    expect(result).toContain("Puppy: 200 dogs");
    expect(result).toContain("Male: 650 dogs");
  });

  it("includes available countries section", () => {
    const result = formatFilterCountsMarkdown(mockFilterCounts);
    expect(result).toContain("Available To (Countries)");
    expect(result).toContain("United Kingdom");
  });

  it("includes breed options", () => {
    const result = formatFilterCountsMarkdown(mockFilterCounts);
    expect(result).toContain("Top Breeds");
    expect(result).toContain("Golden Retriever");
  });

  it("handles empty filter options gracefully", () => {
    const emptyCounts: FilterCountsResponse = {
      size_options: [],
      age_options: [],
      sex_options: [],
      breed_options: [],
      organization_options: [],
      location_country_options: [],
      available_country_options: [],
      available_region_options: [],
    };
    const result = formatFilterCountsMarkdown(emptyCounts);
    expect(result).toContain("Available Filter Options");
    expect(result).not.toContain("## Size");
  });
});
