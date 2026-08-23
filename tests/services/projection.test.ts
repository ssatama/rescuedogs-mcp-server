import { describe, it, expect } from "vitest";
import { toPublicDog, toPublicOrganization } from "../../src/services/projection.js";
import { mockDog, mockDogMinimal, mockOrganization } from "../fixtures/dogs.js";

/**
 * OpenAI plugin policy: tool responses must not carry "diagnostic, telemetry,
 * or internal identifiers - such as session IDs, trace IDs, request IDs,
 * timestamps, or logging metadata". The raw API record carries plenty.
 */
const FORBIDDEN = [
  "created_at",
  "updated_at",
  "last_scraped_at",
  "last_seen_at",
  "consecutive_scrapes_missing",
  "adoption_check_data",
  "external_id",
  "properties",
  "availability_confidence",
  "model_used",
  "prompt_version",
  "profiler_version",
  "processing_time_ms",
  "confidence",
  "confidence_scores",
  "profiled_at",
  "source_references",
  "quality_score",
];

function deepKeys(value: unknown, out = new Set<string>()): Set<string> {
  if (Array.isArray(value)) {
    value.forEach((v) => deepKeys(v, out));
  } else if (value && typeof value === "object") {
    for (const [k, v] of Object.entries(value)) {
      out.add(k);
      deepKeys(v, out);
    }
  }
  return out;
}

describe("toPublicDog", () => {
  it("keeps what a reader needs to evaluate and contact the rescue", () => {
    const dog = toPublicDog(mockDog);
    expect(dog).toMatchObject({
      slug: "buddy-golden-retriever",
      name: "Buddy",
      breed: "Golden Retriever",
      age_text: "2 years",
      sex: "Male",
      size: "Large",
      adoption_url: mockDog.adoption_url,
    });
    expect(dog.organization).toMatchObject({ name: "Happy Paws Rescue" });
    expect(dog.profile?.tagline).toBe("Your new best friend!");
    expect(dog.profile?.personality_traits).toEqual(["Friendly", "Playful"]);
  });

  it("emits no telemetry, provenance or internal identifiers", () => {
    const keys = deepKeys(toPublicDog(mockDog));
    for (const forbidden of FORBIDDEN) {
      expect([...keys]).not.toContain(forbidden);
    }
  });

  it("omits the numeric dog id, since slug is the public handle", () => {
    // Nested organization.id is deliberately kept - it is a search filter.
    expect(Object.keys(toPublicDog(mockDog))).not.toContain("id");
  });

  it("survives a dog with no profiler data or organization", () => {
    const dog = toPublicDog(mockDogMinimal);
    expect(dog.name).toBe("Rex");
    expect(dog.profile).toBeUndefined();
    expect(dog.organization).toBeUndefined();
  });

  it("prefers standardized breed and size over the raw values", () => {
    const dog = toPublicDog({
      ...mockDog,
      breed: "raw breed",
      standardized_breed: "Standard Breed",
      size: "raw size",
      standardized_size: "Medium",
    });
    expect(dog.breed).toBe("Standard Breed");
    expect(dog.size).toBe("Medium");
  });

  it("falls back to raw breed and size when unstandardized", () => {
    const dog = toPublicDog({
      ...mockDog,
      standardized_breed: null,
      standardized_size: null,
      breed: "Lurcher",
      size: "Big",
    });
    expect(dog.breed).toBe("Lurcher");
    expect(dog.size).toBe("Big");
  });
});

describe("toPublicOrganization", () => {
  it("keeps the id, which is a documented search filter", () => {
    // organization_id is an input to rescuedogs_search_dogs, so it is
    // required to fulfil a follow-up query rather than internal metadata.
    expect(toPublicOrganization(mockOrganization).id).toBe(1);
  });

  it("emits no timestamps or internal bookkeeping", () => {
    const keys = deepKeys(toPublicOrganization(mockOrganization));
    for (const forbidden of ["created_at", "updated_at", "active", "recent_dogs"]) {
      expect([...keys]).not.toContain(forbidden);
    }
  });
});
