import { act, renderHook } from '@testing-library/react-native';

import type { Bbox } from '@/lib/geo';
import { resetAircraftStore, useAircraftStore } from '@/stores/aircraft-store';

import { useViewportBbox } from '../use-viewport-bbox';

const CENTRE = { latitude: 51.5, longitude: -0.1 };

/** A view roughly the size of southern England. */
const VIEW: Bbox = { lamin: 50.9, lomin: -1.4, lamax: 52.1, lomax: 1.2 };

beforeEach(() => {
  resetAircraftStore();
});

afterEach(() => {
  jest.useRealTimers();
});

type Report = (view?: Bbox) => Promise<void>;

async function setup(): Promise<Report> {
  // Mount on real timers — the testing library flushes effects through the
  // microtask queue, and faking that stops `result.current` ever being set.
  // The debounce this test is about is only scheduled later.
  const { result } = await renderHook(() => useViewportBbox());
  jest.useFakeTimers();

  // Every `act` must be awaited: this library's version always wraps the
  // callback in an async function, and dropping the promise leaves React's act
  // environment dirty for the rest of the file.
  return async (view = VIEW) => {
    await act(() => {
      result.current(view, CENTRE, 8);
    });
  };
}

async function settle() {
  await act(() => {
    jest.advanceTimersByTime(500);
  });
}

describe('useViewportBbox', () => {
  it('does not spend a credit until the map has stopped moving', async () => {
    const report = await setup();

    await report();
    expect(useAircraftStore.getState().bbox).toBeNull();

    await settle();
    expect(useAircraftStore.getState().bbox).not.toBeNull();
  });

  it('collapses a whole gesture into one request', async () => {
    const report = await setup();

    // A drag reports moveend repeatedly as the map is flung and settles.
    for (let step = 0; step < 5; step += 1) {
      await report({ ...VIEW, lomin: -1.4 + step, lomax: 1.2 + step });
      await act(() => {
        jest.advanceTimersByTime(100);
      });
    }
    expect(useAircraftStore.getState().bbox).toBeNull();

    await settle();
    expect(useAircraftStore.getState().bbox).not.toBeNull();
  });

  it('pads the box, so a small pan stays inside what has already been fetched', async () => {
    const report = await setup();
    await report();
    await settle();

    const bbox = useAircraftStore.getState().bbox!;
    expect(bbox.lamin).toBeLessThan(VIEW.lamin);
    expect(bbox.lamax).toBeGreaterThan(VIEW.lamax);
  });

  it('snaps to a grid, so a nudge produces the box that is already loaded', async () => {
    const report = await setup();

    await report();
    await settle();
    const first = useAircraftStore.getState().bbox;

    // Moved by a few metres — visually identical, and must not cost anything.
    await report({ ...VIEW, lamin: VIEW.lamin + 0.0001 });
    await settle();

    expect(useAircraftStore.getState().bbox).toBe(first);
  });

  it('does set a new box once the map has genuinely moved somewhere else', async () => {
    const report = await setup();

    await report();
    await settle();
    const first = useAircraftStore.getState().bbox;

    await report({ lamin: 40, lomin: -75, lamax: 42, lomax: -72 });
    await settle();

    expect(useAircraftStore.getState().bbox).not.toBe(first);
  });
});
