import type { FlightTrack } from '@/api/opensky/types';

/**
 * The line drawn behind a selected aircraft.
 *
 * Two sources, deliberately ranked:
 *
 *   `track`    — the real trajectory from OpenSky's /tracks endpoint, which
 *                reaches back to where the aircraft took off. Costs credits and
 *                needs a connected account, so it is only ever there because
 *                the user asked for it.
 *   `observed` — positions this app has watched go by since it was opened.
 *                Free, works anonymously, but it begins when you started
 *                looking rather than at the departure airport.
 *
 * The distinction matters enough to be carried in the type: a trail that starts
 * mid-flight must not be presented as a departure point.
 */

/** `[longitude, latitude]` pairs, oldest first — GeoJSON coordinate order. */
export type TrailPath = [number, number][];

export type TrailSource = 'track' | 'observed' | 'none';

export type Trail = { path: TrailPath; source: TrailSource };

export const EMPTY_TRAIL: Trail = { path: [], source: 'none' };

/**
 * How many observed positions to keep per aircraft. At the fastest poll this
 * is roughly half an hour of flying, and 500 aircraft of it is well under a
 * megabyte.
 */
export const MAX_OBSERVED_POINTS = 60;

/** ~1 metre, matching the feature encoder. More precision is invisible. */
const COORD_DECIMALS = 5;

const round = (value: number): number => {
  const factor = 10 ** COORD_DECIMALS;
  return Math.round(value * factor) / factor;
};

/** A line needs two points; one is just the aircraft again. */
function usable(path: TrailPath): boolean {
  return path.length >= 2;
}

/** The flown trajectory as map coordinates, dropping any repeated position. */
export function trackPath(track: FlightTrack): TrailPath {
  const path: TrailPath = [];
  for (const point of track.path) {
    const next: [number, number] = [round(point.longitude), round(point.latitude)];
    const last = path[path.length - 1];
    if (last && last[0] === next[0] && last[1] === next[1]) continue;
    path.push(next);
  }
  return path;
}

/**
 * Adds a position to an aircraft's observed trail.
 *
 * Returns the existing array unchanged when the aircraft has not actually
 * moved, so an unchanged trail is referentially equal and cannot trigger a
 * pointless re-render or a bridge write.
 */
export function appendObserved(
  existing: TrailPath | undefined,
  longitude: number,
  latitude: number
): TrailPath {
  const next: [number, number] = [round(longitude), round(latitude)];
  const path = existing ?? [];
  const last = path[path.length - 1];
  if (last && last[0] === next[0] && last[1] === next[1]) return path;

  const appended = [...path, next];
  // Oldest first out: the tail nearest the aircraft is the informative end.
  return appended.length > MAX_OBSERVED_POINTS
    ? appended.slice(appended.length - MAX_OBSERVED_POINTS)
    : appended;
}

/**
 * Forgets aircraft that are no longer in the snapshot.
 *
 * Without this the trail map grows for the whole session as traffic flies in
 * and out of the viewport.
 */
export function pruneTrails(
  trails: Record<string, TrailPath>,
  liveIds: Iterable<string>
): Record<string, TrailPath> {
  const keep = liveIds instanceof Set ? liveIds : new Set(liveIds);
  const kept: Record<string, TrailPath> = {};
  let dropped = false;
  for (const [id, path] of Object.entries(trails)) {
    if (keep.has(id)) kept[id] = path;
    else dropped = true;
  }
  return dropped ? kept : trails;
}

/**
 * Picks the best trail available for one aircraft.
 *
 * The fetched track wins whenever it exists: it is the only one of the two
 * that actually answers "where did this come from".
 */
export function buildTrail({
  track,
  observed,
}: {
  track: FlightTrack | null;
  observed: TrailPath | undefined;
}): Trail {
  if (track) {
    const path = trackPath(track);
    if (usable(path)) return { path, source: 'track' };
  }
  if (observed && usable(observed)) return { path: observed, source: 'observed' };
  return EMPTY_TRAIL;
}
