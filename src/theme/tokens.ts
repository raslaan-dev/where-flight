/** Non-colour design tokens. Shared across every palette. */

/** 4pt grid. */
export const space = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const radius = {
  sm: 6,
  md: 10,
  lg: 16,
  pill: 999,
} as const;

/**
 * Minimum touch target, in dp.
 *
 * 48 is the strictest of the three relevant guidelines — WCAG 2.2 asks for 24px,
 * Apple for 44pt, Material for 48dp — so meeting it satisfies all of them.
 */
export const MIN_TOUCH_TARGET = 48;

/**
 * Base font sizes. These are *unscaled*: React Native multiplies them by the
 * user's OS font-size setting at render time, which is why `allowFontScaling`
 * is never disabled anywhere in this app.
 */
export const fontSize = {
  xs: 11,
  sm: 13,
  md: 15,
  lg: 17,
  xl: 22,
  xxl: 28,
} as const;

export const lineHeightMultiplier = 1.35;

export const fontWeight = {
  regular: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
} as const;

/**
 * Above this OS font scale the app switches to stacked layouts: side-by-side
 * rows and multi-column grids stop fitting long before the text stops growing.
 */
export const STACKED_LAYOUT_FONT_SCALE = 1.3;

export const duration = {
  fast: 120,
  normal: 220,
  slow: 360,
} as const;
