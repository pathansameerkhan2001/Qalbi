import "server-only";

/**
 * Best-effort in-memory fixed-window rate limiter.
 * On serverless platforms each instance keeps its own counters; for strict
 * limits, replace with a shared store (e.g. Upstash Redis / Vercel KV).
 */
const buckets = new Map<string, { count: number; resetAt: number }>();

export function rateLimit(key: string, limit: number, windowMs: number): { allowed: boolean; retryAfterSeconds: number } {
  const now = Date.now();
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    if (buckets.size > 5000) {
      for (const [k, b] of buckets) if (b.resetAt <= now) buckets.delete(k);
    }
    return { allowed: true, retryAfterSeconds: 0 };
  }
  bucket.count += 1;
  return { allowed: bucket.count <= limit, retryAfterSeconds: Math.ceil((bucket.resetAt - now) / 1000) };
}

export function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  return forwarded?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "unknown";
}
