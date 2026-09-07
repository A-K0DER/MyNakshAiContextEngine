import { getUser } from "../services/userService";
import { getKundli } from "../services/kundliService";
import { getHoroscope } from "../services/horoscopeService";
import { getPanchang } from "../services/panchangService";
import { todayDateString } from "../services/mockData";
import { cache, CACHE_TTL_MS } from "./cache";
import {
  FetchedContext,
  HoroscopeProfile,
  KundliProfile,
  PanchangInfo,
  ServiceResult,
  UserProfile,
} from "../types";

const CALL_TIMEOUT_MS = 1000;
const MAX_RETRIES = 2;
const BASE_BACKOFF_MS = 150;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("timeout")), timeoutMs);
    promise
      .then((value) => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
  });
}

async function callWithRetry<T>(fn: () => Promise<T>): Promise<{ data: T; attempts: number }> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= MAX_RETRIES + 1; attempt++) {
    try {
      const data = await withTimeout(fn(), CALL_TIMEOUT_MS);
      return { data, attempts: attempt };
    } catch (err) {
      lastError = err;
      if (attempt <= MAX_RETRIES) {
        await sleep(BASE_BACKOFF_MS * 2 ** (attempt - 1));
      }
    }
  }
  throw lastError;
}

async function fetchCached<T>(
  cacheKey: string,
  ttlMs: number,
  fn: () => Promise<T>,
): Promise<ServiceResult<T>> {
  const start = Date.now();
  const cached = cache.get<T>(cacheKey);
  if (cached !== undefined) {
    return {
      status: "fulfilled",
      data: cached,
      cacheHit: true,
      latencyMs: Date.now() - start,
      attempts: 0,
    };
  }
  try {
    const { data, attempts } = await callWithRetry(fn);
    cache.set(cacheKey, data, ttlMs);
    return {
      status: "fulfilled",
      data,
      cacheHit: false,
      latencyMs: Date.now() - start,
      attempts,
    };
  } catch (err) {
    return {
      status: "failed",
      data: null,
      error: err instanceof Error ? err.message : String(err),
      cacheHit: false,
      latencyMs: Date.now() - start,
      attempts: MAX_RETRIES + 1,
    };
  }
}

export async function fetchAllContext(userId: string): Promise<FetchedContext> {
  const date = todayDateString();

  const [user, kundli, horoscope, panchang] = await Promise.allSettled([
    fetchCached<UserProfile>(`user:${userId}`, CACHE_TTL_MS.user, () => getUser(userId)),
    fetchCached<KundliProfile>(`kundli:${userId}`, CACHE_TTL_MS.kundli, () => getKundli(userId)),
    fetchCached<HoroscopeProfile>(`horoscope:${userId}`, CACHE_TTL_MS.horoscope, () =>
      getHoroscope(userId),
    ),
    fetchCached<PanchangInfo>(`panchang:${date}`, CACHE_TTL_MS.panchang, () => getPanchang()),
  ]);

  // fetchCached never rejects (it catches internally), so allSettled entries are always "fulfilled".
  return {
    user: user.status === "fulfilled" ? user.value : failedResult("orchestrator error"),
    kundli: kundli.status === "fulfilled" ? kundli.value : failedResult("orchestrator error"),
    horoscope: horoscope.status === "fulfilled" ? horoscope.value : failedResult("orchestrator error"),
    panchang: panchang.status === "fulfilled" ? panchang.value : failedResult("orchestrator error"),
  };
}

function failedResult<T>(error: string): ServiceResult<T> {
  return { status: "failed", data: null, error, cacheHit: false, latencyMs: 0, attempts: 0 };
}
