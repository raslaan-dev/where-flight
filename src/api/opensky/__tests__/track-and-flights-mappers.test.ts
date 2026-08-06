import { mapFlightsResponse, mapTrackResponse } from '../mappers';
import type { RawFlight, RawTrackResponse } from '../types';

const NOW = 1_700_000_000;

describe('mapTrackResponse', () => {
  const raw: RawTrackResponse = {
    icao24: '4B1815',
    startTime: NOW - 3600,
    endTime: NOW,
    callsign: 'SWR123  ',
    path: [
      [NOW - 3600, 47.45, 8.56, 0, 90, true],
      [NOW - 3000, 47.6, 8.9, 2400, 45, false],
      [NOW, 48.2, 9.8, 9500, 44, false],
    ],
  };

  it('maps waypoints into chronological typed points', () => {
    const track = mapTrackResponse(raw);
    expect(track.icao24).toBe('4b1815');
    expect(track.callsign).toBe('SWR123');
    expect(track.path).toHaveLength(3);
    expect(track.path[0]).toEqual({
      time: NOW - 3600,
      latitude: 47.45,
      longitude: 8.56,
      altitude: 0,
      trueTrack: 90,
      onGround: true,
    });
  });

  it('sorts waypoints that arrive out of order', () => {
    const shuffled = { ...raw, path: [raw.path![2], raw.path![0], raw.path![1]] };
    const track = mapTrackResponse(shuffled);
    expect(track.path.map((point) => point.time)).toEqual([NOW - 3600, NOW - 3000, NOW]);
  });

  it('drops waypoints with no position but keeps their neighbours', () => {
    const withHole = { ...raw, path: [raw.path![0], [NOW - 3300, null, null, 1200, 45, false], raw.path![2]] };
    const track = mapTrackResponse(withHole as RawTrackResponse);
    expect(track.path).toHaveLength(2);
  });

  it('treats a null path as an empty track, not a crash', () => {
    const track = mapTrackResponse({ ...raw, path: null });
    expect(track.path).toEqual([]);
    expect(track.startTime).toBe(NOW - 3600);
  });

  it('keeps a null altitude null rather than reading it as sea level', () => {
    const track = mapTrackResponse({
      ...raw,
      path: [[NOW, 48.2, 9.8, null, 44, false]],
    });
    expect(track.path[0].altitude).toBeNull();
  });
});

describe('mapFlightsResponse', () => {
  const flight = (overrides: Partial<RawFlight> = {}): RawFlight => ({
    icao24: '4b1815',
    firstSeen: NOW - 7200,
    lastSeen: NOW - 3600,
    callsign: 'SWR123  ',
    estDepartureAirport: 'LSZH',
    estArrivalAirport: 'EGLL',
    ...overrides,
  });

  it('maps a well-formed row', () => {
    const [mapped] = mapFlightsResponse([flight()]);
    expect(mapped).toEqual({
      icao24: '4b1815',
      callsign: 'SWR123',
      label: 'SWR123',
      firstSeen: NOW - 7200,
      lastSeen: NOW - 3600,
      departureAirport: 'LSZH',
      arrivalAirport: 'EGLL',
    });
  });

  it('falls back to the hex address when no callsign was broadcast', () => {
    const [mapped] = mapFlightsResponse([flight({ callsign: null })]);
    expect(mapped.label).toBe('4B1815');
  });

  it('keeps unattributed airports null instead of inventing one', () => {
    const [mapped] = mapFlightsResponse([flight({ estDepartureAirport: null })]);
    expect(mapped.departureAirport).toBeNull();
  });

  it('sorts the board newest first', () => {
    const rows = mapFlightsResponse([
      flight({ lastSeen: NOW - 9000, icao24: 'aaaaaa' }),
      flight({ lastSeen: NOW - 100, icao24: 'bbbbbb' }),
    ]);
    expect(rows.map((row) => row.icao24)).toEqual(['bbbbbb', 'aaaaaa']);
  });

  it('drops malformed rows rather than rendering half a flight', () => {
    const rows = mapFlightsResponse([flight(), { icao24: null }, 'garbage', null]);
    expect(rows).toHaveLength(1);
  });

  it('treats a non-array payload as an empty board', () => {
    expect(mapFlightsResponse({ error: 'nope' })).toEqual([]);
  });
});
