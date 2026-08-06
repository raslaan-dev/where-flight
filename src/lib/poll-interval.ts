/**
 * How long to wait between automatic refreshes.
 *
 * The naive answer — a fixed interval — spends the whole daily allowance
 * before lunch and then leaves the app dead for eighteen hours. This stretches
 * the interval as the budget runs down, backs off on server errors, and honours
 * a `Retry-After` when the server has given one.
 */

/** Comfortably inside OpenSky's 10s anonymous resolution. */
export const BASE_INTERVAL_MS = 15_000;

/** Requesting faster than this cannot return new data, only spend credits. */
export const MIN_INTERVAL_MS = 5_000;

/** Past this, the app is effectively idle and should say so rather than poll. */
export const MAX_INTERVAL_MS = 300_000;

export type PollInput = {
  /** Credits background polling may still spend today. */
  pollableCredits: number;
  /** Credits one refresh of the current viewport costs. */
  costPerPoll: number;
  /** Consecutive failures since the last success. */
  consecutiveFailures: number;
  /** Unix ms from a `Retry-After` header, when the server sent one. */
  retryAfter?: number | null;
  /** Seconds remaining in the UTC day, so the budget can be paced across it. */
  secondsLeftToday: number;
  now?: number;
};

/**
 * Doubling per failure, capped. Hammering a struggling server is how a client
 * gets rate-limited into a worse position than the one it started in.
 */
function backoffMultiplier(consecutiveFailures: number): number {
  return Math.min(2 ** Math.min(consecutiveFailures, 5), 32);
}

export function pollIntervalMs({
  pollableCredits,
  costPerPoll,
  consecutiveFailures,
  retryAfter = null,
  secondsLeftToday,
  now = Date.now(),
}: PollInput): number {
  if (pollableCredits < costPerPoll) return MAX_INTERVAL_MS;

  // Spread what is left evenly over what is left of the day. Early on this is
  // far below the base interval and has no effect; late in the day it is what
  // keeps the app alive at all.
  const pollsAffordable = Math.floor(pollableCredits / costPerPoll);
  const pacedMs = (Math.max(0, secondsLeftToday) / Math.max(1, pollsAffordable)) * 1000;

  const interval = Math.max(BASE_INTERVAL_MS, pacedMs) * backoffMultiplier(consecutiveFailures);

  // A server that named a time outranks every local calculation.
  const untilRetryAfter = retryAfter === null ? 0 : retryAfter - now;

  return Math.min(MAX_INTERVAL_MS, Math.max(MIN_INTERVAL_MS, interval, untilRetryAfter));
}

/** Seconds until the next UTC midnight, which is when the allowance resets. */
export function secondsLeftInUtcDay(now: number = Date.now()): number {
  const date = new Date(now);
  const midnight = Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate() + 1,
    0,
    0,
    0,
    0
  );
  return Math.max(0, (midnight - now) / 1000);
}
