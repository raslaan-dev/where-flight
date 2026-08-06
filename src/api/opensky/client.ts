import type { Bbox } from '@/lib/geo';
import { clampBbox } from '@/lib/geo';
import { statesRequestCost } from './costs';
import { ApiError, kindFromStatus } from './errors';
import { mapStatesResponse } from './mappers';
import { getAccessToken, invalidateAccessToken, type OpenSkyCredentials } from './token';
import type { AircraftSnapshot, RawStatesResponse } from './types';

const BASE_URL = 'https://opensky-network.org/api';
const REQUEST_TIMEOUT_MS = 15_000;

/**
 * Everything the client needs from the rest of the app, passed in rather than
 * imported, so the request pipeline can be tested without a store or a device.
 */
export type ClientContext = {
  /** Null runs in anonymous mode — the zero-configuration default. */
  credentials: OpenSkyCredentials | null;
  isOnline: boolean;
  /** Credits still available today. */
  remainingCredits: number;
  /** Called with the actual cost once a request has been issued. */
  onCreditsSpent?: (credits: number) => void;
  /**
   * OpenSky's own remaining-credit figure from `X-Rate-Limit-Remaining`. More
   * authoritative than the local estimate, so it is reported back when present.
   */
  onRemainingReported?: (remaining: number) => void;
};

function parseRetryAfter(header: string | null): number | undefined {
  if (!header) return undefined;
  const seconds = Number(header);
  if (Number.isFinite(seconds)) return Date.now() + seconds * 1000;
  const date = Date.parse(header);
  return Number.isNaN(date) ? undefined : date;
}

async function fetchWithTimeout(url: string, headers: Record<string, string>) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    return await fetch(url, { headers, signal: controller.signal });
  } catch (error) {
    const aborted = error instanceof Error && error.name === 'AbortError';
    throw new ApiError(
      aborted ? 'TIMEOUT' : 'OFFLINE',
      aborted ? 'The request to OpenSky timed out.' : 'Could not reach OpenSky.'
    );
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Issues one authenticated (or anonymous) GET and returns parsed JSON.
 *
 * Retries exactly once on 401, and only when a token was actually used — an
 * anonymous 401 is a permanent answer, and retrying a rejected credential in a
 * loop is how an app gets its client banned.
 */
async function requestJson(
  path: string,
  context: ClientContext,
  allowRetry = true
): Promise<unknown> {
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (context.credentials) {
    headers.Authorization = `Bearer ${await getAccessToken(context.credentials)}`;
  }

  const response = await fetchWithTimeout(`${BASE_URL}${path}`, headers);

  // Only present on the authenticated tier. `Number(null)` is 0, so testing the
  // parsed value alone would read a missing header as "no credits left".
  const remainingHeader = response.headers.get('X-Rate-Limit-Remaining');
  if (remainingHeader !== null) {
    const reported = Number(remainingHeader);
    if (Number.isFinite(reported)) context.onRemainingReported?.(reported);
  }

  if (response.status === 401 && context.credentials && allowRetry) {
    invalidateAccessToken();
    return requestJson(path, context, false);
  }

  if (!response.ok) {
    throw new ApiError(kindFromStatus(response.status), `OpenSky returned ${response.status}.`, {
      status: response.status,
      retryAfter: parseRetryAfter(response.headers.get('Retry-After')),
    });
  }

  // OpenSky serves an HTML error page with a 200 when its gateway is unhappy,
  // so trusting the status alone produces a JSON parse crash in the UI.
  const contentType = response.headers.get('Content-Type') ?? '';
  if (!contentType.includes('json')) {
    throw new ApiError('BAD_PAYLOAD', 'OpenSky replied with something other than JSON.');
  }

  try {
    return await response.json();
  } catch {
    throw new ApiError('BAD_PAYLOAD', 'The OpenSky response could not be parsed.');
  }
}

function isRawStatesResponse(value: unknown): value is RawStatesResponse {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as { time?: unknown; states?: unknown };
  return (
    typeof candidate.time === 'number' &&
    (candidate.states === null || Array.isArray(candidate.states))
  );
}

/**
 * Fetches live aircraft for a viewport.
 *
 * Gate order is budget → network → request, so the two failures that cost
 * nothing to detect are detected first.
 */
export async function fetchStates(
  bbox: Bbox | null,
  context: ClientContext
): Promise<AircraftSnapshot> {
  const safeBbox = bbox === null ? null : clampBbox(bbox);
  const cost = statesRequestCost(safeBbox);

  if (context.remainingCredits < cost) {
    throw new ApiError('BUDGET_EXHAUSTED', "Today's OpenSky allowance is used up.");
  }
  if (!context.isOnline) {
    throw new ApiError('OFFLINE', 'No internet connection.');
  }

  const query = safeBbox
    ? `?lamin=${safeBbox.lamin}&lomin=${safeBbox.lomin}&lamax=${safeBbox.lamax}&lomax=${safeBbox.lomax}`
    : '';

  const payload = await requestJson(`/states/all${query}`, context);
  context.onCreditsSpent?.(cost);

  if (!isRawStatesResponse(payload)) {
    throw new ApiError('BAD_PAYLOAD', 'The states response was not in the expected shape.');
  }
  return mapStatesResponse(payload);
}
