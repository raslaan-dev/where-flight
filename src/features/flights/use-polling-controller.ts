import { useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';

import { statesRequestCost } from '@/api/opensky/costs';
import { pollIntervalMs, secondsLeftInUtcDay } from '@/lib/poll-interval';
import { useAircraftStore } from '@/stores/aircraft-store';
import { pollableCredits, useBudgetStore } from '@/stores/budget-store';
import { isOnline, useNetworkStore } from '@/stores/network-store';

/**
 * The one automatic refresh loop in the app.
 *
 * Mounted once, at the tab layout. Anything else — a timer per screen — spends
 * the daily allowance several times over and keeps fetching for screens nobody
 * is looking at.
 *
 * It stops entirely when the app is backgrounded, when there is no connection,
 * and when the budget is down to its reserve. Each of those is a case where the
 * request would either fail outright or be thrown away.
 *
 * It deliberately does *not* stop when a screen loses focus. Every consumer —
 * map, list, saved, flight detail — reads the same snapshot, so a poll is never
 * wasted while the app is in front of the user; pausing on navigation would
 * only mean the flight detail screen froze the moment it was opened.
 */

export type PollingStatus = {
  /** Why the loop is not running, if it is not. */
  pausedReason: 'offline' | 'budget' | 'background' | null;
  /** Milliseconds between refreshes at the moment. */
  intervalMs: number;
  /** Credits one refresh of the current view costs. */
  costPerPoll: number;
};

export function usePollingController(): PollingStatus {
  const [appActive, setAppActive] = useState(() => AppState.currentState === 'active');
  const consecutiveFailures = useRef(0);

  const bbox = useAircraftStore((state) => state.bbox);
  const retryAfter = useAircraftStore((state) => state.retryAfter);
  const online = useNetworkStore(isOnline);
  const dayKeyUtc = useBudgetStore((state) => state.dayKeyUtc);
  const used = useBudgetStore((state) => state.used);
  const authenticated = useBudgetStore((state) => state.authenticated);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) =>
      setAppActive(state === 'active')
    );
    return () => subscription.remove();
  }, []);

  const costPerPoll = statesRequestCost(bbox);
  const credits = pollableCredits({ dayKeyUtc, used, authenticated });

  const intervalMs = pollIntervalMs({
    pollableCredits: credits,
    costPerPoll,
    consecutiveFailures: consecutiveFailures.current,
    retryAfter,
    secondsLeftToday: secondsLeftInUtcDay(),
  });

  const pausedReason: PollingStatus['pausedReason'] = !online
    ? 'offline'
    : credits < costPerPoll
      ? 'budget'
      : !appActive
        ? 'background'
        : null;

  const active = pausedReason === null;

  /**
   * Read at the moment each refresh finishes rather than captured in the
   * effect, so the pacing responds to a shrinking budget without the interval
   * becoming a dependency — which would restart the loop, and fire an
   * immediate refresh, every single time a credit was spent.
   */
  const nextDelay = useRef(intervalMs);
  nextDelay.current = intervalMs;

  useEffect(() => {
    if (!active) return;

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const tick = async () => {
      await useAircraftStore.getState().refresh({ background: true });
      if (cancelled) return;

      // Backoff belongs to this loop, not to the store: a manual retry should
      // not inherit a delay the user never saw.
      if (useAircraftStore.getState().errorKind === null) consecutiveFailures.current = 0;
      else consecutiveFailures.current += 1;

      timer = setTimeout(tick, nextDelay.current);
    };

    // Fires straight away: waiting a full interval to show anything after
    // unlocking the phone reads as a broken app.
    void tick();

    return () => {
      cancelled = true;
      if (timer !== undefined) clearTimeout(timer);
    };
    // A pan produces a new bbox, which is exactly when a fresh fetch is wanted.
  }, [active, bbox]);

  return { pausedReason, intervalMs, costPerPoll };
}
