import { useCallback, useEffect, useRef } from 'react';

import { bboxArea, bboxEquals, padBbox, quantiseBbox, type Bbox, type LatLon } from '@/lib/geo';
import { useAircraftStore } from '@/stores/aircraft-store';

/**
 * Turns map movement into API requests, as rarely as possible.
 *
 * OpenSky charges by area, so the naive wiring — set the bbox on every
 * `moveend` — spends a day's allowance in a few minutes of idle panning. Three
 * things prevent that: a debounce so a flick counts once, a quantisation grid
 * so a nudge produces the same box as before, and padding so small pans stay
 * inside the box already fetched.
 */

const DEBOUNCE_MS = 500;

/** Grid step in degrees, by how zoomed out the view is. */
function stepForArea(areaSquareDegrees: number): number {
  if (areaSquareDegrees < 4) return 0.1;
  if (areaSquareDegrees < 50) return 0.5;
  return 1;
}

export function useViewportBbox() {
  const setBbox = useAircraftStore((state) => state.setBbox);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => () => clearTimeout(timer.current), []);

  return useCallback(
    (visible: Bbox, _centre: LatLon, _zoom: number) => {
      clearTimeout(timer.current);
      timer.current = setTimeout(() => {
        // Pad first, then snap: padding an already-snapped box would drift it
        // off the grid and defeat the point.
        const padded = padBbox(visible, 0.2);
        const next = quantiseBbox(padded, stepForArea(bboxArea(padded)));
        if (!bboxEquals(useAircraftStore.getState().bbox, next)) setBbox(next);
      }, DEBOUNCE_MS);
    },
    [setBbox]
  );
}
