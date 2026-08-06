import { relativeLuminance } from '../contrast';
import { colourDistance, luminanceDistance, simulateCvd, type CvdType } from '../cvd';
import { PALETTES, type Palette } from '../palette';

const CVD_TYPES: CvdType[] = ['protanopia', 'deuteranopia', 'tritanopia'];

/** Minimum separation, in 0-441 RGB distance, for two stops to read as different. */
const MIN_SEPARATION = 20;
/** Minimum difference in relative luminance between adjacent stops. */
const MIN_LUMINANCE_STEP = 0.015;

describe('CVD simulation', () => {
  it('leaves greys untouched — they carry no chromatic information', () => {
    CVD_TYPES.forEach((type) => {
      expect(simulateCvd('#808080', type)).toBe('#808080');
    });
  });

  it('pulls red towards green, shrinking the gap between them', () => {
    const gapBefore = colourDistance('#D62728', '#2CA02C');
    const gapAfter = colourDistance(
      simulateCvd('#D62728', 'deuteranopia'),
      simulateCvd('#2CA02C', 'deuteranopia')
    );
    expect(gapAfter).toBeLessThan(gapBefore);
  });
});

/**
 * Justifies the palette decision rather than merely stating it: the ramp every
 * other flight tracker uses fails the exact criterion cividis is chosen for.
 */
describe('the conventional green -> yellow -> red altitude ramp', () => {
  const CONVENTIONAL = ['#22C55E', '#84CC16', '#EAB308', '#F97316', '#EF4444', '#B91C1C'];

  it('is not monotonic in lightness, so it collapses in greyscale', () => {
    const luminances = CONVENTIONAL.map((c) => relativeLuminance(c));
    const isMonotonic = luminances.every((l, i) => i === 0 || l > luminances[i - 1]);

    expect(isMonotonic).toBe(false);
  });

  it('has adjacent stops that become indistinguishable under deuteranopia', () => {
    const collapsed = CONVENTIONAL.slice(1).some(
      (c, i) =>
        colourDistance(
          simulateCvd(CONVENTIONAL[i], 'deuteranopia'),
          simulateCvd(c, 'deuteranopia')
        ) < MIN_SEPARATION
    );
    expect(collapsed).toBe(true);
  });
});

describe.each(Object.values(PALETTES))('altitude ramp: $name', (palette: Palette) => {
  const ramp = palette.altitudeRamp;

  it('increases monotonically in lightness', () => {
    // Monotonic lightness is what makes the scale survive *any* CVD type and
    // greyscale printing, independently of hue.
    for (let i = 1; i < ramp.length; i += 1) {
      expect(luminanceDistance(ramp[i - 1], ramp[i])).toBeGreaterThanOrEqual(
        MIN_LUMINANCE_STEP
      );
    }
  });

  it.each(CVD_TYPES)('keeps adjacent stops distinct under %s', (type) => {
    for (let i = 1; i < ramp.length; i += 1) {
      const a = simulateCvd(ramp[i - 1], type);
      const b = simulateCvd(ramp[i], type);
      expect(colourDistance(a, b)).toBeGreaterThanOrEqual(MIN_SEPARATION);
    }
  });
});
