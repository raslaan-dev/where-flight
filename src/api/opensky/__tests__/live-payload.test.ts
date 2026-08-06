import { mapStatesResponse } from '../mappers';
import type { RawStatesResponse } from '../types';

import fixture from './fixtures/states-uk.json';

/**
 * The mapper against a real captured `/states/all` response.
 *
 * The hand-written fixtures in `mappers.test.ts` prove each quirk is handled;
 * this proves the assumptions about the wire format are right in the first
 * place. Notably the live feed sends **17** fields per row, not the 18 the
 * documentation implies — `category` is absent on the anonymous tier — so any
 * mapper that indexed from the end of the array would silently read wrong data.
 */
const CAPTURED = fixture as RawStatesResponse;

describe('a real OpenSky response over the United Kingdom', () => {
  it('sends 17 fields per row, one short of the documented 18', () => {
    const lengths = new Set(CAPTURED.states?.map((row) => row.length));
    expect([...lengths]).toEqual([17]);
  });

  it('maps every row without producing a malformed count', () => {
    const snapshot = mapStatesResponse(CAPTURED);
    expect(snapshot.discarded.malformed).toBe(0);
    expect(snapshot.aircraft.length).toBeGreaterThan(0);
  });

  it('produces no duplicate identifiers', () => {
    const snapshot = mapStatesResponse(CAPTURED);
    const ids = new Set(snapshot.aircraft.map((item) => item.icao24));
    expect(ids.size).toBe(snapshot.aircraft.length);
  });

  it('gives every aircraft a non-empty label, whether or not it broadcasts a callsign', () => {
    const snapshot = mapStatesResponse(CAPTURED);
    expect(snapshot.aircraft.every((item) => item.label.length > 0)).toBe(true);
  });

  it('never reports an altitude for an aircraft on the ground', () => {
    const snapshot = mapStatesResponse(CAPTURED);
    const grounded = snapshot.aircraft.filter((item) => item.onGround);
    expect(grounded.length).toBeGreaterThan(0);
    expect(grounded.every((item) => item.altitude === null)).toBe(true);
  });

  it('gives every aircraft usable coordinates', () => {
    const snapshot = mapStatesResponse(CAPTURED);
    expect(
      snapshot.aircraft.every(
        (item) =>
          item.latitude !== null &&
          item.longitude !== null &&
          Math.abs(item.latitude) <= 90 &&
          Math.abs(item.longitude) <= 180
      )
    ).toBe(true);
  });
});
