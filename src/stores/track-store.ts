import { create } from 'zustand';

import { fetchTrack } from '@/api/opensky/client';
import { ApiError, isApiError, type ApiErrorKind } from '@/api/opensky/errors';
import type { FlightTrack } from '@/api/opensky/types';

import { userActionContext } from './client-context';

/**
 * Flown trajectories, fetched on request and never automatically.
 *
 * Tracks cost real credits and only change slowly, so each one is cached for
 * a few minutes: closing and reopening the same flight detail screen must not
 * bill the user twice for the same picture.
 */

const TTL_MS = 5 * 60_000;
const MAX_CACHED = 10;

export type TrackStatus = 'idle' | 'loading' | 'ready' | 'error';

type CachedTrack = { track: FlightTrack; fetchedAt: number };

export type TrackState = {
  /** icao24 → cached track. Insertion-ordered, evicted oldest-first. */
  cache: Record<string, CachedTrack>;
  status: TrackStatus;
  errorKind: ApiErrorKind | null;
  /** The aircraft the current status/error refer to. */
  activeIcao24: string | null;

  load: (icao24: string) => Promise<void>;
  clearError: () => void;
};

function evicted(cache: Record<string, CachedTrack>): Record<string, CachedTrack> {
  const keys = Object.keys(cache);
  if (keys.length <= MAX_CACHED) return cache;
  const next = { ...cache };
  for (const key of keys.slice(0, keys.length - MAX_CACHED)) delete next[key];
  return next;
}

export const useTrackStore = create<TrackState>()((set, get) => ({
  cache: {},
  status: 'idle',
  errorKind: null,
  activeIcao24: null,

  clearError: () => set({ errorKind: null, status: 'idle' }),

  load: async (icao24) => {
    const key = icao24.toLowerCase();
    const hit = get().cache[key];
    if (hit && Date.now() - hit.fetchedAt < TTL_MS) {
      set({ status: 'ready', errorKind: null, activeIcao24: key });
      return;
    }

    set({ status: 'loading', errorKind: null, activeIcao24: key });
    try {
      const track = await fetchTrack(key, userActionContext('Flight track'));
      set((state) => ({
        cache: evicted({ ...state.cache, [key]: { track, fetchedAt: Date.now() } }),
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

/** The cached track for an aircraft, if still fresh enough to show. */
export function cachedTrack(
  state: Pick<TrackState, 'cache'>,
  icao24: string
): FlightTrack | null {
  return state.cache[icao24.toLowerCase()]?.track ?? null;
}

/** Test seam. */
export function resetTrackStore(): void {
  useTrackStore.setState({ cache: {}, status: 'idle', errorKind: null, activeIcao24: null });
}
