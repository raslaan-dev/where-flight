import { StyleSheet, View, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { space, useTheme } from '@/theme';

import { Text } from './text';

export type ScreenProps = {
  children: React.ReactNode;
  /** Rendered as a screen-reader heading and a large visual title. */
  title?: string;
  subtitle?: string;
  /** Controls sit to the right of the title. */
  actions?: React.ReactNode;
  /** Set false for full-bleed content such as the map. */
  padded?: boolean;
  style?: ViewStyle;
};

export function Screen({
  children,
  title,
  subtitle,
  actions,
  padded = true,
  style,
}: ScreenProps) {
  const { colors, stackedLayout } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.root,
        { backgroundColor: colors.bg, paddingTop: insets.top },
        style,
      ]}>
      {title ? (
        <View
          style={[
            styles.header,
            padded && styles.padded,
            // At large text sizes a title and its actions stop fitting on one
            // line, so they stack instead of the title truncating.
            stackedLayout ? styles.headerStacked : styles.headerRow,
          ]}>
          <View style={styles.headerText}>
            <Text variant="display" heading>
              {title}
            </Text>
            {subtitle ? (
              <Text variant="caption" tone="muted">
                {subtitle}
              </Text>
            ) : null}
          </View>
          {actions ? <View style={styles.actions}>{actions}</View> : null}
        </View>
      ) : null}

      <View style={[styles.body, padded && styles.padded]}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  padded: { paddingHorizontal: space.lg },
  header: { paddingTop: space.md, paddingBottom: space.sm, gap: space.sm },
  headerRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  headerStacked: { flexDirection: 'column', alignItems: 'flex-start' },
  headerText: { flexShrink: 1, gap: 2 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  body: { flex: 1 },
});
