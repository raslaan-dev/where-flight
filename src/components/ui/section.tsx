import { StyleSheet, View } from 'react-native';

import { borderWidthFor, radius, space, useTheme } from '@/theme';

import { Text } from './text';

export function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  const { colors } = useTheme();

  return (
    <View style={styles.wrapper}>
      <Text variant="overline" tone="muted" heading>
        {title}
      </Text>
      {description ? (
        <Text variant="caption" tone="muted">
          {description}
        </Text>
      ) : null}
      <View
        style={[
          styles.card,
          {
            backgroundColor: colors.bgElevated,
            borderColor: colors.border,
            borderWidth: borderWidthFor(colors),
          },
        ]}>
        {children}
      </View>
    </View>
  );
}

export function Row({
  label,
  description,
  children,
}: {
  label: string;
  description?: string;
  children?: React.ReactNode;
}) {
  return (
    <View style={styles.row}>
      <Text variant="bodyStrong">{label}</Text>
      {description ? (
        <Text variant="caption" tone="muted">
          {description}
        </Text>
      ) : null}
      {children}
    </View>
  );
}

/**
 * A label and its value.
 *
 * `accessible` on the wrapper is what makes it read as "Speed, 452 knots"
 * rather than as two unrelated focus stops.
 */
export function DataRow({
  label,
  value,
  spokenValue,
}: {
  label: string;
  value: string;
  /** Overrides the spoken form — hex codes need spelling out, for instance. */
  spokenValue?: string;
}) {
  const { stackedLayout } = useTheme();

  return (
    <View
      accessible
      accessibilityLabel={`${label}: ${spokenValue ?? value}`}
      style={stackedLayout ? styles.dataRowStacked : styles.dataRow}>
      <Text tone="muted">{label}</Text>
      <Text variant="mono">{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: space.sm, marginBottom: space.xl },
  card: { borderRadius: radius.lg, padding: space.lg, gap: space.lg },
  row: { gap: space.sm },
  dataRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    gap: space.md,
  },
  // At large text sizes a label and value stop fitting on one line.
  dataRowStacked: { flexDirection: 'column', gap: 2 },
});
