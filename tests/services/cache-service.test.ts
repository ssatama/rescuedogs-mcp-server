import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { CacheService } from "../../src/services/cache-service.js";

describe("CacheService", () => {
  let cache: CacheService;

  beforeEach(() => {
    cache = new CacheService();
  });

  describe("basic operations", () => {
    it("set + get round-trip works", () => {
      cache.set("breed_stats", { total: 100 });
      expect(cache.get("breed_stats")).toEqual({ total: 100 });
    });

    it("get returns undefined for missing key", () => {
      expect(cache.get("breed_stats")).toBeUndefined();
    });

    it("has returns true after set", () => {
      cache.set("statistics", { total_dogs: 50 });
      expect(cache.has("statistics")).toBe(true);
    });

    it("has returns false for missing key", () => {
      expect(cache.has("statistics")).toBe(false);
    });

    it("delete removes entry", () => {
      cache.set("breed_stats", { total: 100 });
      cache.delete("breed_stats");
      expect(cache.get("breed_stats")).toBeUndefined();
      expect(cache.has("breed_stats")).toBe(false);
    });

    it("flush clears all entries", () => {
      cache.set("breed_stats", { total: 100 });
      cache.set("statistics", { total_dogs: 50 });
      cache.flush();
      expect(cache.get("breed_stats")).toBeUndefined();
      expect(cache.get("statistics")).toBeUndefined();
    });
  });

  describe("convenience methods", () => {
    it("setBreedStats / getBreedStats round-trip", () => {
      const data = { total_dogs: 500 };
      cache.setBreedStats(data);
      expect(cache.getBreedStats()).toEqual(data);
    });

    it("setStatistics / getStatistics round-trip", () => {
      const data = { total_dogs: 1000, total_organizations: 10 };
      cache.setStatistics(data);
      expect(cache.getStatistics()).toEqual(data);
    });

    it("setOrganizations / getOrganizations round-trip", () => {
      const data = [{ name: "Happy Paws" }];
      cache.setOrganizations(data);
      expect(cache.getOrganizations()).toEqual(data);
    });

    it("setFilterCounts / getFilterCounts with hash key", () => {
      const data = { size_options: [] };
      cache.setFilterCounts("abc123", data);
      expect(cache.getFilterCounts("abc123")).toEqual(data);
    });

    it("getFilterCounts returns undefined for different hash", () => {
      cache.setFilterCounts("abc123", { size_options: [] });
      expect(cache.getFilterCounts("xyz789")).toBeUndefined();
    });

    it("setImage / getImage round-trip", () => {
      cache.setImage("https://example.com/dog.jpg", "base64data");
      expect(cache.getImage("https://example.com/dog.jpg")).toBe("base64data");
    });

    it("getImage returns undefined for uncached URL", () => {
      expect(cache.getImage("https://example.com/other.jpg")).toBeUndefined();
    });
  });

  describe("TTL expiry", () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("entries expire after TTL", () => {
      cache.set("breed_stats", { total: 100 }, 1000); // 1 second TTL
      expect(cache.get("breed_stats")).toEqual({ total: 100 });

      vi.advanceTimersByTime(1500);
      expect(cache.get("breed_stats")).toBeUndefined();
    });

    it("entries persist before TTL expires", () => {
      cache.set("breed_stats", { total: 100 }, 5000); // 5 second TTL
      vi.advanceTimersByTime(3000);
      expect(cache.get("breed_stats")).toEqual({ total: 100 });
    });
  });

  describe("getStats", () => {
    it("returns cache statistics", () => {
      cache.set("breed_stats", { total: 100 });
      const stats = cache.getStats();
      expect(stats).toBeDefined();
      expect(stats.keys).toBe(1);
    });
  });
});
