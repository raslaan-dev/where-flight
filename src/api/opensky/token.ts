import { ApiError } from './errors';

/**
 * OAuth2 client_credentials token manager.
 *
 * Deliberately in-memory only. OpenSky tokens live 30 minutes, so persisting
 * one buys nothing and puts a bearer credential on disk — the token is cheap to
 * re-mint and expensive to leak.
 */

const TOKEN_ENDPOINT =
  'https://auth.opensky-network.org/auth/realms/opensky-network/protocol/openid-connect/token';

/** Re-mint this far before real expiry so an in-flight request never 401s. */
const EXPIRY_SKEW_MS = 60_000;

export type OpenSkyCredentials = { clientId: string; clientSecret: string };

type CachedToken = { accessToken: string; expiresAt: number; clientId: string };

let cached: CachedToken | null = null;
/**
 * Single-flight guard. Five screens waking at once must produce one token
 * request, not five — the auth endpoint rate limits and the extra tokens
 * invalidate each other.
 */
let pendingRefresh: Promise<string> | null = null;

function isUsable(token: CachedToken | null, clientId: string): token is CachedToken {
  return (
    token !== null &&
    token.clientId === clientId &&
    Date.now() < token.expiresAt - EXPIRY_SKEW_MS
  );
}

async function requestToken(credentials: OpenSkyCredentials): Promise<string> {
  const body = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: credentials.clientId,
    client_secret: credentials.clientSecret,
  });

  let response: Response;
  try {
    response = await fetch(TOKEN_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });
  } catch {
    throw new ApiError('OFFLINE', 'Could not reach the OpenSky authentication server.');
  }

  if (response.status === 401 || response.status === 400) {
    throw new ApiError('AUTH_INVALID', 'OpenSky rejected the client credentials.', {
      status: response.status,
    });
  }
  if (!response.ok) {
    throw new ApiError('SERVER', 'The OpenSky authentication server errored.', {
      status: response.status,
    });
  }

  const payload = (await response.json().catch(() => null)) as {
    access_token?: unknown;
    expires_in?: unknown;
  } | null;

  const accessToken = payload?.access_token;
  if (typeof accessToken !== 'string' || accessToken.length === 0) {
    throw new ApiError('BAD_PAYLOAD', 'The token response contained no access token.');
  }

  const expiresIn =
    typeof payload?.expires_in === 'number' && Number.isFinite(payload.expires_in)
      ? payload.expires_in
      : 1800;

  cached = {
    accessToken,
    expiresAt: Date.now() + expiresIn * 1000,
    clientId: credentials.clientId,
  };
  return accessToken;
}

/** Returns a valid bearer token, minting one only if the cache cannot serve it. */
export async function getAccessToken(credentials: OpenSkyCredentials): Promise<string> {
  if (isUsable(cached, credentials.clientId)) return cached.accessToken;
  if (pendingRefresh) return pendingRefresh;

  pendingRefresh = requestToken(credentials).finally(() => {
    pendingRefresh = null;
  });
  return pendingRefresh;
}

/**
 * Drops the cached token. Called after a 401 so the next request re-mints
 * exactly once; the caller is responsible for not retrying in a loop.
 */
export function invalidateAccessToken(): void {
  cached = null;
}

/** Test seam — clears both the cache and any in-flight refresh. */
export function resetTokenManager(): void {
  cached = null;
  pendingRefresh = null;
}
