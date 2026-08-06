import { FlashList } from '@shopify/flash-list';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo } from 'react';
import { RefreshControl, StyleSheet, View } from 'react-native';

import type { ApiErrorKind } from '@/api/opensky/errors';
import type { Aircraft } from '@/api/opensky/types';
import { Screen } from '@/components/ui/screen';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/states';
import { Text } from '@/components/ui/text';
import { AircraftListItem } from '@/features/flights/aircraft-list-item';
import { formatRelativeTime } from '@/lib/format';
import { DEFAULT_REGION } from '@/lib/regions';
import { useAircraftStore, visibleAircraft, type LoadStatus } from '@/stores/aircraft-store';
import { useSettingsStore } from '@/stores/settings-store';
import { space, useTheme } from '@/theme';

/**
 * The list view of live traffic.
 *
 * Deliberately a first-class screen rather than a fallback: it renders the same
 * store the map does, so everything on the map is reachable here without a
 * single gesture.
 */
export default function LiveScreen() {
  const { colors } = useTheme();
  const router = useRouter();

  const snapshot = useAircraftStore((state) => state.snapshot);
  const status = useAircraftStore((state) => state.status);
  const errorKind = useAircraftStore((state) => state.errorKind);
  const lastLoadedAt = useAircraftStore((state) => state.lastLoadedAt);
  const bbox = useAircraftStore((state) => state.bbox);
  const setBbox = useAircraftStore((state) => state.setBbox);
  const refresh = useAircraftStore((state) => state.refresh);

  const units = useSettingsStore((state) => state.units);
  const showOnGround = useSettingsStore((state) => state.showOnGround);

  useEffect(() => {
    if (bbox === null) setBbox(DEFAULT_REGION.bbox);
  }, [bbox, setBbox]);

  useEffect(() => {
    if (bbox !== null && status === 'idle') void refresh();
  }, [bbox, status, refresh]);

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

  const summary = summarise({ count: aircraft.length, lastLoadedAt, status });

  return (
    <Screen title="Live" subtitle={DEFAULT_REGION.name} padded={false}>
      {/* A polite live region: the count changes on every poll, and a screen
          reader user needs to hear it without losing their place. */}
      <View
        style={styles.summary}
        accessible
        accessibilityLiveRegion="polite"
        accessibilityLabel={summary}>
        <Text variant="caption" tone="muted">
          {summary}
        </Text>
      </View>

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
    </Screen>
  );
}

function summarise({
  count,
  lastLoadedAt,
  status,
}: {
  count: number;
  lastLoadedAt: number | null;
  status: LoadStatus;
}): string {
  if (status === 'loading') return 'Loading aircraft';
  if (lastLoadedAt === null) return 'No data loaded yet';
  const age = formatRelativeTime((Date.now() - lastLoadedAt) / 1000);
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
  summary: { paddingHorizontal: space.lg, paddingBottom: space.sm },
  list: { paddingHorizontal: space.lg, paddingBottom: space.xxl },
  separator: { height: space.sm },
});
