interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

// Simple in-memory TTL cache. Not shared across processes — fine for this scope.
export class TtlCache {
  private store = new Map<string, CacheEntry<unknown>>();

  get<T>(key: string): T | undefined {
    const entry = this.store.get(key);
    if (!entry) return undefined;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return undefined;
    }
    return entry.value as T;
  }

  set<T>(key: string, value: T, ttlMs: number): void {
    this.store.set(key, { value, expiresAt: Date.now() + ttlMs });
  }

  has(key: string): boolean {
    return this.get(key) !== undefined;
  }
}

export const cache = new TtlCache();

export const CACHE_TTL_MS = {
  user: Number(process.env.USER_CACHE_TTL_MS ?? 300_000),
  kundli: Number(process.env.KUNDLI_CACHE_TTL_MS ?? 300_000),
  horoscope: Number(process.env.HOROSCOPE_CACHE_TTL_MS ?? 60_000),
  panchang: Number(process.env.PANCHANG_CACHE_TTL_MS ?? 3_600_000),
};
