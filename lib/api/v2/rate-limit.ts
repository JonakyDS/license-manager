/**
 * Rate Limiting Configuration
 *
 * Uses Upstash Redis for serverless-compatible rate limiting.
 * Free tier supports 10,000 commands/day which is plenty for license validation.
 *
 * Setup:
 * 1. Add Upstash Redis integration in Vercel (automatically adds KV_REST_API_URL and KV_REST_API_TOKEN)
 * 2. Or create manually at https://console.upstash.com and add env vars
 */

import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { NextResponse } from "next/server";
import type { ApiErrorResponse } from "./types";

// ============================================================================
// Rate Limiter Instances
// ============================================================================

/**
 * Check if Upstash Redis is configured.
 * Rate limiting will be skipped if not configured (development mode).
 */
function isRateLimitConfigured(): boolean {
  return !!(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);
}

/**
 * Create Redis client (lazy initialization).
 */
let redis: Redis | null = null;
function getRedis(): Redis | null {
  if (!isRateLimitConfigured()) return null;

  if (!redis) {
    redis = new Redis({
      url: process.env.KV_REST_API_URL!,
      token: process.env.KV_REST_API_TOKEN!,
    });
  }
  return redis;
}

/**
 * Rate limiter for general API requests.
 * Limit: 60 requests per hour per IP address.
 */
let generalLimiter: Ratelimit | null = null;
function getGeneralLimiter(): Ratelimit | null {
  const redisClient = getRedis();
  if (!redisClient) return null;

  if (!generalLimiter) {
    generalLimiter = new Ratelimit({
      redis: redisClient,
      limiter: Ratelimit.slidingWindow(60, "1 h"),
      prefix: "license-api:general",
      analytics: true,
    });
  }
  return generalLimiter;
}

/**
 * Rate limiter for activation requests.
 * Limit: 60 activations per hour per IP address.
 */
let activationLimiter: Ratelimit | null = null;
function getActivationLimiter(): Ratelimit | null {
  const redisClient = getRedis();
  if (!redisClient) return null;

  if (!activationLimiter) {
    activationLimiter = new Ratelimit({
      redis: redisClient,
      limiter: Ratelimit.slidingWindow(60, "1 h"),
      prefix: "license-api:activation",
      analytics: true,
    });
  }
  return activationLimiter;
}

/**
 * Rate limiter for list requests (higher limit for read operations).
 * Limit: 60 requests per minute per IP address.
 */
let listLimiter: Ratelimit | null = null;
function getListLimiter(): Ratelimit | null {
  const redisClient = getRedis();
  if (!redisClient) return null;

  if (!listLimiter) {
    listLimiter = new Ratelimit({
      redis: redisClient,
      limiter: Ratelimit.slidingWindow(60, "1 m"),
      prefix: "license-api:list",
      analytics: true,
    });
  }
  return listLimiter;
}

/**
 * Rate limiter for failed attempts (brute force protection).
 * Limit: 60 failed attempts per hour per license key.
 */
let failedAttemptLimiter: Ratelimit | null = null;
function getFailedAttemptLimiter(): Ratelimit | null {
  const redisClient = getRedis();
  if (!redisClient) return null;

  if (!failedAttemptLimiter) {
    failedAttemptLimiter = new Ratelimit({
      redis: redisClient,
      limiter: Ratelimit.slidingWindow(60, "1 h"),
      prefix: "license-api:failed",
      analytics: true,
    });
  }
  return failedAttemptLimiter;
}

// ============================================================================
// Rate Limit Types
// ============================================================================

export type RateLimitType = "general" | "activation" | "failed" | "list";

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
}

// ============================================================================
// Rate Limit Functions
// ============================================================================

/**
 * Extract client identifier from request (IP address).
 */
export function getClientIdentifier(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  const realIp = request.headers.get("x-real-ip");

  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  if (realIp) {
    return realIp;
  }

  return "unknown";
}

/**
 * Check rate limit for a given identifier and type.
 * Returns null if rate limiting is not configured (allows request to proceed).
 */
export async function checkRateLimit(
  identifier: string,
  type: RateLimitType = "general"
): Promise<RateLimitResult | null> {
  let limiter: Ratelimit | null;

  switch (type) {
    case "activation":
      limiter = getActivationLimiter();
      break;
    case "failed":
      limiter = getFailedAttemptLimiter();
      break;
    case "list":
      limiter = getListLimiter();
      break;
    default:
      limiter = getGeneralLimiter();
  }

  if (!limiter) {
    // Rate limiting not configured, allow all requests
    return null;
  }

  const result = await limiter.limit(identifier);

  return {
    success: result.success,
    limit: result.limit,
    remaining: result.remaining,
    reset: result.reset,
  };
}

/**
 * Record a failed attempt for brute force protection.
 */
export async function recordFailedAttempt(licenseKey: string): Promise<void> {
  const limiter = getFailedAttemptLimiter();
  if (limiter) {
    await limiter.limit(`failed:${licenseKey}`);
  }
}

/**
 * Check if a license key is blocked due to too many failed attempts.
 */
export async function isLicenseKeyBlocked(
  licenseKey: string
): Promise<boolean> {
  const limiter = getFailedAttemptLimiter();
  if (!limiter) return false;

  const result = await limiter.limit(`failed:${licenseKey}`);
  return !result.success;
}

// ============================================================================
// Response Helpers
// ============================================================================

/**
 * Create rate limit exceeded error response.
 */
export function rateLimitExceededResponse(
  result: RateLimitResult
): NextResponse<ApiErrorResponse> {
  const retryAfter = Math.ceil((result.reset - Date.now()) / 1000);

  return NextResponse.json(
    {
      success: false,
      error: {
        code: "RATE_LIMIT_EXCEEDED" as const,
        message: `Too many requests. Please try again in ${retryAfter} seconds.`,
      },
    } as ApiErrorResponse,
    {
      status: 429,
      headers: {
        "Retry-After": String(retryAfter),
        "X-RateLimit-Limit": String(result.limit),
        "X-RateLimit-Remaining": String(result.remaining),
        "X-RateLimit-Reset": String(result.reset),
        "Cache-Control": "no-store, no-cache, must-revalidate",
        "X-API-Version": "2.0",
        "X-API-Type": "server-to-server",
      },
    }
  );
}

/**
 * Add rate limit headers to a successful response.
 */
export function addRateLimitHeaders(
  response: NextResponse,
  result: RateLimitResult | null
): NextResponse {
  if (result) {
    response.headers.set("X-RateLimit-Limit", String(result.limit));
    response.headers.set("X-RateLimit-Remaining", String(result.remaining));
    response.headers.set("X-RateLimit-Reset", String(result.reset));
  }
  return response;
}
