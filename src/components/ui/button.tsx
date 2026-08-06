import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { borderWidthFor, radius, space, useTheme } from '@/theme';

import { Pressable } from './pressable';
import { Text } from './text';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost';

export type ButtonProps = {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  /** Extra context for a screen reader, when the label alone is ambiguous. */
  accessibilityHint?: string;
  disabled?: boolean;
  icon?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
};

export function Button({
  label,
  onPress,
  variant = 'primary',
  accessibilityHint,
  disabled = false,
  icon,
  style,
}: ButtonProps) {
  const { colors } = useTheme();

  const background =
    variant === 'primary' ? colors.accent : variant === 'secondary' ? colors.bgElevated : 'transparent';
  const tone = variant === 'primary' ? 'onAccent' : 'default';

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      // Communicated to assistive tech, not just greyed out visually.
      accessibilityState={{ disabled }}
      style={[
        styles.base,
        {
          backgroundColor: background,
          borderColor: variant === 'ghost' ? 'transparent' : colors.borderStrong,
          borderWidth: borderWidthFor(colors),
          opacity: disabled ? 0.5 : 1,
        },
        style,
      ]}>
      <View style={styles.content}>
        {icon}
        <Text variant="bodyStrong" tone={tone}>
          {label}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.md,
    paddingHorizontal: space.lg,
    // Vertical padding rather than a height, so the button grows with the text.
    paddingVertical: space.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
});
