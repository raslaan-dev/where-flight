import { FlashList } from '@shopify/flash-list';
import { useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import type { ScheduleDirection } from '@/api/opensky/client';
import { ERROR_COPY } from '@/api/opensky/errors';
import type { AirportFlight } from '@/api/opensky/types';
import { Banner } from '@/components/ui/banner';
import { Button } from '@/components/ui/button';
import { Pressable } from '@/components/ui/pressable';
import { Screen } from '@/components/ui/screen';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { EmptyState } from '@/components/ui/states';
import { Text } from '@/components/ui/text';
import { TextField } from '@/components/ui/text-field';
import { airportByIcao, airportLabel, searchAirports, type Airport } from '@/lib/airports';
import { formatRelativeTime } from '@/lib/format';
import {
  cachedBoard,
  isBoardFresh,
  scheduleFetchCost,
  useAirportsStore,
  SCHEDULE_WINDOW_SECONDS,
} from '@/stores/airports-store';
import { useNow } from '@/lib/use-now';
import { isOnline, useNetworkStore } from '@/stores/network-store';
import { borderWidthFor, radius, space, useTheme } from '@/theme';

/**
 * Arrivals and departures.
 *
 * The costliest data in the app, so the design inverts the usual pattern:
 * nothing loads until the user asks, the price is on the button that asks,
 * and everything fetched is kept and shown again for free.
 */

export default function AirportsScreen() {
  // Selection lives in the store so the search modal can deep-link here.
  const selectedIcao = useAirportsStore((state) => state.selectedIcao);
  const selectAirport = useAirportsStore((state) => state.selectAirport);
  const selected = selectedIcao !== null ? airportByIcao(selectedIcao) : null;

  return (
    <Screen
      title="Airports"
      subtitle={selected ? `${selected.name} · ${selected.icao}` : 'Arrivals and departures'}
      padded={false}
      actions={
        selected ? (
          <Button
            label="Change"
            variant="secondary"
            onPress={() => selectAirport(null)}
            accessibilityHint="Goes back to the airport search"
          />
        ) : undefined
      }>
      {selected ? (
        <ScheduleBoard airport={selected} />
      ) : (
        <AirportPicker onSelect={(airport) => selectAirport(airport.icao)} />
      )}
    </Screen>
  );
}

function AirportPicker({ onSelect }: { onSelect: (airport: Airport) => void }) {
  const { colors } = useTheme();
  const [query, setQuery] = useState('');
  const results = useMemo(() => searchAirports(query), [query]);

  return (
    <View style={styles.fill}>
      <View style={styles.header}>
        <TextField
          accessibilityLabel="Search airports"
          placeholder="City, airport or code"
          value={query}
          onChangeText={setQuery}
          autoCorrect={false}
          autoCapitalize="none"
        />
        {/* Spoken on every keystroke's result change, politely. */}
        <View
          accessible
          accessibilityLiveRegion="polite"
          accessibilityLabel={`${results.length} airport${results.length === 1 ? '' : 's'} found`}>
          <Text variant="caption" tone="muted">
            {results.length} airport{results.length === 1 ? '' : 's'}
          </Text>
        </View>
      </View>

      <FlashList
        data={results}
        keyExtractor={(item) => item.icao}
        contentContainerStyle={styles.list}
        ItemSeparatorComponent={Separator}
        renderItem={({ item }) => (
          <Pressable
            onPress={() => onSelect(item)}
            accessibilityRole="button"
            accessibilityLabel={`${item.name}, ${item.city}, ${item.country}`}
            accessibilityHint="Shows arrivals and departures for this airport"
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
                {item.city} · {item.name}
              </Text>
              <Text variant="caption" tone="muted">
                {item.country}
              </Text>
            </View>
            <Text variant="mono" tone="muted">
              {item.iata}
            </Text>
          </Pressable>
        )}
      />
    </View>
  );
}

function ScheduleBoard({ airport }: { airport: Airport }) {
  const [direction, setDirection] = useState<ScheduleDirection>('arrival');
  const online = useNetworkStore(isOnline);
  const now = useNow();

  const board = useAirportsStore((state) => cachedBoard(state, airport.icao, direction));
  const status = useAirportsStore((state) => state.status);
  const errorKind = useAirportsStore((state) => state.errorKind);
  const activeKey = useAirportsStore((state) => state.activeKey);
  const load = useAirportsStore((state) => state.load);

  const mine = activeKey === `${airport.icao}:${direction}`;
  const cost = scheduleFetchCost();
  const windowHours = SCHEDULE_WINDOW_SECONDS / 3600;

  const fetchLabel = `Load ${direction === 'arrival' ? 'arrivals' : 'departures'}`;
  const fetchHint = `Fetches the last ${windowHours} hours and uses about ${cost} of today's API credits`;
  const onLoad = () => void load(airport.icao, direction);

  return (
    <View style={styles.fill}>
      <View style={styles.header}>
        <SegmentedControl
          label="Direction"
          value={direction}
          onChange={setDirection}
          options={[
            { value: 'arrival', label: 'Arrivals' },
            { value: 'departure', label: 'Departures' },
          ]}
        />

        {board && !isBoardFresh(board, now) ? (
          <Banner
            tone="info"
            message={`Fetched ${formatRelativeTime((now - board.fetchedAt) / 1000)}.`}
            actionLabel={online ? `Refresh (~${cost} credits)` : undefined}
            onAction={online ? onLoad : undefined}
          />
        ) : null}
      </View>

      <BoardBody
        board={board?.flights ?? null}
        fetchedAt={board?.fetchedAt ?? null}
        direction={direction}
        loading={mine && status === 'loading'}
        errorKind={mine ? errorKind : null}
        online={online}
        fetchLabel={`${fetchLabel} (~${cost} credits)`}
        fetchHint={fetchHint}
        onLoad={onLoad}
        now={now}
      />
    </View>
  );
}

function BoardBody({
  board,
  fetchedAt,
  direction,
  loading,
  errorKind,
  online,
  fetchLabel,
  fetchHint,
  onLoad,
  now,
}: {
  board: AirportFlight[] | null;
  fetchedAt: number | null;
  direction: ScheduleDirection;
  loading: boolean;
  errorKind: ReturnType<typeof useAirportsStore.getState>['errorKind'];
  online: boolean;
  fetchLabel: string;
  fetchHint: string;
  onLoad: () => void;
  now: number;
}) {
  const { colors } = useTheme();

  if (loading) {
    return (
      <View
        style={styles.centred}
        accessible
        accessibilityRole="progressbar"
        accessibilityLabel="Loading schedule">
        <ActivityIndicator color={colors.accent} size="large" />
        <Text tone="muted">Fetching the board…</Text>
      </View>
    );
  }

  if (errorKind !== null && board === null) {
    const copy = ERROR_COPY[errorKind];
    return (
      <EmptyState
        title={copy.title}
        body={copy.body}
        actionLabel={online ? 'Try again' : undefined}
        onAction={online ? onLoad : undefined}
      />
    );
  }

  if (board === null) {
    return (
      <EmptyState
        title="Nothing loaded yet"
        body={`Schedules are the most expensive request OpenSky offers, so they only load when you ask. ${fetchHint}.`}
        actionLabel={online ? fetchLabel : undefined}
        onAction={online ? onLoad : undefined}
      />
    );
  }

  if (board.length === 0) {
    return (
      <EmptyState
        title={`No ${direction === 'arrival' ? 'arrivals' : 'departures'} found`}
        body="OpenSky saw no matching flights in the window. Quiet hours at smaller airports genuinely look like this."
        actionLabel={online ? fetchLabel : undefined}
        onAction={online ? onLoad : undefined}
      />
    );
  }

  return (
    <FlashList
      data={board}
      keyExtractor={(item) => `${item.icao24}-${item.firstSeen}`}
      contentContainerStyle={styles.list}
      ItemSeparatorComponent={Separator}
      ListHeaderComponent={
        fetchedAt !== null ? (
          <Text variant="caption" tone="muted" style={styles.boardCaption}>
            {board.length} flight{board.length === 1 ? '' : 's'}, fetched{' '}
            {formatRelativeTime((now - fetchedAt) / 1000)}
          </Text>
        ) : null
      }
      renderItem={({ item }) => <FlightRow flight={item} direction={direction} now={now} />}
    />
  );
}

function FlightRow({
  flight,
  direction,
  now,
}: {
  flight: AirportFlight;
  direction: ScheduleDirection;
  now: number;
}) {
  const { colors } = useTheme();

  const from = airportLabel(flight.departureAirport);
  const to = airportLabel(flight.arrivalAirport);
  const when = formatRelativeTime((now / 1000 - flight.lastSeen));
  const summary =
    direction === 'arrival'
      ? `${flight.label}, arrived from ${from}, ${when}`
      : `${flight.label}, departed for ${to}, ${when}`;

  return (
    <View
      accessible
      accessibilityLabel={summary}
      style={[
        styles.flightRow,
        {
          backgroundColor: colors.bgElevated,
          borderColor: colors.border,
          borderWidth: borderWidthFor(colors),
        },
      ]}>
      <View style={styles.airportText}>
        <Text variant="bodyStrong">{flight.label}</Text>
        <Text variant="caption" tone="muted">
          {from} → {to}
        </Text>
      </View>
      <Text variant="caption" tone="muted">
        {when}
      </Text>
    </View>
  );
}

function Separator() {
  return <View style={styles.separator} />;
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  header: { paddingHorizontal: space.lg, paddingBottom: space.sm, gap: space.sm },
  list: { paddingHorizontal: space.lg, paddingBottom: space.xxl },
  separator: { height: space.sm },
  centred: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: space.md },
  boardCaption: { paddingBottom: space.sm },
  airportRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space.md,
    borderRadius: radius.md,
    padding: space.md,
  },
  airportText: { flex: 1, gap: 2 },
  flightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space.md,
    borderRadius: radius.md,
    padding: space.md,
  },
});
