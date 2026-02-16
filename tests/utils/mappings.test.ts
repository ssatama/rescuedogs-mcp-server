import { describe, it, expect } from "vitest";
import {
  AGE_CATEGORY_MAP,
  SEX_MAP,
  normalizeCountryForApi,
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
