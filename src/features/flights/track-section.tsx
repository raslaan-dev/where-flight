import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { TRACK_REQUEST_COST } from '@/api/opensky/costs';
import { ERROR_COPY } from '@/api/opensky/errors';
import { Button } from '@/components/ui/button';
import { Section } from '@/components/ui/section';
import { Text } from '@/components/ui/text';
import { cachedRoute, routeFetchCost, useRouteStore } from '@/stores/route-store';
import { cachedTrack, useTrackStore } from '@/stores/track-store';
import { useCredentialsStore } from '@/stores/credentials-store';
import { useSettingsStore } from '@/stores/settings-store';
import { space, useTheme } from '@/theme';

import { AltitudeRibbon } from './altitude-ribbon';
import { RouteLine } from './route-line';

/**
 * The flight-path section of the detail screen.
 *
 * Fetched only on request: `/tracks` bills real credits, so the screen states
 * the price up front instead of spending silently on open. OpenSky also limits
 * the endpoint to authenticated accounts, and that restriction is explained
 * rather than surfaced as a raw error.
 */

export function TrackSection({ icao24 }: { icao24: string }) {
  const { colors } = useTheme();
  const units = useSettingsStore((state) => state.units);
  const connected = useCredentialsStore((state) => state.credentials !== null);

  const track = useTrackStore((state) => cachedTrack(state, icao24));
  const status = useTrackStore((state) => state.status);
  const errorKind = useTrackStore((state) => state.errorKind);
  const activeIcao24 = useTrackStore((state) => state.activeIcao24);
  const load = useTrackStore((state) => state.load);
  const route = useRouteStore((state) => cachedRoute(state, icao24));
  const loadRoute = useRouteStore((state) => state.load);

  // The store is shared; only reflect the status if it is about this aircraft.
  const mine = activeIcao24 === icao24.toLowerCase();

  return (
    <Section title="Route and flight path">
      {/* The route is the headline answer — where from, where to — so it sits
          above the altitude chart rather than under it. */}
      {route !== undefined ? (
        <RouteLine
          route={route}
          emptyLabel="OpenSky has no completed leg for this aircraft in the last 12 hours, so its route is unknown."
        />
      ) : null}

      {track ? (
        <AltitudeRibbon track={track} units={units} />
      ) : !connected ? (
        <Text tone="muted">
          Flight paths need a connected OpenSky account. Add your API client under Settings, or
          carry on without — everything else works anonymously.
        </Text>
      ) : mine && status === 'loading' ? (
        <View
          style={styles.loading}
          accessible
          accessibilityRole="progressbar"
          accessibilityLabel="Loading flight path">
          <ActivityIndicator color={colors.accent} />
          <Text tone="muted">Loading flight path…</Text>
        </View>
      ) : (
        <>
          {mine && errorKind !== null ? (
            <Text tone="muted" accessibilityRole="alert">
              {ERROR_COPY[errorKind].title}. {ERROR_COPY[errorKind].body}
            </Text>
          ) : (
            <Text tone="muted">
              The route flown so far, charted by altitude. Loaded on request because it counts
              against the daily API allowance.
            </Text>
          )}
          <Button
            label={mine && errorKind !== null ? 'Try again' : 'Load route and path'}
            variant="secondary"
            onPress={() => {
              void loadRoute(icao24);
              void load(icao24);
            }}
            accessibilityHint={`Uses about ${TRACK_REQUEST_COST + routeFetchCost()} of today's API credits`}
          />
        </>
      )}
    </Section>
  );
}

const styles = StyleSheet.create({
  loading: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
});
