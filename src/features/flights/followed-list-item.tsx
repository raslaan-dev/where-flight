import { MaterialCommunityIcons } from '@expo/vector-icons';
import { memo } from 'react';
import { StyleSheet, View } from 'react-native';

import { Pressable } from '@/components/ui/pressable';
import { Text } from '@/components/ui/text';
import { describeAircraft } from '@/lib/describe-aircraft';
import { formatAltitude, formatRelativeTime, formatSpeed } from '@/lib/format';
import type { UnitSystem } from '@/stores/settings-store';
import { ageSecondsOf, type FollowedFlight } from '@/stores/followed-store';
import { altitudeColour, borderWidthFor, radius, space, useTheme } from '@/theme';

export type FollowedListItemProps = {
  flight: FollowedFlight;
  units: UnitSystem;
  /** Seconds since the telemetry was recorded. Passed in so the whole list
   *  ticks from one clock reading rather than each row calling `Date.now()`. */
  ageSeconds?: number;
  onPress: (icao24: string) => void;
  onShowOnMap: (icao24: string) => void;
  onRemove: (icao24: string) => void;
};

/**
 * One followed flight.
 *
 * Renders entirely from the stored copy, so it looks the same in airplane mode
 * as it does online — with the age of the reading stated plainly rather than
 * left for the user to assume.
 */
function FollowedListItemComponent({
  onShowOnMap,
  flight,
  units,
  ageSeconds,
  onPress,
  onRemove,
}: FollowedListItemProps) {
  const { colors, stackedLayout } = useTheme();
  const aircraft = flight.lastSeen;
  const age = ageSeconds ?? ageSecondsOf(flight);
  const seen = formatRelativeTime(age);

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.bgElevated,
          borderColor: colors.border,
          borderWidth: borderWidthFor(colors),
        },
      ]}>
      <View style={[styles.band, { backgroundColor: altitudeColour(aircraft.altitude, colors) }]} />

      <View style={styles.body}>
        {/* The map button is a sibling of the row, never a child: the row sets
            `accessible`, which collapses its descendants into one label, and a
            button swallowed by that could be heard but never pressed. */}
        <View style={styles.topRow}>
          <Pressable
            onPress={() => onPress(flight.icao24)}
            accessible
            accessibilityRole="button"
            accessibilityLabel={`${describeAircraft(aircraft, { units })} Last seen ${seen}.`}
            accessibilityHint="Opens the full flight details"
            allowSmallTarget
            style={styles.main}>
            <View style={styles.identity}>
              <Text variant="bodyStrong" numberOfLines={1}>
                {flight.label}
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
                {formatSpeed(aircraft.velocity, units)}
              </Text>
            </View>
          </Pressable>

          <Pressable
            onPress={() => onShowOnMap(flight.icao24)}
            accessibilityRole="button"
            accessibilityLabel={`Show ${flight.label} on the map`}
            accessibilityHint="Opens the map centred on this flight"
            style={[
              styles.mapButton,
              {
                backgroundColor: colors.accentMuted,
                borderColor: colors.accent,
                borderWidth: borderWidthFor(colors),
              },
            ]}>
            {/* Text as well as the glyph: an icon font that fails to load would
                otherwise render this as an empty box with no clue what it does. */}
            <MaterialCommunityIcons name="map-marker-outline" size={16} color={colors.accent} />
            <Text variant="caption" style={{ color: colors.accent }}>
              Map
            </Text>
          </Pressable>
        </View>

        <View style={[styles.footer, stackedLayout && styles.footerStacked]}>
          <Text variant="caption" tone={age > 300 ? 'warn' : 'muted'}>
            Last seen {seen}
          </Text>
          <Pressable
            onPress={() => onRemove(flight.icao24)}
            accessibilityRole="button"
            accessibilityLabel={`Stop tracking ${flight.label}`}
            allowSmallTarget
            style={styles.remove}>
            <Text variant="caption" style={{ color: colors.accent }}>
              Untrack
            </Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

export const FollowedListItem = memo(
  FollowedListItemComponent,
  (previous, next) =>
    previous.flight.icao24 === next.flight.icao24 &&
    previous.flight.lastSeenAt === next.flight.lastSeenAt &&
    previous.ageSeconds === next.ageSeconds &&
    previous.units === next.units
);

const styles = StyleSheet.create({
  card: { flexDirection: 'row', borderRadius: radius.md, overflow: 'hidden', minHeight: 88 },
  band: { width: 6 },
  body: { flex: 1, padding: space.md, gap: space.sm },
  // Top-aligned so the button stays in the corner as the row grows taller with
  // larger text, rather than drifting to the middle of the card.
  topRow: { flexDirection: 'row', alignItems: 'flex-start', gap: space.sm },
  main: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space.md,
  },
  mapButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    borderRadius: radius.sm,
    paddingHorizontal: space.sm,
    paddingVertical: space.xs,
  },
  identity: { flexShrink: 1, gap: 2 },
  telemetry: { alignItems: 'flex-end', gap: 2 },
  telemetryStacked: { alignItems: 'flex-start' },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space.sm,
  },
  footerStacked: { flexDirection: 'column', alignItems: 'flex-start' },
  remove: { paddingVertical: space.xs },
});
