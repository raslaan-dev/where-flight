import AsyncStorage from '@react-native-async-storage/async-storage';

import { installFetchMock, jsonResponse } from '@/test-utils/fetch-mock';
import { DEFAULT_REGION } from '@/lib/regions';
import { resetAircraftStore, useAircraftStore, visibleAircraft } from '../aircraft-store';
import { useBudgetStore, utcDayKey } from '../budget-store';
import { useFollowedStore } from '../followed-store';
import { useNetworkStore } from '../network-store';
import { flushSnapshot, loadSnapshot, resetSnapshotCache, saveSnapshot } from '../snapshot-cache';
import type { Aircraft, AircraftSnapshot } from '@/api/opensky/types';

const NOW = 1_786_034_585;

/** A row good enough to survive the mapper, parameterised by the bits we vary. */
function row(icao24: string, overrides: Record<number, unknown> = {}) {
  const base: unknown[] = [
    icao24,
    'TST123  ',
    'United Kingdom',
    NOW,
    NOW,
    -0.05,
    51.9,
    3000,
    false,
    100,
    170,
    -1,
    null,
    3050,
    '3255',
    false,
    0,
  ];
  for (const [index, value] of Object.entries(overrides)) base[Number(index)] = value;
  return base;
}

function statesBody(rows: unknown[][]) {
  return jsonResponse({ time: NOW, states: rows });
}

beforeEach(async () => {
  jest.restoreAllMocks();
  resetAircraftStore();
  resetSnapshotCache();
  await AsyncStorage.clear();
  useFollowedStore.setState({ flights: [] });
  useBudgetStore.setState({ dayKeyUtc: utcDayKey(), used: 0, log: [], authenticated: false });
  useNetworkStore.setState({ isConnected: true, isInternetReachable: true, hasChecked: true });
  useAircraftStore.getState().setBbox(DEFAULT_REGION.bbox);
});

describe('refresh', () => {
  it('stores the mapped snapshot and marks the load as ready', async () => {
    installFetchMock(jest.fn(async () => statesBody([row('407a06')])));

    await useAircraftStore.getState().refresh();

    const state = useAircraftStore.getState();
    expect(state.status).toBe('ready');
    expect(state.snapshot?.aircraft).toHaveLength(1);
    expect(state.lastLoadedAt).not.toBeNull();
    expect(state.errorKind).toBeNull();
  });

  it('charges the budget for what it fetched', async () => {
    installFetchMock(jest.fn(async () => statesBody([])));
    await useAircraftStore.getState().refresh();
    // The default region is roughly 114 square degrees: the 3-credit tier.
    expect(useBudgetStore.getState().used).toBe(3);
  });

  it('collapses two overlapping refreshes into one request', async () => {
    // Pull-to-refresh while a poll is already in flight must not double-charge.
    const fetchMock = installFetchMock(jest.fn(async () => statesBody([row('407a06')])));

    await Promise.all([
      useAircraftStore.getState().refresh(),
      useAircraftStore.getState().refresh(),
    ]);

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('records the error kind instead of throwing at the screen', async () => {
    installFetchMock(jest.fn(async () => jsonResponse({}, { status: 503 })));

    await useAircraftStore.getState().refresh();

    expect(useAircraftStore.getState().status).toBe('error');
    expect(useAircraftStore.getState().errorKind).toBe('SERVER');
  });

  it('keeps the previous snapshot when a later refresh fails', async () => {
    // Throwing away usable data because the newest request failed is the
    // difference between a stale-data banner and a blank screen.
    const fetchMock = installFetchMock(
      jest
        .fn()
        .mockResolvedValueOnce(statesBody([row('407a06')]))
        .mockResolvedValueOnce(jsonResponse({}, { status: 503 }))
    );

    await useAircraftStore.getState().refresh();
    await useAircraftStore.getState().refresh();

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(useAircraftStore.getState().snapshot?.aircraft).toHaveLength(1);
    expect(useAircraftStore.getState().errorKind).toBe('SERVER');
  });

  it('reports being offline without attempting a request', async () => {
    const fetchMock = installFetchMock();
    useNetworkStore.setState({ isConnected: false, isInternetReachable: false });

    await useAircraftStore.getState().refresh();

    expect(fetchMock).not.toHaveBeenCalled();
    expect(useAircraftStore.getState().errorKind).toBe('OFFLINE');
  });

  it('lets a user-initiated refresh spend into the reserve that polling cannot', async () => {
    const fetchMock = installFetchMock(jest.fn(async () => statesBody([])));
    // 360 of 400 spent leaves 40 credits, all of which are reserve.
    useBudgetStore.setState({ used: 360 });

    await useAircraftStore.getState().refresh({ background: true });
    expect(useAircraftStore.getState().errorKind).toBe('BUDGET_EXHAUSTED');
    expect(fetchMock).not.toHaveBeenCalled();

    await useAircraftStore.getState().refresh();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

describe('offline persistence', () => {
  it('caches what it fetched, so a relaunch is not a blank screen', async () => {
    installFetchMock(jest.fn(async () => statesBody([row('407a06')])));

    await useAircraftStore.getState().refresh();
    await flushSnapshot();

    expect((await loadSnapshot())?.snapshot.aircraft[0].icao24).toBe('407a06');
  });

  it('restores the cached snapshot on launch and flags it as not live', async () => {
    await saveSnapshot(
      { time: NOW, aircraft: [], discarded: { noPosition: 0, tooOld: 0, malformed: 0, duplicate: 0 } },
      DEFAULT_REGION.bbox
    );
    resetAircraftStore();

    await useAircraftStore.getState().hydrate();

    const state = useAircraftStore.getState();
    expect(state.snapshot).not.toBeNull();
    expect(state.fromCache).toBe(true);
    // Cached data is real but old; calling it 'ready' would hide that.
    expect(state.status).toBe('idle');
    expect(state.lastLoadedAt).not.toBeNull();
  });

  it('marks itself hydrated even when there is nothing cached', async () => {
    await useAircraftStore.getState().hydrate();
    expect(useAircraftStore.getState().hydrated).toBe(true);
    expect(useAircraftStore.getState().snapshot).toBeNull();
  });

  it('never lets a slow disk read overwrite a network response that already landed', async () => {
    await saveSnapshot(
      { time: 1, aircraft: [], discarded: { noPosition: 0, tooOld: 0, malformed: 0, duplicate: 0 } },
      DEFAULT_REGION.bbox
    );
    installFetchMock(jest.fn(async () => statesBody([row('407a06')])));

    await useAircraftStore.getState().refresh();
    await useAircraftStore.getState().hydrate();

    expect(useAircraftStore.getState().snapshot?.aircraft).toHaveLength(1);
    expect(useAircraftStore.getState().fromCache).toBe(false);
  });

  it('updates the telemetry stored against a followed flight', async () => {
    installFetchMock(jest.fn(async () => statesBody([row('407a06', { 13: 9000 })])));
    useFollowedStore.setState({
      flights: [
        {
          icao24: '407a06',
          label: 'TST123',
          followedAt: 0,
          lastSeenAt: 0,
          // Only the fields the sync compares matter to this test.
          lastSeen: { icao24: '407a06', altitude: 1, lastContact: 0 } as Aircraft,
        },
      ],
    });

    await useAircraftStore.getState().refresh();

    expect(useFollowedStore.getState().flights[0].lastSeen.altitude).toBe(9000);
  });
});

describe('setBbox', () => {
  it('ignores a box that is effectively the same, so nothing re-renders', () => {
    const before = useAircraftStore.getState().bbox;
    useAircraftStore.getState().setBbox({ ...DEFAULT_REGION.bbox });
    expect(useAircraftStore.getState().bbox).toBe(before);
  });
});

describe('visibleAircraft', () => {
  function aircraft(partial: Partial<Aircraft>): Aircraft {
    return {
      icao24: 'a',
      callsign: null,
      label: 'A',
      originCountry: 'United Kingdom',
      latitude: 51,
      longitude: 0,
      altitude: 1000,
      altitudeSource: 'geometric',
      onGround: false,
      velocity: 100,
      trueTrack: 0,
      verticalRate: 0,
      verticalTrend: 'level',
      squawk: null,
      isEmergencySquawk: false,
      positionSource: 'ADS-B',
      timePosition: NOW,
      lastContact: NOW,
      positionAgeSeconds: 0,
      isStale: false,
      ...partial,
    };
  }

  const snapshot: AircraftSnapshot = {
    time: NOW,
    aircraft: [
      aircraft({ icao24: 'low', altitude: 500 }),
      aircraft({ icao24: 'ground', altitude: null, onGround: true }),
      aircraft({ icao24: 'high', altitude: 11000 }),
    ],
    discarded: { noPosition: 0, tooOld: 0, malformed: 0, duplicate: 0 },
  };

  it('hides parked traffic by default, because it swamps any view with an airport in it', () => {
    expect(visibleAircraft(snapshot, false).map((item) => item.icao24)).toEqual(['high', 'low']);
  });

  it('includes parked traffic when the setting is on', () => {
    expect(visibleAircraft(snapshot, true)).toHaveLength(3);
  });

  it('sorts highest first, putting the interesting traffic at the top', () => {
    expect(visibleAircraft(snapshot, true)[0].icao24).toBe('high');
  });

  it('returns an empty list rather than failing when there is no snapshot', () => {
    expect(visibleAircraft(null, false)).toEqual([]);
  });
});

describe('observed trails', () => {
  it('records each refresh position so the map can draw a trail', async () => {
    const fetchMock = installFetchMock(
      jest.fn(async () => statesBody([row('407a06', { 5: -0.05, 6: 51.9 })]))
    );
    await useAircraftStore.getState().refresh();

    fetchMock.mockImplementation(async () =>
      statesBody([row('407a06', { 5: -0.25, 6: 52.1 })])
    );
    await useAircraftStore.getState().refresh();

    expect(useAircraftStore.getState().trails['407a06']).toEqual([
      [-0.05, 51.9],
      [-0.25, 52.1],
    ]);
  });

  it('forgets aircraft that have left the viewport, so the map does not grow forever', async () => {
    const fetchMock = installFetchMock(
      jest.fn(async () => statesBody([row('407a06'), row('4ca1fd')]))
    );
    await useAircraftStore.getState().refresh();
    expect(Object.keys(useAircraftStore.getState().trails).sort()).toEqual(['407a06', '4ca1fd']);

    fetchMock.mockImplementation(async () => statesBody([row('407a06')]));
    await useAircraftStore.getState().refresh();

    expect(Object.keys(useAircraftStore.getState().trails)).toEqual(['407a06']);
  });

  it('does not record a position for an aircraft heard without one', async () => {
    installFetchMock(jest.fn(async () => statesBody([row('407a06', { 5: null, 6: null })])));

    await useAircraftStore.getState().refresh();

    expect(useAircraftStore.getState().trails['407a06']).toBeUndefined();
  });
});
