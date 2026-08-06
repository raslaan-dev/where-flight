import AsyncStorage from '@react-native-async-storage/async-storage';

import { resetAircraftStore, useAircraftStore } from '../aircraft-store';
import { useBudgetStore } from '../budget-store';
import { useFollowedStore } from '../followed-store';
import { hydrateStores } from '../hydration';
import { useSettingsStore } from '../settings-store';
import { resetSnapshotCache } from '../snapshot-cache';

beforeEach(async () => {
  await AsyncStorage.clear();
  resetAircraftStore();
  resetSnapshotCache();
});

describe('hydrateStores', () => {
  it('resolves once every persisted store has been read back', async () => {
    await AsyncStorage.setItem(
      'wf.settings',
      JSON.stringify({ state: { theme: 'light', units: 'metric' }, version: 1 })
    );
    await AsyncStorage.setItem(
      'wf.budget',
      JSON.stringify({ state: { dayKeyUtc: '2000-01-01', used: 42, log: [] }, version: 1 })
    );
    // The stores were created at import time, so replay their rehydration.
    await Promise.all([
      useSettingsStore.persist.rehydrate(),
      useBudgetStore.persist.rehydrate(),
      useFollowedStore.persist.rehydrate(),
    ]);

    await hydrateStores();

    expect(useSettingsStore.getState().theme).toBe('light');
    expect(useBudgetStore.getState().used).toBe(42);
    expect(useAircraftStore.getState().hydrated).toBe(true);
  });

  it('resolves on a first launch, when there is nothing on disk at all', async () => {
    // A gate that never opens is a permanently blank splash screen.
    await expect(hydrateStores()).resolves.toBeUndefined();
    expect(useAircraftStore.getState().hydrated).toBe(true);
  });
});
