import {
  contrastRatio,
  hexToRgb,
  relativeLuminance,
  WCAG_AA_NON_TEXT,
  WCAG_AA_TEXT,
  WCAG_AAA_TEXT,
} from '../contrast';
import { NON_TEXT_PAIRS, PALETTES, TEXT_PAIRS, type Palette } from '../palette';

describe('contrast maths', () => {
  it('parses shorthand and longhand hex', () => {
    expect(hexToRgb('#fff')).toEqual({ r: 255, g: 255, b: 255 });
    expect(hexToRgb('4CC9F0')).toEqual({ r: 76, g: 201, b: 240 });
  });

  it('rejects malformed hex rather than silently producing NaN', () => {
    expect(() => hexToRgb('#12345')).toThrow();
    expect(() => hexToRgb('nope')).toThrow();
  });

  it('anchors on the known WCAG extremes', () => {
    expect(relativeLuminance('#000000')).toBeCloseTo(0, 5);
    expect(relativeLuminance('#FFFFFF')).toBeCloseTo(1, 5);
    expect(contrastRatio('#000000', '#FFFFFF')).toBeCloseTo(21, 2);
    expect(contrastRatio('#777777', '#777777')).toBeCloseTo(1, 5);
  });

  it('is order-independent', () => {
    expect(contrastRatio('#0B1017', '#F2F5F8')).toBeCloseTo(
      contrastRatio('#F2F5F8', '#0B1017'),
      10
    );
  });
});

/**
 * The point of this block: the palette is not *claimed* to be accessible, it is
 * proven on every run. Changing a token to something pretty but unreadable
 * fails the build.
 */
describe.each(Object.values(PALETTES))('palette: $name', (palette: Palette) => {
  const floor = palette.isHighContrast ? WCAG_AAA_TEXT : WCAG_AA_TEXT;

  it.each(TEXT_PAIRS)(`%s on %s clears ${floor}:1`, (fgKey, bgKey) => {
    const ratio = contrastRatio(palette[fgKey] as string, palette[bgKey] as string);
    expect(ratio).toBeGreaterThanOrEqual(floor);
  });

  it.each(NON_TEXT_PAIRS)(`%s on %s clears ${WCAG_AA_NON_TEXT}:1`, (fgKey, bgKey) => {
    const ratio = contrastRatio(palette[fgKey] as string, palette[bgKey] as string);
    expect(ratio).toBeGreaterThanOrEqual(WCAG_AA_NON_TEXT);
  });

  // Altitude colour is a graphical object carrying meaning, so 1.4.11 applies.
  it('every altitude ramp stop is visible against the map background', () => {
    palette.altitudeRamp.forEach((stop) => {
      expect(contrastRatio(stop, palette.bg)).toBeGreaterThanOrEqual(WCAG_AA_NON_TEXT);
    });
  });
});
