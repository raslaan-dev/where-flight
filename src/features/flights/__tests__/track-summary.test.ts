import type { FlightTrack, TrackPoint } from '@/api/opensky/types';

import { describeTrack } from '../track-summary';

const START = 1_700_000_000;

function point(offsetSeconds: number, altitude: number | null): TrackPoint {
  return {
    time: START + offsetSeconds,
    latitude: 51,
    longitude: 0,
    altitude,
    trueTrack: 90,
    onGround: false,
  };
}

function track(path: TrackPoint[]): FlightTrack {
  return {
    icao24: '4b1815',
    callsign: 'SWR123',
    startTime: path[0]?.time ?? START,
    endTime: path[path.length - 1]?.time ?? START,
    path,
  };
}

describe('describeTrack', () => {
  it('speaks duration and peak altitude in the chosen units', () => {
    const summary = describeTrack(
      track([point(0, 100), point(1800, 8000), point(4320, 6000)]),
      'metric'
    );
    expect(summary).toContain('1 hour 12 minutes');
    expect(summary).toContain('8,000 metres');
  });

  it('says climbing when the recent trend is upwards', () => {
    const summary = describeTrack(
      track([point(0, 100), point(600, 1000), point(1200, 2500)]),
      'aviation'
    );
    expect(summary).toContain('now climbing');
  });

  it('says descending when the recent trend is downwards', () => {
    const summary = describeTrack(
      track([point(0, 9000), point(600, 8000), point(1200, 5000)]),
      'aviation'
    );
    expect(summary).toContain('now descending');
  });

  it('stays quiet about trend when the flight is level', () => {
    const summary = describeTrack(
      track([point(0, 9000), point(600, 9010), point(1200, 9020)]),
      'aviation'
    );
    expect(summary).not.toContain('climbing');
    expect(summary).not.toContain('descending');
  });

  it('admits when there is too little to describe', () => {
    expect(describeTrack(track([point(0, 100)]), 'aviation')).toContain('too few points');
  });

  it('copes with a track whose altitudes are all null', () => {
    const summary = describeTrack(track([point(0, null), point(600, null)]), 'aviation');
    expect(summary).toContain('10 minutes');
    expect(summary).not.toContain('reaching');
  });
});
