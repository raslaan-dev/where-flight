import { ERROR_COPY, type ApiErrorKind } from '@/api/opensky/errors';
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

/**
 * Failures where issuing the very same request again could plausibly work.
 *
 * Listed explicitly rather than derived from ERROR_COPY's `primaryAction`,
 * which is a different question: BUDGET_EXHAUSTED offers "Open settings", but
 * a retry with no credits left fails identically, and AUTH_INVALID offers the
 * same while the rejected credentials stay rejected. Retrying rate limiting
 * actively makes it worse.
 */
const RETRYABLE = new Set<ApiErrorKind>(['TIMEOUT', 'SERVER', 'BAD_PAYLOAD']);

/**
 * Failures that are not the app breaking: they clear up on their own, or need
 * a decision in Settings. Shown amber rather than red, so a red banner keeps
 * meaning "something is actually wrong".
 */
const SELF_RESOLVING = new Set<ApiErrorKind>(['RATE_LIMITED', 'BUDGET_EXHAUSTED']);

export type Freshness = {
  tone: BannerTone;
  message: string;
  /**
   * False when pressing retry cannot help — being rate limited, or having
   * spent the day's allowance. Offering a button that makes things worse is
   * worse than offering none.
   */
  canRetry: boolean;
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
      canRetry: false,
    };
  }

  // A failure with data behind it is a banner, not a takeover: the old
  // positions are still the best answer available.
  //
  // The banner names the actual failure rather than saying "could not
  // refresh". The app already knows exactly which of the eight kinds it hit
  // and has plain-English copy for each; collapsing them all into one generic
  // sentence threw that away and left the user guessing whether the problem
  // was their account, their allowance, their signal, or OpenSky itself.
  if (errorKind !== null && age !== null) {
    return {
      tone: SELF_RESOLVING.has(errorKind) ? 'warn' : 'danger',
      message: `${ERROR_COPY[errorKind].title}. Showing positions from ${age}.`,
      canRetry: RETRYABLE.has(errorKind),
    };
  }

  if (fromCache && age !== null) {
    return {
      tone: 'info',
      message: `Showing saved positions from ${age}. Refreshing…`,
      canRetry: false,
    };
  }

  const ageSeconds = lastLoadedAt === null ? null : (now - lastLoadedAt) / 1000;
  if (ageSeconds !== null && ageSeconds > STALE_AFTER_SECONDS) {
    return { tone: 'warn', message: `These positions are from ${age}.`, canRetry: true };
  }

  return null;
}
