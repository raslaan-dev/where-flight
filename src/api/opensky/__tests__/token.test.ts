import { installFetchMock, jsonResponse } from '@/test-utils/fetch-mock';
import { isApiError } from '../errors';
import { getAccessToken, invalidateAccessToken, resetTokenManager } from '../token';

const CREDENTIALS = { clientId: 'test-client', clientSecret: 'test-secret' };

function tokenResponse(accessToken: string, expiresIn = 1800) {
  return jsonResponse({ access_token: accessToken, expires_in: expiresIn });
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

afterEach(() => {
  resetTokenManager();
});

describe('token manager', () => {
  it('mints a token and returns it', async () => {
    installFetchMock(jest.fn(async () => tokenResponse('token-a')));
    await expect(getAccessToken(CREDENTIALS)).resolves.toBe('token-a');
  });

  it('serves later calls from cache without touching the network', async () => {
    const fetchMock = installFetchMock(jest.fn(async () => tokenResponse('token-a')));

    await getAccessToken(CREDENTIALS);
    await getAccessToken(CREDENTIALS);
    await getAccessToken(CREDENTIALS);

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('collapses five concurrent callers into a single token request', async () => {
    // Five screens waking together must not mint five tokens: the auth endpoint
    // rate limits, and each new token invalidates the last.
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const fetchMock = installFetchMock(
      jest.fn(async () => {
        await gate;
        return tokenResponse('token-a');
      })
    );

    const pending = Promise.all(
      Array.from({ length: 5 }, () => getAccessToken(CREDENTIALS))
    );
    release();

    expect(await pending).toEqual(Array(5).fill('token-a'));
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('re-mints after the cache is invalidated', async () => {
    const fetchMock = installFetchMock(
      jest
        .fn()
        .mockResolvedValueOnce(tokenResponse('token-a'))
        .mockResolvedValueOnce(tokenResponse('token-b'))
    );

    expect(await getAccessToken(CREDENTIALS)).toBe('token-a');
    invalidateAccessToken();
    expect(await getAccessToken(CREDENTIALS)).toBe('token-b');
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('re-mints when a token is within the expiry skew buffer', async () => {
    // A token about to expire must not be handed to a request about to start,
    // or it 401s mid-flight.
    installFetchMock(
      jest
        .fn()
        .mockResolvedValueOnce(tokenResponse('token-a', 30))
        .mockResolvedValueOnce(tokenResponse('token-b', 1800))
    );

    expect(await getAccessToken(CREDENTIALS)).toBe('token-a');
    expect(await getAccessToken(CREDENTIALS)).toBe('token-b');
  });

  it('re-mints when the client id changes', async () => {
    installFetchMock(
      jest
        .fn()
        .mockResolvedValueOnce(tokenResponse('token-a'))
        .mockResolvedValueOnce(tokenResponse('token-b'))
    );

    await getAccessToken(CREDENTIALS);
    await expect(getAccessToken({ clientId: 'other', clientSecret: 's' })).resolves.toBe(
      'token-b'
    );
  });

  it('sends the client_credentials grant as form-encoded, as the realm requires', async () => {
    const fetchMock = installFetchMock(jest.fn(async () => tokenResponse('token-a')));
    await getAccessToken(CREDENTIALS);

    const [, init] = fetchMock.mock.calls[0];
    expect(init?.method).toBe('POST');
    expect(String(init?.body)).toContain('grant_type=client_credentials');
    expect(String(init?.body)).toContain('client_id=test-client');
  });
});

describe('failures', () => {
  it('reports rejected credentials as AUTH_INVALID', async () => {
    installFetchMock(jest.fn(async () => jsonResponse({}, { status: 401 })));
    expect(await kindOf(getAccessToken(CREDENTIALS))).toBe('AUTH_INVALID');
  });

  it('reports an auth server outage as SERVER, not as bad credentials', async () => {
    installFetchMock(jest.fn(async () => jsonResponse({}, { status: 503 })));
    expect(await kindOf(getAccessToken(CREDENTIALS))).toBe('SERVER');
  });

  it('reports a network failure as OFFLINE', async () => {
    installFetchMock(
      jest.fn(async () => {
        throw new TypeError('Network request failed');
      })
    );
    expect(await kindOf(getAccessToken(CREDENTIALS))).toBe('OFFLINE');
  });

  it('reports a token-less success body as BAD_PAYLOAD', async () => {
    installFetchMock(jest.fn(async () => tokenResponse('')));
    expect(await kindOf(getAccessToken(CREDENTIALS))).toBe('BAD_PAYLOAD');
  });

  it('clears the in-flight refresh after a failure so the next call retries', async () => {
    // Without the finally, one failure leaves every later caller awaiting a
    // promise that has already rejected.
    installFetchMock(
      jest
        .fn()
        .mockRejectedValueOnce(new TypeError('Network request failed'))
        .mockResolvedValueOnce(tokenResponse('token-a'))
    );

    expect(await kindOf(getAccessToken(CREDENTIALS))).toBe('OFFLINE');
    expect(await getAccessToken(CREDENTIALS)).toBe('token-a');
  });
});
