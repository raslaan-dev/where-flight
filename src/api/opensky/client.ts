import type { Bbox } from '@/lib/geo';
import { clampBbox } from '@/lib/geo';
import { flightsRequestCost, statesRequestCost, TRACK_REQUEST_COST } from './costs';
import { ApiError, kindFromStatus } from './errors';
import { mapFlightsResponse, mapStatesResponse, mapTrackResponse } from './mappers';
import { getAccessToken, invalidateAccessToken, type OpenSkyCredentials } from './token';
import type {
  AircraftSnapshot,
  AirportFlight,
  FlightTrack,
  RawStatesResponse,
  RawTrackResponse,
} from './types';

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

/** Same budget → network gate order as `fetchStates`, shared by every fetch. */
function assertCanSpend(cost: number, context: ClientContext): void {
  if (context.remainingCredits < cost) {
    throw new ApiError('BUDGET_EXHAUSTED', "Today's OpenSky allowance is used up.");
  }
  if (!context.isOnline) {
    throw new ApiError('OFFLINE', 'No internet connection.');
  }
}

function isRawTrackResponse(value: unknown): value is RawTrackResponse {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as { icao24?: unknown; path?: unknown };
  return (
    typeof candidate.icao24 === 'string' &&
    (candidate.path === null || Array.isArray(candidate.path))
  );
}

/**
 * Fetches the flown trajectory of one live aircraft.
 *
 * `time=0` asks for the track of the flight in progress. OpenSky restricts
 * this endpoint to authenticated accounts, so anonymous callers get an
 * `AUTH_INVALID` the UI must explain rather than hide.
 */
export async function fetchTrack(icao24: string, context: ClientContext): Promise<FlightTrack> {
  assertCanSpend(TRACK_REQUEST_COST, context);

  const payload = await requestJson(
    `/tracks/all?icao24=${encodeURIComponent(icao24.toLowerCase())}&time=0`,
    context
  );
  context.onCreditsSpent?.(TRACK_REQUEST_COST);

  if (!isRawTrackResponse(payload)) {
    throw new ApiError('BAD_PAYLOAD', 'The track response was not in the expected shape.');
  }
  return mapTrackResponse(payload);
}

/**
 * Fetches the recent flight legs flown by one aircraft.
 *
 * This is where a route comes from: `/states/all` broadcasts a position and a
 * callsign but never an origin or a destination. Priced on the same day-span
 * table as the airport boards.
 *
 * A leg still in the air usually has a departure airport and a null arrival
 * one, because OpenSky only attributes the arrival once the aircraft has
 * landed and been processed. That is a real answer — "departed Heathrow, still
 * flying" — so it is returned rather than discarded.
 */
export async function fetchAircraftFlights(
  icao24: string,
  beginUnix: number,
  endUnix: number,
  context: ClientContext
): Promise<AirportFlight[]> {
  const cost = flightsRequestCost(beginUnix, endUnix);
  assertCanSpend(cost, context);

  const query =
    `?icao24=${encodeURIComponent(icao24.toLowerCase())}` +
    `&begin=${Math.floor(beginUnix)}&end=${Math.floor(endUnix)}`;

  let payload: unknown;
  try {
    payload = await requestJson(`/flights/aircraft${query}`, context);
  } catch (error) {
    // As with the boards, 404 means "nothing in that window", not a failure.
    if (error instanceof ApiError && error.status === 404) {
      context.onCreditsSpent?.(cost);
      return [];
    }
    throw error;
  }
  context.onCreditsSpent?.(cost);

  return mapFlightsResponse(payload);
}

export type ScheduleDirection = 'arrival' | 'departure';

/**
 * Fetches an airport's arrival or departure board for a time window.
 *
 * The costliest calls in the API — priced by how much of a day the window
 * spans — which is why the airports feature caches results and asks before
 * spending rather than fetching on scroll.
 */
export async function fetchAirportFlights(
  direction: ScheduleDirection,
  airportIcao: string,
  beginUnix: number,
  endUnix: number,
  context: ClientContext
): Promise<AirportFlight[]> {
  const cost = flightsRequestCost(beginUnix, endUnix);
  assertCanSpend(cost, context);

  const query =
    `?airport=${encodeURIComponent(airportIcao.toUpperCase())}` +
    `&begin=${Math.floor(beginUnix)}&end=${Math.floor(endUnix)}`;

  let payload: unknown;
  try {
    payload = await requestJson(`/flights/${direction}${query}`, context);
  } catch (error) {
    // OpenSky answers 404 — not an empty array — when nothing flew in the
    // window. A quiet airfield is an answer, not a failure.
    if (error instanceof ApiError && error.status === 404) {
      context.onCreditsSpent?.(cost);
      return [];
    }
    throw error;
  }
  context.onCreditsSpent?.(cost);

  return mapFlightsResponse(payload);
}
