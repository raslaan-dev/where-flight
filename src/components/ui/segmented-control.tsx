import { StyleSheet, View } from 'react-native';

import { borderWidthFor, radius, space, useTheme } from '@/theme';

import { Pressable } from './pressable';
import { Text } from './text';

export type SegmentedOption<T extends string> = {
  value: T;
  label: string;
  /** Spoken instead of `label` when the short visual label lacks context. */
  a11yLabel?: string;
};

export type SegmentedControlProps<T extends string> = {
  options: readonly SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  /** Names the group for screen readers, e.g. "Theme". */
  label: string;
};

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  label,
}: SegmentedControlProps<T>) {
  const { colors, stackedLayout } = useTheme();
  const border = borderWidthFor(colors);

  return (
    <View
      accessibilityRole="radiogroup"
      accessibilityLabel={label}
      style={[
        styles.group,
        stackedLayout ? styles.stacked : styles.row,
        { backgroundColor: colors.bgSunken, borderRadius: radius.md },
      ]}>
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            onPress={() => onChange(option.value)}
            accessibilityRole="radio"
            // `selected` is what makes a screen reader say "selected", rather
            // than the user having to infer state from a colour change.
            accessibilityState={{ selected }}
            accessibilityLabel={option.a11yLabel ?? option.label}
            style={[
              styles.segment,
              stackedLayout && styles.segmentStacked,
              {
                borderRadius: radius.md - 2,
                backgroundColor: selected ? colors.accent : 'transparent',
                borderWidth: selected ? border : 0,
                borderColor: colors.borderStrong,
              },
            ]}>
            <Text
              variant="caption"
              tone={selected ? 'onAccent' : 'muted'}
              numberOfLines={2}
              style={styles.segmentLabel}>
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  group: { padding: 3, gap: 3 },
  row: { flexDirection: 'row' },
  stacked: { flexDirection: 'column' },
  segment: {
    flex: 1,
    minHeight: 40,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentStacked: { width: '100%' },
  segmentLabel: { textAlign: 'center' },
});
