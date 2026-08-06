import type { Aircraft } from '@/api/opensky/types';
import type { UnitSystem } from '@/stores/settings-store';
import {
  formatAltitudeSpoken,
  formatDistance,
  formatRelativeTime,
  formatSpeedSpoken,
  spellOut,
} from './format';
import { bearingToCompass, haversineKm, type LatLon } from './geo';

/**
 * Builds the sentence a screen reader announces for one aircraft.
 *
 * Kept pure and separate from the component so it can be unit tested: the
 * spoken label is the primary interface for some users, and "the label is
 * wrong" is not something a visual review catches.
 */

/** Callsigns are pronounceable words to a controller and gibberish to TalkBack. */
function spokenIdentifier(aircraft: Aircraft): string {
  if (aircraft.callsign) return aircraft.callsign;
  return `Aircraft ${spellOut(aircraft.icao24)}`;
}

const TREND_PHRASE: Record<Aircraft['verticalTrend'], string> = {
  climbing: 'climbing',
  descending: 'descending',
  level: 'level',
  unknown: '',
};

export type DescribeOptions = {
  units: UnitSystem;
  /** When given, the description includes how far away the aircraft is. */
  from?: LatLon | null;
};

export function describeAircraft(aircraft: Aircraft, options: DescribeOptions): string {
  const { units, from } = options;
  const parts: string[] = [spokenIdentifier(aircraft)];

  if (aircraft.onGround) {
    parts.push('On the ground');
  } else {
    const trend = TREND_PHRASE[aircraft.verticalTrend];
    const altitude = formatAltitudeSpoken(aircraft.altitude, units);
    parts.push(trend ? `Altitude ${altitude}, ${trend}` : `Altitude ${altitude}`);
  }

  parts.push(`Speed ${formatSpeedSpoken(aircraft.velocity, units)}`);

  if (aircraft.trueTrack !== null) {
    parts.push(`Heading ${bearingToCompass(aircraft.trueTrack)}`);
  }

  if (from && aircraft.latitude !== null && aircraft.longitude !== null) {
    const km = haversineKm(from, {
      latitude: aircraft.latitude,
      longitude: aircraft.longitude,
    });
    parts.push(`${formatDistance(km, units)} away`);
  }

  parts.push(`Last seen ${formatRelativeTime(aircraft.positionAgeSeconds)}`);

  if (aircraft.isEmergencySquawk) {
    parts.push('Squawking an emergency code');
  }

  // Full stops make a screen reader pause between facts instead of running
  // them together into one breathless sentence.
  return `${parts.join('. ')}.`;
}
