import { forwardRef, useImperativeHandle, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import WebView from 'react-native-webview';

import type { Aircraft } from '@/api/opensky/types';
import type { Bbox, LatLon } from '@/lib/geo';
import { useMapStore } from '@/stores/map-store';
import { useTheme } from '@/theme';

import { useMapBridge } from './use-map-bridge';
import { mapHtml } from './webview/map-script';

export type FlightMapProps = {
  aircraft: readonly Aircraft[];
  pinned: readonly string[];
  includeOnGround: boolean;
  onViewportChange: (bbox: Bbox, centre: LatLon, zoom: number) => void;
};

/** The native control overlay lives outside the map, so it needs a way in. */
export type FlightMapHandle = { send: (script: string) => void };

/**
 * The MapLibre WebView.
 *
 * Hidden from assistive technology entirely. A screen reader that walks into
 * this finds an unlabelled canvas and nothing else, which is worse than finding
 * nothing at all — so the Map screen provides a live status region, native
 * controls and a list toggle beside it, and those are the real interface.
 */
export const FlightMap = forwardRef<FlightMapHandle, FlightMapProps>(function FlightMap(
  { aircraft, pinned, includeOnGround, onViewportChange },
  ref
) {
  const { colors, reduceMotion } = useTheme();
  const mapKey = useMapStore((state) => state.mapKey);
  const styleId = colors.scheme;

  const { webviewRef, onMessage, onProcessLost, send } = useMapBridge({
    aircraft,
    pinned,
    includeOnGround,
    motion: !reduceMotion,
    onViewportChange,
  });

  useImperativeHandle(ref, () => ({ send }), [send]);

  // Rebuilt only when the theme or the remount counter changes: a new `source`
  // reloads the page, and doing that on every render would reload it forever.
  // The camera is read once, at mount, from the persisted store.
  const html = useMemo(
    () =>
      mapHtml({
        palette: colors,
        styleId,
        centre: useMapStore.getState().centre,
        zoom: useMapStore.getState().zoom,
        motion: !reduceMotion,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [colors, styleId, mapKey]
  );

  return (
    <View
      style={[styles.container, { backgroundColor: colors.bgSunken }]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants">
      <WebView
        key={mapKey}
        ref={webviewRef}
        source={{ html, baseUrl: 'https://localhost' }}
        originWhitelist={['https://*']}
        onMessage={onMessage}
        style={styles.webview}
        // The map is the whole point of the surface; a white flash on load is
        // more jarring than the dark background it will settle into.
        containerStyle={{ backgroundColor: colors.bgSunken }}
        javaScriptEnabled
        domStorageEnabled
        // Nothing in this app should ever navigate the WebView away from the
        // document it was given.
        onShouldStartLoadWithRequest={(request) => request.url.startsWith('https://localhost')}
        onRenderProcessGone={onProcessLost}
        onContentProcessDidTerminate={onProcessLost}
        // Media playback and file access have no business being reachable here.
        allowFileAccess={false}
        allowsInlineMediaPlayback={false}
        setSupportMultipleWindows={false}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  container: { flex: 1 },
  webview: { flex: 1, backgroundColor: 'transparent' },
});
