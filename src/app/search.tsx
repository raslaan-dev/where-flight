import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import type { Aircraft } from '@/api/opensky/types';
import { Button } from '@/components/ui/button';
import { Pressable } from '@/components/ui/pressable';
import { Screen } from '@/components/ui/screen';
import { EmptyState } from '@/components/ui/states';
import { Text } from '@/components/ui/text';
import { TextField } from '@/components/ui/text-field';
import { AircraftListItem } from '@/features/flights/aircraft-list-item';
import { searchAirports } from '@/lib/airports';
import { useAircraftStore } from '@/stores/aircraft-store';
import { useAirportsStore } from '@/stores/airports-store';
import { useFollowedStore } from '@/stores/followed-store';
import { useSearchStore } from '@/stores/search-store';
import { useSettingsStore } from '@/stores/settings-store';
import { borderWidthFor, radius, space, useTheme } from '@/theme';

/**
 * One search box over everything the app knows about.
 *
 * Aircraft come from the live snapshot plus followed flights — both already on
 * the device, so searching costs nothing and works offline. Airports come from
 * the bundled directory; picking one lands on its board in the Airports tab.
 */

const MAX_AIRCRAFT_RESULTS = 12;
const MAX_AIRPORT_RESULTS = 6;

export default function SearchScreen() {
  const router = useRouter();
  const [query, setQuery] = useState('');

  const snapshot = useAircraftStore((state) => state.snapshot);
  const followed = useFollowedStore((state) => state.flights);
  const units = useSettingsStore((state) => state.units);
  const selectAirport = useAirportsStore((state) => state.selectAirport);

  const recent = useSearchStore((state) => state.recent);
  const remember = useSearchStore((state) => state.remember);
  const clearRecent = useSearchStore((state) => state.clearRecent);

  const needle = query.trim().toLowerCase();

  const aircraftResults = useMemo(() => {
    if (needle.length === 0) return [];
    // Live positions win; followed flights fill in aircraft that have since
    // left the viewport, which is exactly when someone searches for them.
    const pool = new Map<string, Aircraft>();
    for (const flight of followed) pool.set(flight.icao24, flight.lastSeen);
    for (const aircraft of snapshot?.aircraft ?? []) pool.set(aircraft.icao24, aircraft);
    return [...pool.values()]
      .filter(
        (aircraft) =>
          (aircraft.callsign?.toLowerCase().includes(needle) ?? false) ||
          aircraft.icao24.startsWith(needle) ||
          aircraft.originCountry.toLowerCase().includes(needle)
      )
      .slice(0, MAX_AIRCRAFT_RESULTS);
  }, [needle, snapshot, followed]);

  const airportResults = useMemo(
    () => (needle.length === 0 ? [] : searchAirports(needle).slice(0, MAX_AIRPORT_RESULTS)),
    [needle]
  );

  const openFlight = (icao24: string) => {
    remember(query);
    router.push(`/flight/${icao24}`);
  };

  const openAirport = (icao: string) => {
    remember(query);
    selectAirport(icao);
    router.navigate('/airports');
  };

  return (
    <Screen
      title="Search"
      subtitle="Flights, callsigns and airports"
      actions={
        <Button
          label="Close"
          variant="secondary"
          onPress={() => router.back()}
          accessibilityHint="Closes the search screen"
        />
      }>
      <View style={styles.searchBox}>
        <TextField
          accessibilityLabel="Search flights and airports"
          placeholder="Callsign, hex code, country or airport"
          value={query}
          onChangeText={setQuery}
          autoFocus
          autoCorrect={false}
          autoCapitalize="none"
          returnKeyType="search"
        />
      </View>

      <ScrollView
        contentContainerStyle={styles.results}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        {needle.length === 0 ? (
          <RecentQueries recent={recent} onPick={setQuery} onClear={clearRecent} />
        ) : (
          <SearchResults
            aircraft={aircraftResults}
            airports={airportResults}
            units={units}
            onOpenFlight={openFlight}
            onOpenAirport={openAirport}
          />
        )}
      </ScrollView>
    </Screen>
  );
}

function RecentQueries({
  recent,
  onPick,
  onClear,
}: {
  recent: string[];
  onPick: (query: string) => void;
  onClear: () => void;
}) {
  const { colors } = useTheme();

  if (recent.length === 0) {
    return (
      <EmptyState
        title="Search everything at once"
        body="Type a callsign like BAW117, an aircraft hex code, a country, or an airport name or code."
      />
    );
  }

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text variant="overline" tone="muted" heading>
          Recent searches
        </Text>
        <Button
          label="Clear"
          variant="ghost"
          onPress={onClear}
          accessibilityHint="Removes all recent searches"
        />
      </View>
      {recent.map((item) => (
        <Pressable
          key={item}
          onPress={() => onPick(item)}
          accessibilityRole="button"
          accessibilityLabel={`Search again for ${item}`}
          style={[
            styles.recentRow,
            {
              backgroundColor: colors.bgElevated,
              borderColor: colors.border,
              borderWidth: borderWidthFor(colors),
            },
          ]}>
          <Text>{item}</Text>
        </Pressable>
      ))}
    </View>
  );
}

function SearchResults({
  aircraft,
  airports,
  units,
  onOpenFlight,
  onOpenAirport,
}: {
  aircraft: Aircraft[];
  airports: ReturnType<typeof searchAirports>;
  units: ReturnType<typeof useSettingsStore.getState>['units'];
  onOpenFlight: (icao24: string) => void;
  onOpenAirport: (icao: string) => void;
}) {
  const { colors } = useTheme();

  if (aircraft.length === 0 && airports.length === 0) {
    return (
      <EmptyState
        title="No matches"
        body="Search covers aircraft currently in view, flights you follow, and major airports. An aircraft outside the loaded region will not appear."
      />
    );
  }

  return (
    <>
      {aircraft.length > 0 ? (
        <View style={styles.section}>
          <Text variant="overline" tone="muted" heading>
            Aircraft
          </Text>
          {aircraft.map((item) => (
            <AircraftListItem key={item.icao24} aircraft={item} units={units} onPress={onOpenFlight} />
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
    </>
  );
}

const styles = StyleSheet.create({
  searchBox: { paddingBottom: space.sm },
  results: { paddingBottom: space.xxl, gap: space.lg },
  section: { gap: space.sm },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  recentRow: {
    borderRadius: radius.md,
    padding: space.md,
  },
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
