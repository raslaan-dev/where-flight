import { useLocalSearchParams, useRouter } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';

import { Banner } from '@/components/ui/banner';
import { Button } from '@/components/ui/button';
import { Screen } from '@/components/ui/screen';
import { EmptyState } from '@/components/ui/states';
import { DataRow, Section } from '@/components/ui/section';
import { Text } from '@/components/ui/text';
import { TrackSection } from '@/features/flights/track-section';
import { describeAircraft } from '@/lib/describe-aircraft';
import { hapticConfirm } from '@/lib/haptics';
import {
  formatAltitude,
  formatRelativeTime,
  formatSpeed,
  formatVerticalRate,
  spellOut,
  UNKNOWN,
} from '@/lib/format';
import { bearingToCompass } from '@/lib/geo';
import { useAircraftStore } from '@/stores/aircraft-store';
import { ageSecondsOf, useFollowedStore } from '@/stores/followed-store';
import { useSettingsStore } from '@/stores/settings-store';
import { altitudeBandLabel, space } from '@/theme';

/** Full telemetry for one aircraft. */
export default function FlightDetailScreen() {
  const { icao24 } = useLocalSearchParams<{ icao24: string }>();
  const router = useRouter();
  const units = useSettingsStore((state) => state.units);
  const live = useAircraftStore((state) =>
    state.snapshot?.aircraft.find((item) => item.icao24 === icao24)
  );
  const followed = useFollowedStore((state) =>
    state.flights.find((flight) => flight.icao24 === icao24)
  );
  const toggle = useFollowedStore((state) => state.toggle);

  // Falling back to the stored copy is what lets this screen open at all from
  // the Saved tab with no connection.
  const aircraft = live ?? followed?.lastSeen;
  const isFollowing = followed !== undefined;
  const storedAge = followed && !live ? formatRelativeTime(ageSecondsOf(followed)) : null;

  if (!aircraft) {
    return (
      <Screen title="Flight">
        <EmptyState
          title="That aircraft is no longer in view"
          body="It has either left the area or stopped reporting. Go back to see what is currently airborne."
          actionLabel="Back to the list"
          onAction={() => router.back()}
        />
      </Screen>
    );
  }

  return (
    <Screen title={aircraft.label} subtitle={aircraft.originCountry}>
      <ScrollView contentContainerStyle={styles.content}>
        {storedAge ? (
          <Banner
            tone="warn"
            message={`This aircraft is not in the current view. Showing the last reading saved, from ${storedAge}.`}
          />
        ) : null}

        {/* The visual layout below is a table of fragments; this gives a screen
            reader the same information as one coherent sentence. */}
        <View accessible accessibilityLabel={describeAircraft(aircraft, { units })}>
          <Text variant="title">
            {aircraft.onGround ? 'On the ground' : formatAltitude(aircraft.altitude, units)}
          </Text>
          <Text tone="muted">
            {altitudeBandLabel(aircraft.altitude)} · {aircraft.verticalTrend}
          </Text>
        </View>

        <Section title="Telemetry">
          <DataRow label="Speed" value={formatSpeed(aircraft.velocity, units)} />
          <DataRow label="Vertical rate" value={formatVerticalRate(aircraft.verticalRate, units)} />
          <DataRow
            label="Heading"
            value={
              aircraft.trueTrack === null
                ? UNKNOWN
                : `${Math.round(aircraft.trueTrack)}° ${bearingToCompass(aircraft.trueTrack)}`
            }
          />
          <DataRow
            label="Altitude source"
            value={aircraft.onGround ? UNKNOWN : aircraft.altitudeSource}
          />
        </Section>

        <Section title="Identity">
          <DataRow
            label="ICAO 24-bit address"
            value={aircraft.icao24.toUpperCase()}
            spokenValue={spellOut(aircraft.icao24)}
          />
          <DataRow label="Callsign" value={aircraft.callsign ?? 'Not broadcasting'} />
          <DataRow label="Squawk" value={aircraft.squawk ?? UNKNOWN} />
          <DataRow label="Position source" value={aircraft.positionSource} />
        </Section>

        {/* Only offered while the flight is live: a track for an aircraft
            last seen an hour ago returns little and still costs credits. */}
        {live ? <TrackSection icao24={live.icao24} /> : null}

        <Section title="Freshness">
          <DataRow
            label="Last position"
            value={formatRelativeTime(aircraft.positionAgeSeconds)}
          />
          <DataRow
            label="Coordinates"
            value={
              aircraft.latitude === null || aircraft.longitude === null
                ? UNKNOWN
                : `${aircraft.latitude.toFixed(3)}, ${aircraft.longitude.toFixed(3)}`
            }
          />
        </Section>

        <View style={styles.actions}>
          <Button
            label={isFollowing ? 'Unfollow' : 'Follow'}
            variant={isFollowing ? 'secondary' : 'primary'}
            onPress={() => {
              hapticConfirm();
              toggle(aircraft);
            }}
            accessibilityHint={
              isFollowing
                ? 'Removes this flight from the Saved tab'
                : 'Keeps this flight in the Saved tab, available offline'
            }
          />
          <Button label="Back" variant="ghost" onPress={() => router.back()} />
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: space.lg, paddingBottom: space.xxl },
  actions: { flexDirection: 'row', gap: space.sm, flexWrap: 'wrap' },
});
