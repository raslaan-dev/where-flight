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
    expect(banner?.message).toContain('Could not refresh');
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
