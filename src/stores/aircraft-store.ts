import { create } from 'zustand';
import { fetchStates } from '@/api/opensky/client';
import { ApiError, isApiError, type ApiErrorKind } from '@/api/opensky/errors';
import type { Aircraft, AircraftSnapshot } from '@/api/opensky/types';
import { bboxEquals, type Bbox } from '@/lib/geo';
import { pollableCredits, remainingCredits, useBudgetStore } from './budget-store';
import { activeCredentials } from './credentials-store';
import { useFollowedStore } from './followed-store';
import { isOnline, useNetworkStore } from './network-store';
import { flushSnapshot, loadSnapshot, saveSnapshot } from './snapshot-cache';

/**
 * The single source of live aircraft.
 *
 * The map and the list are two renderers over this one store, which is what
 * makes the list a genuine equivalent of the map rather than a second-class
 * accessibility bolt-on.
 */

export type LoadStatus = 'idle' | 'loading' | 'refreshing' | 'ready' | 'error';

export type AircraftState = {
  snapshot: AircraftSnapshot | null;
  status: LoadStatus;
  errorKind: ApiErrorKind | null;
  /** The box the current snapshot describes. */
  bbox: Bbox | null;
  /** Unix ms of the last successful load, for the "updated N ago" line. */
  lastLoadedAt: number | null;
  /** Unix ms before which a retry is pointless, set from Retry-After. */
  retryAfter: number | null;
  /** True while the snapshot on screen came off disk rather than the network. */
  fromCache: boolean;
  /** False until the disk cache has been read, so the splash can wait for it. */
  hydrated: boolean;

  setBbox: (bbox: Bbox) => void;
  /** Fetches the current bbox. `background` suppresses the loading spinner. */
  refresh: (options?: { background?: boolean }) => Promise<void>;
  /** Reads the cached snapshot so the first frame is never empty. */
  hydrate: () => Promise<void>;
  /** Forces any throttled cache write out to disk. */
  flush: () => Promise<void>;
  clearError: () => void;
};

/** Guards against two overlapping fetches racing to set the snapshot. */
let inFlight: Promise<void> | null = null;

export const useAircraftStore = create<AircraftState>()((set, get) => ({
  snapshot: null,
  status: 'idle',
  errorKind: null,
  bbox: null,
  lastLoadedAt: null,
  retryAfter: null,
  fromCache: false,
  hydrated: false,

  setBbox: (bbox) => {
    if (bboxEquals(get().bbox, bbox)) return;
    set({ bbox });
  },

  clearError: () => set({ errorKind: null }),

  hydrate: async () => {
    const cached = await loadSnapshot();
    if (cached === null) {
      set({ hydrated: true });
      return;
    }
    // A network response that landed first must not be replaced by older data.
    if (get().snapshot !== null) {
      set({ hydrated: true });
      return;
    }
    set({
      snapshot: cached.snapshot,
      bbox: cached.bbox,
      lastLoadedAt: cached.savedAt,
      // Not 'ready': the data is real but old, and the UI says so.
      status: 'idle',
      fromCache: true,
      hydrated: true,
    });
  },

  flush: flushSnapshot,

  refresh: async ({ background = false } = {}) => {
    if (inFlight) return inFlight;

    const { bbox, snapshot } = get();
    set({
      status: background ? 'refreshing' : snapshot ? 'refreshing' : 'loading',
      errorKind: null,
    });

    const budget = useBudgetStore.getState();
    const network = useNetworkStore.getState();

    inFlight = fetchStates(bbox, {
      credentials: activeCredentials(),
      isOnline: isOnline(network),
      // Background polling stops at the reserve; a user-initiated refresh may
      // spend down to the last credit.
      remainingCredits: background ? pollableCredits(budget) : remainingCredits(budget),
      onCreditsSpent: (credits) => budget.spend(credits, 'Live aircraft'),
      onRemainingReported: budget.reconcileRemaining,
    })
      .then((next) => {
        set({
          snapshot: next,
          status: 'ready',
          errorKind: null,
          lastLoadedAt: Date.now(),
          retryAfter: null,
          fromCache: false,
        });
        // Followed flights carry their own copy of the telemetry so they still
        // render once this snapshot has been replaced or the app is offline.
        useFollowedStore.getState().syncFromSnapshot(next);
        void saveSnapshot(next, bbox);
      })
      .catch((error: unknown) => {
        const apiError = isApiError(error)
          ? error
          : new ApiError('BAD_PAYLOAD', 'Something unexpected went wrong.');
        set({
          status: 'error',
          errorKind: apiError.kind,
          retryAfter: apiError.retryAfter ?? null,
        });
      })
      .finally(() => {
        inFlight = null;
      });

    return inFlight;
  },
}));

/** Test seam — the module-level in-flight guard outlives a store reset. */
export function resetAircraftStore(): void {
  inFlight = null;
  useAircraftStore.setState({
    snapshot: null,
    status: 'idle',
    errorKind: null,
    bbox: null,
    lastLoadedAt: null,
    retryAfter: null,
    fromCache: false,
    hydrated: false,
  });
}

/** Aircraft ready to render: on-ground traffic filtered out unless asked for. */
export function visibleAircraft(
  snapshot: AircraftSnapshot | null,
  showOnGround: boolean
): Aircraft[] {
  if (!snapshot) return [];
  const aircraft = showOnGround
    ? snapshot.aircraft
    : snapshot.aircraft.filter((item) => !item.onGround);
  // Highest first: the interesting traffic is at the top of a list of hundreds.
  return [...aircraft].sort((a, b) => (b.altitude ?? -1) - (a.altitude ?? -1));
}
