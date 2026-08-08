import { create } from 'zustand';

import { fetchAircraftFlights } from '@/api/opensky/client';
import { flightsRequestCost } from '@/api/opensky/costs';
import { ApiError, isApiError, type ApiErrorKind } from '@/api/opensky/errors';
import type { AirportFlight } from '@/api/opensky/types';

import { userActionContext } from './client-context';

/**
 * Where a flight came from and where it is going.
 *
 * `/states/all` carries a callsign and a position but no route at all, so this
 * is a separate, chargeable lookup — fetched only when the user asks, and
 * cached so re-selecting the same aircraft is free.
 */

/**
 * How far back to look for the current leg. Long enough to catch a long-haul
 * that departed this morning, short enough to stay in the 8-credit tier.
 */
export const ROUTE_WINDOW_SECONDS = 12 * 3600;

const TTL_MS = 10 * 60_000;
const MAX_CACHED = 10;

export type RouteStatus = 'idle' | 'loading' | 'ready' | 'error';

/** The most recent leg, or null when OpenSky knows of none. */
export type Route = AirportFlight | null;

type CachedRoute = { route: Route; fetchedAt: number };

export type RouteState = {
  cache: Record<string, CachedRoute>;
  status: RouteStatus;
  errorKind: ApiErrorKind | null;
  activeIcao24: string | null;

  load: (icao24: string) => Promise<void>;
};

/** What one route lookup costs, for the copy on the button. */
export function routeFetchCost(now: number = Date.now()): number {
  const end = Math.floor(now / 1000);
  return flightsRequestCost(end - ROUTE_WINDOW_SECONDS, end);
}

function evicted(cache: Record<string, CachedRoute>): Record<string, CachedRoute> {
  const keys = Object.keys(cache);
  if (keys.length <= MAX_CACHED) return cache;
  const next = { ...cache };
  for (const key of keys.slice(0, keys.length - MAX_CACHED)) delete next[key];
  return next;
}

export const useRouteStore = create<RouteState>()((set, get) => ({
  cache: {},
  status: 'idle',
  errorKind: null,
  activeIcao24: null,

  load: async (icao24) => {
    const key = icao24.toLowerCase();
    const hit = get().cache[key];
    if (hit && Date.now() - hit.fetchedAt < TTL_MS) {
      set({ status: 'ready', errorKind: null, activeIcao24: key });
      return;
    }

    set({ status: 'loading', errorKind: null, activeIcao24: key });
    try {
      const end = Math.floor(Date.now() / 1000);
      const legs = await fetchAircraftFlights(
        key,
        end - ROUTE_WINDOW_SECONDS,
        end,
        userActionContext('Flight route')
      );
      // Newest first from the mapper, so the first entry is the current leg.
      set((state) => ({
        cache: evicted({ ...state.cache, [key]: { route: legs[0] ?? null, fetchedAt: Date.now() } }),
        status: 'ready',
        errorKind: null,
      }));
    } catch (error: unknown) {
      const apiError = isApiError(error)
        ? error
        : new ApiError('BAD_PAYLOAD', 'Something unexpected went wrong.');
      set({ status: 'error', errorKind: apiError.kind });
    }
  },
}));

/**
 * The cached route for an aircraft.
 *
 * Returns `undefined` when nothing has been fetched and `null` when a lookup
 * came back empty — "not asked" and "asked, no answer" need different copy.
 */
export function cachedRoute(
  state: Pick<RouteState, 'cache'>,
  icao24: string
): Route | undefined {
  return state.cache[icao24.toLowerCase()]?.route;
}

/** Test seam. */
export function resetRouteStore(): void {
  useRouteStore.setState({ cache: {}, status: 'idle', errorKind: null, activeIcao24: null });
}
