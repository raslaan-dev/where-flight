import { bboxArea, type Bbox } from '@/lib/geo';

/**
 * OpenSky's published pricing for `/states/all`, in "API credits".
 *
 * Charging by area is why the app quantises the viewport rather than
 * re-requesting on every pixel of pan: a careless implementation burns a day's
 * allowance in a few minutes of map dragging.
 */
export const DAILY_CREDITS_ANONYMOUS = 400;
export const DAILY_CREDITS_AUTHENTICATED = 4000;

/** Area thresholds in square degrees, ascending, paired with their cost. */
const STATES_COST_TIERS: readonly { maxAreaSquareDegrees: number; credits: number }[] = [
  { maxAreaSquareDegrees: 25, credits: 1 },
  { maxAreaSquareDegrees: 100, credits: 2 },
  { maxAreaSquareDegrees: 400, credits: 3 },
  { maxAreaSquareDegrees: Infinity, credits: 4 },
];

/** Credits a `/states/all` call over `bbox` will cost. A null bbox is global. */
export function statesRequestCost(bbox: Bbox | null): number {
  if (bbox === null) return 4;
  const area = bboxArea(bbox);
  return STATES_COST_TIERS.find((tier) => area <= tier.maxAreaSquareDegrees)!.credits;
}

/**
 * Credits a `/flights/*` call will cost.
 *
 * These are priced by how many day-partitions the interval touches and get
 * expensive fast, which is why airport schedules are cached and gated behind
 * an explicit confirmation rather than fetched on scroll.
 */
export function flightsRequestCost(beginUnix: number, endUnix: number): number {
  const SECONDS_PER_DAY = 86400;
  const spanDays = Math.max(0, endUnix - beginUnix) / SECONDS_PER_DAY;
  if (spanDays <= 1 / 24) return 4;
  if (spanDays <= 0.5) return 8;
  if (spanDays <= 1) return 20;
  if (spanDays <= 2) return 40;
  return 960;
}

export function dailyCreditsFor(authenticated: boolean): number {
  return authenticated ? DAILY_CREDITS_AUTHENTICATED : DAILY_CREDITS_ANONYMOUS;
}
