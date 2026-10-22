import { Ratelimit } from "@upstash/ratelimit";
import { redis } from "./redis";

/**
 * Limits anonymous paste creation to 10 requests per minute per IP.
 * Uses a sliding window so bursts cannot exceed the limit at window edges.
 */
export const createPasteLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, "1m"),
  prefix: "ratelimit:create",
  ephemeralCache: new Map(),
});

export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }

  return request.headers.get("x-real-ip")?.trim() || "unknown";
}
