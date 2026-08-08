import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { Aircraft, AircraftSnapshot } from '@/api/opensky/types';

/**
 * Flights the user follows.
 *
 * The whole `Aircraft` record is kept, not just the identifier. Storing an id
 * alone would mean the Track tab could only render a list of hex codes in
 * airplane mode, and the aircraft that matters most to a user — the one they
 * deliberately followed — would be the one they could see least about. With the
 * full telemetry on disk, a card offline is the same card as online, honestly
 * labelled with when it was last heard from.
 */

/** Enough for any realistic use, and bounds what a hydration has to parse. */
export const MAX_FOLLOWED = 50;

export type FollowedFlight = {
  icao24: string;
  /**
   * The label as it was when followed. Frozen so a flight that stops
   * broadcasting a callsign does not silently become a hex code in the list.
   */
  label: string;
  /** Unix ms. */
  followedAt: number;
  /** The last complete telemetry seen for this aircraft. */
  lastSeen: Aircraft;
  /** Unix ms at which `lastSeen` was recorded, by the device clock. */
  lastSeenAt: number;
};

export type FollowedState = {
  /** Newest first, so the Track tab needs no sort at render time. */
  flights: FollowedFlight[];

  follow: (aircraft: Aircraft) => void;
  unfollow: (icao24: string) => void;
  toggle: (aircraft: Aircraft) => void;
  /** Refreshes the stored telemetry for every followed flight in a snapshot. */
  syncFromSnapshot: (snapshot: AircraftSnapshot) => void;
  clear: () => void;
};

function entryFor(aircraft: Aircraft): FollowedFlight {
  const now = Date.now();
  return {
    icao24: aircraft.icao24,
    label: aircraft.label,
    followedAt: now,
    lastSeen: aircraft,
    lastSeenAt: now,
  };
}

/** Oldest entries fall off the end once the cap is reached. */
function added(flights: FollowedFlight[], aircraft: Aircraft): FollowedFlight[] {
  return [entryFor(aircraft), ...flights].slice(0, MAX_FOLLOWED);
}

function removed(flights: FollowedFlight[], icao24: string): FollowedFlight[] {
  return flights.filter((flight) => flight.icao24 !== icao24);
}

export const useFollowedStore = create<FollowedState>()(
  persist(
    (set) => ({
      flights: [],

      follow: (aircraft) =>
        set((state) =>
          state.flights.some((flight) => flight.icao24 === aircraft.icao24)
            ? state
            : { flights: added(state.flights, aircraft) }
        ),

      unfollow: (icao24) => set((state) => ({ flights: removed(state.flights, icao24) })),

      toggle: (aircraft) =>
        set((state) => ({
          flights: state.flights.some((flight) => flight.icao24 === aircraft.icao24)
            ? removed(state.flights, aircraft.icao24)
            : added(state.flights, aircraft),
        })),

      syncFromSnapshot: (snapshot) =>
        set((state) => {
          if (state.flights.length === 0) return state;
          const byId = new Map(snapshot.aircraft.map((item) => [item.icao24, item]));
          const now = Date.now();

          let changed = false;
          const flights = state.flights.map((flight) => {
            const current = byId.get(flight.icao24);
            // An aircraft out of view keeps its old record rather than being
            // blanked: "last seen 14 minutes ago" is useful, an empty card is not.
            if (!current) return flight;
            // The feed repeats the same position between reports. Rewriting an
            // identical record would churn a disk write on every poll.
            if (current.lastContact === flight.lastSeen.lastContact) return flight;
            changed = true;
            return { ...flight, lastSeen: current, lastSeenAt: now };
          });

          return changed ? { flights } : state;
        }),

      clear: () => set({ flights: [] }),
    }),
    {
      name: 'wf.followed',
      version: 1,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ flights: state.flights }),
    }
  )
);

export function isFollowed(state: FollowedState, icao24: string): boolean {
  return state.flights.some((flight) => flight.icao24 === icao24);
}

/**
 * Seconds since a followed flight was last heard from, by the device clock.
 *
 * Deliberately not derived from the snapshot's server time: once the app is
 * offline there is no server time to compare against, and the number the user
 * needs is "how stale is this", which only the local clock can answer.
 */
export function ageSecondsOf(flight: FollowedFlight, now: number = Date.now()): number {
  return Math.max(0, Math.round((now - flight.lastSeenAt) / 1000));
}
