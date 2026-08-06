import { StyleSheet, View } from 'react-native';

import { borderWidthFor, radius, space, useTheme } from '@/theme';

import { Pressable } from './pressable';
import { Text } from './text';

export type BannerTone = 'info' | 'warn' | 'danger';

export type BannerProps = {
  tone?: BannerTone;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
};

/**
 * A one-line explanation of why the screen is not showing live data.
 *
 * Tone is carried by a leading glyph as well as by colour, because a red strip
 * and an amber strip are the same strip to a user with protanopia.
 */
export function Banner({ tone = 'info', message, actionLabel, onAction }: BannerProps) {
  const { colors } = useTheme();

  const accent = tone === 'danger' ? colors.danger : tone === 'warn' ? colors.warn : colors.accent;
  const glyph = tone === 'info' ? 'ℹ' : '⚠';

  return (
    <View
      style={[
        styles.banner,
        {
          backgroundColor: colors.bgElevated,
          borderColor: accent,
          borderWidth: borderWidthFor(colors),
        },
      ]}
      accessible
      // The banner appears in response to something changing, so it announces
      // itself rather than waiting to be found by a swipe.
      accessibilityLiveRegion="polite"
      accessibilityRole={tone === 'info' ? 'text' : 'alert'}
      accessibilityLabel={message}>
      <Text style={{ color: accent }}>{glyph}</Text>
      <Text variant="caption" style={styles.message}>
        {message}
      </Text>
      {actionLabel && onAction ? (
        <Pressable onPress={onAction} accessibilityRole="button" accessibilityLabel={actionLabel}>
          <Text variant="caption" style={{ color: colors.accent }}>
            {actionLabel}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    borderRadius: radius.md,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
  },
  message: { flex: 1 },
});
