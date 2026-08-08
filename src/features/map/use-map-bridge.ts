import { useCallback, useEffect, useRef } from 'react';
import type WebView from 'react-native-webview';
import type { WebViewMessageEvent } from 'react-native-webview';

import type { Aircraft } from '@/api/opensky/types';
import { clampBbox, type Bbox, type LatLon } from '@/lib/geo';
import { hapticSelect } from '@/lib/haptics';
import { useAircraftStore } from '@/stores/aircraft-store';
import { useMapStore } from '@/stores/map-store';
import { cachedTrack, useTrackStore } from '@/stores/track-store';

import {
  buildFeatures,
  diffFeatures,
  fullDelta,
  isEmptyDelta,
  type FeatureSet,
} from './diff';
import { inject, parseOutbound } from './protocol';
import { buildTrail } from './trail';

/**
 * Keeps the WebView's copy of the world in step with the store.
 *
 * The one thing this has to get right is that the page is not always there to
 * be talked to. It has not loaded yet, or it has just been killed by Android
 * and remounted with an empty source. So the hook holds the authoritative
 * feature set on the native side and can always replay it, rather than
 * assuming an injection landed.
 */

export type MapBridgeOptions = {
  aircraft: readonly Aircraft[];
  /** Kept regardless of the feature cap: selected and followed flights. */
  pinned: readonly string[];
  includeOnGround: boolean;
  motion: boolean;
  onViewportChange: (bbox: Bbox, centre: LatLon, zoom: number) => void;
};

export function useMapBridge({
  aircraft,
  pinned,
  includeOnGround,
  motion,
  onViewportChange,
}: MapBridgeOptions) {
  const webviewRef = useRef<WebView | null>(null);
  /** What the page is believed to be showing. Empty until it says it is ready. */
  const rendered = useRef<FeatureSet>(new Map());

  const isReady = useMapStore((state) => state.isReady);
  const mapKey = useMapStore((state) => state.mapKey);
  const centre = useMapStore((state) => state.centre);
  const selectedIcao24 = useMapStore((state) => state.selectedIcao24);
  const trails = useAircraftStore((state) => state.trails);
  const selectedTrack = useTrackStore((state) =>
    selectedIcao24 === null ? null : cachedTrack(state, selectedIcao24)
  );

  const send = useCallback((script: string) => {
    webviewRef.current?.injectJavaScript(script);
  }, []);

  // The page starts empty on every mount, so the record of what it is showing
  // has to start empty too — otherwise the first diff sends nothing and the
  // map stays blank until every aircraft happens to move.
  useEffect(() => {
    rendered.current = new Map();
  }, [mapKey]);

  useEffect(() => {
    if (!isReady) return;

    const next = buildFeatures(aircraft, {
      pinned,
      includeOnGround,
      centre,
    });
    const delta =
      rendered.current.size === 0 ? fullDelta(next) : diffFeatures(rendered.current, next);
    rendered.current = next;

    if (!isEmptyDelta(delta)) send(inject.applyDelta(delta));
    // `centre` is deliberately not a dependency: it changes on every pan, and
    // re-running then would rebuild the whole set mid-gesture. It is read for
    // prioritisation only, and the next snapshot picks up the new value.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aircraft, pinned, includeOnGround, isReady, send]);

  useEffect(() => {
    if (isReady) send(inject.select(selectedIcao24));
  }, [selectedIcao24, isReady, send]);

  // The trail follows the selection, and upgrades itself the moment a real
  // track lands in the store — which is why it watches the cache rather than
  // being pushed once at selection time.
  useEffect(() => {
    if (!isReady) return;
    if (selectedIcao24 === null) {
      send(inject.setTrail(null));
      return;
    }
    send(
      inject.setTrail(
        buildTrail({ track: selectedTrack, observed: trails[selectedIcao24] })
      )
    );
  }, [selectedIcao24, selectedTrack, trails, isReady, send]);

  useEffect(() => {
    if (isReady) send(inject.setMotion(motion));
  }, [motion, isReady, send]);

  const onMessage = useCallback(
    (event: WebViewMessageEvent) => {
      const message = parseOutbound(event.nativeEvent.data);
      if (message === null) return;

      const store = useMapStore.getState();
      switch (message.type) {
        case 'ready':
          store.setReady(true);
          store.setDegraded(null);
          break;
        case 'viewport':
          store.setCamera(message.centre, message.zoom);
          onViewportChange(
            clampBbox({
              lamin: message.lamin,
              lomin: message.lomin,
              lamax: message.lamax,
              lomax: message.lomax,
            }),
            message.centre,
            message.zoom
          );
          break;
        case 'select':
          // A canvas gives no press feedback of its own, so selection is the
          // one map interaction that earns a haptic.
          hapticSelect();
          store.select(message.icao24);
          break;
        case 'deselect':
          store.select(null);
          break;
        case 'unsupported':
          store.setDegraded('unsupported');
          break;
        case 'degraded':
          store.setDegraded('no-tiles');
          break;
        case 'error':
        case 'log':
          if (__DEV__) console.warn(`[map] ${message.message}`);
          break;
      }
    },
    [onViewportChange]
  );

  /**
   * Android kills WebViews under memory pressure and iOS terminates the content
   * process. Without this the map is a permanently white rectangle with no
   * error anywhere — the remount and replay are the whole recovery.
   */
  const onProcessLost = useCallback(() => {
    rendered.current = new Map();
    useMapStore.getState().remount();
  }, []);

  return { webviewRef, onMessage, onProcessLost, send };
}
