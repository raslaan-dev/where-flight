import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { TRACK_REQUEST_COST } from '@/api/opensky/costs';
import { ERROR_COPY } from '@/api/opensky/errors';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { useCredentialsStore } from '@/stores/credentials-store';
import { cachedTrack, useTrackStore } from '@/stores/track-store';
import { space, useTheme } from '@/theme';

/**
 * The one line under the map's selection card that explains its trail.
 *
 * The map always draws *something* behind a selected aircraft, but the two
 * possible somethings mean different things, and conflating them would be a
 * lie: the free trail starts when you opened the app, the fetched one starts
 * at the runway. So the copy always says which is on screen, and the upgrade
 * states its price before spending anything.
 */

export function TrailControl({ icao24 }: { icao24: string }) {
  const { colors } = useTheme();
  const connected = useCredentialsStore((state) => state.credentials !== null);

  const track = useTrackStore((state) => cachedTrack(state, icao24));
  const status = useTrackStore((state) => state.status);
  const errorKind = useTrackStore((state) => state.errorKind);
  const activeIcao24 = useTrackStore((state) => state.activeIcao24);
  const load = useTrackStore((state) => state.load);

  // The store is shared between screens; only reflect status for this aircraft.
  const mine = activeIcao24 === icao24.toLowerCase();

  if (track) {
    return (
      <Text variant="caption" tone="muted">
        Trail shows the full flown path. The ringed end is where it took off.
      </Text>
    );
  }

  if (mine && status === 'loading') {
    return (
      <View style={styles.row} accessible accessibilityRole="progressbar" accessibilityLabel="Loading flight path">
        <ActivityIndicator color={colors.accent} />
        <Text variant="caption" tone="muted">
          Loading flight path…
        </Text>
      </View>
    );
  }

  if (!connected) {
    return (
      <Text variant="caption" tone="muted">
        Trail shows where this flight has been since you opened the app. Connect an
        OpenSky account in Settings for the full path back to take-off.
      </Text>
    );
  }

  return (
    <View style={styles.stack}>
      <Text variant="caption" tone="muted">
        {mine && errorKind
          ? ERROR_COPY[errorKind].body
          : 'Trail starts when you opened the app. Fetch the full path to see where this flight took off.'}
      </Text>
      <Button
        label={mine && errorKind ? 'Try again' : 'Show full path'}
        variant="secondary"
        onPress={() => void load(icao24)}
        accessibilityHint={`Fetches the flown path back to take-off. Costs about ${TRACK_REQUEST_COST} credits.`}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  stack: { gap: space.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
});
