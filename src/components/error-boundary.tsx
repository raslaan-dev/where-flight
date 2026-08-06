import { Component, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { space } from '@/theme';

import { Button } from './ui/button';
import { Text } from './ui/text';

/**
 * The last line of defence against a render crash.
 *
 * Mounted twice: once at the root, so no bug produces a silent white screen,
 * and once tightly around the map, so a WebView crash costs the map and
 * nothing else — the tab bar, the list view and every other screen keep
 * working.
 */

type Props = {
  children: ReactNode;
  /** Rendered instead of the default message, e.g. the map's radar fallback. */
  fallback?: (retry: () => void) => ReactNode;
};

type State = { failed: boolean };

export class ErrorBoundary extends Component<Props, State> {
  state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  componentDidCatch(error: unknown): void {
    if (__DEV__) console.error('[error-boundary]', error);
  }

  retry = (): void => {
    this.setState({ failed: false });
  };

  render(): ReactNode {
    if (!this.state.failed) return this.props.children;
    if (this.props.fallback) return this.props.fallback(this.retry);

    return (
      <View style={styles.centred}>
        <View style={styles.copy} accessible accessibilityRole="alert">
          <Text variant="heading" heading>
            Something went wrong
          </Text>
          <Text tone="muted" style={styles.body}>
            The screen hit a bug and could not be drawn. Your saved flights and
            settings are untouched.
          </Text>
        </View>
        <Button label="Try again" onPress={this.retry} />
      </View>
    );
  }
}

const styles = StyleSheet.create({
  centred: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.md,
    paddingHorizontal: space.lg,
  },
  copy: { alignItems: 'center', gap: space.md },
  body: { textAlign: 'center' },
});
