import { useLocalSearchParams, useRouter } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Screen } from '@/components/ui/screen';
import { EmptyState } from '@/components/ui/states';
import { DataRow, Section } from '@/components/ui/section';
import { Text } from '@/components/ui/text';
import { describeAircraft } from '@/lib/describe-aircraft';
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
import { useSettingsStore } from '@/stores/settings-store';
import { altitudeBandLabel, space } from '@/theme';

/** Full telemetry for one aircraft. */
export default function FlightDetailScreen() {
  const { icao24 } = useLocalSearchParams<{ icao24: string }>();
  const router = useRouter();
  const units = useSettingsStore((state) => state.units);
  const aircraft = useAircraftStore((state) =>
    state.snapshot?.aircraft.find((item) => item.icao24 === icao24)
  );

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

        <Button label="Back" variant="secondary" onPress={() => router.back()} />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: space.lg, paddingBottom: space.xxl },
});
