import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { fetchAirportFlights, type ScheduleDirection } from '@/api/opensky/client';
import { flightsRequestCost } from '@/api/opensky/costs';
import { ApiError, isApiError, type ApiErrorKind } from '@/api/opensky/errors';
import type { AirportFlight } from '@/api/opensky/types';

import { userActionContext } from './client-context';

/**
 * Airport arrival/departure boards.
 *
 * These are the most expensive calls in the whole API, so nothing here is
 * automatic: every fetch is a button the user pressed after seeing the price.
 * Results are cached to disk — a board of flights that already happened does
 * not go stale the way live positions do, and a cached board is what makes
 * the tab worth opening twice.
 */

/**
 * How far back a board looks.
 *
 * This was 2h to keep the request in the 8-credit tier, and that made the tab
 * look broken: OpenSky derives arrivals from flights that have *landed and
 * been processed*, which lags real time by hours. Probing the live API, a 2h
 * arrivals window at Heathrow, Frankfurt and Schiphol returned 404 — no data —
 * every time, while departures over the same window returned rows. A day-long
 * window is the shortest one that reliably answers for both directions. It
 * costs 20 credits instead of 8, which the button states before spending.
 */
export const SCHEDULE_WINDOW_SECONDS = 24 * 3600;

/** Boards older than this are shown, but flagged and refetchable. */
export const SCHEDULE_TTL_MS = 15 * 60_000;

const MAX_CACHED_BOARDS = 12;

export type ScheduleBoard = {
  airportIcao: string;
  direction: ScheduleDirection;
  flights: AirportFlight[];
  /** Unix ms when this board was fetched. */
  fetchedAt: number;
};

export type ScheduleStatus = 'idle' | 'loading' | 'ready' | 'error';

function keyOf(airportIcao: string, direction: ScheduleDirection): string {
  return `${airportIcao.toUpperCase()}:${direction}`;
}

export type AirportsState = {
  /** key → board. Insertion-ordered; oldest evicted beyond the cap. */
  boards: Record<string, ScheduleBoard>;
  status: ScheduleStatus;
  errorKind: ApiErrorKind | null;
  /** The board the current status/error refer to. */
  activeKey: string | null;
  /**
   * The airport the tab is showing. In the store rather than screen state so
   * that search can deep-link into the tab, and so the choice survives
   * switching tabs. Not persisted: a fresh launch starts at the picker.
   */
  selectedIcao: string | null;

  selectAirport: (icao: string | null) => void;
  load: (airportIcao: string, direction: ScheduleDirection) => Promise<void>;
};

function evicted(boards: Record<string, ScheduleBoard>): Record<string, ScheduleBoard> {
  const keys = Object.keys(boards);
  if (keys.length <= MAX_CACHED_BOARDS) return boards;
  const next = { ...boards };
  for (const key of keys.slice(0, keys.length - MAX_CACHED_BOARDS)) delete next[key];
  return next;
}

export const useAirportsStore = create<AirportsState>()(
  persist(
    (set) => ({
      boards: {},
      status: 'idle',
      errorKind: null,
      activeKey: null,
      selectedIcao: null,

      selectAirport: (selectedIcao) => set({ selectedIcao }),

      load: async (airportIcao, direction) => {
        const key = keyOf(airportIcao, direction);
        set({ status: 'loading', errorKind: null, activeKey: key });

        const end = Math.floor(Date.now() / 1000);
        const begin = end - SCHEDULE_WINDOW_SECONDS;
        try {
          const flights = await fetchAirportFlights(
            direction,
            airportIcao,
            begin,
            end,
            userActionContext(`${direction === 'arrival' ? 'Arrivals' : 'Departures'} ${airportIcao.toUpperCase()}`)
          );
          set((state) => ({
            boards: evicted({
              ...state.boards,
              [key]: {
                airportIcao: airportIcao.toUpperCase(),
                direction,
                flights,
                fetchedAt: Date.now(),
              },
            }),
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
    }),
    {
      name: 'wf.airports',
      version: 1,
      storage: createJSONStorage(() => AsyncStorage),
      // Boards are worth keeping; transient fetch state is not.
      partialize: (state) => ({ boards: state.boards }),
    }
  )
);

/** The cached board for an airport and direction, however old. */
export function cachedBoard(
  state: Pick<AirportsState, 'boards'>,
  airportIcao: string,
  direction: ScheduleDirection
): ScheduleBoard | null {
  return state.boards[keyOf(airportIcao, direction)] ?? null;
}

export function isBoardFresh(board: ScheduleBoard, now: number = Date.now()): boolean {
  return now - board.fetchedAt < SCHEDULE_TTL_MS;
}

/** What one board fetch costs right now, for the confirmation copy. */
export function scheduleFetchCost(): number {
  const end = Math.floor(Date.now() / 1000);
  return flightsRequestCost(end - SCHEDULE_WINDOW_SECONDS, end);
}

/** Test seam. */
export function resetAirportsStore(): void {
  useAirportsStore.setState({
    boards: {},
    status: 'idle',
    errorKind: null,
    activeKey: null,
    selectedIcao: null,
  });
}
