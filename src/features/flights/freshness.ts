import type { ApiErrorKind } from '@/api/opensky/errors';
import { formatRelativeTime } from '@/lib/format';
import type { BannerTone } from '@/components/ui/banner';

/**
 * Decides what to tell the user about the age of what they are looking at.
 *
 * Pure and separate from the component so the rules can be tested directly.
 * The rule that matters: as soon as the data on screen is not live, say so and
 * say how old it is. A tracker showing a twenty-minute-old position with no
 * indication is worse than one that shows nothing.
 */

/** Data older than this stops being "current" and starts being "last known". */
export const STALE_AFTER_SECONDS = 90;

export type Freshness = {
  tone: BannerTone;
  message: string;
} | null;

export type FreshnessInput = {
  isOnline: boolean;
  /** True when the snapshot came off disk rather than the network. */
  fromCache: boolean;
  /** Unix ms of the snapshot on screen, null when there is none. */
  lastLoadedAt: number | null;
  /** The most recent failure, if the last attempt failed. */
  errorKind: ApiErrorKind | null;
  now?: number;
};

export function freshnessBanner({
  isOnline,
  fromCache,
  lastLoadedAt,
  errorKind,
  now = Date.now(),
}: FreshnessInput): Freshness {
  const age = lastLoadedAt === null ? null : formatRelativeTime((now - lastLoadedAt) / 1000);

  if (!isOnline) {
    return {
      tone: 'warn',
      message:
        age === null
          ? 'No connection. Nothing has been downloaded yet, so there is nothing to show.'
          : `No connection. Showing the last positions received, from ${age}.`,
    };
  }

  // A failure with data behind it is a banner, not a takeover: the old
  // positions are still the best answer available.
  if (errorKind !== null && age !== null) {
    return { tone: 'danger', message: `Could not refresh. Showing positions from ${age}.` };
  }

  if (fromCache && age !== null) {
    return { tone: 'info', message: `Showing saved positions from ${age}. Refreshing…` };
  }

  const ageSeconds = lastLoadedAt === null ? null : (now - lastLoadedAt) / 1000;
  if (ageSeconds !== null && ageSeconds > STALE_AFTER_SECONDS) {
    return { tone: 'warn', message: `These positions are from ${age}.` };
  }

  return null;
}
