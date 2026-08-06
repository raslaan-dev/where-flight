import { memo } from 'react';
import { StyleSheet, View } from 'react-native';

import type { Aircraft } from '@/api/opensky/types';
import { Pressable } from '@/components/ui/pressable';
import { Text } from '@/components/ui/text';
import { describeAircraft } from '@/lib/describe-aircraft';
import { formatAltitude, formatRelativeTime, formatSpeed, UNKNOWN } from '@/lib/format';
import { bearingToCompass, type LatLon } from '@/lib/geo';
import type { UnitSystem } from '@/stores/settings-store';
import { altitudeBandLabel, altitudeColour, borderWidthFor, radius, space, useTheme } from '@/theme';

/** ▲ ▼ ● carry the trend for anyone who cannot use the colour. */
const TREND_GLYPH: Record<Aircraft['verticalTrend'], string> = {
  climbing: '▲',
  descending: '▼',
  level: '●',
  unknown: '·',
};

export type AircraftListItemProps = {
  aircraft: Aircraft;
  units: UnitSystem;
  selected?: boolean;
  /** When given, rows show how far the aircraft is from this point. */
  origin?: LatLon | null;
  onPress: (icao24: string) => void;
};

/**
 * One aircraft, as a row.
 *
 * `accessible` on the wrapper collapses the row into a single focus stop so a
 * screen reader reads one sentence rather than six disconnected fragments.
 */
function AircraftListItemComponent({
  aircraft,
  units,
  selected = false,
  origin,
  onPress,
}: AircraftListItemProps) {
  const { colors, stackedLayout } = useTheme();
  const bandColour = altitudeColour(aircraft.altitude, colors);

  return (
    <Pressable
      onPress={() => onPress(aircraft.icao24)}
      accessible
      accessibilityRole="button"
      accessibilityLabel={describeAircraft(aircraft, { units, from: origin })}
      accessibilityHint="Opens the full flight details"
      accessibilityState={{ selected }}
      style={[
        styles.row,
        {
          backgroundColor: selected ? colors.accentMuted : colors.bgElevated,
          borderColor: selected ? colors.accent : colors.border,
          borderWidth: selected ? 2 : borderWidthFor(colors),
        },
      ]}>
      {/* A colour bar alone would be meaningless to a third of CVD users, so
          the band is also spelled out in the altitude badge below. */}
      <View style={[styles.band, { backgroundColor: bandColour }]} />

      <View style={[styles.content, stackedLayout && styles.contentStacked]}>
        <View style={styles.identity}>
          <Text variant="bodyStrong" numberOfLines={1}>
            {aircraft.label}
          </Text>
          <Text variant="caption" tone="muted" numberOfLines={1}>
            {aircraft.originCountry}
          </Text>
        </View>

        <View style={[styles.telemetry, stackedLayout && styles.telemetryStacked]}>
          <Text variant="mono">
            {aircraft.onGround ? 'On ground' : formatAltitude(aircraft.altitude, units)}
          </Text>
          <Text variant="caption" tone="muted">
            {TREND_GLYPH[aircraft.verticalTrend]} {altitudeBandLabel(aircraft.altitude)} ·{' '}
            {formatSpeed(aircraft.velocity, units)}
          </Text>
          <Text variant="caption" tone={aircraft.isStale ? 'warn' : 'muted'}>
            {aircraft.trueTrack === null
              ? UNKNOWN
              : `${bearingToCompass(aircraft.trueTrack)}`}{' '}
            · {formatRelativeTime(aircraft.positionAgeSeconds)}
          </Text>
        </View>
      </View>

      {aircraft.isEmergencySquawk ? (
        <View style={[styles.emergency, { backgroundColor: colors.danger }]}>
          <Text variant="caption" tone="onAccent">
            Emergency {aircraft.squawk}
          </Text>
        </View>
      ) : null}
    </Pressable>
  );
}

/**
 * Memoised on the fields the row actually renders. A snapshot of several
 * hundred aircraft arrives every few seconds and most rows are unchanged.
 */
export const AircraftListItem = memo(
  AircraftListItemComponent,
  (previous, next) =>
    previous.aircraft.icao24 === next.aircraft.icao24 &&
    previous.aircraft.lastContact === next.aircraft.lastContact &&
    previous.aircraft.altitude === next.aircraft.altitude &&
    previous.aircraft.velocity === next.aircraft.velocity &&
    previous.aircraft.trueTrack === next.aircraft.trueTrack &&
    previous.aircraft.isStale === next.aircraft.isStale &&
    previous.selected === next.selected &&
    previous.units === next.units
);

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'stretch',
    borderRadius: radius.md,
    overflow: 'hidden',
    // No fixed height: the row grows when the OS font size does.
    minHeight: 64,
  },
  band: { width: 6 },
  content: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space.md,
    padding: space.md,
  },
  contentStacked: { flexDirection: 'column', alignItems: 'flex-start' },
  identity: { flexShrink: 1, gap: 2 },
  telemetry: { alignItems: 'flex-end', gap: 2 },
  telemetryStacked: { alignItems: 'flex-start' },
  emergency: { justifyContent: 'center', paddingHorizontal: space.sm },
});
