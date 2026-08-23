/**
 * Contract tests against the live rescuedogs API.
 *
 * The unit tests mock axios and then assert the URL the client itself built,
 * which is tautological: it let /api/enhanced_animals/* 404 in production
 * while the suite stayed green. These tests make real requests and assert the
 * fields the formatters and tools actually read.
 *
 * Excluded from `npm test` so offline development still works.
 * Run with `npm run test:contract`.
 */
import { describe, it, expect, beforeAll } from "vitest";
import { apiClient } from "../../src/services/api-client.js";
import type { Dog } from "../../src/types.js";

const TIMEOUT = 30_000;

const KNOWN_COMPATIBILITY = [
  "yes",
  "no",
  "unknown",
  "older_children",
  "selective",
];

describe("live API contract", () => {
  let dogs: Dog[];

  beforeAll(async () => {
    dogs = await apiClient.searchDogs({ limit: 20 });
  }, TIMEOUT);

  it("searchDogs returns dogs with the fields the list formatter reads", () => {
    expect(dogs.length).toBeGreaterThan(0);
    for (const dog of dogs) {
      expect(typeof dog.id).toBe("number");
      expect(typeof dog.slug).toBe("string");
      expect(typeof dog.name).toBe("string");
      expect(typeof dog.adoption_url).toBe("string");
      expect(dog.status).toBe("available");
    }
  });

  it("carries dog_profiler_data inline, which is why the bulk call was dropped", () => {
    const profiled = dogs.filter((d) => d.dog_profiler_data);
    expect(profiled.length / dogs.length).toBeGreaterThan(0.8);
    expect(profiled.some((d) => d.dog_profiler_data?.tagline)).toBe(true);
    expect(profiled.some((d) => d.dog_profiler_data?.description)).toBe(true);
  });

  it(
    "reports only compatibility values the formatter has a label for",
    async () => {
      // "older_children" and "selective" appear in roughly 1 in 75 dogs, so a
      // small page can miss them entirely. Sample deep enough that a new value
      // fails here rather than being silently dropped from the rendered profile.
      const pages = await Promise.all(
        [0, 100, 200, 300, 400, 500].map((offset) =>
          apiClient.searchDogs({ limit: 100, offset })
        )
      );
      const values = pages
        .flat()
        .flatMap((d) => [
          d.dog_profiler_data?.good_with_children,
          d.dog_profiler_data?.good_with_dogs,
          d.dog_profiler_data?.good_with_cats,
        ])
        .filter((v): v is NonNullable<typeof v> => v !== null && v !== undefined);

      expect(values.length).toBeGreaterThan(0);
      expect([...new Set(values)].sort()).toEqual(
        expect.arrayContaining(["no", "unknown", "yes"])
      );
      for (const value of values) {
        expect(KNOWN_COMPATIBILITY).toContain(value);
      }
    },
    TIMEOUT
  );

  it(
    "getDogBySlug resolves and returns the same profiler shape",
    async () => {
      const profiled = dogs.find((d) => d.dog_profiler_data?.tagline)!;
      expect(profiled).toBeDefined();

      const dog = await apiClient.getDogBySlug(profiled.slug);
      expect(dog.slug).toBe(profiled.slug);
      expect(typeof dog.adoption_url).toBe("string");

      // The invariant that lets getEnhancedDogData go away: the detail
      // endpoint carries the profiler block inline, same as the list endpoint.
      expect(dog.dog_profiler_data).toBeTruthy();
      expect(dog.dog_profiler_data?.tagline).toBe(profiled.dog_profiler_data?.tagline);
    },
    TIMEOUT
  );

  it(
    "getBreedStats returns qualifying_breeds with counts",
    async () => {
      const stats = await apiClient.getBreedStats();
      expect(Array.isArray(stats.qualifying_breeds)).toBe(true);
      expect(typeof stats.total_dogs).toBe("number");
    },
    TIMEOUT
  );

  it(
    "getStatistics returns totals and country breakdown",
    async () => {
      const stats = await apiClient.getStatistics();
      expect(typeof stats.total_dogs).toBe("number");
      expect(Array.isArray(stats.countries)).toBe(true);
    },
    TIMEOUT
  );

  it(
    "getFilterCounts returns every option list the formatter renders",
    async () => {
      const counts = await apiClient.getFilterCounts();
      for (const key of [
        "size_options",
        "age_options",
        "sex_options",
        "breed_options",
        "organization_options",
        "available_country_options",
      ] as const) {
        expect(Array.isArray(counts[key])).toBe(true);
      }
    },
    TIMEOUT
  );

  it(
    "getOrganizations returns named, identifiable orgs",
    async () => {
      const orgs = await apiClient.getOrganizations({ active_only: true });
      expect(orgs.length).toBeGreaterThan(0);
      for (const org of orgs) {
        expect(typeof org.id).toBe("number");
        expect(typeof org.name).toBe("string");
      }
    },
    TIMEOUT
  );
});
