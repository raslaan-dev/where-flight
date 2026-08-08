import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui/text';
import { airportByIcao } from '@/lib/airports';
import type { Route } from '@/stores/route-store';
import { space } from '@/theme';

/**
 * `LHR → DXB`, the one line everybody actually wants from a flight tracker.
 *
 * Either end can be unknown, and they are unknown for different reasons: a
 * departure OpenSky never attributed, or an arrival it cannot know yet because
 * the aircraft has not landed. Both are stated rather than papered over with a
 * guess, and the spoken label says the same thing in words — an arrow glyph is
 * announced inconsistently, or not at all.
 */

export type RouteLineProps = {
  route: Route;
  /** Shown when the route came back empty. */
  emptyLabel?: string;
};

/** IATA where known — shorter and far more recognisable than ICAO. */
function endpoint(icao: string | null): { code: string; place: string | null } {
  if (!icao) return { code: '—', place: null };
  const airport = airportByIcao(icao);
  if (!airport) return { code: icao.toUpperCase(), place: null };
  return { code: airport.iata || airport.icao, place: airport.city };
}

function spoken(from: string | null, to: string | null): string {
  const origin = from ? (airportByIcao(from)?.city ?? from.toUpperCase()) : null;
  const destination = to ? (airportByIcao(to)?.city ?? to.toUpperCase()) : null;

  if (origin && destination) return `Flying from ${origin} to ${destination}.`;
  if (origin) return `Departed ${origin}. Destination not known yet.`;
  if (destination) return `Arriving at ${destination}. Departure airport unknown.`;
  return 'Route unknown.';
}

export function RouteLine({ route, emptyLabel }: RouteLineProps) {
  if (route === null) {
    return (
      <Text variant="caption" tone="muted">
        {emptyLabel ?? 'OpenSky has no route on record for this aircraft.'}
      </Text>
    );
  }

  const from = endpoint(route.departureAirport);
  const to = endpoint(route.arrivalAirport);

  return (
    <View
      style={styles.row}
      accessible
      accessibilityLabel={spoken(route.departureAirport, route.arrivalAirport)}>
      <View style={styles.end}>
        <Text variant="bodyStrong">{from.code}</Text>
        {from.place ? (
          <Text variant="caption" tone="muted" numberOfLines={1}>
            {from.place}
          </Text>
        ) : null}
      </View>

      <Text variant="bodyStrong" tone="muted">
        →
      </Text>

      <View style={[styles.end, styles.destination]}>
        <Text variant="bodyStrong">{to.code}</Text>
        {to.place ? (
          <Text variant="caption" tone="muted" numberOfLines={1}>
            {to.place}
          </Text>
        ) : (
          <Text variant="caption" tone="muted" numberOfLines={1}>
            {route.arrivalAirport === null ? 'still flying' : ''}
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  end: { flexShrink: 1 },
  destination: { alignItems: 'flex-end', flexGrow: 1 },
});
