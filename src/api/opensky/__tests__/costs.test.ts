import {
  DAILY_CREDITS_ANONYMOUS,
  DAILY_CREDITS_AUTHENTICATED,
  dailyCreditsFor,
  flightsRequestCost,
  statesRequestCost,
} from '../costs';

/** Builds a square bbox of exactly `area` square degrees, anchored at 0,0. */
function squareOfArea(area: number) {
  const side = Math.sqrt(area);
  return { lamin: 0, lomin: 0, lamax: side, lomax: side };
}

describe('statesRequestCost', () => {
  it('charges the maximum for a global request', () => {
    expect(statesRequestCost(null)).toBe(4);
  });

  it.each([
    [1, 1],
    [25, 1],
    [26, 2],
    [100, 2],
    [101, 3],
    [400, 3],
    [401, 4],
    [10000, 4],
  ])('charges %i square degrees as %i credits', (area, expected) => {
    expect(statesRequestCost(squareOfArea(area))).toBe(expected);
  });

  it('is inclusive at each tier boundary, not exclusive', () => {
    // Off-by-one here silently doubles the cost of the most common viewport.
    expect(statesRequestCost(squareOfArea(25))).toBe(1);
    expect(statesRequestCost(squareOfArea(25.0001))).toBe(2);
  });

  it('costs the same regardless of where on the globe the box sits', () => {
    const north = { lamin: 60, lomin: 0, lamax: 63, lomax: 3 };
    const equator = { lamin: 0, lomin: 0, lamax: 3, lomax: 3 };
    expect(statesRequestCost(north)).toBe(statesRequestCost(equator));
  });
});

describe('flightsRequestCost', () => {
  const HOUR = 3600;
  const DAY = 86400;

  it.each([
    ['an hour', HOUR, 4],
    ['half a day', DAY / 2, 8],
    ['a day', DAY, 20],
    ['two days', DAY * 2, 40],
    ['a week', DAY * 7, 960],
  ])('charges %s as %i credits', (_label, span, expected) => {
    expect(flightsRequestCost(0, span)).toBe(expected);
  });

  it('treats a reversed interval as zero rather than going negative', () => {
    expect(flightsRequestCost(DAY, 0)).toBe(4);
  });

  it('escalates steeply enough to justify gating the airports tab', () => {
    // 960 credits is more than twice the entire anonymous daily allowance.
    expect(flightsRequestCost(0, DAY * 3)).toBeGreaterThan(DAILY_CREDITS_ANONYMOUS * 2);
  });
});

describe('dailyCreditsFor', () => {
  it('gives an authenticated client ten times the anonymous allowance', () => {
    expect(dailyCreditsFor(false)).toBe(DAILY_CREDITS_ANONYMOUS);
    expect(dailyCreditsFor(true)).toBe(DAILY_CREDITS_AUTHENTICATED);
    expect(DAILY_CREDITS_AUTHENTICATED).toBe(DAILY_CREDITS_ANONYMOUS * 10);
  });
});
