import { StyleSheet, TextInput, type TextInputProps } from 'react-native';

import { borderWidthFor, fontSize, radius, space, MIN_TOUCH_TARGET, useTheme } from '@/theme';

/**
 * A themed text input.
 *
 * `accessibilityLabel` is required, not optional: an unlabelled text field is
 * announced as just "edit box", which tells the user nothing about what to
 * type into it.
 */
export type TextFieldProps = Omit<TextInputProps, 'style'> & {
  accessibilityLabel: string;
};

export function TextField({ accessibilityLabel, ...rest }: TextFieldProps) {
  const { colors } = useTheme();

  return (
    <TextInput
      accessibilityLabel={accessibilityLabel}
      placeholderTextColor={colors.fgMuted}
      allowFontScaling
      style={[
        styles.input,
        {
          color: colors.fg,
          backgroundColor: colors.bgElevated,
          borderColor: colors.borderStrong,
          borderWidth: borderWidthFor(colors),
        },
      ]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  input: {
    minHeight: MIN_TOUCH_TARGET,
    borderRadius: radius.md,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    fontSize: fontSize.md,
  },
});
