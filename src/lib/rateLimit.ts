import { createHash } from "crypto";

import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { headers } from "next/headers";

type RateLimitBucket = {
  count: number;
  resetAt: number;
};

type RateLimitOptions = {
  identifier: string;
  limit: number;
  namespace: string;
  windowMs: number;
};

type RateLimitResult = {
  ok: boolean;
  remaining: number;
  retryAfterMs: number;
  resetAt: number;
};

/**
 * Raised when production rate limiting is requested without a shared backend
 * configured.
 */
class RateLimitConfigurationError extends Error {
  constructor(message = "Shared rate limiting is not configured.") {
    super(message);
    this.name = "RateLimitConfigurationError";
  }
}

declare global {
  var __appRateLimitStore: Map<string, RateLimitBucket> | undefined;
  var __appRateLimitLastPruneAt: number | undefined;
}

const rateLimitStore =
  globalThis.__appRateLimitStore ?? new Map<string, RateLimitBucket>();
globalThis.__appRateLimitStore = rateLimitStore;

/**
 * Builds the in-memory bucket key for a namespace and hashed identifier pair.
 */
function getStoreKey(namespace: string, identifier: string) {
  return `${namespace}:${identifier}`;
}

/**
 * Hashes potentially sensitive identifiers before they are used in caches,
 * logs, or third-party rate-limit backends.
 */
function hashValue(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

/**
 * Removes expired in-memory buckets on a coarse interval to keep the local
 * development store bounded.
 */
function pruneExpiredBuckets(now: number) {
  const lastPruneAt = globalThis.__appRateLimitLastPruneAt ?? 0;
  if (now - lastPruneAt < 60_000) {
    return;
  }

  for (const [key, bucket] of rateLimitStore.entries()) {
    if (bucket.resetAt <= now) {
      rateLimitStore.delete(key);
    }
  }

  globalThis.__appRateLimitLastPruneAt = now;
}

const redisUrl =
  process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL;
const redisToken =
  process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN;

const redis =
  redisUrl && redisToken
    ? new Redis({ url: redisUrl, token: redisToken })
    : null;

/**
 * Reports whether the current runtime should fail closed when shared rate
 * limiting is unavailable.
 */
function isProductionEnvironment() {
  return process.env.NODE_ENV === "production";
}

/**
 * Reports whether a shared Upstash/Redis rate-limit backend is configured.
 */
function hasSharedRateLimitBackend() {
  return redis !== null;
}

/**
 * Reports whether the app can enforce rate limiting in the current runtime,
 * either via the shared backend or via the local development fallback.
 */
export function hasAvailableRateLimitProtection() {
  return hasSharedRateLimitBackend() || !isProductionEnvironment();
}

/**
 * Reuse Upstash limiter instances for identical namespaces and windows instead
 * of rebuilding them on every request.
 */
const upstashRateLimiters = new Map<string, Ratelimit>();
const ratelimitCache = new Map<string, number>();

/**
 * Consumes one rate-limit token for the given namespace and identifier.
 * Uses the shared Upstash backend when configured, falls back to an in-memory
 * store during local development, and throws in production if no shared backend
 * is available so callers can fail closed.
 */
export async function consumeRateLimit({
  identifier,
  limit,
  namespace,
  windowMs,
}: RateLimitOptions): Promise<RateLimitResult> {
  const now = Date.now();

  if (redis) {
    const cacheKey = `${namespace}-${limit}-${windowMs}`;
    let upstashLimiter = upstashRateLimiters.get(cacheKey);

    if (!upstashLimiter) {
      upstashLimiter = new Ratelimit({
        redis,
        limiter: Ratelimit.fixedWindow(limit, `${windowMs} ms`),
        ephemeralCache: ratelimitCache,
        prefix: `ratelimit:${namespace}`,
      });
      upstashRateLimiters.set(cacheKey, upstashLimiter);
    }

    const { success, remaining, reset } =
      await upstashLimiter.limit(identifier);
    return {
      ok: success,
      remaining,
      retryAfterMs: Math.max(reset - now, 0),
      resetAt: reset,
    };
  }

  if (isProductionEnvironment()) {
    throw new RateLimitConfigurationError();
  }

  /**
   * Local development falls back to in-memory buckets when no shared backend is
   * configured.
   */
  pruneExpiredBuckets(now);
  const key = getStoreKey(namespace, identifier);
  const existingBucket = rateLimitStore.get(key);
  const activeBucket =
    existingBucket && existingBucket.resetAt > now
      ? existingBucket
      : { count: 0, resetAt: now + windowMs };

  if (activeBucket.count >= limit) {
    rateLimitStore.set(key, activeBucket);
    return {
      ok: false,
      remaining: 0,
      retryAfterMs: Math.max(activeBucket.resetAt - now, 0),
      resetAt: activeBucket.resetAt,
    };
  }

  activeBucket.count += 1;
  rateLimitStore.set(key, activeBucket);

  return {
    ok: true,
    remaining: Math.max(limit - activeBucket.count, 0),
    retryAfterMs: Math.max(activeBucket.resetAt - now, 0),
    resetAt: activeBucket.resetAt,
  };
}

/**
 * Builds a privacy-preserving identifier for anonymous clients from request
 * headers. Raw IP and header values stay local to this function and are hashed
 * before being used as a cache or rate-limit key.
 */
export async function getClientRateLimitIdentifier() {
  const headerList = await headers();
  const forwardedFor =
    headerList.get("x-forwarded-for") ??
    headerList.get("x-real-ip") ??
    headerList.get("cf-connecting-ip") ??
    headerList.get("x-vercel-forwarded-for") ??
    "";
  const ip = forwardedFor.split(",")[0]?.trim() ?? "";
  const userAgent = headerList.get("user-agent") ?? "unknown";
  const acceptLanguage = headerList.get("accept-language") ?? "unknown";

  return hashValue(`${ip}|${userAgent}|${acceptLanguage}`);
}

/**
 * Hashes a stable user id before it is used as a rate-limit key so caches and
 * logs do not need to retain the raw identifier.
 */
export function getUserRateLimitIdentifier(userId: string) {
  return getSensitiveRateLimitIdentifier(userId);
}

/** Hashes any stable sensitive value before it is used as a rate-limit key. */
export function getSensitiveRateLimitIdentifier(value: string) {
  return hashValue(value);
}
