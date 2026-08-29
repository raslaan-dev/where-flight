import { freshnessBanner, STALE_AFTER_SECONDS } from '../freshness';

const NOW = 1_786_034_585_000;

function at(secondsAgo: number) {
  return NOW - secondsAgo * 1000;
}

const LIVE = {
  isOnline: true,
  fromCache: false,
  lastLoadedAt: at(5),
  errorKind: null,
  now: NOW,
} as const;

describe('freshnessBanner', () => {
  it('says nothing when the data on screen is current', () => {
    expect(freshnessBanner(LIVE)).toBeNull();
  });

  it('states the age of the data when offline, not just that there is no signal', () => {
    const banner = freshnessBanner({ ...LIVE, isOnline: false, lastLoadedAt: at(840) });
    expect(banner?.tone).toBe('warn');
    expect(banner?.message).toContain('14 minutes ago');
  });

  it('admits there is nothing at all when offline with no cache', () => {
    const banner = freshnessBanner({ ...LIVE, isOnline: false, lastLoadedAt: null });
    expect(banner?.message).toContain('nothing to show');
  });

  it('reports a failed refresh as a banner over the old data, not a dead end', () => {
    const banner = freshnessBanner({ ...LIVE, errorKind: 'SERVER', lastLoadedAt: at(120) });
    expect(banner?.tone).toBe('danger');
    expect(banner?.message).toContain('OpenSky is having trouble');
    expect(banner?.message).toContain('2 minutes ago');
  });

  // The bug this replaced: every one of these said only "Could not refresh",
  // so a user with a working account and credits to spare had no way to tell
  // whether the problem was theirs, their allowance, or OpenSky's.
  it.each([
    ['AUTH_INVALID', 'credentials were rejected'],
    ['RATE_LIMITED', 'rate limiting'],
    ['BUDGET_EXHAUSTED', "allowance is used up"],
    ['TIMEOUT', 'timed out'],
    ['SERVER', 'having trouble'],
    ['BAD_PAYLOAD', 'Unexpected response'],
  ] as const)('names %s rather than blaming the refresh generically', (kind, expected) => {
    const banner = freshnessBanner({ ...LIVE, errorKind: kind, lastLoadedAt: at(120) });
    expect(banner?.message).toContain(expected);
    expect(banner?.message).not.toContain('Could not refresh');
  });

  it('does not offer a retry that would make rate limiting worse', () => {
    const banner = freshnessBanner({ ...LIVE, errorKind: 'RATE_LIMITED', lastLoadedAt: at(120) });
    expect(banner?.canRetry).toBe(false);
    // Amber, not red: it clears up on its own and nothing is broken.
    expect(banner?.tone).toBe('warn');
  });

  it('does not offer a retry once the daily allowance is gone', () => {
    const banner = freshnessBanner({
      ...LIVE,
      errorKind: 'BUDGET_EXHAUSTED',
      lastLoadedAt: at(120),
    });
    expect(banner?.canRetry).toBe(false);
    expect(banner?.tone).toBe('warn');
  });

  it('does not offer a retry while the same credentials would be rejected again', () => {
    expect(
      freshnessBanner({ ...LIVE, errorKind: 'AUTH_INVALID', lastLoadedAt: at(120) })?.canRetry
    ).toBe(false);
  });

  it('does offer a retry for a failure that a retry could actually fix', () => {
    expect(
      freshnessBanner({ ...LIVE, errorKind: 'SERVER', lastLoadedAt: at(120) })?.canRetry
    ).toBe(true);
  });

  it('prefers the offline message over the error one, because offline is the cause', () => {
    const banner = freshnessBanner({ ...LIVE, isOnline: false, errorKind: 'OFFLINE' });
    expect(banner?.message).toContain('No connection');
  });

  it('says the data came off disk and that a refresh is on its way', () => {
    const banner = freshnessBanner({ ...LIVE, fromCache: true, lastLoadedAt: at(3600) });
    expect(banner?.tone).toBe('info');
    expect(banner?.message).toContain('1 hour ago');
  });

  it('flags data that has quietly gone stale while the app sat idle', () => {
    const banner = freshnessBanner({ ...LIVE, lastLoadedAt: at(STALE_AFTER_SECONDS + 10) });
    expect(banner?.tone).toBe('warn');
  });

  it('leaves data just inside the staleness threshold alone', () => {
    expect(freshnessBanner({ ...LIVE, lastLoadedAt: at(STALE_AFTER_SECONDS - 1) })).toBeNull();
  });

  it('does not claim a cache age it does not have', () => {
    expect(freshnessBanner({ ...LIVE, fromCache: true, lastLoadedAt: null })).toBeNull();
  });
});
