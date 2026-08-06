import AsyncStorage from '@react-native-async-storage/async-storage';

import type { Aircraft, AircraftSnapshot } from '@/api/opensky/types';
import {
  clearSnapshot,
  flushSnapshot,
  loadSnapshot,
  MAX_CACHED_AIRCRAFT,
  MIN_WRITE_INTERVAL_MS,
  resetSnapshotCache,
  saveSnapshot,
} from '../snapshot-cache';

const NOW = 1_786_034_585;
const BBOX = { lamin: 49.9, lomin: -10.5, lamax: 59, lomax: 2 };

function aircraft(icao24: string, lastContact = NOW): Aircraft {
  return {
    icao24,
    callsign: null,
    label: icao24.toUpperCase(),
    originCountry: 'United Kingdom',
    latitude: 51.5,
    longitude: -0.4,
    altitude: 10_000,
    altitudeSource: 'geometric',
    onGround: false,
    velocity: 230,
    trueTrack: 90,
    verticalRate: 0,
    verticalTrend: 'level',
    squawk: null,
    isEmergencySquawk: false,
    positionSource: 'ADS-B',
    timePosition: lastContact,
    lastContact,
    positionAgeSeconds: 0,
    isStale: false,
  };
}

function snapshotOf(aircraftList: Aircraft[]): AircraftSnapshot {
  return {
    time: NOW,
    aircraft: aircraftList,
    discarded: { noPosition: 0, tooOld: 0, malformed: 0, duplicate: 0 },
  };
}

/** The AsyncStorage jest mock is already a set of `jest.fn`s. */
const setItem = AsyncStorage.setItem as jest.Mock;

beforeEach(async () => {
  resetSnapshotCache();
  await AsyncStorage.clear();
  jest.clearAllMocks();
});

describe('saveSnapshot', () => {
  it('round-trips a snapshot through storage', async () => {
    await saveSnapshot(snapshotOf([aircraft('407a06')]), BBOX);
    const cached = await loadSnapshot();
    expect(cached?.snapshot.aircraft[0].icao24).toBe('407a06');
    expect(cached?.bbox).toEqual(BBOX);
  });

  it('writes once and then holds back, rather than thrashing the disk', async () => {
    await saveSnapshot(snapshotOf([aircraft('a')]), BBOX);
    await saveSnapshot(snapshotOf([aircraft('b')]), BBOX);
    await saveSnapshot(snapshotOf([aircraft('c')]), BBOX);

    expect(setItem).toHaveBeenCalledTimes(1);
  });

  it('flushes the newest held-back snapshot, not the one that was dropped', async () => {
    await saveSnapshot(snapshotOf([aircraft('first')]), BBOX);
    await saveSnapshot(snapshotOf([aircraft('second')]), BBOX);
    await saveSnapshot(snapshotOf([aircraft('third')]), BBOX);

    await flushSnapshot();

    expect((await loadSnapshot())?.snapshot.aircraft[0].icao24).toBe('third');
  });

  it('does nothing on flush when the throttle is holding nothing', async () => {
    await saveSnapshot(snapshotOf([aircraft('a')]), BBOX);
    setItem.mockClear();
    await flushSnapshot();
    expect(setItem).not.toHaveBeenCalled();
  });

  it('writes again once the interval has elapsed', async () => {
    const clock = jest.spyOn(Date, 'now').mockReturnValue(1_000);
    await saveSnapshot(snapshotOf([aircraft('a')]), BBOX);

    clock.mockReturnValue(1_000 + MIN_WRITE_INTERVAL_MS + 1);
    await saveSnapshot(snapshotOf([aircraft('b')]), BBOX);
    clock.mockRestore();

    expect((await loadSnapshot())?.snapshot.aircraft[0].icao24).toBe('b');
  });

  it('forces a write past the throttle, which is what backgrounding needs', async () => {
    await saveSnapshot(snapshotOf([aircraft('a')]), BBOX);
    await saveSnapshot(snapshotOf([aircraft('b')]), BBOX, { force: true });
    expect((await loadSnapshot())?.snapshot.aircraft[0].icao24).toBe('b');
  });

  it('caps what it stores, keeping the freshest positions', async () => {
    const many = Array.from({ length: MAX_CACHED_AIRCRAFT + 40 }, (_, index) =>
      aircraft(`id${index}`, NOW - index)
    );
    await saveSnapshot(snapshotOf(many), BBOX);

    const cached = await loadSnapshot();
    expect(cached?.snapshot.aircraft).toHaveLength(MAX_CACHED_AIRCRAFT);
    // The oldest contacts are the ones dropped: they age worst while offline.
    expect(cached?.snapshot.aircraft.at(-1)?.icao24).toBe(`id${MAX_CACHED_AIRCRAFT - 1}`);
  });

  it('survives a storage failure rather than taking down the screen', async () => {
    setItem.mockRejectedValueOnce(new Error('disk full'));
    await expect(saveSnapshot(snapshotOf([aircraft('a')]), BBOX)).resolves.toBeUndefined();
  });
});

describe('loadSnapshot', () => {
  it('returns null when nothing has been saved', async () => {
    expect(await loadSnapshot()).toBeNull();
  });

  it('discards a cache written by an incompatible version', async () => {
    await AsyncStorage.setItem(
      'wf.snapshot',
      JSON.stringify({ version: 0, savedAt: NOW, snapshot: snapshotOf([]) })
    );
    expect(await loadSnapshot()).toBeNull();
  });

  it('discards unparseable storage instead of crashing at launch', async () => {
    await AsyncStorage.setItem('wf.snapshot', 'not json');
    expect(await loadSnapshot()).toBeNull();
  });
});

describe('clearSnapshot', () => {
  it('removes the cache and the pending write with it', async () => {
    await saveSnapshot(snapshotOf([aircraft('a')]), BBOX);
    await saveSnapshot(snapshotOf([aircraft('b')]), BBOX);

    await clearSnapshot();
    await flushSnapshot();

    expect(await loadSnapshot()).toBeNull();
  });
});
