// Best-effort, in-memory limiter. On serverless hosting each instance keeps its
// own counts, so this slows down casual abuse but is not a hard guarantee.
// Pair it with a monthly spend limit in the Anthropic Console.

type Window = { count: number; resetAt: number };

const buckets = new Map<string, Window>();

export function checkRateLimit(key: string, limit: number, windowMs: number, now = Date.now()) {
  const current = buckets.get(key);
  if (!current || current.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    pruneExpired(now);
    return { allowed: true, retryAfterSeconds: 0 };
  }
  if (current.count >= limit) {
    return { allowed: false, retryAfterSeconds: Math.ceil((current.resetAt - now) / 1000) };
  }
  current.count++;
  return { allowed: true, retryAfterSeconds: 0 };
}

function pruneExpired(now: number) {
  if (buckets.size < 10_000) return;
  for (const [key, window] of buckets) {
    if (window.resetAt <= now) buckets.delete(key);
  }
}

export function clientKey(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  return forwarded?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "unknown";
}
