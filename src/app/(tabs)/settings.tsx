import { ScrollView, StyleSheet, Switch, View } from 'react-native';

import { Row, Section } from '@/components/ui/section';
import { Screen } from '@/components/ui/screen';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { Text } from '@/components/ui/text';
import { useSettingsStore } from '@/stores/settings-store';
import { space, useTheme } from '@/theme';

export default function SettingsScreen() {
  const { colors, reduceMotion } = useTheme();
  const settings = useSettingsStore();

  return (
    <Screen title="Settings" subtitle="Appearance, units and accessibility">
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}>
        <Section title="Appearance">
          <Row label="Theme">
            <SegmentedControl
              label="Theme"
              value={settings.theme}
              onChange={settings.setTheme}
              options={[
                { value: 'system', label: 'System' },
                { value: 'light', label: 'Light' },
                { value: 'dark', label: 'Dark' },
              ]}
            />
          </Row>

          <Row
            label="High contrast"
            description="Stronger colours and heavier borders. Follows your device setting by default.">
            <SegmentedControl
              label="High contrast"
              value={settings.highContrast}
              onChange={settings.setHighContrast}
              options={[
                { value: 'system', label: 'System' },
                { value: 'on', label: 'On' },
                { value: 'off', label: 'Off' },
              ]}
            />
          </Row>
        </Section>

        <Section title="Motion">
          <Row
            label="Reduce motion"
            description={
              reduceMotion
                ? 'Animations are currently off. Aircraft jump between updates instead of gliding.'
                : 'Aircraft glide smoothly between position updates.'
            }>
            <SegmentedControl
              label="Reduce motion"
              value={settings.reduceMotion}
              onChange={settings.setReduceMotion}
              options={[
                { value: 'system', label: 'System' },
                { value: 'on', label: 'Reduce' },
                { value: 'off', label: 'Full' },
              ]}
            />
          </Row>
        </Section>

        <Section title="Units">
          <Row label="Measurement system">
            <SegmentedControl
              label="Units"
              value={settings.units}
              onChange={settings.setUnits}
              options={[
                { value: 'aviation', label: 'Aviation', a11yLabel: 'Aviation: feet and knots' },
                { value: 'metric', label: 'Metric', a11yLabel: 'Metric: metres and km/h' },
                { value: 'imperial', label: 'Imperial', a11yLabel: 'Imperial: feet and mph' },
              ]}
            />
          </Row>
        </Section>

        <Section title="Data">
          <View style={styles.switchRow}>
            <View style={styles.switchLabel}>
              <Text variant="bodyStrong">Show aircraft on the ground</Text>
              <Text variant="caption" tone="muted">
                Parked and taxiing aircraft crowd out airborne traffic near airports.
              </Text>
            </View>
            <Switch
              value={settings.showOnGround}
              onValueChange={settings.setShowOnGround}
              accessibilityLabel="Show aircraft on the ground"
              trackColor={{ true: colors.accent, false: colors.borderStrong }}
            />
          </View>

          <View style={styles.switchRow}>
            <View style={styles.switchLabel}>
              <Text variant="bodyStrong">Haptic feedback</Text>
              <Text variant="caption" tone="muted">
                A non-visual confirmation when you select or follow a flight.
              </Text>
            </View>
            <Switch
              value={settings.haptics}
              onValueChange={settings.setHaptics}
              accessibilityLabel="Haptic feedback"
              trackColor={{ true: colors.accent, false: colors.borderStrong }}
            />
          </View>
        </Section>

        <Section title="About">
          <Text variant="caption" tone="muted">
            Flight data from the OpenSky Network, used under its non-commercial terms.
            Map data © OpenStreetMap contributors, © CARTO.
          </Text>
        </Section>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingTop: space.lg, paddingBottom: space.xxl },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: space.lg },
  switchLabel: { flex: 1, gap: 2 },
});
