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

const styles = StyleSheet.create({
  wrapper: { gap: space.sm, marginBottom: space.xl },
  card: { borderRadius: radius.lg, padding: space.lg, gap: space.lg },
  row: { gap: space.sm },
});
