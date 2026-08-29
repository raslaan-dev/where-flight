import { FlashList } from '@shopify/flash-list';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';

import type { ApiErrorKind } from '@/api/opensky/errors';
import type { Aircraft } from '@/api/opensky/types';
import { Banner } from '@/components/ui/banner';
import { Pressable } from '@/components/ui/pressable';
import { Screen } from '@/components/ui/screen';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/states';
import { Text } from '@/components/ui/text';
import { TextField } from '@/components/ui/text-field';
import { AircraftListItem } from '@/features/flights/aircraft-list-item';
import { freshnessBanner } from '@/features/flights/freshness';
import { searchAirports, type Airport } from '@/lib/airports';
import { formatRelativeTime } from '@/lib/format';
import { DEFAULT_REGION } from '@/lib/regions';
import { useNow } from '@/lib/use-now';
import { useAircraftStore, visibleAircraft, type LoadStatus } from '@/stores/aircraft-store';
import { useAirportsStore } from '@/stores/airports-store';
import { useFollowedStore } from '@/stores/followed-store';
import { isOnline, useNetworkStore } from '@/stores/network-store';
import { useSettingsStore } from '@/stores/settings-store';
import { borderWidthFor, radius, space, useTheme } from '@/theme';

/**
 * Live traffic as a list, with one search box over everything the app knows.
 *
 * Deliberately a first-class screen rather than a fallback: it renders the same
 * store the map does, so everything on the map is reachable here without a
 * single gesture. With the box empty it is that list; with a query it searches
 * live aircraft, tracked flights and the bundled airport directory — all of it
 * already on the device, so searching costs nothing and works offline.
 */

const MAX_AIRCRAFT_RESULTS = 12;
const MAX_AIRPORT_RESULTS = 6;

export default function SearchScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const [query, setQuery] = useState('');
  const followed = useFollowedStore((state) => state.flights);
  const selectAirport = useAirportsStore((state) => state.selectAirport);

  const snapshot = useAircraftStore((state) => state.snapshot);
  const status = useAircraftStore((state) => state.status);
  const errorKind = useAircraftStore((state) => state.errorKind);
  const lastLoadedAt = useAircraftStore((state) => state.lastLoadedAt);
  const bbox = useAircraftStore((state) => state.bbox);
  const fromCache = useAircraftStore((state) => state.fromCache);
  const setBbox = useAircraftStore((state) => state.setBbox);
  const refresh = useAircraftStore((state) => state.refresh);

  const online = useNetworkStore(isOnline);
  const units = useSettingsStore((state) => state.units);
  const showOnGround = useSettingsStore((state) => state.showOnGround);
  const now = useNow();

  // Fetching is the polling controller's job, mounted once at the tab layout.
  // This screen only ensures there is a region to fetch.
  useEffect(() => {
    if (bbox === null) setBbox(DEFAULT_REGION.bbox);
  }, [bbox, setBbox]);

  const aircraft = useMemo(
    () => visibleAircraft(snapshot, showOnGround),
    [snapshot, showOnGround]
  );

  const onSelect = useCallback((icao24: string) => router.push(`/flight/${icao24}`), [router]);

  const renderItem = useCallback(
    ({ item }: { item: Aircraft }) => (
      <AircraftListItem
        aircraft={item}
        units={units}
        origin={DEFAULT_REGION.centre}
        onPress={onSelect}
      />
    ),
    [units, onSelect]
  );

  const needle = query.trim().toLowerCase();
  const searching = needle.length > 0;

  // Live positions win; tracked flights fill in aircraft that have since left
  // the viewport, which is exactly when someone searches for one by name.
  const matchedAircraft = useMemo(() => {
    if (!searching) return [];
    const pool = new Map<string, Aircraft>();
    for (const flight of followed) pool.set(flight.icao24, flight.lastSeen);
    for (const item of snapshot?.aircraft ?? []) pool.set(item.icao24, item);
    return [...pool.values()]
      .filter(
        (item) =>
          (item.callsign?.toLowerCase().includes(needle) ?? false) ||
          item.icao24.startsWith(needle) ||
          item.originCountry.toLowerCase().includes(needle)
      )
      .slice(0, MAX_AIRCRAFT_RESULTS);
  }, [searching, needle, snapshot, followed]);

  const matchedAirports = useMemo(
    () => (searching ? searchAirports(needle).slice(0, MAX_AIRPORT_RESULTS) : []),
    [searching, needle]
  );

  const openAirport = useCallback(
    (icao: string) => {
      selectAirport(icao);
      router.navigate('/airports');
    },
    [selectAirport, router]
  );

  const summary = searching
    ? `${matchedAircraft.length + matchedAirports.length} result${
        matchedAircraft.length + matchedAirports.length === 1 ? '' : 's'
      } for “${query.trim()}”`
    : summarise({ count: aircraft.length, lastLoadedAt, status, now });
  const freshness = freshnessBanner({ isOnline: online, fromCache, lastLoadedAt, errorKind, now });

  return (
    <Screen title="Search" subtitle={DEFAULT_REGION.name} padded={false}>
      <View style={styles.header}>
        <TextField
          accessibilityLabel="Search flights and airports"
          placeholder="Callsign, hex code, country or airport"
          value={query}
          onChangeText={setQuery}
          autoCorrect={false}
          autoCapitalize="none"
          returnKeyType="search"
        />

        {/* Only shown when the data is not live, so it never becomes wallpaper
            the user learns to ignore. */}
        {freshness && snapshot && !searching ? (
          <Banner
            tone={freshness.tone}
            message={freshness.message}
            actionLabel={online && freshness.canRetry ? 'Retry' : undefined}
            onAction={online && freshness.canRetry ? () => void refresh() : undefined}
          />
        ) : null}

        {/* A polite live region: the count changes on every poll, and a screen
            reader user needs to hear it without losing their place. */}
        <View accessible accessibilityLiveRegion="polite" accessibilityLabel={summary}>
          <Text variant="caption" tone="muted">
            {summary}
          </Text>
        </View>
      </View>

      {searching ? (
        <SearchResults
          aircraft={matchedAircraft}
          airports={matchedAirports}
          units={units}
          onOpenFlight={onSelect}
          onOpenAirport={openAirport}
        />
      ) : (
        <Body
          aircraft={aircraft}
          status={status}
          errorKind={errorKind}
          hasSnapshot={snapshot !== null}
          showOnGround={showOnGround}
          renderItem={renderItem}
          onRefresh={() => void refresh()}
          accentColour={colors.accent}
        />
      )}
    </Screen>
  );
}

/** Matching aircraft and airports, shown in place of the live list. */
function SearchResults({
  aircraft,
  airports,
  units,
  onOpenFlight,
  onOpenAirport,
}: {
  aircraft: Aircraft[];
  airports: Airport[];
  units: ReturnType<typeof useSettingsStore.getState>['units'];
  onOpenFlight: (icao24: string) => void;
  onOpenAirport: (icao: string) => void;
}) {
  const { colors } = useTheme();

  if (aircraft.length === 0 && airports.length === 0) {
    return (
      <EmptyState
        title="No matches"
        body="Search covers aircraft currently in view, flights you track, and major airports. An aircraft outside the loaded region will not appear."
      />
    );
  }

  return (
    <ScrollView
      contentContainerStyle={styles.results}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}>
      {aircraft.length > 0 ? (
        <View style={styles.section}>
          <Text variant="overline" tone="muted" heading>
            Aircraft
          </Text>
          {aircraft.map((item) => (
            <AircraftListItem
              key={item.icao24}
              aircraft={item}
              units={units}
              onPress={onOpenFlight}
            />
          ))}
        </View>
      ) : null}

      {airports.length > 0 ? (
        <View style={styles.section}>
          <Text variant="overline" tone="muted" heading>
            Airports
          </Text>
          {airports.map((airport) => (
            <Pressable
              key={airport.icao}
              onPress={() => onOpenAirport(airport.icao)}
              accessibilityRole="button"
              accessibilityLabel={`${airport.name}, ${airport.city}, ${airport.country}`}
              accessibilityHint="Opens arrivals and departures for this airport"
              style={[
                styles.airportRow,
                {
                  backgroundColor: colors.bgElevated,
                  borderColor: colors.border,
                  borderWidth: borderWidthFor(colors),
                },
              ]}>
              <View style={styles.airportText}>
                <Text variant="bodyStrong">
                  {airport.city} · {airport.name}
                </Text>
                <Text variant="caption" tone="muted">
                  {airport.country}
                </Text>
              </View>
              <Text variant="mono" tone="muted">
                {airport.iata}
              </Text>
            </Pressable>
          ))}
        </View>
      ) : null}
    </ScrollView>
  );
}

function summarise({
  count,
  lastLoadedAt,
  status,
  now,
}: {
  count: number;
  lastLoadedAt: number | null;
  status: LoadStatus;
  now: number;
}): string {
  if (status === 'loading') return 'Loading aircraft';
  if (lastLoadedAt === null) return 'No data loaded yet';
  const age = formatRelativeTime((now - lastLoadedAt) / 1000);
  return `${count} aircraft in view, updated ${age}`;
}

type BodyProps = {
  aircraft: Aircraft[];
  status: LoadStatus;
  errorKind: ApiErrorKind | null;
  hasSnapshot: boolean;
  showOnGround: boolean;
  renderItem: ({ item }: { item: Aircraft }) => React.ReactElement;
  onRefresh: () => void;
  accentColour: string;
};

function Body({
  aircraft,
  status,
  errorKind,
  hasSnapshot,
  showOnGround,
  renderItem,
  onRefresh,
  accentColour,
}: BodyProps) {
  if (status === 'loading' && !hasSnapshot) return <LoadingState />;

  // Only a first failure takes the screen over. Once there is data to show,
  // an error is reported without throwing away what the user can still use.
  if (errorKind !== null && !hasSnapshot) {
    return <ErrorState kind={errorKind} onRetry={onRefresh} />;
  }

  if (aircraft.length === 0) {
    return (
      <EmptyState
        title="No aircraft in this area"
        body={
          showOnGround
            ? "OpenSky's coverage comes from volunteer receivers, so quiet regions genuinely are empty."
            : 'Nothing airborne here right now. Aircraft parked at gates are hidden — you can show them in Settings.'
        }
        actionLabel="Check again"
        onAction={onRefresh}
      />
    );
  }

  return (
    <FlashList
      data={aircraft}
      renderItem={renderItem}
      keyExtractor={(item) => item.icao24}
      contentContainerStyle={styles.list}
      ItemSeparatorComponent={Separator}
      refreshControl={
        <RefreshControl
          refreshing={status === 'refreshing'}
          onRefresh={onRefresh}
          tintColor={accentColour}
        />
      }
    />
  );
}

function Separator() {
  return <View style={styles.separator} />;
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: space.lg, paddingBottom: space.sm, gap: space.sm },
  list: { paddingHorizontal: space.lg, paddingBottom: space.xxl },
  separator: { height: space.sm },
  results: { paddingHorizontal: space.lg, paddingBottom: space.xxl, gap: space.lg },
  section: { gap: space.sm },
  airportRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space.md,
    borderRadius: radius.md,
    padding: space.md,
  },
  airportText: { flex: 1, gap: 2 },
});
