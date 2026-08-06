import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { ERROR_COPY, type ApiErrorKind } from '@/api/opensky/errors';
import { space, useTheme } from '@/theme';

import { Button } from './button';
import { Text } from './text';

/**
 * The three states every data screen has to be able to show.
 *
 * Shared so that no screen quietly ships a blank view instead — an unexplained
 * empty screen is the most common way an app fails a first-time user.
 */

export function LoadingState({ label = 'Loading aircraft' }: { label?: string }) {
  const { colors } = useTheme();
  return (
    <View
      style={styles.centred}
      // One announcement rather than a spinner a screen reader cannot see.
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={label}>
      <ActivityIndicator color={colors.accent} size="large" />
      <Text tone="muted">{label}…</Text>
    </View>
  );
}

export type ErrorStateProps = {
  kind: ApiErrorKind;
  onRetry?: () => void;
  /** Offered when there is a cached snapshot worth falling back to. */
  onUseCached?: () => void;
};

/** Renders the plain-English copy paired with each error kind. */
export function ErrorState({ kind, onRetry, onUseCached }: ErrorStateProps) {
  const copy = ERROR_COPY[kind];

  return (
    <View style={styles.centred} accessible accessibilityRole="alert">
      <Text variant="heading" heading>
        {copy.title}
      </Text>
      <Text tone="muted" style={styles.body}>
        {copy.body}
      </Text>
      <View style={styles.actions}>
        {copy.primaryAction && onRetry ? (
          <Button label={copy.primaryAction} onPress={onRetry} />
        ) : null}
        {copy.offerCachedData && onUseCached ? (
          <Button label="Show last loaded" onPress={onUseCached} variant="secondary" />
        ) : null}
      </View>
    </View>
  );
}

export type EmptyStateProps = {
  title: string;
  body: string;
  actionLabel?: string;
  onAction?: () => void;
};

export function EmptyState({ title, body, actionLabel, onAction }: EmptyStateProps) {
  return (
    <View style={styles.centred} accessible>
      <Text variant="heading" heading>
        {title}
      </Text>
      <Text tone="muted" style={styles.body}>
        {body}
      </Text>
      {actionLabel && onAction ? (
        <Button label={actionLabel} onPress={onAction} variant="secondary" />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  centred: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.md,
    paddingHorizontal: space.lg,
  },
  body: { textAlign: 'center' },
  actions: { flexDirection: 'row', gap: space.sm, flexWrap: 'wrap', justifyContent: 'center' },
});
