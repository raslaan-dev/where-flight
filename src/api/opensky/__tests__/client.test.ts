import {
  headersOf,
  installFetchMock,
  jsonResponse,
  urlOf,
  type FetchMock,
} from '@/test-utils/fetch-mock';
import { fetchStates, type ClientContext } from '../client';
import { isApiError } from '../errors';
import { resetTokenManager } from '../token';

const UK = { lamin: 49.9, lomin: -8.6, lamax: 59.4, lomax: 1.8 };
const EMPTY_STATES = { time: 1_700_000_000, states: null };
const TOKEN_BODY = { access_token: 'token-a', expires_in: 1800 };
const CREDENTIALS = { clientId: 'a', clientSecret: 'b' };

function context(overrides: Partial<ClientContext> = {}): ClientContext {
  return { credentials: null, isOnline: true, remainingCredits: 400, ...overrides };
}

/** Resolves each queued response in turn. */
function respondWith(...responses: Response[]): FetchMock {
  let index = 0;
  return installFetchMock(jest.fn(async () => responses[Math.min(index++, responses.length - 1)]));
}

async function kindOf(promise: Promise<unknown>): Promise<string> {
  const error = await promise.then(
    () => null,
    (e: unknown) => e
  );
  return isApiError(error) ? error.kind : `not an ApiError: ${String(error)}`;
}

beforeEach(() => {
  resetTokenManager();
  jest.restoreAllMocks();
});

describe('fetchStates', () => {
  it('requests the bounding box and returns a mapped snapshot', async () => {
    const fetchMock = respondWith(jsonResponse(EMPTY_STATES));

    const snapshot = await fetchStates(UK, context());

    expect(snapshot.aircraft).toEqual([]);
    expect(urlOf(fetchMock, 0)).toContain(
      '/states/all?lamin=49.9&lomin=-8.6&lamax=59.4&lomax=1.8'
    );
  });

  it('omits the query entirely for a global request', async () => {
    const fetchMock = respondWith(jsonResponse(EMPTY_STATES));
    await fetchStates(null, context());
    expect(urlOf(fetchMock, 0)).toBe('https://opensky-network.org/api/states/all');
  });

  it('sends no Authorization header in anonymous mode', async () => {
    const fetchMock = respondWith(jsonResponse(EMPTY_STATES));
    await fetchStates(UK, context());
    expect(headersOf(fetchMock, 0).Authorization).toBeUndefined();
  });

  it('attaches a bearer token when credentials are configured', async () => {
    const fetchMock = respondWith(jsonResponse(TOKEN_BODY), jsonResponse(EMPTY_STATES));
    await fetchStates(UK, context({ credentials: CREDENTIALS }));
    expect(headersOf(fetchMock, 1).Authorization).toBe('Bearer token-a');
  });
});

describe('gates', () => {
  it('refuses to spend credits it does not have, without a network call', async () => {
    const fetchMock = installFetchMock();
    expect(await kindOf(fetchStates(UK, context({ remainingCredits: 0 })))).toBe(
      'BUDGET_EXHAUSTED'
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('fails fast when offline rather than waiting for a timeout', async () => {
    const fetchMock = installFetchMock();
    expect(await kindOf(fetchStates(UK, context({ isOnline: false })))).toBe('OFFLINE');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('checks the budget before the network, so an offline app still warns about credits', async () => {
    installFetchMock();
    expect(
      await kindOf(fetchStates(UK, context({ isOnline: false, remainingCredits: 0 })))
    ).toBe('BUDGET_EXHAUSTED');
  });

  it('reports the cost actually charged for the viewport', async () => {
    respondWith(jsonResponse(EMPTY_STATES));
    const onCreditsSpent = jest.fn();
    // The UK box is roughly 98 square degrees, inside the 2-credit tier.
    await fetchStates(UK, context({ onCreditsSpent }));
    expect(onCreditsSpent).toHaveBeenCalledWith(2);
  });

  it('does not charge for a request that failed', async () => {
    respondWith(jsonResponse({}, { status: 503 }));
    const onCreditsSpent = jest.fn();
    await kindOf(fetchStates(UK, context({ onCreditsSpent })));
    expect(onCreditsSpent).not.toHaveBeenCalled();
  });

  it("reports the server's own remaining-credit figure, which outranks the local estimate", async () => {
    respondWith(jsonResponse(EMPTY_STATES, { headers: { 'X-Rate-Limit-Remaining': '312' } }));
    const onRemainingReported = jest.fn();
    await fetchStates(UK, context({ onRemainingReported }));
    expect(onRemainingReported).toHaveBeenCalledWith(312);
  });

  it('says nothing when the header is absent, rather than reporting zero remaining', async () => {
    // The anonymous tier omits the header, and `Number(null)` is 0 — reading
    // that as the truth wipes out the whole allowance after one request.
    respondWith(jsonResponse(EMPTY_STATES));
    const onRemainingReported = jest.fn();
    await fetchStates(UK, context({ onRemainingReported }));
    expect(onRemainingReported).not.toHaveBeenCalled();
  });

  it('ignores a non-numeric header rather than trusting it', async () => {
    respondWith(jsonResponse(EMPTY_STATES, { headers: { 'X-Rate-Limit-Remaining': 'n/a' } }));
    const onRemainingReported = jest.fn();
    await fetchStates(UK, context({ onRemainingReported }));
    expect(onRemainingReported).not.toHaveBeenCalled();
  });
});

describe('failure mapping', () => {
  it.each([
    [429, 'RATE_LIMITED'],
    [503, 'SERVER'],
    [400, 'BAD_REQUEST'],
  ])('maps HTTP %i onto %s', async (status, kind) => {
    respondWith(jsonResponse({}, { status }));
    expect(await kindOf(fetchStates(UK, context()))).toBe(kind);
  });

  it('carries Retry-After through so polling can back off honestly', async () => {
    respondWith(jsonResponse({}, { status: 429, headers: { 'Retry-After': '30' } }));
    const error = await fetchStates(UK, context()).catch((e: unknown) => e);
    expect(isApiError(error) && error.retryAfter).toBeGreaterThan(Date.now() + 25_000);
  });

  it('rejects an HTML body served with a 200, which OpenSky does when its gateway fails', async () => {
    respondWith(
      jsonResponse('<html>502 Bad Gateway</html>', { headers: { 'Content-Type': 'text/html' } })
    );
    expect(await kindOf(fetchStates(UK, context()))).toBe('BAD_PAYLOAD');
  });

  it('rejects JSON that is not a states response', async () => {
    respondWith(jsonResponse({ unexpected: true }));
    expect(await kindOf(fetchStates(UK, context()))).toBe('BAD_PAYLOAD');
  });

  it('reports a dropped connection as OFFLINE', async () => {
    installFetchMock(
      jest.fn(async () => {
        throw new TypeError('Network request failed');
      })
    );
    expect(await kindOf(fetchStates(UK, context()))).toBe('OFFLINE');
  });

  it('reports an aborted request as TIMEOUT', async () => {
    installFetchMock(
      jest.fn(async () => {
        const error = new Error('Aborted');
        error.name = 'AbortError';
        throw error;
      })
    );
    expect(await kindOf(fetchStates(UK, context()))).toBe('TIMEOUT');
  });
});

describe('401 handling', () => {
  it('re-mints the token once and retries', async () => {
    const fetchMock = respondWith(
      jsonResponse({ access_token: 'stale', expires_in: 1800 }),
      jsonResponse({}, { status: 401 }),
      jsonResponse({ access_token: 'fresh', expires_in: 1800 }),
      jsonResponse(EMPTY_STATES)
    );

    const snapshot = await fetchStates(UK, context({ credentials: CREDENTIALS }));

    expect(snapshot.aircraft).toEqual([]);
    expect(headersOf(fetchMock, 3).Authorization).toBe('Bearer fresh');
  });

  it('gives up after one retry instead of looping on a rejected credential', async () => {
    const fetchMock = respondWith(
      jsonResponse(TOKEN_BODY),
      jsonResponse({}, { status: 401 }),
      jsonResponse(TOKEN_BODY),
      jsonResponse({}, { status: 401 })
    );

    expect(await kindOf(fetchStates(UK, context({ credentials: CREDENTIALS })))).toBe(
      'AUTH_INVALID'
    );
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });

  it('does not retry an anonymous 401, which is a permanent answer', async () => {
    const fetchMock = respondWith(jsonResponse({}, { status: 401 }));
    expect(await kindOf(fetchStates(UK, context()))).toBe('AUTH_INVALID');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
