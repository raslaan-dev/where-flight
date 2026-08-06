import { useEffect, useState } from 'react';

import { useAircraftStore } from './aircraft-store';
import { useBudgetStore } from './budget-store';
import { useFollowedStore } from './followed-store';
import { useSettingsStore } from './settings-store';

/**
 * Waits for everything that lives on disk before the app is shown.
 *
 * Rendering first and hydrating after is visible as a flash: the app opens in
 * the wrong theme, the Saved tab appears empty for a frame, and the budget
 * reads zero long enough to trigger a fetch it should not have made. Holding
 * the splash screen until storage has been read costs a few milliseconds and
 * removes all three.
 */

const PERSISTED = [useSettingsStore, useBudgetStore, useFollowedStore] as const;

function whenRehydrated(store: (typeof PERSISTED)[number]): Promise<void> {
  if (store.persist.hasHydrated()) return Promise.resolve();
  return new Promise((resolve) => {
    const unsubscribe = store.persist.onFinishHydration(() => {
      unsubscribe();
      resolve();
    });
  });
}

export async function hydrateStores(): Promise<void> {
  await Promise.all([
    ...PERSISTED.map(whenRehydrated),
    // The snapshot cache is written by hand, so it is awaited by hand.
    useAircraftStore.getState().hydrate(),
  ]);
}

/** True once every store has been restored. */
export function useHydrated(): boolean {
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void hydrateStores().then(() => {
      if (!cancelled) setHydrated(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return hydrated;
}
