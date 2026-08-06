import { useEffect, useRef, useState } from 'react';

/**
 * Emits at most one change per interval, keeping the most recent value.
 *
 * Written for the map's live region. An `accessibilityLiveRegion` that updates
 * every fifteen seconds interrupts a screen reader mid-sentence, over and over,
 * which is worse than not announcing at all.
 */
export function useThrottledValue<T>(value: T, intervalMs: number): T {
  const [shown, setShown] = useState(value);
  const lastEmittedAt = useRef(Date.now());
  const latest = useRef(value);
  latest.current = value;

  useEffect(() => {
    if (value === shown) return;
    const wait = Math.max(0, intervalMs - (Date.now() - lastEmittedAt.current));
    const timer = setTimeout(() => {
      lastEmittedAt.current = Date.now();
      setShown(latest.current);
    }, wait);
    return () => clearTimeout(timer);
  }, [value, shown, intervalMs]);

  return shown;
}
