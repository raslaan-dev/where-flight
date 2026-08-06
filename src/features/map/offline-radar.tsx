import { useMemo, useState } from 'react';
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import Svg, { Circle, G, Line, Path, Rect } from 'react-native-svg';

import { Text } from '@/components/ui/text';
import type { Aircraft } from '@/api/opensky/types';
import type { Bbox } from '@/lib/geo';
import { altitudeColour, radius, space, useTheme } from '@/theme';

/**
 * A map with no map.
 *
 * Plenty of Android emulators and low-end devices have no working WebGL, and
 * the CARTO tiles need a connection the user may not have. Either way MapLibre
 * cannot draw, and a blank rectangle is not an acceptable answer — so this
 * plots the real positions on a plain grid using nothing but native SVG.
 *
 * Equirectangular, because within a single viewport-sized box the distortion is
 * invisible and the arithmetic is one subtraction and one divide per aircraft.
 */

export type OfflineRadarProps = {
  aircraft: readonly Aircraft[];
  bbox: Bbox | null;
  selectedIcao24: string | null;
  reason: string;
};

const MARKER = 'M0 -7 L4 4 L0 1.5 L-4 4 Z';

export function OfflineRadar({ aircraft, bbox, selectedIcao24, reason }: OfflineRadarProps) {
  const { colors } = useTheme();
  const [size, setSize] = useState({ width: 0, height: 0 });

  const onLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setSize((prev) => (prev.width === width && prev.height === height ? prev : { width, height }));
  };

  const plotted = useMemo(() => {
    if (bbox === null || size.width === 0) return [];
    const spanLon = Math.max(1e-6, bbox.lomax - bbox.lomin);
    const spanLat = Math.max(1e-6, bbox.lamax - bbox.lamin);

    return aircraft.flatMap((item) => {
      if (item.latitude === null || item.longitude === null) return [];
      return [
        {
          key: item.icao24,
          x: ((item.longitude - bbox.lomin) / spanLon) * size.width,
          // SVG y grows downwards; latitude grows upwards.
          y: (1 - (item.latitude - bbox.lamin) / spanLat) * size.height,
          rotation: item.trueTrack ?? 0,
          hasHeading: item.trueTrack !== null,
          colour: altitudeColour(item.altitude, colors),
          selected: item.icao24 === selectedIcao24,
        },
      ];
    });
  }, [aircraft, bbox, size, colors, selectedIcao24]);

  return (
    <View
      style={[styles.container, { backgroundColor: colors.bgSunken, borderColor: colors.border }]}
      onLayout={onLayout}>
      <Svg
        width="100%"
        height="100%"
        // The plot is decorative: every aircraft in it is also a row in the
        // list below, which is where the real information is.
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants">
        <Rect width="100%" height="100%" fill={colors.bgSunken} />
        {[0.25, 0.5, 0.75].map((fraction) => (
          <G key={fraction}>
            <Line
              x1={size.width * fraction}
              y1={0}
              x2={size.width * fraction}
              y2={size.height}
              stroke={colors.border}
              strokeWidth={1}
            />
            <Line
              x1={0}
              y1={size.height * fraction}
              x2={size.width}
              y2={size.height * fraction}
              stroke={colors.border}
              strokeWidth={1}
            />
          </G>
        ))}
        {plotted.map((item) =>
          item.hasHeading ? (
            <G key={item.key} transform={`translate(${item.x} ${item.y}) rotate(${item.rotation})`}>
              {item.selected ? (
                <Circle r={12} fill="none" stroke={colors.accent} strokeWidth={2} />
              ) : null}
              <Path
                d={MARKER}
                fill={item.colour}
                stroke={colors.bgSunken}
                strokeWidth={1}
                strokeLinejoin="round"
              />
            </G>
          ) : (
            <G key={item.key} transform={`translate(${item.x} ${item.y})`}>
              {item.selected ? (
                <Circle r={12} fill="none" stroke={colors.accent} strokeWidth={2} />
              ) : null}
              <Circle r={4} fill={item.colour} stroke={colors.bgSunken} strokeWidth={1} />
            </G>
          )
        )}
      </Svg>

      <View style={[styles.caption, { backgroundColor: colors.bgOverlay }]}>
        <Text variant="caption" tone="muted">
          {reason}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    borderWidth: 1,
    borderRadius: radius.lg,
    overflow: 'hidden',
  },
  caption: {
    position: 'absolute',
    left: space.sm,
    right: space.sm,
    bottom: space.sm,
    padding: space.sm,
    borderRadius: radius.md,
  },
});
