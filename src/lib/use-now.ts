import { useEffect, useState } from 'react';

/**
 * A clock that re-renders on an interval.
 *
 * Relative timestamps ("last seen 4 minutes ago") are wrong the moment they are
 * rendered unless something makes them tick. One timer per screen, shared by
 * every row, is far cheaper than a timer per row.
 */
export function useNow(intervalMs = 30_000): number {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(timer);
  }, [intervalMs]);

  return now;
}
