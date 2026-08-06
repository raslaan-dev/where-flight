import {
  MAX_POSITION_AGE_SECONDS,
  STALE_POSITION_AGE_SECONDS,
  mapStatesResponse,
} from '../mappers';
import type { RawStateVector } from '../types';

const NOW = 1_700_000_000;

/**
 * Builds a state vector by field index. Overrides are sparse so each test only
 * states the quirk it is about.
 */
function stateVector(overrides: Record<number, unknown> = {}): RawStateVector {
  const row: unknown[] = [
    '4b1815', // 0  icao24
    'SWR123  ', // 1  callsign, space-padded to 8 as OpenSky sends it
    'Switzerland', // 2  origin_country
    NOW - 5, // 3  time_position
    NOW - 2, // 4  last_contact
    -0.45, // 5  longitude
    51.47, // 6  latitude
    10000, // 7  baro_altitude
    false, // 8  on_ground
    230, // 9  velocity
    47, // 10 true_track
    5.2, // 11 vertical_rate
    null, // 12 sensors
    10050, // 13 geo_altitude
    '2000', // 14 squawk
    false, // 15 spi
    0, // 16 position_source
    2, // 17 category
  ];
  for (const [index, value] of Object.entries(overrides)) row[Number(index)] = value;
  return row as RawStateVector;
}

function mapOne(overrides: Record<number, unknown> = {}) {
  return mapStatesResponse({ time: NOW, states: [stateVector(overrides)] });
}

describe('mapStatesResponse', () => {
  it('maps a well-formed row into the domain model', () => {
    const { time, aircraft } = mapOne();
    expect(time).toBe(NOW);
    expect(aircraft).toHaveLength(1);
    expect(aircraft[0]).toMatchObject({
      icao24: '4b1815',
      callsign: 'SWR123',
      label: 'SWR123',
      originCountry: 'Switzerland',
      latitude: 51.47,
      longitude: -0.45,
      onGround: false,
      velocity: 230,
      trueTrack: 47,
      positionSource: 'ADS-B',
    });
  });

  it('treats a null states array as an empty region, not an error', () => {
    // OpenSky sends null rather than [] when nothing is in the box.
    const snapshot = mapStatesResponse({ time: NOW, states: null });
    expect(snapshot.aircraft).toEqual([]);
    expect(snapshot.time).toBe(NOW);
  });
});

describe('callsigns', () => {
  it('trims the space padding OpenSky applies', () => {
    expect(mapOne({ 1: 'BAW117  ' }).aircraft[0].callsign).toBe('BAW117');
  });

  it('falls back to the ICAO hex when no callsign is broadcast', () => {
    // Common for general aviation and military traffic.
    const [aircraft] = mapOne({ 1: null }).aircraft;
    expect(aircraft.callsign).toBeNull();
    expect(aircraft.label).toBe('4B1815');
  });

  it('treats an all-whitespace callsign as absent', () => {
    expect(mapOne({ 1: '        ' }).aircraft[0].callsign).toBeNull();
  });

  it('lower-cases the icao24 so it is a stable key', () => {
    expect(mapOne({ 0: '4B1815' }).aircraft[0].icao24).toBe('4b1815');
  });
});

describe('altitude', () => {
  it('prefers geometric altitude and says so', () => {
    const [aircraft] = mapOne().aircraft;
    expect(aircraft.altitude).toBe(10050);
    expect(aircraft.altitudeSource).toBe('geometric');
  });

  it('falls back to barometric and labels it, because the two can differ by hundreds of feet', () => {
    const [aircraft] = mapOne({ 13: null }).aircraft;
    expect(aircraft.altitude).toBe(10000);
    expect(aircraft.altitudeSource).toBe('barometric');
  });

  it('reports unknown rather than zero when neither source is present', () => {
    const [aircraft] = mapOne({ 7: null, 13: null }).aircraft;
    expect(aircraft.altitude).toBeNull();
    expect(aircraft.altitudeSource).toBe('unknown');
  });

  it('nulls the altitude of an aircraft on the ground', () => {
    const [aircraft] = mapOne({ 8: true }).aircraft;
    expect(aircraft.onGround).toBe(true);
    expect(aircraft.altitude).toBeNull();
  });
});

describe('vertical trend', () => {
  it.each([
    [5.2, 'climbing'],
    [-5.2, 'descending'],
    [0, 'level'],
    [0.2, 'level'],
    [null, 'unknown'],
  ])('reads a rate of %s as %s', (rate, expected) => {
    expect(mapOne({ 11: rate }).aircraft[0].verticalTrend).toBe(expected);
  });

  it('is level for an aircraft on the ground whatever the rate says', () => {
    expect(mapOne({ 8: true, 11: 3 }).aircraft[0].verticalTrend).toBe('level');
  });
});

describe('squawk', () => {
  it.each(['7500', '7600', '7700'])('flags %s as an emergency code', (squawk) => {
    expect(mapOne({ 14: squawk }).aircraft[0].isEmergencySquawk).toBe(true);
  });

  it('does not flag an ordinary code', () => {
    expect(mapOne({ 14: '2000' }).aircraft[0].isEmergencySquawk).toBe(false);
  });

  it('does not flag a missing code', () => {
    const [aircraft] = mapOne({ 14: null }).aircraft;
    expect(aircraft.squawk).toBeNull();
    expect(aircraft.isEmergencySquawk).toBe(false);
  });
});

describe('position source', () => {
  it.each([
    [0, 'ADS-B'],
    [1, 'ASTERIX'],
    [2, 'MLAT'],
    [3, 'FLARM'],
    [99, 'unknown'],
    [null, 'unknown'],
  ])('maps index %s to %s', (index, expected) => {
    expect(mapOne({ 16: index }).aircraft[0].positionSource).toBe(expected);
  });
});

describe('staleness', () => {
  it('flags a position older than the stale threshold but keeps it', () => {
    const age = STALE_POSITION_AGE_SECONDS + 1;
    const [aircraft] = mapOne({ 3: NOW - age }).aircraft;
    expect(aircraft.positionAgeSeconds).toBe(age);
    expect(aircraft.isStale).toBe(true);
  });

  it('does not flag a fresh position', () => {
    expect(mapOne({ 3: NOW - 5 }).aircraft[0].isStale).toBe(false);
  });

  it('drops a position past the maximum age', () => {
    // Showing an hour-old position as live is worse than showing nothing.
    const snapshot = mapOne({ 3: NOW - (MAX_POSITION_AGE_SECONDS + 1) });
    expect(snapshot.aircraft).toHaveLength(0);
    expect(snapshot.discarded.tooOld).toBe(1);
  });

  it('falls back to last_contact when time_position is missing', () => {
    const [aircraft] = mapOne({ 3: null, 4: NOW - 30 }).aircraft;
    expect(aircraft.positionAgeSeconds).toBe(30);
    expect(aircraft.timePosition).toBeNull();
  });

  it('never reports a negative age when the clock is ahead of the snapshot', () => {
    expect(mapOne({ 3: NOW + 10 }).aircraft[0].positionAgeSeconds).toBe(0);
  });
});

describe('discarding', () => {
  it('drops an aircraft heard without a position and counts it', () => {
    const snapshot = mapOne({ 5: null, 6: null });
    expect(snapshot.aircraft).toHaveLength(0);
    expect(snapshot.discarded.noPosition).toBe(1);
  });

  it('drops a row with no icao24, which is the only stable id', () => {
    expect(mapOne({ 0: null }).discarded.malformed).toBe(1);
  });

  it('drops a row with no last_contact', () => {
    expect(mapOne({ 4: null }).discarded.malformed).toBe(1);
  });

  it('counts discards separately so coverage gaps stay explainable', () => {
    const snapshot = mapStatesResponse({
      time: NOW,
      states: [
        stateVector(),
        stateVector({ 0: 'aaa111', 6: null }),
        stateVector({ 0: null }),
        stateVector({ 0: 'bbb222', 3: NOW - 1000 }),
      ],
    });
    expect(snapshot.aircraft).toHaveLength(1);
    expect(snapshot.discarded).toEqual({
      noPosition: 1,
      malformed: 1,
      tooOld: 1,
      duplicate: 0,
    });
  });
});

describe('deduplication', () => {
  it('keeps the newest report when overlapping receivers report the same aircraft', () => {
    const snapshot = mapStatesResponse({
      time: NOW,
      states: [
        stateVector({ 4: NOW - 30, 9: 100 }),
        stateVector({ 4: NOW - 2, 9: 250 }),
      ],
    });
    expect(snapshot.aircraft).toHaveLength(1);
    expect(snapshot.aircraft[0].velocity).toBe(250);
    expect(snapshot.discarded.duplicate).toBe(1);
  });

  it('keeps the newest report regardless of the order it arrives in', () => {
    const snapshot = mapStatesResponse({
      time: NOW,
      states: [
        stateVector({ 4: NOW - 2, 9: 250 }),
        stateVector({ 4: NOW - 30, 9: 100 }),
      ],
    });
    expect(snapshot.aircraft[0].velocity).toBe(250);
    expect(snapshot.discarded.duplicate).toBe(1);
  });
});

describe('missing optional telemetry', () => {
  it('keeps an aircraft with no heading, which the UI draws as a circle', () => {
    const [aircraft] = mapOne({ 10: null }).aircraft;
    expect(aircraft.trueTrack).toBeNull();
    expect(aircraft.velocity).toBe(230);
  });

  it('keeps an aircraft with no velocity', () => {
    expect(mapOne({ 9: null }).aircraft[0].velocity).toBeNull();
  });

  it('substitutes a readable placeholder for a missing origin country', () => {
    expect(mapOne({ 2: null }).aircraft[0].originCountry).toBe('Unknown');
  });
});
