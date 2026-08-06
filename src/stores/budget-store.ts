import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { dailyCreditsFor } from '@/api/opensky/costs';

/**
 * Tracks OpenSky API credit spend against the daily allowance.
 *
 * The allowance resets at midnight **UTC**, not local midnight, so the day key
 * is derived from UTC parts. Using the device's local date would hand a user in
 * Auckland a reset thirteen hours early and one in Los Angeles a dead app for
 * most of their evening.
 */

/** Kept back so a deliberate user action still works late in the day. */
export const RESERVE_FRACTION = 0.1;

export type SpendEntry = {
  /** Unix ms. */
  at: number;
  credits: number;
  label: string;
};

const MAX_LOG_ENTRIES = 200;

export function utcDayKey(now: number = Date.now()): string {
  return new Date(now).toISOString().slice(0, 10);
}

export type BudgetState = {
  dayKeyUtc: string;
  used: number;
  /** Recent spend, newest first. Powers the Settings budget meter. */
  log: SpendEntry[];
  authenticated: boolean;

  setAuthenticated: (value: boolean) => void;
  /** Records a spend, rolling the day over first if the date has changed. */
  spend: (credits: number, label: string) => void;
  /** Adopts OpenSky's own figure, which outranks the local estimate. */
  reconcileRemaining: (remaining: number) => void;
  reset: () => void;
};

/** Rolls the counter over when the UTC date has moved on. */
function rolled(state: { dayKeyUtc: string; used: number; log: SpendEntry[] }, now: number) {
  const today = utcDayKey(now);
  if (state.dayKeyUtc === today) return state;
  return { dayKeyUtc: today, used: 0, log: [] };
}

export const useBudgetStore = create<BudgetState>()(
  persist(
    (set) => ({
      dayKeyUtc: utcDayKey(),
      used: 0,
      log: [],
      authenticated: false,

      setAuthenticated: (authenticated) => set({ authenticated }),

      spend: (credits, label) =>
        set((state) => {
          const now = Date.now();
          const base = rolled(state, now);
          return {
            ...base,
            used: base.used + credits,
            log: [{ at: now, credits, label }, ...base.log].slice(0, MAX_LOG_ENTRIES),
          };
        }),

      reconcileRemaining: (remaining) =>
        set((state) => {
          const base = rolled(state, Date.now());
          const allowance = dailyCreditsFor(state.authenticated);
          return { ...base, used: Math.max(0, allowance - remaining) };
        }),

      reset: () => set({ dayKeyUtc: utcDayKey(), used: 0, log: [] }),
    }),
    {
      name: 'wf.budget',
      version: 1,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        dayKeyUtc: state.dayKeyUtc,
        used: state.used,
        log: state.log,
        authenticated: state.authenticated,
      }),
    }
  )
);

/** Credits left today, including the reserve. */
export function remainingCredits(state: Pick<BudgetState, 'dayKeyUtc' | 'used' | 'authenticated'>): number {
  // A snapshot persisted yesterday must not be read as today's spend.
  const used = state.dayKeyUtc === utcDayKey() ? state.used : 0;
  return Math.max(0, dailyCreditsFor(state.authenticated) - used);
}

/**
 * Credits available to background polling. Automatic refreshes stop short of
 * the reserve so that tapping "refresh" or opening a flight still works.
 */
export function pollableCredits(
  state: Pick<BudgetState, 'dayKeyUtc' | 'used' | 'authenticated'>
): number {
  const allowance = dailyCreditsFor(state.authenticated);
  return Math.max(0, remainingCredits(state) - Math.floor(allowance * RESERVE_FRACTION));
}
