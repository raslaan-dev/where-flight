import AsyncStorage from '@react-native-async-storage/async-storage';

import type { AircraftSnapshot } from '@/api/opensky/types';
import type { Bbox } from '@/lib/geo';

/**
 * On-disk cache of the last aircraft snapshot.
 *
 * Written by hand rather than through zustand's `persist`, because `persist`
 * writes on every state change: a poll every fifteen seconds would serialise
 * a few hundred aircraft to disk four times a minute, for a value only ever
 * read once, at launch. Writes here are throttled to once a minute and forced
 * at the moments the data is actually about to be needed — when the app is
 * backgrounded or the tab loses focus.
 */

const STORAGE_KEY = 'wf.snapshot';
const VERSION = 1;

/** Floor between opportunistic writes. */
export const MIN_WRITE_INTERVAL_MS = 60_000;

/** Bounds both the write cost and the JSON parse at launch. */
export const MAX_CACHED_AIRCRAFT = 300;

export type CachedSnapshot = {
  snapshot: AircraftSnapshot;
  bbox: Bbox | null;
  /** Unix ms by the device clock, so the age survives being offline. */
  savedAt: number;
};

type Payload = CachedSnapshot & { version: number };

let lastWriteAt = 0;
let pending: CachedSnapshot | null = null;

/** Keeps the freshest positions: the stale ones age worst while offline. */
function trim(snapshot: AircraftSnapshot): AircraftSnapshot {
  if (snapshot.aircraft.length <= MAX_CACHED_AIRCRAFT) return snapshot;
  const aircraft = [...snapshot.aircraft]
    .sort((a, b) => b.lastContact - a.lastContact)
    .slice(0, MAX_CACHED_AIRCRAFT);
  return { ...snapshot, aircraft };
}

async function write(entry: CachedSnapshot): Promise<void> {
  const payload: Payload = { ...entry, version: VERSION, snapshot: trim(entry.snapshot) };
  lastWriteAt = Date.now();
  pending = null;
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // A full disk must not take down a live screen; the cache is an optimisation.
  }
}

/**
 * Offers a snapshot to the cache. Writes at most once per minute unless
 * `force` is set, holding the newest offer back for the next flush.
 */
export async function saveSnapshot(
  snapshot: AircraftSnapshot,
  bbox: Bbox | null,
  { force = false }: { force?: boolean } = {}
): Promise<void> {
  const entry: CachedSnapshot = { snapshot, bbox, savedAt: Date.now() };
  if (!force && Date.now() - lastWriteAt < MIN_WRITE_INTERVAL_MS) {
    pending = entry;
    return;
  }
  await write(entry);
}

/** Writes whatever the throttle is holding. Call on background and on blur. */
export async function flushSnapshot(): Promise<void> {
  if (pending) await write(pending);
}

export async function loadSnapshot(): Promise<CachedSnapshot | null> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (raw === null) return null;
    const parsed = JSON.parse(raw) as Partial<Payload>;
    // A cache written by an older build may not match the current shape, and
    // there is nothing to migrate: it is discarded and refetched.
    if (parsed.version !== VERSION || !parsed.snapshot || typeof parsed.savedAt !== 'number') {
      return null;
    }
    return { snapshot: parsed.snapshot, bbox: parsed.bbox ?? null, savedAt: parsed.savedAt };
  } catch {
    return null;
  }
}

export async function clearSnapshot(): Promise<void> {
  resetSnapshotCache();
  await AsyncStorage.removeItem(STORAGE_KEY);
}

/** Test seam — the throttle state is module-level and outlives a store reset. */
export function resetSnapshotCache(): void {
  lastWriteAt = 0;
  pending = null;
}
