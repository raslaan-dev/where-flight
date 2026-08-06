import { useCallback, useState } from 'react';
import {
  Pressable as RNPressable,
  StyleSheet,
  View,
  type LayoutChangeEvent,
  type PressableProps as RNPressableProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { MIN_TOUCH_TARGET, useTheme } from '@/theme';

export type PressableProps = Omit<RNPressableProps, 'style'> & {
  style?: StyleProp<ViewStyle>;
  /**
   * Opt out of the enforced 48dp target. Only legitimate for controls inside a
   * row that is itself the touch target (the row swallows the tap).
   */
  allowSmallTarget?: boolean;
};

/**
 * The only pressable used in the app.
 *
 * Guarantees a 48dp touch target regardless of how small the visual is, by
 * measuring the rendered size and growing `hitSlop` to make up the difference.
 * Centralising this is what makes the guarantee testable — see the unit test.
 */
export function Pressable({
  style,
  allowSmallTarget = false,
  accessibilityRole = 'button',
  children,
  ...rest
}: PressableProps) {
  const { colors } = useTheme();
  const [slop, setSlop] = useState({ top: 0, bottom: 0, left: 0, right: 0 });
  const [focused, setFocused] = useState(false);

  const onLayout = useCallback(
    (event: LayoutChangeEvent) => {
      if (allowSmallTarget) return;
      const { width, height } = event.nativeEvent.layout;
      const horizontal = Math.max(0, (MIN_TOUCH_TARGET - width) / 2);
      const vertical = Math.max(0, (MIN_TOUCH_TARGET - height) / 2);
      setSlop((prev) =>
        prev.left === horizontal && prev.top === vertical
          ? prev
          : { top: vertical, bottom: vertical, left: horizontal, right: horizontal }
      );
    },
    [allowSmallTarget]
  );

  return (
    <RNPressable
      {...rest}
      accessibilityRole={accessibilityRole}
      onLayout={onLayout}
      hitSlop={slop}
      onFocus={(event) => {
        setFocused(true);
        rest.onFocus?.(event);
      }}
      onBlur={(event) => {
        setFocused(false);
        rest.onBlur?.(event);
      }}
      style={({ pressed }) => [
        !allowSmallTarget && styles.minimumTarget,
        style,
        pressed && styles.pressed,
        // Keyboard and switch-control focus must be visible, not just implied.
        focused && { borderColor: colors.focusRing, borderWidth: 2 },
      ]}>
      {typeof children === 'function' ? children : <View style={styles.center}>{children}</View>}
    </RNPressable>
  );
}

const styles = StyleSheet.create({
  minimumTarget: {
    minWidth: MIN_TOUCH_TARGET,
    // `minHeight`, never `height`: a fixed height clips text once the user
    // raises their OS font size.
    minHeight: MIN_TOUCH_TARGET,
    justifyContent: 'center',
  },
  center: { justifyContent: 'center' },
  pressed: { opacity: 0.6 },
});
