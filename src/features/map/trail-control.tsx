import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { TRACK_REQUEST_COST } from '@/api/opensky/costs';
import { ERROR_COPY } from '@/api/opensky/errors';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { RouteLine } from '@/features/flights/route-line';
import { useCredentialsStore } from '@/stores/credentials-store';
import { cachedRoute, routeFetchCost, useRouteStore } from '@/stores/route-store';
import { cachedTrack, useTrackStore } from '@/stores/track-store';
import { space, useTheme } from '@/theme';

/**
 * The route and trail line under the map's selection card.
 *
 * One tap buys both halves of the same question — where has this flight been,
 * and where is it going — so they are fetched together and priced together.
 *
 * The explanatory copy only appears when it can still change something. With
 * an account connected there is a button to press, so the card shows the route
 * or the button and nothing else; the paragraph about connecting an account is
 * only there for people who have not.
 */

export function TrailControl({ icao24 }: { icao24: string }) {
  const { colors } = useTheme();
  const connected = useCredentialsStore((state) => state.credentials !== null);

  const track = useTrackStore((state) => cachedTrack(state, icao24));
  const trackStatus = useTrackStore((state) => state.status);
  const trackError = useTrackStore((state) => state.errorKind);
  const trackActive = useTrackStore((state) => state.activeIcao24);
  const loadTrack = useTrackStore((state) => state.load);

  const route = useRouteStore((state) => cachedRoute(state, icao24));
  const routeStatus = useRouteStore((state) => state.status);
  const routeActive = useRouteStore((state) => state.activeIcao24);
  const loadRoute = useRouteStore((state) => state.load);

  // The stores are shared between screens; only reflect status for this one.
  const key = icao24.toLowerCase();
  const mine = trackActive === key || routeActive === key;
  const loading =
    mine && (trackStatus === 'loading' || routeStatus === 'loading');
  const fetched = track !== null || route !== undefined;
  const routeError = useRouteStore((state) => state.errorKind);
  const failed = mine ? (routeError ?? trackError) : null;

  // The two halves have different permissions. /flights/aircraft answers for
  // anonymous callers, so the route is available to everyone; /tracks is
  // authenticated-only, so the altitude path is the part an account buys.
  // Gating both on an account — as this did — meant an anonymous user never
  // saw a button at all and could never load a route.
  const cost = connected ? TRACK_REQUEST_COST + routeFetchCost() : routeFetchCost();

  const load = () => {
    void loadRoute(icao24);
    if (connected) void loadTrack(icao24);
  };

  if (loading) {
    return (
      <View
        style={styles.row}
        accessible
        accessibilityRole="progressbar"
        accessibilityLabel="Loading route and flight path">
        <ActivityIndicator color={colors.accent} />
        <Text variant="caption" tone="muted">
          Loading route and flight path…
        </Text>
      </View>
    );
  }

  if (fetched) {
    return (
      <View style={styles.stack}>
        {route !== undefined ? (
          <RouteLine
            route={route}
            emptyLabel="OpenSky has no completed leg for this aircraft in the last 12 hours."
          />
        ) : null}
        {track ? (
          <Text variant="caption" tone="muted">
            The ringed end of the trail is where it took off.
          </Text>
        ) : null}
      </View>
    );
  }

  return (
    <View style={styles.stack}>
      {mine && failed ? (
        <Text variant="caption" tone="muted">
          {ERROR_COPY[failed].body}
        </Text>
      ) : !connected ? (
        <Text variant="caption" tone="muted">
          The trail starts when you opened the app. Connect an OpenSky account in
          Settings to also chart the full path back to take-off.
        </Text>
      ) : null}
      <Button
        label={mine && failed ? 'Try again' : connected ? 'Show route and path' : 'Show route'}
        variant="secondary"
        onPress={load}
        accessibilityHint={
          connected
            ? `Fetches where this flight departed, where it is heading, and its flown path. Costs about ${cost} credits.`
            : `Fetches where this flight departed and where it is heading. Costs about ${cost} credits.`
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  stack: { gap: space.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
});
