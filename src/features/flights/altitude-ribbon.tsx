import { useMemo, useState } from 'react';
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import Svg, { Line, Path } from 'react-native-svg';

import type { FlightTrack } from '@/api/opensky/types';
import { Text } from '@/components/ui/text';
import { formatAltitude } from '@/lib/format';
import type { UnitSystem } from '@/stores/settings-store';
import { radius, space, useTheme } from '@/theme';

import { describeTrack } from './track-summary';

/**
 * Altitude over time for one flight, as a small area chart.
 *
 * The picture is decorative: `describeTrack` speaks the same information, so
 * the SVG is hidden from assistive technology rather than exposed as an
 * unlabelled shape.
 */

const RIBBON_HEIGHT = 120;

export type AltitudeRibbonProps = {
  track: FlightTrack;
  units: UnitSystem;
};

export function AltitudeRibbon({ track, units }: AltitudeRibbonProps) {
  const { colors } = useTheme();
  const [width, setWidth] = useState(0);

  const onLayout = (event: LayoutChangeEvent) => {
    const next = event.nativeEvent.layout.width;
    setWidth((prev) => (prev === next ? prev : next));
  };

  const plot = useMemo(() => {
    if (width === 0) return null;
    const points = track.path.filter((point) => point.altitude !== null);
    if (points.length < 2) return null;

    const timeSpan = Math.max(1, track.endTime - track.startTime);
    const maxAltitude = Math.max(...points.map((point) => point.altitude!));
    // Ground level stays at the bottom even for a low-flying circuit.
    const altitudeSpan = Math.max(300, maxAltitude);

    const coords = points.map((point) => ({
      x: ((point.time - track.startTime) / timeSpan) * width,
      y: RIBBON_HEIGHT - (point.altitude! / altitudeSpan) * RIBBON_HEIGHT,
    }));

    const line = coords
      .map((point, index) => `${index === 0 ? 'M' : 'L'}${point.x.toFixed(1)} ${point.y.toFixed(1)}`)
      .join(' ');
    const area = `${line} L${coords[coords.length - 1].x.toFixed(1)} ${RIBBON_HEIGHT} L${coords[0].x.toFixed(1)} ${RIBBON_HEIGHT} Z`;

    return { line, area, maxAltitude };
  }, [track, width]);

  if (plot === null && width !== 0) {
    return (
      <Text tone="muted">
        The flight path arrived without altitude readings, so there is nothing to chart.
      </Text>
    );
  }

  return (
    <View accessible accessibilityLabel={describeTrack(track, units)} style={styles.wrapper}>
      <View
        onLayout={onLayout}
        style={[styles.chart, { backgroundColor: colors.bgSunken, borderColor: colors.border }]}>
        {plot ? (
          <Svg
            width="100%"
            height={RIBBON_HEIGHT}
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants">
            {[0.25, 0.5, 0.75].map((fraction) => (
              <Line
                key={fraction}
                x1={0}
                y1={RIBBON_HEIGHT * fraction}
                x2={width}
                y2={RIBBON_HEIGHT * fraction}
                stroke={colors.border}
                strokeWidth={1}
              />
            ))}
            <Path d={plot.area} fill={colors.accent} opacity={0.18} />
            <Path d={plot.line} stroke={colors.accent} strokeWidth={2} fill="none" />
          </Svg>
        ) : null}
      </View>

      <View style={styles.legend}>
        <Text variant="caption" tone="muted">
          Take-off
        </Text>
        {plot ? (
          <Text variant="caption" tone="muted">
            Peak {formatAltitude(plot.maxAltitude, units)}
          </Text>
        ) : null}
        <Text variant="caption" tone="muted">
          Now
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: space.xs },
  chart: {
    height: RIBBON_HEIGHT,
    borderRadius: radius.md,
    borderWidth: 1,
    overflow: 'hidden',
  },
  legend: { flexDirection: 'row', justifyContent: 'space-between' },
});
