import { fireEvent, render, screen } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import type { Aircraft } from '@/api/opensky/types';
import { ThemeProvider } from '@/theme';

import { AircraftListItem } from '../aircraft-list-item';

const AIRCRAFT: Aircraft = {
  icao24: '4b1815',
  callsign: 'SWR123',
  label: 'SWR123',
  originCountry: 'Switzerland',
  latitude: 51.47,
  longitude: -0.45,
  altitude: 11000,
  altitudeSource: 'geometric',
  onGround: false,
  velocity: 232,
  trueTrack: 47,
  verticalRate: 5,
  verticalTrend: 'climbing',
  squawk: '2000',
  isEmergencySquawk: false,
  positionSource: 'ADS-B',
  timePosition: 1_700_000_000,
  lastContact: 1_700_000_000,
  positionAgeSeconds: 12,
  isStale: false,
};

/** SafeAreaProvider needs metrics up front; there is no window to measure. */
const METRICS = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
};

async function renderItem(
  overrides: Partial<Aircraft> = {},
  props: { selected?: boolean; onPress?: jest.Mock } = {}
) {
  const onPress = props.onPress ?? jest.fn();
  await render(
    <SafeAreaProvider initialMetrics={METRICS}>
      <ThemeProvider>
        <AircraftListItem
          aircraft={{ ...AIRCRAFT, ...overrides }}
          units="aviation"
          selected={props.selected}
          onPress={onPress}
        />
      </ThemeProvider>
    </SafeAreaProvider>
  );
  return onPress;
}

describe('AircraftListItem', () => {
  it('exposes the row as a single labelled button, not six fragments', async () => {
    await renderItem();
    const label = screen.getByRole('button').props.accessibilityLabel;
    expect(label).toContain('SWR123');
    expect(label).toContain('climbing');
    expect(label).toContain('Heading north-east');
  });

  it('passes the aircraft identifier back on press', async () => {
    const onPress = await renderItem();
    await fireEvent.press(screen.getByRole('button'));
    expect(onPress).toHaveBeenCalledWith('4b1815');
  });

  it('reports selection to assistive tech, not only as a colour change', async () => {
    await renderItem({}, { selected: true });
    expect(screen.getByRole('button').props.accessibilityState.selected).toBe(true);
  });

  it('carries the vertical trend as a glyph as well as a colour', async () => {
    await renderItem({ verticalTrend: 'descending' });
    expect(screen.getByText(/▼/)).toBeTruthy();
  });

  it('shows "On ground" instead of an altitude for parked traffic', async () => {
    await renderItem({ onGround: true, altitude: null });
    expect(screen.getByText('On ground')).toBeTruthy();
  });

  it('falls back to the ICAO hex when no callsign is broadcast', async () => {
    await renderItem({ callsign: null, label: '4B1815' });
    expect(screen.getByText('4B1815')).toBeTruthy();
  });

  it('surfaces an emergency squawk visibly, not only in the spoken label', async () => {
    await renderItem({ squawk: '7700', isEmergencySquawk: true });
    expect(screen.getByText('Emergency 7700')).toBeTruthy();
  });
});
