import {
  BASE_INTERVAL_MS,
  MAX_INTERVAL_MS,
  MIN_INTERVAL_MS,
  pollIntervalMs,
  secondsLeftInUtcDay,
} from '../poll-interval';

const FULL_DAY_SECONDS = 86_400;

/**
 * A healthy morning: enough budget that pacing is well below the base interval
 * and has no say, so each test can vary one thing at a time.
 */
const HEALTHY = {
  pollableCredits: 100_000,
  costPerPoll: 3,
  consecutiveFailures: 0,
  secondsLeftToday: FULL_DAY_SECONDS,
  now: 0,
} as const;

describe('pollIntervalMs', () => {
  it('uses the base interval when there is budget to spare', () => {
    expect(pollIntervalMs(HEALTHY)).toBe(BASE_INTERVAL_MS);
  });

  it('stretches the interval to make a thin budget last the rest of the day', () => {
    // 30 credits at 3 a poll is 10 polls; six hours left means one every 36 min,
    // which the cap then brings down to five.
    const interval = pollIntervalMs({
      ...HEALTHY,
      pollableCredits: 30,
      secondsLeftToday: 6 * 3600,
    });
    expect(interval).toBe(MAX_INTERVAL_MS);
  });

  it('paces without hitting the cap when the numbers allow it', () => {
    const interval = pollIntervalMs({
      ...HEALTHY,
      pollableCredits: 300,
      costPerPoll: 3,
      secondsLeftToday: 4000,
    });
    // 100 polls over 4000 seconds is one every 40 seconds.
    expect(interval).toBe(40_000);
  });

  it('goes quiet rather than retrying when a single poll is unaffordable', () => {
    expect(pollIntervalMs({ ...HEALTHY, pollableCredits: 2, costPerPoll: 3 })).toBe(
      MAX_INTERVAL_MS
    );
  });

  it('backs off exponentially while the server is failing', () => {
    const first = pollIntervalMs({ ...HEALTHY, consecutiveFailures: 1 });
    const second = pollIntervalMs({ ...HEALTHY, consecutiveFailures: 2 });
    expect(first).toBe(BASE_INTERVAL_MS * 2);
    expect(second).toBe(BASE_INTERVAL_MS * 4);
  });

  it('stops backing off at the cap instead of growing without bound', () => {
    expect(pollIntervalMs({ ...HEALTHY, consecutiveFailures: 99 })).toBe(MAX_INTERVAL_MS);
  });

  it('waits as long as a Retry-After asks, even when nothing else would', () => {
    const interval = pollIntervalMs({ ...HEALTHY, retryAfter: 90_000, now: 0 });
    expect(interval).toBe(90_000);
  });

  it('ignores a Retry-After that has already passed', () => {
    expect(pollIntervalMs({ ...HEALTHY, retryAfter: 500, now: 10_000 })).toBe(BASE_INTERVAL_MS);
  });

  it('never returns an interval that would outrun the API resolution', () => {
    // Nothing in the inputs should be able to drive it below the floor.
    expect(
      pollIntervalMs({ ...HEALTHY, secondsLeftToday: 0, pollableCredits: 4000 })
    ).toBeGreaterThanOrEqual(MIN_INTERVAL_MS);
  });
});

describe('secondsLeftInUtcDay', () => {
  it('counts down to UTC midnight, not the local one', () => {
    const noonUtc = Date.UTC(2026, 0, 15, 12, 0, 0);
    expect(secondsLeftInUtcDay(noonUtc)).toBe(FULL_DAY_SECONDS / 2);
  });

  it('returns a whole day immediately after the rollover', () => {
    expect(secondsLeftInUtcDay(Date.UTC(2026, 0, 15, 0, 0, 0))).toBe(FULL_DAY_SECONDS);
  });
});
