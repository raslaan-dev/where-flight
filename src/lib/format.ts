import type { UnitSystem } from '@/stores/settings-store';

/**
 * Unit conversion and display formatting.
 *
 * Centralised deliberately: OpenSky reports metres, metres per second and
 * degrees from true north, and mislabelling any of those is both easy to do
 * and invisible in the UI until someone who knows aviation looks at it.
 */

export const METRES_TO_FEET = 3.280839895;
export const MPS_TO_KNOTS = 1.943844492;
export const MPS_TO_KMH = 3.6;
export const MPS_TO_MPH = 2.236936292;
export const KM_TO_MILES = 0.621371192;
export const KM_TO_NAUTICAL_MILES = 0.539956803;

/** Shown wherever a value is genuinely unknown, never substituted with zero. */
export const UNKNOWN = '—';

function withThousands(value: number): string {
  return Math.round(value)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

export function formatAltitude(metres: number | null, units: UnitSystem): string {
  if (metres === null || !Number.isFinite(metres)) return UNKNOWN;
  if (units === 'metric') return `${withThousands(metres)} m`;
  return `${withThousands(metres * METRES_TO_FEET)} ft`;
}

/** Spelled out for screen readers, which read "ft" as "F T". */
export function formatAltitudeSpoken(metres: number | null, units: UnitSystem): string {
  if (metres === null || !Number.isFinite(metres)) return 'altitude unknown';
  if (units === 'metric') return `${withThousands(metres)} metres`;
  return `${withThousands(metres * METRES_TO_FEET)} feet`;
}

export function formatSpeed(metresPerSecond: number | null, units: UnitSystem): string {
  if (metresPerSecond === null || !Number.isFinite(metresPerSecond)) return UNKNOWN;
  if (units === 'metric') return `${Math.round(metresPerSecond * MPS_TO_KMH)} km/h`;
  if (units === 'imperial') return `${Math.round(metresPerSecond * MPS_TO_MPH)} mph`;
  return `${Math.round(metresPerSecond * MPS_TO_KNOTS)} kt`;
}

export function formatSpeedSpoken(
  metresPerSecond: number | null,
  units: UnitSystem
): string {
  if (metresPerSecond === null || !Number.isFinite(metresPerSecond)) return 'speed unknown';
  if (units === 'metric')
    return `${Math.round(metresPerSecond * MPS_TO_KMH)} kilometres per hour`;
  if (units === 'imperial')
    return `${Math.round(metresPerSecond * MPS_TO_MPH)} miles per hour`;
  return `${Math.round(metresPerSecond * MPS_TO_KNOTS)} knots`;
}

export function formatDistance(kilometres: number, units: UnitSystem): string {
  if (!Number.isFinite(kilometres)) return UNKNOWN;
  if (units === 'metric') return `${Math.round(kilometres)} km`;
  if (units === 'imperial') return `${Math.round(kilometres * KM_TO_MILES)} mi`;
  return `${Math.round(kilometres * KM_TO_NAUTICAL_MILES)} nm`;
}

export function formatVerticalRate(
  metresPerSecond: number | null,
  units: UnitSystem
): string {
  if (metresPerSecond === null || !Number.isFinite(metresPerSecond)) return UNKNOWN;
  if (units === 'metric') return `${metresPerSecond.toFixed(1)} m/s`;
  // Feet per minute is the universal aviation convention for vertical speed.
  return `${withThousands(metresPerSecond * METRES_TO_FEET * 60)} ft/min`;
}

/**
 * Human-readable age of a reading.
 *
 * Deliberately blunt about staleness: a tracker that shows an hour-old position
 * as if it were current is worse than one that admits it does not know.
 */
export function formatRelativeTime(secondsAgo: number): string {
  if (!Number.isFinite(secondsAgo) || secondsAgo < 0) return UNKNOWN;
  if (secondsAgo < 10) return 'just now';
  if (secondsAgo < 60) return `${Math.floor(secondsAgo)} seconds ago`;
  const minutes = Math.floor(secondsAgo / 60);
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? '' : 's'} ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? '' : 's'} ago`;
}

/**
 * Spaces out a hex identifier so TalkBack reads "4 B 1 8 1 5" rather than
 * attempting to pronounce it as a word.
 */
export function spellOut(value: string): string {
  return value.toUpperCase().split('').join(' ');
}
