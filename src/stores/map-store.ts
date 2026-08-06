import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { LatLon } from '@/lib/geo';
import { DEFAULT_REGION } from '@/lib/regions';

/**
 * Camera, selection and map health.
 *
 * The camera is persisted so relaunching returns to where the user was; the
 * WebView's readiness and the current selection are not, because both describe
 * a component that no longer exists by the next launch.
 */

export type MapStyleId = 'dark' | 'light';

/** Why the map is not showing what it should, when it is not. */
export type MapDegradation =
  /** No WebGL — the OfflineRadar fallback renders instead. */
  | 'unsupported'
  /** MapLibre loaded but tiles will not: real positions on a blank background. */
  | 'no-tiles'
  /** The WebView process died. Remounting is the only recovery. */
  | 'crashed';

export const DEFAULT_ZOOM = 5.5;

export type MapState = {
  centre: LatLon;
  zoom: number;
  styleId: MapStyleId;

  /** The style has loaded, so the GeoJSON source exists and can be written to. */
  isReady: boolean;
  degraded: MapDegradation | null;
  /** Bumped to force a remount after the WebView process is killed. */
  mapKey: number;
  selectedIcao24: string | null;
  /**
   * Whether the Map tab is showing the list instead. Defaults to true when a
   * screen reader is running, since a canvas is of no use to one.
   */
  listMode: boolean;

  setCamera: (centre: LatLon, zoom: number) => void;
  setStyleId: (styleId: MapStyleId) => void;
  setReady: (isReady: boolean) => void;
  setDegraded: (degraded: MapDegradation | null) => void;
  remount: () => void;
  select: (icao24: string | null) => void;
  setListMode: (listMode: boolean) => void;
};

const INITIAL = {
  centre: DEFAULT_REGION.centre,
  zoom: DEFAULT_ZOOM,
  styleId: 'dark' as MapStyleId,
  isReady: false,
  degraded: null,
  mapKey: 0,
  selectedIcao24: null,
  listMode: false,
};

export const useMapStore = create<MapState>()(
  persist(
    (set) => ({
      ...INITIAL,

      setCamera: (centre, zoom) => set({ centre, zoom }),
      setStyleId: (styleId) => set({ styleId }),
      setReady: (isReady) => set({ isReady }),
      setDegraded: (degraded) => set({ degraded }),
      // A remount starts a fresh WebView, so nothing has loaded in it yet.
      remount: () => set((state) => ({ mapKey: state.mapKey + 1, isReady: false })),
      select: (selectedIcao24) => set({ selectedIcao24 }),
      setListMode: (listMode) => set({ listMode }),
    }),
    {
      name: 'wf.map',
      version: 1,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        centre: state.centre,
        zoom: state.zoom,
        styleId: state.styleId,
      }),
    }
  )
);

/** Test helper: puts the store back to a first-launch state. */
export function resetMapStore(): void {
  useMapStore.setState(INITIAL);
}
