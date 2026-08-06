import { MaterialCommunityIcons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';

import { Pressable } from '@/components/ui/pressable';
import { borderWidthFor, radius, space, useTheme } from '@/theme';

/**
 * Native equivalents for every map gesture.
 *
 * Pinch, drag and two-finger rotate are all unreachable with a screen reader,
 * a switch control or a keyboard. Rather than treat that as unavoidable, each
 * gesture gets a real focusable button here — which is also simply easier to
 * use one-handed.
 */

export type MapControlsProps = {
  onZoomIn: () => void;
  onZoomOut: () => void;
  onRecentre: () => void;
  onResetNorth: () => void;
  disabled?: boolean;
};

export function MapControls({
  onZoomIn,
  onZoomOut,
  onRecentre,
  onResetNorth,
  disabled = false,
}: MapControlsProps) {
  const { colors } = useTheme();

  const buttons = [
    { icon: 'plus', label: 'Zoom in', hint: 'Shows a smaller area in more detail', onPress: onZoomIn },
    { icon: 'minus', label: 'Zoom out', hint: 'Shows a wider area', onPress: onZoomOut },
    {
      icon: 'crosshairs-gps',
      label: 'Recentre',
      hint: 'Returns the map to the region being tracked',
      onPress: onRecentre,
    },
    {
      icon: 'navigation-variant-outline',
      label: 'Reset north',
      hint: 'Points the map north again',
      onPress: onResetNorth,
    },
  ] as const;

  return (
    <View style={styles.column} pointerEvents="box-none">
      {buttons.map(({ icon, label, hint, onPress }) => (
        <Pressable
          key={label}
          onPress={onPress}
          disabled={disabled}
          accessibilityLabel={label}
          accessibilityHint={hint}
          accessibilityState={{ disabled }}
          style={[
            styles.button,
            {
              backgroundColor: colors.bgOverlay,
              borderColor: colors.borderStrong,
              borderWidth: borderWidthFor(colors),
              opacity: disabled ? 0.5 : 1,
            },
          ]}>
          <MaterialCommunityIcons name={icon} size={22} color={colors.fg} />
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  column: {
    position: 'absolute',
    right: space.md,
    top: space.md,
    gap: space.sm,
  },
  button: {
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    padding: space.sm,
  },
});
