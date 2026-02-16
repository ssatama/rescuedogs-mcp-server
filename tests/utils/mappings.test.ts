import { describe, it, expect } from "vitest";
import {
  AGE_CATEGORY_MAP,
  SEX_MAP,
  normalizeCountryForApi,
  HOME_TYPE_MAP,
  ENERGY_LEVEL_MAP,
  EXPERIENCE_MAP,
} from "../../src/utils/mappings.js";

describe("AGE_CATEGORY_MAP", () => {
  it("maps all 4 age categories correctly", () => {
    expect(AGE_CATEGORY_MAP["puppy"]).toBe("Puppy");
    expect(AGE_CATEGORY_MAP["young"]).toBe("Young");
    expect(AGE_CATEGORY_MAP["adult"]).toBe("Adult");
    expect(AGE_CATEGORY_MAP["senior"]).toBe("Senior");
  });

  it("has exactly 4 entries", () => {
    expect(Object.keys(AGE_CATEGORY_MAP)).toHaveLength(4);
  });
});

describe("SEX_MAP", () => {
  it("maps male and female correctly", () => {
    expect(SEX_MAP["male"]).toBe("Male");
    expect(SEX_MAP["female"]).toBe("Female");
  });

  it("has exactly 2 entries", () => {
    expect(Object.keys(SEX_MAP)).toHaveLength(2);
  });
});

describe("normalizeCountryForApi", () => {
  it('converts "GB" to "UK"', () => {
    expect(normalizeCountryForApi("GB")).toBe("UK");
  });

  it('passes through "UK" unchanged', () => {
    expect(normalizeCountryForApi("UK")).toBe("UK");
  });

  it("passes through other country codes unchanged", () => {
    expect(normalizeCountryForApi("FR")).toBe("FR");
    expect(normalizeCountryForApi("DE")).toBe("DE");
    expect(normalizeCountryForApi("ES")).toBe("ES");
  });

  it("uppercases lowercase input", () => {
    expect(normalizeCountryForApi("gb")).toBe("UK");
    expect(normalizeCountryForApi("fr")).toBe("FR");
  });

  it("returns undefined for undefined input", () => {
    expect(normalizeCountryForApi(undefined)).toBeUndefined();
  });

  it("returns undefined for empty string", () => {
    expect(normalizeCountryForApi("")).toBeUndefined();
  });
});

describe("HOME_TYPE_MAP", () => {
  it("maps all living situations to backend values", () => {
    expect(HOME_TYPE_MAP["apartment"]).toBe("apartment_ok");
    expect(HOME_TYPE_MAP["house_small_garden"]).toBe("house_preferred");
    expect(HOME_TYPE_MAP["house_large_garden"]).toBe("house_preferred");
    expect(HOME_TYPE_MAP["rural"]).toBe("house_required");
  });

  it("has exactly 4 entries", () => {
    expect(Object.keys(HOME_TYPE_MAP)).toHaveLength(4);
  });
});

describe("ENERGY_LEVEL_MAP", () => {
  it("maps all activity levels to backend values", () => {
    expect(ENERGY_LEVEL_MAP["sedentary"]).toBe("low");
    expect(ENERGY_LEVEL_MAP["moderate"]).toBe("medium");
    expect(ENERGY_LEVEL_MAP["active"]).toBe("high");
    expect(ENERGY_LEVEL_MAP["very_active"]).toBe("very_high");
  });

  it("has exactly 4 entries", () => {
    expect(Object.keys(ENERGY_LEVEL_MAP)).toHaveLength(4);
  });
});

describe("EXPERIENCE_MAP", () => {
  it("maps all experience levels to backend values", () => {
    expect(EXPERIENCE_MAP["first_time"]).toBe("first_time_ok");
    expect(EXPERIENCE_MAP["some"]).toBe("some_experience");
    expect(EXPERIENCE_MAP["experienced"]).toBe("experienced_only");
  });

  it("has exactly 3 entries", () => {
    expect(Object.keys(EXPERIENCE_MAP)).toHaveLength(3);
  });
});
