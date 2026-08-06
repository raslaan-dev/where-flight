import type { Aircraft } from '@/api/opensky/types';
import { describeAircraft } from '../describe-aircraft';

const BASE: Aircraft = {
  icao24: '4b1815',
  callsign: 'SWR123',
  label: 'SWR123',
  originCountry: 'Switzerland',
  latitude: 51.47,
  longitude: -0.45,
  altitude: 3444,
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

function describe_(overrides: Partial<Aircraft> = {}, from?: { latitude: number; longitude: number }) {
  return describeAircraft({ ...BASE, ...overrides }, { units: 'aviation', from });
}

describe('describeAircraft', () => {
  it('reads as one sentence per fact, in the order a pilot would say them', () => {
    expect(describe_()).toBe(
      'SWR123. Altitude 11,299 feet, climbing. Speed 451 knots. Heading north-east. Last seen 12 seconds ago.'
    );
  });

  it('spells out the hex address when there is no callsign, so TalkBack does not try to pronounce it', () => {
    const text = describe_({ callsign: null });
    expect(text).toContain('Aircraft 4 B 1 8 1 5');
  });

  it('says unknown rather than zero for missing telemetry', () => {
    // "Altitude zero feet" would be a lie about an aircraft at cruise.
    const text = describe_({ altitude: null, velocity: null, verticalTrend: 'unknown' });
    expect(text).toContain('Altitude altitude unknown');
    expect(text).toContain('Speed speed unknown');
    expect(text).not.toContain('0 feet');
  });

  it('omits the heading entirely when it is unknown, rather than saying zero degrees', () => {
    const text = describe_({ trueTrack: null });
    expect(text).not.toContain('Heading');
  });

  it('reports an aircraft on the ground as such instead of quoting an altitude', () => {
    const text = describe_({ onGround: true, altitude: null });
    expect(text).toContain('On the ground');
    expect(text).not.toContain('Altitude');
  });

  it('gives a spoken compass direction, not a bearing in degrees', () => {
    expect(describe_({ trueTrack: 271 })).toContain('Heading west');
    expect(describe_({ trueTrack: 271 })).not.toContain('271');
  });

  it('includes the distance only when an origin is supplied', () => {
    expect(describe_()).not.toContain('away');
    expect(describe_({}, { latitude: 51.5, longitude: -0.12 })).toContain('away');
  });

  it('flags an emergency squawk last, where it is heard rather than buried', () => {
    const text = describe_({ squawk: '7700', isEmergencySquawk: true });
    expect(text.endsWith('Squawking an emergency code.')).toBe(true);
  });

  it('is honest about a stale position rather than implying it is current', () => {
    expect(describe_({ positionAgeSeconds: 240 })).toContain('Last seen 4 minutes ago');
  });

  it('respects the metric unit system', () => {
    const text = describeAircraft(BASE, { units: 'metric' });
    expect(text).toContain('3,444 metres');
    expect(text).toContain('835 kilometres per hour');
  });
});
