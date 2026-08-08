import { FlashList } from '@shopify/flash-list';
import { useRouter } from 'expo-router';
import { useCallback, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { Banner } from '@/components/ui/banner';
import { Screen } from '@/components/ui/screen';
import { EmptyState } from '@/components/ui/states';
import { Text } from '@/components/ui/text';
import { FollowedListItem } from '@/features/flights/followed-list-item';
import { useNow } from '@/lib/use-now';
import { ageSecondsOf, useFollowedStore, type FollowedFlight } from '@/stores/followed-store';
import { useMapStore } from '@/stores/map-store';
import { isOnline, useNetworkStore } from '@/stores/network-store';
import { useSettingsStore } from '@/stores/settings-store';
import { space } from '@/theme';

/**
 * Followed flights, rendered entirely from disk.
 *
 * This screen never touches the network. Everything it shows was stored when
 * the flight was last seen, which is what makes it work identically in airplane
 * mode — the case the persistence is actually for.
 */
export default function TrackScreen() {
  const router = useRouter();
  const flights = useFollowedStore((state) => state.flights);
  const unfollow = useFollowedStore((state) => state.unfollow);
  const units = useSettingsStore((state) => state.units);
  const online = useNetworkStore(isOnline);
  const requestFocus = useMapStore((state) => state.requestFocus);

  // One ticking clock for the whole list: without it "last seen 4 minutes ago"
  // would stay frozen at whatever it read when the screen first mounted.
  const now = useNow();
  const ages = useMemo(
    () => new Map(flights.map((flight) => [flight.icao24, ageSecondsOf(flight, now)])),
    [flights, now]
  );

  const onPress = useCallback((icao24: string) => router.push(`/flight/${icao24}`), [router]);

  // Now its own control rather than the whole card, so both destinations are
  // reachable: the card opens the telemetry, the corner button opens the map.
  const onShowOnMap = useCallback(
    (icao24: string) => {
      const flight = flights.find((item) => item.icao24 === icao24);
      const { latitude, longitude } = flight?.lastSeen ?? {};
      requestFocus(
        icao24,
        latitude != null && longitude != null ? { latitude, longitude } : null
      );
      router.navigate('/');
    },
    [flights, requestFocus, router]
  );

  const renderItem = useCallback(
    ({ item }: { item: FollowedFlight }) => (
      <FollowedListItem
        flight={item}
        units={units}
        ageSeconds={ages.get(item.icao24)}
        onPress={onPress}
        onShowOnMap={onShowOnMap}
        onRemove={unfollow}
      />
    ),
    [units, ages, onPress, unfollow]
  );

  const summary =
    flights.length === 0
      ? 'No tracked flights'
      : `${flights.length} tracked flight${flights.length === 1 ? '' : 's'}`;

  return (
    <Screen title="Track" subtitle="Available offline" padded={false}>
      <View style={styles.header}>
        {!online ? (
          <Banner
            message="Offline. These are the last positions saved for each flight."
            tone="info"
          />
        ) : null}
        <View accessible accessibilityLiveRegion="polite" accessibilityLabel={summary}>
          <Text variant="caption" tone="muted">
            {summary}
          </Text>
        </View>
      </View>

      {flights.length === 0 ? (
        <EmptyState
          title="Nothing tracked yet"
          body="Tap an aircraft on the Map and choose Track, or open one from the Live tab. Tracked flights keep their last known position, so they still work with no connection."
          actionLabel="Go to Live"
          onAction={() => router.push('/search')}
        />
      ) : (
        <FlashList
          data={flights}
          renderItem={renderItem}
          keyExtractor={(item) => item.icao24}
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={Separator}
        />
      )}
    </Screen>
  );
}

function Separator() {
  return <View style={styles.separator} />;
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: space.lg, paddingBottom: space.sm, gap: space.sm },
  list: { paddingHorizontal: space.lg, paddingBottom: space.xxl },
  separator: { height: space.sm },
});
