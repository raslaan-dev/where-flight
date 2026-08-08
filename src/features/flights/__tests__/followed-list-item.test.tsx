import { fireEvent, render, screen } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import type { Aircraft } from '@/api/opensky/types';
import type { FollowedFlight } from '@/stores/followed-store';
import { ThemeProvider } from '@/theme';

import { FollowedListItem } from '../followed-list-item';

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

const FLIGHT: FollowedFlight = {
  icao24: '4b1815',
  label: 'SWR123',
  followedAt: 1_700_000_000_000,
  lastSeen: AIRCRAFT,
  lastSeenAt: 1_700_000_000_000,
};

const METRICS = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
};

async function renderRow(overrides: Partial<FollowedListItemArgs> = {}) {
  const onPress = overrides.onPress ?? jest.fn();
  const onRemove = overrides.onRemove ?? jest.fn();
  await render(
    <SafeAreaProvider initialMetrics={METRICS}>
      <ThemeProvider>
        <FollowedListItem
          flight={overrides.flight ?? FLIGHT}
          units="aviation"
          ageSeconds={overrides.ageSeconds ?? 840}
          onPress={onPress}
          onRemove={onRemove}
        />
      </ThemeProvider>
    </SafeAreaProvider>
  );
  return { onPress, onRemove };
}

type FollowedListItemArgs = {
  flight: FollowedFlight;
  ageSeconds: number;
  onPress: jest.Mock;
  onRemove: jest.Mock;
};

describe('FollowedListItem', () => {
  it('states how old the reading is, rather than implying it is current', async () => {
    await renderRow();
    expect(screen.getByText('Last seen 14 minutes ago')).toBeTruthy();
  });

  it('includes the age in the spoken label too, not just on screen', async () => {
    await renderRow();
    const label = screen.getByLabelText(/SWR123\./).props.accessibilityLabel;
    expect(label).toContain('Last seen 14 minutes ago');
  });

  it('renders the full stored telemetry, which is what makes it work offline', async () => {
    await renderRow();
    expect(screen.getByText('36,089 ft')).toBeTruthy();
    expect(screen.getByText('451 kt')).toBeTruthy();
    expect(screen.getByText('Switzerland')).toBeTruthy();
  });

  it('opens the flight when the card is pressed', async () => {
    const { onPress } = await renderRow();
    await fireEvent.press(screen.getByLabelText(/SWR123\./));
    expect(onPress).toHaveBeenCalledWith('4b1815');
  });

  it('names the flight in the untrack control, so it is unambiguous out of context', async () => {
    const { onRemove } = await renderRow();
    await fireEvent.press(screen.getByLabelText('Stop tracking SWR123'));
    expect(onRemove).toHaveBeenCalledWith('4b1815');
  });

  it('keeps the followed label even after the aircraft stops broadcasting one', async () => {
    await renderRow({
      flight: { ...FLIGHT, lastSeen: { ...AIRCRAFT, callsign: null, label: '4B1815' } },
    });
    expect(screen.getByText('SWR123')).toBeTruthy();
  });
});
