import NodeCache from "node-cache";
import { CACHE_TTL } from "../constants.js";

type CacheKey =
  | "breed_stats"
  | "statistics"
  | "organizations"
  | `filter_counts:${string}`
  | `image:${string}`;

export class CacheService {
  private cache: NodeCache;

  constructor() {
    // Default TTL of 10 minutes, check for expired keys every 2 minutes
    this.cache = new NodeCache({
      stdTTL: CACHE_TTL.STATISTICS / 1000,
      checkperiod: 120,
      useClones: false,
    });
  }

  get<T>(key: CacheKey): T | undefined {
    return this.cache.get<T>(key);
  }

  set<T>(key: CacheKey, value: T, ttlMs?: number): void {
    if (ttlMs !== undefined) {
      this.cache.set(key, value, ttlMs / 1000);
    } else {
      this.cache.set(key, value);
    }
  }

  has(key: CacheKey): boolean {
    return this.cache.has(key);
  }

  delete(key: CacheKey): void {
    this.cache.del(key);
  }

  flush(): void {
    this.cache.flushAll();
  }

  getStats(): NodeCache.Stats {
    return this.cache.getStats();
  }

  // Convenience methods with built-in TTL
  getBreedStats<T>(): T | undefined {
    return this.get<T>("breed_stats");
  }

  setBreedStats<T>(stats: T): void {
    this.set("breed_stats", stats, CACHE_TTL.BREEDS);
  }

  getStatistics<T>(): T | undefined {
    return this.get<T>("statistics");
  }

  setStatistics<T>(stats: T): void {
    this.set("statistics", stats, CACHE_TTL.STATISTICS);
  }

  getOrganizations<T>(): T | undefined {
    return this.get<T>("organizations");
  }

  setOrganizations<T>(orgs: T): void {
    this.set("organizations", orgs, CACHE_TTL.ORGANIZATIONS);
  }

  getFilterCounts<T>(filterHash: string): T | undefined {
    return this.get<T>(`filter_counts:${filterHash}`);
  }

  setFilterCounts<T>(filterHash: string, counts: T): void {
    this.set(`filter_counts:${filterHash}`, counts, CACHE_TTL.FILTER_COUNTS);
  }

  getImage(url: string): string | undefined {
    return this.get<string>(`image:${url}`);
  }

  setImage(url: string, base64Data: string): void {
    this.set(`image:${url}`, base64Data, CACHE_TTL.IMAGES);
  }
}

export const cacheService = new CacheService();
