/** Geographic helpers. Pure and side-effect free so they are cheap to test. */

export type Bbox = {
  /** Minimum latitude, -90 to 90. */
  lamin: number;
  /** Minimum longitude, -180 to 180. */
  lomin: number;
  lamax: number;
  lomax: number;
};

export type LatLon = { latitude: number; longitude: number };

const EARTH_RADIUS_KM = 6371;

export function clampLatitude(value: number): number {
  return Math.min(90, Math.max(-90, value));
}

export function clampLongitude(value: number): number {
  return Math.min(180, Math.max(-180, value));
}

/**
 * Brings a bbox back inside valid ranges and guarantees min < max.
 *
 * A map that has been panned past a pole or dragged around the world reports
 * out-of-range bounds; OpenSky responds to those with a 400.
 */
export function clampBbox(bbox: Bbox): Bbox {
  const lamin = clampLatitude(Math.min(bbox.lamin, bbox.lamax));
  const lamax = clampLatitude(Math.max(bbox.lamin, bbox.lamax));
  const lomin = clampLongitude(Math.min(bbox.lomin, bbox.lomax));
  const lomax = clampLongitude(Math.max(bbox.lomin, bbox.lomax));
  return { lamin, lomin, lamax, lomax };
}

/** Area in square degrees — the unit OpenSky prices requests in. */
export function bboxArea(bbox: Bbox): number {
  const { lamin, lomin, lamax, lomax } = clampBbox(bbox);
  return Math.abs(lamax - lamin) * Math.abs(lomax - lomin);
}

/**
 * Snaps a bbox outwards to a grid.
 *
 * Nudging the map by a few pixels otherwise produces a brand new bbox and
 * burns a fresh API credit for what is visually the same view. Snapping
 * outwards (floor the minimums, ceil the maximums) means the request always
 * covers at least what the user can see.
 */
export function quantiseBbox(bbox: Bbox, step = 0.5): Bbox {
  const safe = clampBbox(bbox);
  return clampBbox({
    lamin: Math.floor(safe.lamin / step) * step,
    lomin: Math.floor(safe.lomin / step) * step,
    lamax: Math.ceil(safe.lamax / step) * step,
    lomax: Math.ceil(safe.lomax / step) * step,
  });
}

/** Grows a bbox by `degrees` on every side, so slight pans stay covered. */
export function padBbox(bbox: Bbox, degrees: number): Bbox {
  const safe = clampBbox(bbox);
  return clampBbox({
    lamin: safe.lamin - degrees,
    lomin: safe.lomin - degrees,
    lamax: safe.lamax + degrees,
    lomax: safe.lomax + degrees,
  });
}

export function bboxEquals(a: Bbox | null, b: Bbox | null, epsilon = 1e-6): boolean {
  if (a === null || b === null) return a === b;
  return (
    Math.abs(a.lamin - b.lamin) < epsilon &&
    Math.abs(a.lomin - b.lomin) < epsilon &&
    Math.abs(a.lamax - b.lamax) < epsilon &&
    Math.abs(a.lomax - b.lomax) < epsilon
  );
}

export function bboxContains(bbox: Bbox, point: LatLon): boolean {
  return (
    point.latitude >= bbox.lamin &&
    point.latitude <= bbox.lamax &&
    point.longitude >= bbox.lomin &&
    point.longitude <= bbox.lomax
  );
}

export function bboxCentre(bbox: Bbox): LatLon {
  return {
    latitude: (bbox.lamin + bbox.lamax) / 2,
    longitude: (bbox.lomin + bbox.lomax) / 2,
  };
}

const toRadians = (degrees: number) => (degrees * Math.PI) / 180;

/**
 * Great-circle distance in kilometres.
 *
 * Handles the antimeridian correctly: two points either side of the date line
 * are close together, not most of the way around the planet.
 */
export function haversineKm(a: LatLon, b: LatLon): number {
  const dLat = toRadians(b.latitude - a.latitude);
  let dLon = b.longitude - a.longitude;
  if (dLon > 180) dLon -= 360;
  if (dLon < -180) dLon += 360;
  const dLonRad = toRadians(dLon);

  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(a.latitude)) *
      Math.cos(toRadians(b.latitude)) *
      Math.sin(dLonRad / 2) ** 2;

  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

const COMPASS_POINTS = [
  'north',
  'north-east',
  'east',
  'south-east',
  'south',
  'south-west',
  'west',
  'north-west',
] as const;

export type CompassPoint = (typeof COMPASS_POINTS)[number];

/**
 * Converts a true track in degrees to a spoken compass direction.
 *
 * "Heading north-east" is far more useful to a screen reader user than
 * "heading 47 degrees".
 */
export function bearingToCompass(degrees: number): CompassPoint {
  const normalised = ((degrees % 360) + 360) % 360;
  const index = Math.round(normalised / 45) % 8;
  return COMPASS_POINTS[index];
}
