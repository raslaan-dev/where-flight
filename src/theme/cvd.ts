/**
 * Colour-vision-deficiency simulation.
 *
 * Used by cvd.test.ts to prove that adjacent stops on the altitude ramp stay
 * distinguishable for the ~8% of men with red-green CVD. Most flight trackers
 * ship a green -> yellow -> red altitude scale, which is the single worst
 * choice for the most common deficiency.
 */

import { hexToRgb, relativeLuminance, rgbToHex, type Rgb } from './contrast';

export type CvdType = 'protanopia' | 'deuteranopia' | 'tritanopia';

/**
 * Brettel/Vienot-style linear-RGB transforms. Approximations, but the standard
 * ones used by accessibility tooling and more than accurate enough to catch a
 * ramp whose stops collapse into each other.
 */
const MATRICES: Record<CvdType, readonly number[]> = {
  // Missing long-wavelength (red) cones.
  protanopia: [0.567, 0.433, 0.0, 0.558, 0.442, 0.0, 0.0, 0.242, 0.758],
  // Missing medium-wavelength (green) cones. The most common form.
  deuteranopia: [0.625, 0.375, 0.0, 0.7, 0.3, 0.0, 0.0, 0.3, 0.7],
  // Missing short-wavelength (blue) cones. Rare.
  tritanopia: [0.95, 0.05, 0.0, 0.0, 0.433, 0.567, 0.0, 0.475, 0.525],
};

export function simulateCvd(colour: string, type: CvdType): string {
  const { r, g, b } = hexToRgb(colour);
  const m = MATRICES[type];
  return rgbToHex({
    r: m[0] * r + m[1] * g + m[2] * b,
    g: m[3] * r + m[4] * g + m[5] * b,
    b: m[6] * r + m[7] * g + m[8] * b,
  });
}

/** Euclidean distance in RGB space, 0-441. Crude, but adequate as a floor check. */
export function colourDistance(a: string | Rgb, b: string | Rgb): number {
  const ca = typeof a === 'string' ? hexToRgb(a) : a;
  const cb = typeof b === 'string' ? hexToRgb(b) : b;
  return Math.sqrt(
    Math.pow(ca.r - cb.r, 2) + Math.pow(ca.g - cb.g, 2) + Math.pow(ca.b - cb.b, 2)
  );
}

/**
 * Difference in perceived lightness, 0-1.
 *
 * This is the property that actually saves a sequential ramp: if every stop
 * differs in lightness, the scale survives all three CVD types *and*
 * greyscale printing, regardless of hue.
 */
export function luminanceDistance(a: string, b: string): number {
  return Math.abs(relativeLuminance(a) - relativeLuminance(b));
}
