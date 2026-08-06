import { Text as RNText, type TextProps as RNTextProps, type TextStyle } from 'react-native';

import { fontSize, fontWeight, lineHeightMultiplier, useTheme } from '@/theme';

export type TextVariant =
  | 'display'
  | 'title'
  | 'heading'
  | 'body'
  | 'bodyStrong'
  | 'caption'
  | 'overline'
  /** Tabular figures for telemetry that updates in place without jittering. */
  | 'mono';

export type TextTone = 'default' | 'muted' | 'accent' | 'success' | 'warn' | 'danger' | 'onAccent';

const VARIANTS: Record<TextVariant, TextStyle> = {
  display: { fontSize: fontSize.xxl, fontWeight: fontWeight.bold, letterSpacing: -0.5 },
  title: { fontSize: fontSize.xl, fontWeight: fontWeight.bold, letterSpacing: -0.3 },
  heading: { fontSize: fontSize.lg, fontWeight: fontWeight.semibold },
  body: { fontSize: fontSize.md, fontWeight: fontWeight.regular },
  bodyStrong: { fontSize: fontSize.md, fontWeight: fontWeight.semibold },
  caption: { fontSize: fontSize.sm, fontWeight: fontWeight.regular },
  overline: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  mono: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
    fontVariant: ['tabular-nums'],
  },
};

export type TextProps = RNTextProps & {
  variant?: TextVariant;
  tone?: TextTone;
  /** Renders as a screen-reader heading so rotor/heading navigation works. */
  heading?: boolean;
};

export function Text({
  variant = 'body',
  tone = 'default',
  heading,
  style,
  ...rest
}: TextProps) {
  const { colors } = useTheme();

  const colour = {
    default: colors.fg,
    muted: colors.fgMuted,
    accent: colors.accent,
    success: colors.success,
    warn: colors.warn,
    danger: colors.danger,
    onAccent: colors.onAccent,
  }[tone];

  const base = VARIANTS[variant];

  return (
    <RNText
      // Never disabled. Overriding this is the most common — and most easily
      // spotted — accessibility failure in a React Native app.
      allowFontScaling
      accessibilityRole={heading ? 'header' : rest.accessibilityRole}
      style={[
        base,
        { color: colour, lineHeight: (base.fontSize ?? fontSize.md) * lineHeightMultiplier },
        style,
      ]}
      {...rest}
    />
  );
}
