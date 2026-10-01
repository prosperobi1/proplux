/**
 * Fixed-window, in-memory rate limiting.
 *
 * Counts live in this process: they reset on restart and are not shared
 * across instances — fine for a single-node deploy and for abuse damping,
 * not a substitute for an edge/WAF limit.
 */

const hits = new Map<string, number[]>();

function prune(key: string, windowMs: number, now: number): number[] {
  const arr = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  if (arr.length === 0) hits.delete(key);
  else hits.set(key, arr);
  return arr;
}

function evictIfFull(now: number, windowMs: number) {
  if (hits.size < 5000) return;
  for (const key of [...hits.keys()]) prune(key, windowMs, now);
}

/** Record one attempt for `key` (e.g. a failed login). */
export function recordAttempt(key: string, windowMs: number) {
  const now = Date.now();
  evictIfFull(now, windowMs);
  const arr = prune(key, windowMs, now);
  arr.push(now);
  hits.set(key, arr);
}

/** True once `limit` attempts were recorded for `key` inside the window. Does not record. */
export function attemptsExceeded(key: string, limit: number, windowMs: number): boolean {
  return prune(key, windowMs, Date.now()).length >= limit;
}

/** Forget all recorded attempts for `key` (call after a success). */
export function resetAttempts(key: string) {
  hits.delete(key);
}

/**
 * Count-and-check in one: records the attempt and returns how many seconds to
 * wait when over the limit, or null when allowed. Use for endpoints where
 * every request counts (reset emails, signups): the (limit + 1)-th request in
 * a window gets 429 + Retry-After.
 */
export function rateLimit(key: string, limit: number, windowMs: number): number | null {
  recordAttempt(key, windowMs);
  const now = Date.now();
  const arr = prune(key, windowMs, now);
  if (arr.length <= limit) return null;
  return Math.max(Math.ceil((arr[0] + windowMs - now) / 1000), 1);
}

/** Best-effort client IP for per-IP limits (first X-Forwarded-For hop). */
export function clientIp(req: Request): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown"
  );
}
