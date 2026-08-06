import type { Palette } from './palette';

/**
 * Maps an altitude onto the palette's colour ramp.
 *
 * Colour is never the only channel carrying this information — the same
 * altitude also drives a text badge and the marker size — so a user who cannot
 * distinguish the stops loses nothing.
 */

/** Band ceilings in metres, ascending. One more band than there are edges. */
const BAND_CEILINGS_METRES = [1000, 3000, 6000, 9000, 12000];

export const ALTITUDE_BAND_LABELS = [
  'Very low',
  'Low',
  'Medium',
  'High',
  'Very high',
  'Cruise',
] as const;

export type AltitudeBand = (typeof ALTITUDE_BAND_LABELS)[number];

/** Index into the ramp, or null when the altitude is unknown. */
export function altitudeBandIndex(metres: number | null): number | null {
  if (metres === null || !Number.isFinite(metres)) return null;
  const index = BAND_CEILINGS_METRES.findIndex((ceiling) => metres < ceiling);
  return index === -1 ? BAND_CEILINGS_METRES.length : index;
}

export function altitudeColour(metres: number | null, palette: Palette): string {
  const index = altitudeBandIndex(metres);
  // Unknown gets the muted foreground, not the bottom of the ramp: an aircraft
  // with no reported altitude is not one flying near the ground.
  return index === null ? palette.fgMuted : palette.altitudeRamp[index];
}

export function altitudeBandLabel(metres: number | null): AltitudeBand | 'Unknown' {
  const index = altitudeBandIndex(metres);
  return index === null ? 'Unknown' : ALTITUDE_BAND_LABELS[index];
}
