/**
 * Semantic colour tokens.
 *
 * Components never reference raw hex — only the names below. That is what makes
 * four runtime-switchable palettes (including two high-contrast ones) possible
 * without touching a single component.
 */

export type PaletteName = 'dark' | 'light' | 'highContrastDark' | 'highContrastLight';

export type Palette = {
  readonly name: PaletteName;
  /** Drives the OS status bar and keyboard appearance. */
  readonly scheme: 'dark' | 'light';
  /** true when this palette is one of the high-contrast variants. */
  readonly isHighContrast: boolean;

  // Surfaces, back to front.
  readonly bgSunken: string;
  readonly bg: string;
  readonly bgElevated: string;
  readonly bgOverlay: string;

  // Content.
  readonly fg: string;
  readonly fgMuted: string;
  /** Text drawn on top of `accent`. */
  readonly onAccent: string;

  readonly border: string;
  readonly borderStrong: string;

  readonly accent: string;
  readonly accentMuted: string;
  readonly success: string;
  readonly warn: string;
  readonly danger: string;
  readonly focusRing: string;

  /**
   * Sequential altitude scale, lowest to highest.
   *
   * Derived from cividis: monotonic in lightness, so it survives protanopia,
   * deuteranopia, tritanopia *and* greyscale. The range is shifted per palette
   * so every stop clears 3:1 against that palette's map background — the usual
   * green/yellow/red aviation ramp fails all four of those tests.
   */
  readonly altitudeRamp: readonly [string, string, string, string, string, string];
};

/** Width of borders on interactive surfaces. Doubled in high contrast. */
export const borderWidthFor = (p: Palette) => (p.isHighContrast ? 2 : 1);

const dark: Palette = {
  name: 'dark',
  scheme: 'dark',
  isHighContrast: false,

  bgSunken: '#05080D',
  bg: '#0B1017',
  bgElevated: '#161D27',
  bgOverlay: '#1F2937',

  fg: '#F2F5F8',
  fgMuted: '#A3B0BF',
  onAccent: '#04131B',

  border: '#27313E',
  borderStrong: '#5F6E7E',

  accent: '#4CC9F0',
  accentMuted: '#1E3A47',
  success: '#5DE29A',
  warn: '#FBBF24',
  danger: '#FF8095',
  focusRing: '#8AD9FF',

  altitudeRamp: ['#5D6470', '#717573', '#8B896C', '#A79E58', '#CDBF4D', '#FDEA45'],
};

const light: Palette = {
  name: 'light',
  scheme: 'light',
  isHighContrast: false,

  bgSunken: '#E8EDF2',
  bg: '#F6F8FA',
  bgElevated: '#FFFFFF',
  bgOverlay: '#FFFFFF',

  fg: '#0B1220',
  fgMuted: '#535F6D',
  onAccent: '#FFFFFF',

  border: '#D3DBE3',
  borderStrong: '#7C8794',

  accent: '#0B63C5',
  accentMuted: '#DCEAFB',
  success: '#0F7A3D',
  warn: '#8A5A00',
  danger: '#C41E3F',
  focusRing: '#0B63C5',

  altitudeRamp: ['#00224E', '#0F386E', '#2F4668', '#4E576B', '#666C70', '#7B7A6B'],
};

const highContrastDark: Palette = {
  name: 'highContrastDark',
  scheme: 'dark',
  isHighContrast: true,

  bgSunken: '#000000',
  bg: '#000000',
  bgElevated: '#0D0D0D',
  bgOverlay: '#141414',

  fg: '#FFFFFF',
  fgMuted: '#E3E3E3',
  onAccent: '#000000',

  border: '#8A8A8A',
  borderStrong: '#FFFFFF',

  accent: '#6FE3FF',
  accentMuted: '#00303D',
  success: '#79FFB0',
  warn: '#FFD24D',
  danger: '#FF9BAC',
  focusRing: '#FFFFFF',

  altitudeRamp: ['#8B8F94', '#9DA096', '#B2B08D', '#C8C079', '#E2D65F', '#FFF04D'],
};

const highContrastLight: Palette = {
  name: 'highContrastLight',
  scheme: 'light',
  isHighContrast: true,

  bgSunken: '#FFFFFF',
  bg: '#FFFFFF',
  bgElevated: '#FFFFFF',
  bgOverlay: '#FFFFFF',

  fg: '#000000',
  fgMuted: '#2B2B2B',
  onAccent: '#FFFFFF',

  border: '#565656',
  borderStrong: '#000000',

  accent: '#00397F',
  accentMuted: '#D6E4F7',
  success: '#005522',
  warn: '#5C3B00',
  danger: '#96001F',
  focusRing: '#000000',

  altitudeRamp: ['#00224E', '#123570', '#3B496C', '#575D6D', '#6E7071', '#8A8468'],
};

export const PALETTES: Record<PaletteName, Palette> = {
  dark,
  light,
  highContrastDark,
  highContrastLight,
};

/**
 * Foreground/background pairs that must clear WCAG contrast in every palette.
 * Exported so the test suite iterates the real list rather than a copy that
 * silently drifts out of date.
 */
export const TEXT_PAIRS: readonly (readonly [keyof Palette, keyof Palette])[] = [
  ['fg', 'bg'],
  ['fg', 'bgElevated'],
  ['fg', 'bgSunken'],
  ['fg', 'bgOverlay'],
  ['fgMuted', 'bg'],
  ['fgMuted', 'bgElevated'],
  ['fgMuted', 'bgSunken'],
  ['accent', 'bg'],
  ['accent', 'bgElevated'],
  ['success', 'bg'],
  ['warn', 'bg'],
  ['danger', 'bg'],
  ['danger', 'bgElevated'],
  ['onAccent', 'accent'],
];

/**
 * Pairs that only need the 3:1 non-text floor (WCAG 1.4.11).
 *
 * `border` is deliberately absent: it is a decorative hairline between blocks
 * of content, and 1.4.11 exempts purely decorative separators. Anything that
 * outlines an interactive control uses `borderStrong`, which is tested.
 */
export const NON_TEXT_PAIRS: readonly (readonly [keyof Palette, keyof Palette])[] = [
  ['borderStrong', 'bg'],
  ['focusRing', 'bg'],
  ['focusRing', 'bgElevated'],
];
