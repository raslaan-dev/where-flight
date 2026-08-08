import { FlashList } from '@shopify/flash-list';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import type { Aircraft } from '@/api/opensky/types';
import { ErrorBoundary } from '@/components/error-boundary';
import { Banner } from '@/components/ui/banner';
import { Button } from '@/components/ui/button';
import { Screen } from '@/components/ui/screen';
import { EmptyState } from '@/components/ui/states';
import { Text } from '@/components/ui/text';
import { AircraftListItem } from '@/features/flights/aircraft-list-item';
import { freshnessBanner } from '@/features/flights/freshness';
import { FlightMap, type FlightMapHandle } from '@/features/map/flight-map';
import { MapControls } from '@/features/map/map-controls';
import { OfflineRadar } from '@/features/map/offline-radar';
import { inject } from '@/features/map/protocol';
import { SelectionCard } from '@/features/map/selection-card';
import { useViewportBbox } from '@/features/map/use-viewport-bbox';
import { formatRelativeTime } from '@/lib/format';
import { DEFAULT_REGION } from '@/lib/regions';
import { useNow } from '@/lib/use-now';
import { useThrottledValue } from '@/lib/use-throttled-value';
import { useAircraftStore, visibleAircraft } from '@/stores/aircraft-store';
import { useFollowedStore } from '@/stores/followed-store';
import { DEFAULT_ZOOM, useMapStore } from '@/stores/map-store';
import { isOnline, useNetworkStore } from '@/stores/network-store';
import { useSettingsStore } from '@/stores/settings-store';
import { space, useTheme } from '@/theme';

/**
 * The map.
 *
 * Built on the premise that the map is a *visualisation*, not the interface.
 * Everything it shows is reachable without it: the WebView is hidden from
 * assistive technology entirely, and in its place sit a live status region, a
 * full set of native controls, and a toggle that swaps the canvas for the same
 * aircraft as a list. When a screen reader is running, that toggle starts on.
 */

/** Loud enough to be useful, quiet enough not to interrupt constantly. */
const ANNOUNCE_INTERVAL_MS = 20_000;

export default function MapScreen() {
  const { colors, screenReader } = useTheme();
  const router = useRouter();
  const mapRef = useRef<FlightMapHandle>(null);

  const snapshot = useAircraftStore((state) => state.snapshot);
  const bbox = useAircraftStore((state) => state.bbox);
  const lastLoadedAt = useAircraftStore((state) => state.lastLoadedAt);
  const errorKind = useAircraftStore((state) => state.errorKind);
  const fromCache = useAircraftStore((state) => state.fromCache);
  const setBbox = useAircraftStore((state) => state.setBbox);
  const refresh = useAircraftStore((state) => state.refresh);

  const selectedIcao24 = useMapStore((state) => state.selectedIcao24);
  const select = useMapStore((state) => state.select);
  const degraded = useMapStore((state) => state.degraded);
  const listMode = useMapStore((state) => state.listMode);
  const setListMode = useMapStore((state) => state.setListMode);

  const followed = useFollowedStore((state) => state.flights);
  const showOnGround = useSettingsStore((state) => state.showOnGround);
  const units = useSettingsStore((state) => state.units);
  const online = useNetworkStore(isOnline);
  const now = useNow();

  const onViewportChange = useViewportBbox();
  const [listDefaultApplied, setListDefaultApplied] = useState(false);

  useEffect(() => {
    if (bbox === null) setBbox(DEFAULT_REGION.bbox);
  }, [bbox, setBbox]);

  // Applied once, not on every render: a screen reader user who deliberately
  // switches to the map should not be dragged back to the list.
  useEffect(() => {
    if (listDefaultApplied) return;
    setListDefaultApplied(true);
    if (screenReader) setListMode(true);
  }, [screenReader, listDefaultApplied, setListMode]);

  const aircraft = useMemo(
    () => visibleAircraft(snapshot, showOnGround),
    [snapshot, showOnGround]
  );

  const pinned = useMemo(() => {
    const ids = followed.map((flight) => flight.icao24);
    return selectedIcao24 === null ? ids : [selectedIcao24, ...ids];
  }, [followed, selectedIcao24]);

  const selected = useMemo(
    () => aircraft.find((item) => item.icao24 === selectedIcao24) ?? null,
    [aircraft, selectedIcao24]
  );

  const summary =
    lastLoadedAt === null
      ? 'No aircraft loaded yet'
      : `${aircraft.length} aircraft in view, updated ${formatRelativeTime((now - lastLoadedAt) / 1000)}`;
  const announced = useThrottledValue(summary, ANNOUNCE_INTERVAL_MS);

  const freshness = freshnessBanner({ isOnline: online, fromCache, lastLoadedAt, errorKind, now });

  const openSelected = useCallback(() => {
    if (selectedIcao24 !== null) router.push(`/flight/${selectedIcao24}`);
  }, [router, selectedIcao24]);

  const send = useCallback((script: string) => mapRef.current?.send(script), []);
  const recentre = useCallback(() => {
    const { latitude, longitude } = DEFAULT_REGION.centre;
    send(inject.flyTo(latitude, longitude, DEFAULT_ZOOM));
  }, [send]);

  // Only the WebView can be unsupported; the radar and the list always work.
  const canRenderMap = degraded !== 'unsupported';
  const showList = listMode || !canRenderMap;

  return (
    <Screen
      title="Map"
      subtitle={DEFAULT_REGION.name}
      padded={false}
      actions={
        <Button
          label={showList ? 'Map view' : 'List view'}
          variant="secondary"
          onPress={() => setListMode(!listMode)}
          disabled={!canRenderMap}
          accessibilityHint={
            showList
              ? 'Shows the same aircraft on a map'
              : 'Shows the same aircraft as a list you can read and scroll'
          }
        />
      }>
      <View style={styles.header}>
        {freshness ? (
          <Banner
            tone={freshness.tone}
            message={freshness.message}
            actionLabel={online ? 'Retry' : undefined}
            onAction={online ? () => void refresh() : undefined}
          />
        ) : null}

        {/* The map itself is invisible to a screen reader, so this line is the
            only way its contents are ever announced. */}
        <View accessible accessibilityLiveRegion="polite" accessibilityLabel={announced}>
          <Text variant="caption" tone="muted">
            {summary}
          </Text>
        </View>
      </View>

      <View style={styles.canvas}>
        {showList ? (
          <AircraftList
            aircraft={aircraft}
            units={units}
            selectedIcao24={selectedIcao24}
            onPress={(icao24) => router.push(`/flight/${icao24}`)}
            onRefresh={() => void refresh()}
          />
        ) : (
          <>
            {degraded === 'no-tiles' ? (
              <OfflineRadar
                aircraft={aircraft}
                bbox={bbox}
                selectedIcao24={selectedIcao24}
                reason="Map tiles could not be loaded. Positions are real; the background is not."
              />
            ) : (
              // A WebView render crash degrades to the radar; the tab bar,
              // controls and every other screen stay up.
              <ErrorBoundary
                fallback={() => (
                  <OfflineRadar
                    aircraft={aircraft}
                    bbox={bbox}
                    selectedIcao24={selectedIcao24}
                    reason="The map crashed and has been replaced with a simplified view. Positions are still real."
                  />
                )}>
                <FlightMap
                  ref={mapRef}
                  aircraft={aircraft}
                  pinned={pinned}
                  includeOnGround={showOnGround}
                  onViewportChange={onViewportChange}
                />
              </ErrorBoundary>
            )}

            <MapControls
              onZoomIn={() => send(inject.zoomBy(1))}
              onZoomOut={() => send(inject.zoomBy(-1))}
              onRecentre={recentre}
              onResetNorth={() => send(inject.resetNorth())}
              disabled={degraded !== null}
            />

            {selected ? (
              <SelectionCard
                aircraft={selected}
                units={units}
                onOpenDetails={openSelected}
                onClear={() => select(null)}
              />
            ) : null}
          </>
        )}
      </View>
    </Screen>
  );
}

type AircraftListProps = {
  aircraft: Aircraft[];
  units: ReturnType<typeof useSettingsStore.getState>['units'];
  selectedIcao24: string | null;
  onPress: (icao24: string) => void;
  onRefresh: () => void;
};

/** The map's equivalent: the same store, rendered as something readable. */
function AircraftList({
  aircraft,
  units,
  selectedIcao24,
  onPress,
  onRefresh,
}: AircraftListProps) {
  if (aircraft.length === 0) {
    return (
      <EmptyState
        title="No aircraft in this area"
        body="OpenSky's coverage comes from volunteer receivers, so quiet regions genuinely are empty."
        actionLabel="Check again"
        onAction={onRefresh}
      />
    );
  }

  return (
    <FlashList
      data={aircraft}
      keyExtractor={(item) => item.icao24}
      contentContainerStyle={styles.list}
      ItemSeparatorComponent={Separator}
      renderItem={({ item }) => (
        <AircraftListItem
          aircraft={item}
          units={units}
          selected={item.icao24 === selectedIcao24}
          origin={DEFAULT_REGION.centre}
          onPress={onPress}
        />
      )}
    />
  );
}

function Separator() {
  return <View style={styles.separator} />;
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: space.lg, paddingBottom: space.sm, gap: space.sm },
  canvas: { flex: 1 },
  list: { paddingHorizontal: space.lg, paddingBottom: space.xxl },
  separator: { height: space.sm },
});
