import type { Aircraft, AircraftSnapshot } from '@/api/opensky/types';
import {
  ageSecondsOf,
  isFollowed,
  MAX_FOLLOWED,
  useFollowedStore,
  type FollowedFlight,
} from '../followed-store';

const NOW = 1_786_034_585;

function aircraft(partial: Partial<Aircraft> = {}): Aircraft {
  return {
    icao24: '407a06',
    callsign: 'BAW117',
    label: 'BAW117',
    originCountry: 'United Kingdom',
    latitude: 51.5,
    longitude: -0.4,
    altitude: 10_000,
    altitudeSource: 'geometric',
    onGround: false,
    velocity: 230,
    trueTrack: 90,
    verticalRate: 0,
    verticalTrend: 'level',
    squawk: '3255',
    isEmergencySquawk: false,
    positionSource: 'ADS-B',
    timePosition: NOW,
    lastContact: NOW,
    positionAgeSeconds: 0,
    isStale: false,
    ...partial,
  };
}

function snapshot(aircraftList: Aircraft[]): AircraftSnapshot {
  return {
    time: NOW,
    aircraft: aircraftList,
    discarded: { noPosition: 0, tooOld: 0, malformed: 0, duplicate: 0 },
  };
}

function flights(): FollowedFlight[] {
  return useFollowedStore.getState().flights;
}

beforeEach(() => {
  useFollowedStore.setState({ flights: [] });
});

describe('following', () => {
  it('stores the whole aircraft, not just its identifier', () => {
    useFollowedStore.getState().follow(aircraft());
    // The point of the store: an id alone leaves the Track tab unable to render
    // anything but a hex code once the aircraft is out of view.
    expect(flights()[0].lastSeen.velocity).toBe(230);
    expect(flights()[0].lastSeen.originCountry).toBe('United Kingdom');
  });

  it('is idempotent, so a double tap does not create two entries', () => {
    useFollowedStore.getState().follow(aircraft());
    useFollowedStore.getState().follow(aircraft());
    expect(flights()).toHaveLength(1);
  });

  it('puts the newest first so the list needs no sort at render time', () => {
    useFollowedStore.getState().follow(aircraft({ icao24: 'aaa111' }));
    useFollowedStore.getState().follow(aircraft({ icao24: 'bbb222' }));
    expect(flights().map((f) => f.icao24)).toEqual(['bbb222', 'aaa111']);
  });

  it('drops the oldest entry once the cap is reached', () => {
    for (let index = 0; index < MAX_FOLLOWED + 5; index += 1) {
      useFollowedStore.getState().follow(aircraft({ icao24: `id${index}` }));
    }
    expect(flights()).toHaveLength(MAX_FOLLOWED);
    expect(flights().at(-1)?.icao24).toBe('id5');
  });

  it('toggles off again', () => {
    useFollowedStore.getState().toggle(aircraft());
    expect(isFollowed(useFollowedStore.getState(), '407a06')).toBe(true);
    useFollowedStore.getState().toggle(aircraft());
    expect(isFollowed(useFollowedStore.getState(), '407a06')).toBe(false);
  });

  it('freezes the label, so a flight that stops broadcasting keeps its name', () => {
    useFollowedStore.getState().follow(aircraft({ label: 'BAW117' }));
    useFollowedStore
      .getState()
      .syncFromSnapshot(snapshot([aircraft({ label: '407A06', lastContact: NOW + 10 })]));
    expect(flights()[0].label).toBe('BAW117');
  });
});

describe('syncFromSnapshot', () => {
  it('refreshes the stored telemetry from a newer report', () => {
    useFollowedStore.getState().follow(aircraft({ altitude: 10_000 }));
    useFollowedStore
      .getState()
      .syncFromSnapshot(snapshot([aircraft({ altitude: 11_500, lastContact: NOW + 15 })]));
    expect(flights()[0].lastSeen.altitude).toBe(11_500);
  });

  it('keeps the last known reading for an aircraft that has left the view', () => {
    // Blanking the record would turn a useful "last seen 14 minutes ago" card
    // into an empty one at exactly the moment the user cares most.
    useFollowedStore.getState().follow(aircraft());
    useFollowedStore.getState().syncFromSnapshot(snapshot([]));
    expect(flights()[0].lastSeen.altitude).toBe(10_000);
  });

  it('does not touch the state when nothing has actually moved', () => {
    // Every poll would otherwise queue a disk write for identical data.
    useFollowedStore.getState().follow(aircraft());
    const before = flights();
    useFollowedStore.getState().syncFromSnapshot(snapshot([aircraft()]));
    expect(flights()).toBe(before);
  });

  it('costs nothing when nothing is followed', () => {
    const before = flights();
    useFollowedStore.getState().syncFromSnapshot(snapshot([aircraft()]));
    expect(flights()).toBe(before);
  });
});

describe('ageSecondsOf', () => {
  it('measures against the device clock, which still works offline', () => {
    useFollowedStore.getState().follow(aircraft());
    const flight = flights()[0];
    expect(ageSecondsOf(flight, flight.lastSeenAt + 125_000)).toBe(125);
  });

  it('never reports a negative age when the clock has shifted backwards', () => {
    useFollowedStore.getState().follow(aircraft());
    const flight = flights()[0];
    expect(ageSecondsOf(flight, flight.lastSeenAt - 60_000)).toBe(0);
  });
});
