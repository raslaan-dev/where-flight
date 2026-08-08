import { MaterialCommunityIcons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';

import type { Aircraft } from '@/api/opensky/types';
import { Button } from '@/components/ui/button';
import { AircraftListItem } from '@/features/flights/aircraft-list-item';
import { hapticConfirm } from '@/lib/haptics';
import { isFollowed, useFollowedStore } from '@/stores/followed-store';
import type { UnitSystem } from '@/stores/settings-store';
import { borderWidthFor, radius, space, useTheme } from '@/theme';

import { TrailControl } from './trail-control';

/**
 * The card that appears over the map when an aircraft is selected.
 *
 * The row at the top is itself a link to the detail screen, but a tappable row
 * is a weak affordance on a card floating over a map — so the two things
 * someone actually wants are also spelled out as buttons: keep this flight, and
 * go and read the rest of it.
 */

export type SelectionCardProps = {
  aircraft: Aircraft;
  units: UnitSystem;
  onOpenDetails: () => void;
  onClear: () => void;
};

export function SelectionCard({ aircraft, units, onOpenDetails, onClear }: SelectionCardProps) {
  const { colors } = useTheme();
  const tracked = useFollowedStore((state) => isFollowed(state, aircraft.icao24));
  const toggle = useFollowedStore((state) => state.toggle);

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
      <AircraftListItem aircraft={aircraft} units={units} selected onPress={onOpenDetails} />

      <TrailControl icao24={aircraft.icao24} />

      <View style={styles.actions}>
        <Button
          label={tracked ? 'Tracking' : 'Track'}
          variant="secondary"
          style={styles.action}
          icon={
            <MaterialCommunityIcons
              name={tracked ? 'bookmark' : 'bookmark-outline'}
              size={18}
              color={colors.fg}
            />
          }
          onPress={() => {
            hapticConfirm();
            toggle(aircraft);
          }}
          // The label already carries the state in words, so a screen reader
          // hears the change without needing the icon described.
          accessibilityHint={
            tracked
              ? 'Removes this flight from the Track tab'
              : 'Keeps this flight in the Track tab, available offline'
          }
        />
        <Button
          label="Flight details"
          style={styles.action}
          icon={
            <MaterialCommunityIcons
              name="information-outline"
              size={18}
              color={colors.onAccent}
            />
          }
          onPress={onOpenDetails}
          accessibilityHint="Opens altitude, speed, heading and the rest of the telemetry"
        />
      </View>

      <Button
        label="Clear selection"
        variant="ghost"
        onPress={onClear}
        accessibilityHint="Removes the highlight from this aircraft"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    position: 'absolute',
    left: space.md,
    right: space.md,
    bottom: space.md,
    padding: space.sm,
    borderRadius: radius.lg,
    gap: space.sm,
  },
  // Wraps rather than shrinks: at large text sizes two buttons do not fit on
  // one line, and truncating "Flight details" would hide the affordance this
  // card exists to make obvious.
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  action: { flexGrow: 1, flexBasis: 140 },
});
