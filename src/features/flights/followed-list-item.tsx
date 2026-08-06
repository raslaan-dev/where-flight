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

        <View style={[styles.footer, stackedLayout && styles.footerStacked]}>
          <Text variant="caption" tone={age > 300 ? 'warn' : 'muted'}>
            Last seen {seen}
          </Text>
          <Pressable
            onPress={() => onRemove(flight.icao24)}
            accessibilityRole="button"
            accessibilityLabel={`Unfollow ${flight.label}`}
            allowSmallTarget
            style={styles.remove}>
            <Text variant="caption" style={{ color: colors.accent }}>
              Unfollow
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
  main: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space.md,
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
