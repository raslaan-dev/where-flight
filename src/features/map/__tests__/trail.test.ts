import type { FlightTrack, TrackPoint } from '@/api/opensky/types';
import {
  appendObserved,
  buildTrail,
  pruneTrails,
  trackPath,
  MAX_OBSERVED_POINTS,
  type TrailPath,
} from '../trail';

function point(longitude: number, latitude: number): TrackPoint {
  return { time: 0, latitude, longitude, altitude: 1000, trueTrack: 90, onGround: false };
}

function track(points: TrackPoint[]): FlightTrack {
  return { icao24: '407a06', callsign: 'BAW117', startTime: 0, endTime: 1, path: points };
}

describe('trackPath', () => {
  it('converts to GeoJSON longitude-latitude order', () => {
    expect(trackPath(track([point(-0.45, 51.47), point(-1.2, 52.0)]))).toEqual([
      [-0.45, 51.47],
      [-1.2, 52],
    ]);
  });

  it('collapses a repeated position, which a parked aircraft produces a lot of', () => {
    expect(trackPath(track([point(-0.45, 51.47), point(-0.45, 51.47), point(-1.2, 52)]))).toEqual([
      [-0.45, 51.47],
      [-1.2, 52],
    ]);
  });

  it('rounds to the same precision as the feature encoder', () => {
    expect(trackPath(track([point(-0.123456789, 51.987654321)]))).toEqual([[-0.12346, 51.98765]]);
  });
});

describe('appendObserved', () => {
  it('starts a trail from nothing', () => {
    expect(appendObserved(undefined, -0.45, 51.47)).toEqual([[-0.45, 51.47]]);
  });

  it('returns the same array when the aircraft has not moved', () => {
    const existing: TrailPath = [[-0.45, 51.47]];
    expect(appendObserved(existing, -0.45, 51.47)).toBe(existing);
  });

  it('treats sub-metre jitter as not having moved', () => {
    const existing: TrailPath = [[-0.45, 51.47]];
    expect(appendObserved(existing, -0.450000001, 51.470000001)).toBe(existing);
  });

  it('does not mutate the array it was given', () => {
    const existing: TrailPath = [[-0.45, 51.47]];
    appendObserved(existing, -1.2, 52);
    expect(existing).toHaveLength(1);
  });

  it('drops the oldest point once the cap is reached', () => {
    let path: TrailPath = [];
    for (let i = 0; i < MAX_OBSERVED_POINTS + 10; i += 1) path = appendObserved(path, i, i);

    expect(path).toHaveLength(MAX_OBSERVED_POINTS);
    // The newest point survives and the oldest ten are gone.
    expect(path[path.length - 1]).toEqual([MAX_OBSERVED_POINTS + 9, MAX_OBSERVED_POINTS + 9]);
    expect(path[0]).toEqual([10, 10]);
  });
});

describe('pruneTrails', () => {
  it('forgets aircraft that have left the snapshot', () => {
    const trails = { a: [[0, 0]] as TrailPath, b: [[1, 1]] as TrailPath };
    expect(pruneTrails(trails, ['a'])).toEqual({ a: [[0, 0]] });
  });

  it('returns the same object when nothing was dropped, to avoid a re-render', () => {
    const trails = { a: [[0, 0]] as TrailPath };
    expect(pruneTrails(trails, ['a', 'b'])).toBe(trails);
  });
});

describe('buildTrail', () => {
  const observed: TrailPath = [
    [-0.1, 51],
    [-0.2, 51.1],
  ];

  it('prefers the fetched track, because only it reaches the departure point', () => {
    const result = buildTrail({
      track: track([point(-0.45, 51.47), point(-1.2, 52)]),
      observed,
    });

    expect(result.source).toBe('track');
    expect(result.path).toEqual([
      [-0.45, 51.47],
      [-1.2, 52],
    ]);
  });

  it('falls back to observed positions when no track has been fetched', () => {
    expect(buildTrail({ track: null, observed })).toEqual({ path: observed, source: 'observed' });
  });

  it('falls back when a fetched track is too short to draw a line', () => {
    const result = buildTrail({ track: track([point(-0.45, 51.47)]), observed });
    expect(result.source).toBe('observed');
  });

  it('reports no trail rather than a one-point line', () => {
    expect(buildTrail({ track: null, observed: [[-0.1, 51]] }).source).toBe('none');
    expect(buildTrail({ track: null, observed: undefined }).source).toBe('none');
  });
});
