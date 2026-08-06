import type { FlightTrack } from '@/api/opensky/types';
import { formatAltitudeSpoken } from '@/lib/format';
import type { UnitSystem } from '@/stores/settings-store';

/**
 * The spoken equivalent of the altitude ribbon.
 *
 * The chart is hidden from assistive technology; this sentence is the whole of
 * what a screen reader hears about the flight's history, so it carries the
 * same three facts the eye takes from the picture: how long, how high, and
 * which way it is going now.
 */

function formatDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) return 'less than a minute';
  const minutes = Math.round(seconds / 60);
  if (minutes < 1) return 'less than a minute';
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? '' : 's'}`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  const hourPart = `${hours} hour${hours === 1 ? '' : 's'}`;
  return rest === 0 ? hourPart : `${hourPart} ${rest} minute${rest === 1 ? '' : 's'}`;
}

export function describeTrack(track: FlightTrack, units: UnitSystem): string {
  const altitudes = track.path
    .map((point) => point.altitude)
    .filter((altitude): altitude is number => altitude !== null);

  if (track.path.length < 2) {
    return 'Flight path loaded, but it contains too few points to describe.';
  }

  const duration = formatDuration(track.endTime - track.startTime);
  const parts = [`Flight path over ${duration}`];

  if (altitudes.length > 0) {
    parts.push(`reaching ${formatAltitudeSpoken(Math.max(...altitudes), units)}`);

    const last = altitudes[altitudes.length - 1];
    const reference = altitudes[Math.max(0, altitudes.length - 5)];
    // A 100m swing over the last few waypoints is a real climb or descent,
    // not sensor noise.
    if (last - reference > 100) parts.push('now climbing');
    else if (reference - last > 100) parts.push('now descending');
  }

  return `${parts.join(', ')}.`;
}
