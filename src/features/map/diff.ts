/**
 * What actually crosses the WebView bridge.
 *
 * `postMessage` serialises to a string on every call, so sending 400 full
 * `Aircraft` objects at 1 Hz means megabytes of JSON per minute on the UI
 * thread. Two things fix that: a compact positional tuple per aircraft, and
 * sending only what changed since the last frame.
 */

import type { Aircraft } from '@/api/opensky/types';
import { haversineKm, type LatLon } from '@/lib/geo';
import { altitudeBandIndex } from '@/theme';

/** Beyond this the symbol layer starts costing frames on mid-range Android. */
export const MAX_FEATURES = 500;

/** ~1 metre. Any more precision is invisible and just inflates the payload. */
const COORD_DECIMALS = 5;

export const FLAG_ON_GROUND = 1;
export const FLAG_EMERGENCY = 2;
export const FLAG_STALE = 4;

/**
 * One aircraft, positionally encoded. Ugly to read, which is why the map
 * script decodes it into named fields the moment it arrives — but roughly a
 * fifth the bytes of the equivalent object.
 */
export type MapFeature = [
  id: string,
  lon: number,
  lat: number,
  /** Degrees, or -1 when the aircraft is not reporting a heading. */
  track: number,
  /** Altitude ramp index 0-5, or -1 when the altitude is unknown. */
  band: number,
  /** Bitfield of the FLAG_* constants. */
  flags: number,
];

/** Added, updated and deleted. Short keys: this is the hot path. */
export type FeatureDelta = {
  a: MapFeature[];
  u: MapFeature[];
  d: string[];
};

export type FeatureSet = Map<string, MapFeature>;

const round = (value: number) => {
  const factor = 10 ** COORD_DECIMALS;
  return Math.round(value * factor) / factor;
};

function flagsOf(aircraft: Aircraft): number {
  return (
    (aircraft.onGround ? FLAG_ON_GROUND : 0) |
    (aircraft.isEmergencySquawk ? FLAG_EMERGENCY : 0) |
    (aircraft.isStale ? FLAG_STALE : 0)
  );
}

function toFeature(aircraft: Aircraft): MapFeature | null {
  // Aircraft heard but not positioned cannot be drawn. They are still real and
  // still listed — the map is only one of the two renderers.
  if (aircraft.latitude === null || aircraft.longitude === null) return null;
  return [
    aircraft.icao24,
    round(aircraft.longitude),
    round(aircraft.latitude),
    aircraft.trueTrack === null ? -1 : Math.round(aircraft.trueTrack),
    altitudeBandIndex(aircraft.altitude) ?? -1,
    flagsOf(aircraft),
  ];
}

export type BuildOptions = {
  /** Kept regardless of the cap: the user asked for these specifically. */
  pinned?: Iterable<string>;
  /** Drops the parked and taxiing traffic that swamps airports. */
  includeOnGround?: boolean;
  /** Ties are broken by distance from here. Defaults to no reordering. */
  centre?: LatLon | null;
  limit?: number;
};

/**
 * Encodes a snapshot into the capped set of features the map should show.
 *
 * When there are more aircraft than the cap, dropping the tail of an
 * arbitrarily ordered array would make the selected aircraft vanish under the
 * user's finger. Pinned ids survive first, then whatever is nearest the centre
 * of the view — which is where the user is looking.
 */
export function buildFeatures(
  aircraft: readonly Aircraft[],
  { pinned, includeOnGround = false, centre = null, limit = MAX_FEATURES }: BuildOptions = {}
): FeatureSet {
  const pinnedIds = new Set(pinned ?? []);

  const candidates = aircraft.filter(
    (item) => includeOnGround || !item.onGround || pinnedIds.has(item.icao24)
  );

  const chosen =
    candidates.length <= limit ? candidates : prioritise(candidates, pinnedIds, centre, limit);

  const features: FeatureSet = new Map();
  for (const item of chosen) {
    const feature = toFeature(item);
    if (feature !== null) features.set(feature[0], feature);
  }
  return features;
}

function prioritise(
  candidates: readonly Aircraft[],
  pinnedIds: ReadonlySet<string>,
  centre: LatLon | null,
  limit: number
): Aircraft[] {
  const distance = (item: Aircraft) => {
    if (centre === null || item.latitude === null || item.longitude === null) {
      return Number.POSITIVE_INFINITY;
    }
    return haversineKm(centre, { latitude: item.latitude, longitude: item.longitude });
  };

  const scored = candidates.map((item) => ({
    item,
    pinned: pinnedIds.has(item.icao24),
    distance: distance(item),
  }));

  scored.sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
    return a.distance - b.distance;
  });

  return scored.slice(0, limit).map((entry) => entry.item);
}

function sameFeature(a: MapFeature, b: MapFeature): boolean {
  return a[1] === b[1] && a[2] === b[2] && a[3] === b[3] && a[4] === b[4] && a[5] === b[5];
}

/**
 * The change between two feature sets.
 *
 * Most aircraft do not move far enough in one poll to change their rounded
 * coordinates, so a typical delta is a small fraction of the full set.
 */
export function diffFeatures(previous: FeatureSet, next: FeatureSet): FeatureDelta {
  const delta: FeatureDelta = { a: [], u: [], d: [] };

  for (const [id, feature] of next) {
    const before = previous.get(id);
    if (before === undefined) delta.a.push(feature);
    else if (!sameFeature(before, feature)) delta.u.push(feature);
  }

  for (const id of previous.keys()) {
    if (!next.has(id)) delta.d.push(id);
  }

  return delta;
}

export function isEmptyDelta(delta: FeatureDelta): boolean {
  return delta.a.length === 0 && delta.u.length === 0 && delta.d.length === 0;
}

/** A delta that reproduces a whole set from nothing — used after a remount. */
export function fullDelta(features: FeatureSet): FeatureDelta {
  return { a: [...features.values()], u: [], d: [] };
}
