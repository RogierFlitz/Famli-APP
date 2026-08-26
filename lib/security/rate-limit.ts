type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

export type RateLimitScope =
  | "login"
  | "password_reset"
  | "invite"
  | "upload"
  | "mutation"
  | "search"
  | "sensitive";

const LIMITS: Record<RateLimitScope, { max: number; windowMs: number }> = {
  login: { max: 10, windowMs: 15 * 60_000 },
  password_reset: { max: 5, windowMs: 60 * 60_000 },
  invite: { max: 20, windowMs: 60 * 60_000 },
  upload: { max: 30, windowMs: 60 * 60_000 },
  mutation: { max: 120, windowMs: 60_000 },
  search: { max: 60, windowMs: 60_000 },
  sensitive: { max: 10, windowMs: 60_000 },
};

function bucketKey(scope: RateLimitScope, identifier: string): string {
  return `${scope}:${identifier}`;
}

export function checkRateLimit(
  scope: RateLimitScope,
  identifier: string,
): { allowed: boolean; retryAfterMs: number } {
  const config = LIMITS[scope];
  const key = bucketKey(scope, identifier);
  const now = Date.now();
  let bucket = buckets.get(key);

  if (!bucket || now >= bucket.resetAt) {
    bucket = { count: 0, resetAt: now + config.windowMs };
    buckets.set(key, bucket);
  }

  bucket.count += 1;
  if (bucket.count > config.max) {
    return { allowed: false, retryAfterMs: Math.max(0, bucket.resetAt - now) };
  }
  return { allowed: true, retryAfterMs: 0 };
}

export function assertRateLimit(scope: RateLimitScope, identifier: string): void {
  const result = checkRateLimit(scope, identifier);
  if (!result.allowed) {
    throw new Error("Te veel verzoeken. Probeer het later opnieuw.");
  }
}

/** Test helper — clears in-memory buckets. */
export function resetRateLimitsForTests(): void {
  buckets.clear();
}
