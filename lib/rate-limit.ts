import "server-only";

/* ===========================================================================
   Rate limiting for the endpoints an attacker gets unlimited free guesses at:
   sign-in, registration, and anything that sends mail on demand.

   WHAT THIS IS, AND WHAT IT IS NOT
   --------------------------------
   A fixed-window counter in process memory. That is genuinely enough for a
   single Node instance and is dramatically better than nothing, which is what
   was here before. It is NOT enough behind more than one instance: each would
   keep its own counter, so N instances means N times the allowance.

   The interface is deliberately the shape a Redis or Upstash implementation
   would have, so swapping the map for a shared store is a change to this file
   and nowhere else. `RATE_LIMIT_DRIVER` is the seam when that day comes.

   WHY FIXED WINDOW AND NOT TOKEN BUCKET
   -------------------------------------
   The failure mode of a fixed window is a burst at a window boundary — up to
   2x the limit across two adjacent windows. For login that is 10 attempts
   instead of 5 in the worst case, against bcrypt at cost 12. That is not the
   attack anyone is worried about, and the simpler code is easier to be sure
   about.
   ========================================================================= */

export type RateLimitResult = {
  ok: boolean;
  /** Attempts left in this window. */
  remaining: number;
  /** When the window resets, for a Retry-After header or a human message. */
  resetAt: Date;
};

type Window = { count: number; resetAt: number };

const windows = new Map<string, Window>();

/**
 * Sweep expired windows.
 *
 * Without this the map is an unbounded leak keyed by IP: every address that
 * ever hits a limited endpoint stays resident forever. Sweeping on write is
 * cheaper than an interval timer and, unlike a timer, cannot keep the process
 * alive on its own.
 */
function sweep(now: number) {
  if (windows.size < 512) return;
  for (const [key, window] of windows) {
    if (window.resetAt <= now) windows.delete(key);
  }
}

/**
 * Is this key already over the limit, without spending an attempt?
 *
 * The distinction matters on sign-in: the check has to happen BEFORE bcrypt so
 * a flood cannot burn the CPU, but a correct password must not consume the
 * budget. Counting successes locked out anyone who legitimately signed in nine
 * times in a quarter of an hour — which is unusual for a person and completely
 * normal for a test suite, which is how it was found.
 */
export function peek(
  key: string,
  { limit }: { limit: number; windowMs: number }
): RateLimitResult {
  const existing = windows.get(key);
  const now = Date.now();

  if (!existing || existing.resetAt <= now) {
    return { ok: true, remaining: limit, resetAt: new Date(now) };
  }

  return {
    ok: existing.count <= limit,
    remaining: Math.max(0, limit - existing.count),
    resetAt: new Date(existing.resetAt),
  };
}

/** Forget a key. Called when a sign-in succeeds. */
export function resetLimit(key: string): void {
  windows.delete(key);
}

export function rateLimit(
  key: string,
  { limit, windowMs }: { limit: number; windowMs: number }
): RateLimitResult {
  const now = Date.now();
  sweep(now);

  const existing = windows.get(key);

  if (!existing || existing.resetAt <= now) {
    const fresh = { count: 1, resetAt: now + windowMs };
    windows.set(key, fresh);
    return { ok: true, remaining: limit - 1, resetAt: new Date(fresh.resetAt) };
  }

  existing.count += 1;

  return {
    ok: existing.count <= limit,
    remaining: Math.max(0, limit - existing.count),
    resetAt: new Date(existing.resetAt),
  };
}

/** Preset windows, named so call sites read as policy rather than arithmetic. */
export const RATE_LIMITS = {
  /**
   * Registration, per IP.
   *
   * Twenty an hour, not five. This is a B2B site: a hospital, a co-working
   * floor or a management company running several practices all present as one
   * address, and five an hour turns a legitimate second or third practice into
   * a lost lead. Twenty still stops a script dead, and the honeypot — checked
   * before this limit, so bots never spend anyone's budget — catches the
   * unsophisticated half before it gets here.
   */
  register: { limit: 20, windowMs: 60 * 60 * 1000 },
  /** Sign-in, per address. Counts FAILED attempts only — see `peek`. */
  login: { limit: 8, windowMs: 15 * 60 * 1000 },
  /** Anything that puts a message in someone's inbox. */
  email: { limit: 10, windowMs: 60 * 60 * 1000 },
  /** Presigned upload grants — each one is a writable URL. */
  upload: { limit: 40, windowMs: 15 * 60 * 1000 },
} as const;

/**
 * The caller's address, as far as it can be trusted.
 *
 * `x-forwarded-for` is client-controlled unless a proxy you own overwrites it,
 * so this is a best-effort key for rate limiting and must never be used for
 * authorisation. Taking the FIRST entry is the convention when the edge
 * appends; behind a proxy that prepends, take the last.
 */
export function clientIp(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]!.trim();
  return headers.get("x-real-ip")?.trim() || "unknown";
}
