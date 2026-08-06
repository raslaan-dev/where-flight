import AsyncStorage from '@react-native-async-storage/async-storage';

import { DEFAULT_ZOOM, resetMapStore, useMapStore } from '../map-store';

beforeEach(async () => {
  resetMapStore();
  await AsyncStorage.clear();
  jest.clearAllMocks();
});

describe('useMapStore', () => {
  it('opens on the default region rather than a blank ocean', () => {
    const { centre, zoom } = useMapStore.getState();
    expect(zoom).toBe(DEFAULT_ZOOM);
    expect(centre.latitude).toBeGreaterThan(49);
    expect(centre.longitude).toBeLessThan(2);
  });

  it('remounting invalidates readiness, since the new WebView has loaded nothing', () => {
    useMapStore.getState().setReady(true);
    const before = useMapStore.getState().mapKey;

    useMapStore.getState().remount();

    expect(useMapStore.getState().mapKey).toBe(before + 1);
    expect(useMapStore.getState().isReady).toBe(false);
  });

  it('persists the camera, so relaunching returns to where the user was', async () => {
    useMapStore.getState().setCamera({ latitude: 40, longitude: -74 }, 8);
    await Promise.resolve();

    const raw = await AsyncStorage.getItem('wf.map');
    expect(JSON.parse(raw ?? '{}').state).toMatchObject({
      centre: { latitude: 40, longitude: -74 },
      zoom: 8,
      styleId: 'dark',
    });
  });

  it('does not persist anything describing a component that will not exist', async () => {
    useMapStore.getState().select('4b1815');
    useMapStore.getState().setReady(true);
    useMapStore.getState().setDegraded('crashed');
    await Promise.resolve();

    const state = JSON.parse((await AsyncStorage.getItem('wf.map')) ?? '{}').state;
    expect(state).not.toHaveProperty('selectedIcao24');
    expect(state).not.toHaveProperty('isReady');
    expect(state).not.toHaveProperty('degraded');
  });
});
