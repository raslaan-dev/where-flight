import type {
  Aircraft,
  AircraftSnapshot,
  AltitudeSource,
  PositionSource,
  RawStateVector,
  RawStatesResponse,
  VerticalTrend,
} from './types';

/**
 * Wire format → domain model.
 *
 * OpenSky returns rows as positional arrays with no field names and a great
 * many nulls, so this module is where every quirk of the feed is absorbed once
 * rather than defended against in every component.
 */

/** Positions older than this are dropped: they are no longer "live". */
export const MAX_POSITION_AGE_SECONDS = 300;
/** Positions older than this are shown but flagged as stale. */
export const STALE_POSITION_AGE_SECONDS = 60;

/** Field offsets in the state vector. Named so the mapper reads as prose. */
const FIELD = {
  icao24: 0,
  callsign: 1,
  originCountry: 2,
  timePosition: 3,
  lastContact: 4,
  longitude: 5,
  latitude: 6,
  baroAltitude: 7,
  onGround: 8,
  velocity: 9,
  trueTrack: 10,
  verticalRate: 11,
  geoAltitude: 13,
  squawk: 14,
  positionSource: 16,
} as const;

const POSITION_SOURCES: PositionSource[] = ['ADS-B', 'ASTERIX', 'MLAT', 'FLARM'];

/** 7500 hijack, 7600 radio failure, 7700 general emergency. */
const EMERGENCY_SQUAWKS = new Set(['7500', '7600', '7700']);

/** Vertical rates below this are noise, not a climb. */
const LEVEL_FLIGHT_THRESHOLD_MPS = 0.5;

function readNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function readString(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function readPositionSource(value: unknown): PositionSource {
  const index = readNumber(value);
  if (index === null) return 'unknown';
  return POSITION_SOURCES[index] ?? 'unknown';
}

function verticalTrendFrom(rate: number | null, onGround: boolean): VerticalTrend {
  if (onGround) return 'level';
  if (rate === null) return 'unknown';
  if (rate > LEVEL_FLIGHT_THRESHOLD_MPS) return 'climbing';
  if (rate < -LEVEL_FLIGHT_THRESHOLD_MPS) return 'descending';
  return 'level';
}

/**
 * Geometric (GPS) altitude is the more accurate figure, but plenty of
 * transponders only report barometric. Take the best available and record
 * which, so the UI can be honest about it.
 */
function resolveAltitude(
  geometric: number | null,
  barometric: number | null
): { altitude: number | null; altitudeSource: AltitudeSource } {
  if (geometric !== null) return { altitude: geometric, altitudeSource: 'geometric' };
  if (barometric !== null) return { altitude: barometric, altitudeSource: 'barometric' };
  return { altitude: null, altitudeSource: 'unknown' };
}

/** Reasons a row can fail to become an `Aircraft`. */
type Rejection = 'malformed' | 'noPosition' | 'tooOld';

function mapStateVector(
  row: RawStateVector,
  snapshotTime: number
): Aircraft | Rejection {
  if (!Array.isArray(row)) return 'malformed';

  const icao24 = readString(row[FIELD.icao24])?.toLowerCase();
  if (!icao24) return 'malformed';

  const lastContact = readNumber(row[FIELD.lastContact]);
  if (lastContact === null) return 'malformed';

  const latitude = readNumber(row[FIELD.latitude]);
  const longitude = readNumber(row[FIELD.longitude]);
  // An aircraft can be heard by a receiver without being positioned. There is
  // nothing to plot, so it does not belong in a tracker's snapshot.
  if (latitude === null || longitude === null) return 'noPosition';

  const timePosition = readNumber(row[FIELD.timePosition]);
  const positionAgeSeconds = Math.max(0, snapshotTime - (timePosition ?? lastContact));
  if (positionAgeSeconds > MAX_POSITION_AGE_SECONDS) return 'tooOld';

  const onGround = row[FIELD.onGround] === true;
  const { altitude, altitudeSource } = resolveAltitude(
    readNumber(row[FIELD.geoAltitude]),
    readNumber(row[FIELD.baroAltitude])
  );
  const verticalRate = readNumber(row[FIELD.verticalRate]);
  // Callsigns arrive space-padded to 8 characters, and are null for a lot of
  // general aviation and military traffic.
  const callsign = readString(row[FIELD.callsign]);
  const squawk = readString(row[FIELD.squawk]);

  return {
    icao24,
    callsign,
    label: callsign ?? icao24.toUpperCase(),
    originCountry: readString(row[FIELD.originCountry]) ?? 'Unknown',
    latitude,
    longitude,
    altitude: onGround ? null : altitude,
    altitudeSource: onGround ? 'unknown' : altitudeSource,
    onGround,
    velocity: readNumber(row[FIELD.velocity]),
    trueTrack: readNumber(row[FIELD.trueTrack]),
    verticalRate,
    verticalTrend: verticalTrendFrom(verticalRate, onGround),
    squawk,
    isEmergencySquawk: squawk !== null && EMERGENCY_SQUAWKS.has(squawk),
    positionSource: readPositionSource(row[FIELD.positionSource]),
    timePosition,
    lastContact,
    positionAgeSeconds,
    isStale: positionAgeSeconds > STALE_POSITION_AGE_SECONDS,
  };
}

/**
 * Maps a whole `/states/all` response.
 *
 * Counts what it discards rather than dropping rows silently: "412 aircraft,
 * 18 without a position" is explainable, an unexplained gap in coverage is not.
 */
export function mapStatesResponse(response: RawStatesResponse): AircraftSnapshot {
  const time = readNumber(response?.time) ?? Math.floor(Date.now() / 1000);
  const discarded = { noPosition: 0, tooOld: 0, malformed: 0, duplicate: 0 };

  // `states` is null — not an empty array — when no aircraft are in the region.
  const rows = Array.isArray(response?.states) ? response.states : [];
  const byId = new Map<string, Aircraft>();

  for (const row of rows) {
    const result = mapStateVector(row, time);
    if (typeof result === 'string') {
      discarded[result] += 1;
      continue;
    }

    // The same aircraft can appear twice when receivers overlap. Keep whichever
    // report is newer.
    const existing = byId.get(result.icao24);
    if (existing) {
      discarded.duplicate += 1;
      if (existing.lastContact >= result.lastContact) continue;
    }
    byId.set(result.icao24, result);
  }

  return { time, aircraft: [...byId.values()], discarded };
}
