import { fireEvent, render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { MIN_TOUCH_TARGET, ThemeProvider } from '@/theme';

import { Pressable } from '../pressable';
import { Text } from '../text';

const METRICS = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
};

function wrap(node: React.ReactNode) {
  return (
    <SafeAreaProvider initialMetrics={METRICS}>
      <ThemeProvider>{node}</ThemeProvider>
    </SafeAreaProvider>
  );
}

/** Flattens the style array a Pressable produces into one object. */
function flatStyle(element: { props: Record<string, unknown> }) {
  const style = element.props.style;
  return StyleSheet.flatten(
    typeof style === 'function' ? (style as (state: object) => unknown)({ pressed: false }) : style
  ) as Record<string, number | undefined>;
}

describe('Pressable', () => {
  it('guarantees a 48dp minimum target, the strictest of WCAG 2.2 and Apple', async () => {
    await render(
      wrap(
        <Pressable onPress={jest.fn()}>
          <Text>Tap</Text>
        </Pressable>
      )
    );

    const style = flatStyle(screen.getByRole('button'));
    expect(style.minHeight).toBe(MIN_TOUCH_TARGET);
    expect(style.minWidth).toBe(MIN_TOUCH_TARGET);
  });

  it('uses a minimum height rather than a fixed one, so text is never clipped at large font sizes', async () => {
    await render(
      wrap(
        <Pressable onPress={jest.fn()}>
          <Text>Tap</Text>
        </Pressable>
      )
    );

    const style = flatStyle(screen.getByRole('button'));
    expect(style.height).toBeUndefined();
  });

  it('grows hitSlop to make up the difference when the visual is smaller than the target', async () => {
    await render(
      wrap(
        <Pressable onPress={jest.fn()} style={{ width: 20, height: 20 }}>
          <Text>×</Text>
        </Pressable>
      )
    );

    const button = screen.getByRole('button');
    await fireEvent(button, 'layout', { nativeEvent: { layout: { width: 20, height: 20 } } });

    const slop = screen.getByRole('button').props.hitSlop;
    // (48 - 20) / 2 on each side brings the tappable area back up to 48.
    expect(slop).toEqual({ top: 14, bottom: 14, left: 14, right: 14 });
  });

  it('adds no slop to a control that is already large enough', async () => {
    await render(
      wrap(
        <Pressable onPress={jest.fn()}>
          <Text>Wide button</Text>
        </Pressable>
      )
    );

    const button = screen.getByRole('button');
    await fireEvent(button, 'layout', { nativeEvent: { layout: { width: 200, height: 56 } } });

    expect(screen.getByRole('button').props.hitSlop).toEqual({
      top: 0,
      bottom: 0,
      left: 0,
      right: 0,
    });
  });

  it('lets a control inside an already-tappable row opt out', async () => {
    await render(
      wrap(
        <Pressable onPress={jest.fn()} allowSmallTarget>
          <Text>Inline</Text>
        </Pressable>
      )
    );

    expect(flatStyle(screen.getByRole('button')).minHeight).toBeUndefined();
  });
});
