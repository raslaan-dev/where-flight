import type { Aircraft } from '@/api/opensky/types';

import {
  buildFeatures,
  diffFeatures,
  FLAG_EMERGENCY,
  FLAG_ON_GROUND,
  FLAG_STALE,
  fullDelta,
  isEmptyDelta,
  type FeatureSet,
} from '../diff';

const BASE: Aircraft = {
  icao24: '4b1815',
  callsign: 'SWR123',
  label: 'SWR123',
  originCountry: 'Switzerland',
  latitude: 51.5,
  longitude: -0.5,
  altitude: 11_000,
  altitudeSource: 'geometric',
  onGround: false,
  velocity: 232,
  trueTrack: 47.4,
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

function plane(overrides: Partial<Aircraft> = {}): Aircraft {
  return { ...BASE, ...overrides };
}

/** Aircraft in a line heading east, one every tenth of a degree. */
function fleet(count: number, overrides: Partial<Aircraft> = {}): Aircraft[] {
  return Array.from({ length: count }, (_, index) =>
    plane({
      icao24: `a${index.toString().padStart(5, '0')}`,
      longitude: index * 0.1,
      ...overrides,
    })
  );
}

describe('buildFeatures', () => {
  it('encodes an aircraft into the positional tuple the map script expects', () => {
    const [feature] = [...buildFeatures([plane()]).values()];
    // Band 4 is 9-12km; the heading is rounded to a whole degree.
    expect(feature).toEqual(['4b1815', -0.5, 51.5, 47, 4, 0]);
  });

  it('rounds coordinates to roughly a metre, since more is only payload', () => {
    const [feature] = [
      ...buildFeatures([plane({ latitude: 51.123456789, longitude: -0.987654321 })]).values(),
    ];
    expect(feature[1]).toBe(-0.98765);
    expect(feature[2]).toBe(51.12346);
  });

  it('marks an unknown heading as -1 rather than pointing the icon north', () => {
    const [feature] = [...buildFeatures([plane({ trueTrack: null })]).values()];
    expect(feature[3]).toBe(-1);
  });

  it('marks an unknown altitude as -1 rather than the bottom of the ramp', () => {
    const [feature] = [...buildFeatures([plane({ altitude: null })]).values()];
    expect(feature[4]).toBe(-1);
  });

  it('packs the states that change the icon into the flag bits', () => {
    const [feature] = [
      ...buildFeatures([plane({ onGround: true, isEmergencySquawk: true, isStale: true })], {
        includeOnGround: true,
      }).values(),
    ];
    expect(feature[5]).toBe(FLAG_ON_GROUND | FLAG_EMERGENCY | FLAG_STALE);
  });

  it('skips aircraft that were heard but never positioned', () => {
    // They are real, and the Live list still shows them. They just cannot be drawn.
    const features = buildFeatures([plane({ latitude: null, longitude: null })]);
    expect(features.size).toBe(0);
  });

  it('hides ground traffic by default, which is what swamps airports', () => {
    const features = buildFeatures([plane({ onGround: true })]);
    expect(features.size).toBe(0);
  });

  it('shows ground traffic when the setting asks for it', () => {
    const features = buildFeatures([plane({ onGround: true })], { includeOnGround: true });
    expect(features.size).toBe(1);
  });

  it('keeps a pinned aircraft on the ground, because the user chose it', () => {
    const features = buildFeatures([plane({ onGround: true })], { pinned: ['4b1815'] });
    expect(features.has('4b1815')).toBe(true);
  });

  it('caps the number of features so the symbol layer stays smooth', () => {
    expect(buildFeatures(fleet(600), { limit: 500 }).size).toBe(500);
  });

  it('drops the aircraft furthest from where the user is looking', () => {
    const features = buildFeatures(fleet(10), {
      centre: { latitude: 51.5, longitude: 0 },
      limit: 3,
    });
    expect([...features.keys()]).toEqual(['a00000', 'a00001', 'a00002']);
  });

  it('never drops a pinned aircraft, however far away it is', () => {
    // a00009 is the furthest from centre and would be the first to go.
    const features = buildFeatures(fleet(10), {
      centre: { latitude: 51.5, longitude: 0 },
      pinned: ['a00009'],
      limit: 2,
    });
    expect(features.has('a00009')).toBe(true);
    expect(features.size).toBe(2);
  });
});

describe('diffFeatures', () => {
  const previous: FeatureSet = buildFeatures([
    plane({ icao24: 'aaa' }),
    plane({ icao24: 'bbb', longitude: 1 }),
  ]);

  it('sends nothing at all when nothing moved', () => {
    const next = buildFeatures([plane({ icao24: 'aaa' }), plane({ icao24: 'bbb', longitude: 1 })]);
    expect(isEmptyDelta(diffFeatures(previous, next))).toBe(true);
  });

  it('reports an aircraft that has entered the view as added', () => {
    const next = buildFeatures([
      plane({ icao24: 'aaa' }),
      plane({ icao24: 'bbb', longitude: 1 }),
      plane({ icao24: 'ccc', longitude: 2 }),
    ]);
    const delta = diffFeatures(previous, next);
    expect(delta.a.map((f) => f[0])).toEqual(['ccc']);
    expect(delta.u).toHaveLength(0);
  });

  it('reports a moved aircraft as updated, not as a delete and an add', () => {
    // A delete plus an add makes the marker blink out and back on the map.
    const next = buildFeatures([
      plane({ icao24: 'aaa', longitude: -0.4 }),
      plane({ icao24: 'bbb', longitude: 1 }),
    ]);
    const delta = diffFeatures(previous, next);
    expect(delta.u.map((f) => f[0])).toEqual(['aaa']);
    expect(delta.a).toHaveLength(0);
    expect(delta.d).toHaveLength(0);
  });

  it('reports an aircraft that has left the view as deleted, by id alone', () => {
    const next = buildFeatures([plane({ icao24: 'aaa' })]);
    expect(diffFeatures(previous, next).d).toEqual(['bbb']);
  });

  it('treats a change of state as an update even when the position is identical', () => {
    const next = buildFeatures([
      plane({ icao24: 'aaa', isEmergencySquawk: true }),
      plane({ icao24: 'bbb', longitude: 1 }),
    ]);
    expect(diffFeatures(previous, next).u.map((f) => f[0])).toEqual(['aaa']);
  });

  it('ignores movement too small to change the rounded position', () => {
    // Sub-metre jitter would otherwise resend the whole fleet every poll.
    const next = buildFeatures([
      plane({ icao24: 'aaa', longitude: -0.5000001 }),
      plane({ icao24: 'bbb', longitude: 1 }),
    ]);
    expect(isEmptyDelta(diffFeatures(previous, next))).toBe(true);
  });
});

describe('fullDelta', () => {
  it('replays an entire set, which is what a remounted WebView needs', () => {
    const features = buildFeatures([plane({ icao24: 'aaa' }), plane({ icao24: 'bbb' })]);
    const delta = fullDelta(features);
    expect(delta.a).toHaveLength(2);
    expect(delta.u).toHaveLength(0);
    expect(delta.d).toHaveLength(0);
  });
});
