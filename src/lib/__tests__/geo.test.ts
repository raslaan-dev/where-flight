import {
  bboxArea,
  bboxCentre,
  bboxContains,
  bboxEquals,
  bearingToCompass,
  clampBbox,
  haversineKm,
  padBbox,
  quantiseBbox,
  type Bbox,
} from '../geo';

const UK: Bbox = { lamin: 49.9, lomin: -8.6, lamax: 59.4, lomax: 1.8 };

describe('clampBbox', () => {
  it('brings out-of-range bounds back inside the valid ranges', () => {
    expect(clampBbox({ lamin: -120, lomin: -400, lamax: 130, lomax: 250 })).toEqual({
      lamin: -90,
      lomin: -180,
      lamax: 90,
      lomax: 180,
    });
  });

  it('swaps inverted bounds so min is always below max', () => {
    // A map dragged past its own origin reports these; OpenSky answers with 400.
    expect(clampBbox({ lamin: 55, lomin: 10, lamax: 50, lomax: -5 })).toEqual({
      lamin: 50,
      lomin: -5,
      lamax: 55,
      lomax: 10,
    });
  });
});

describe('bboxArea', () => {
  it('measures in square degrees, the unit OpenSky prices in', () => {
    expect(bboxArea({ lamin: 0, lomin: 0, lamax: 5, lomax: 5 })).toBe(25);
  });

  it('is zero for a degenerate box', () => {
    expect(bboxArea({ lamin: 10, lomin: 10, lamax: 10, lomax: 10 })).toBe(0);
  });
});

describe('quantiseBbox', () => {
  it('snaps outwards so the request always covers what the user can see', () => {
    const result = quantiseBbox({ lamin: 51.31, lomin: -0.42, lamax: 51.69, lomax: 0.19 }, 0.5);
    expect(result).toEqual({ lamin: 51, lomin: -0.5, lamax: 52, lomax: 0.5 });
  });

  it('collapses small pans onto the same box, which is the point of it', () => {
    const a = quantiseBbox({ lamin: 51.31, lomin: -0.42, lamax: 51.69, lomax: 0.19 });
    const b = quantiseBbox({ lamin: 51.33, lomin: -0.4, lamax: 51.71, lomax: 0.21 });
    expect(bboxEquals(a, b)).toBe(true);
  });

  it('leaves an already-aligned box untouched', () => {
    const aligned: Bbox = { lamin: 51, lomin: -1, lamax: 52, lomax: 0 };
    expect(quantiseBbox(aligned)).toEqual(aligned);
  });

  it('never produces bounds outside the valid ranges', () => {
    const result = quantiseBbox({ lamin: -89.8, lomin: -179.9, lamax: 89.9, lomax: 179.9 });
    expect(result).toEqual({ lamin: -90, lomin: -180, lamax: 90, lomax: 180 });
  });
});

describe('padBbox', () => {
  it('grows every side', () => {
    expect(padBbox({ lamin: 10, lomin: 10, lamax: 20, lomax: 20 }, 1)).toEqual({
      lamin: 9,
      lomin: 9,
      lamax: 21,
      lomax: 21,
    });
  });

  it('clamps rather than overflowing at the poles', () => {
    expect(padBbox({ lamin: 88, lomin: 0, lamax: 89, lomax: 1 }, 5).lamax).toBe(90);
  });
});

describe('bboxEquals', () => {
  it('treats two nulls as equal and a null and a box as not', () => {
    expect(bboxEquals(null, null)).toBe(true);
    expect(bboxEquals(UK, null)).toBe(false);
  });

  it('tolerates floating point drift', () => {
    expect(bboxEquals(UK, { ...UK, lamin: UK.lamin + 1e-9 })).toBe(true);
  });
});

describe('bboxContains', () => {
  it('includes points on the boundary', () => {
    expect(bboxContains(UK, { latitude: 49.9, longitude: -8.6 })).toBe(true);
  });

  it('excludes points outside', () => {
    expect(bboxContains(UK, { latitude: 40, longitude: 0 })).toBe(false);
  });
});

describe('bboxCentre', () => {
  it('returns the midpoint', () => {
    expect(bboxCentre({ lamin: 50, lomin: -10, lamax: 60, lomax: 10 })).toEqual({
      latitude: 55,
      longitude: 0,
    });
  });
});

describe('haversineKm', () => {
  it('is zero for a point against itself', () => {
    expect(haversineKm({ latitude: 51.5, longitude: 0 }, { latitude: 51.5, longitude: 0 })).toBe(0);
  });

  it('matches the known London to Paris great-circle distance', () => {
    const distance = haversineKm(
      { latitude: 51.5074, longitude: -0.1278 },
      { latitude: 48.8566, longitude: 2.3522 }
    );
    expect(distance).toBeGreaterThan(340);
    expect(distance).toBeLessThan(346);
  });

  it('treats points either side of the antimeridian as close together', () => {
    // Naive maths puts these most of the way around the planet.
    const distance = haversineKm(
      { latitude: 0, longitude: 179.5 },
      { latitude: 0, longitude: -179.5 }
    );
    expect(distance).toBeLessThan(120);
  });

  it('is symmetric', () => {
    const a = { latitude: 10, longitude: 20 };
    const b = { latitude: -30, longitude: 100 };
    expect(haversineKm(a, b)).toBeCloseTo(haversineKm(b, a), 6);
  });
});

describe('bearingToCompass', () => {
  it.each([
    [0, 'north'],
    [45, 'north-east'],
    [90, 'east'],
    [135, 'south-east'],
    [180, 'south'],
    [225, 'south-west'],
    [270, 'west'],
    [315, 'north-west'],
    [360, 'north'],
  ])('maps %i degrees to %s', (degrees, expected) => {
    expect(bearingToCompass(degrees)).toBe(expected);
  });

  it('rounds to the nearest point, switching at the 22.5 degree midpoint', () => {
    expect(bearingToCompass(22)).toBe('north');
    expect(bearingToCompass(23)).toBe('north-east');
    expect(bearingToCompass(47)).toBe('north-east');
    expect(bearingToCompass(67)).toBe('north-east');
    expect(bearingToCompass(68)).toBe('east');
  });

  it('normalises negative and over-wrapped bearings', () => {
    expect(bearingToCompass(-90)).toBe('west');
    expect(bearingToCompass(450)).toBe('east');
  });
});
