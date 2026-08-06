/**
 * The page that runs inside the WebView.
 *
 * Written as one self-contained HTML document with the palette baked in, so
 * the native side never has to reach in and restyle anything: a theme change
 * remounts the WebView with a new document, which is both simpler and less
 * error-prone than mutating a live MapLibre style from the outside.
 *
 * Everything here has to survive being the *second* most important renderer.
 * The Live list shows the same data natively, so this file is allowed to fail
 * — but it has to fail loudly, by posting `unsupported` or `degraded`, rather
 * than sitting there white.
 */

import type { Palette } from '@/theme/palette';

/** No API key, no account, free for non-commercial use. */
const STYLE_URLS = {
  dark: 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json',
  light: 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json',
} as const;

const MAPLIBRE_VERSION = '4.7.1';
const MAPLIBRE_JS = `https://unpkg.com/maplibre-gl@${MAPLIBRE_VERSION}/dist/maplibre-gl.js`;
const MAPLIBRE_CSS = `https://unpkg.com/maplibre-gl@${MAPLIBRE_VERSION}/dist/maplibre-gl.css`;

export type MapHtmlOptions = {
  palette: Palette;
  styleId: keyof typeof STYLE_URLS;
  centre: { latitude: number; longitude: number };
  zoom: number;
  /** False disables every camera ease, for users who asked for less motion. */
  motion: boolean;
};

export function mapHtml({ palette, styleId, centre, zoom, motion }: MapHtmlOptions): string {
  const config = JSON.stringify({
    styleUrl: STYLE_URLS[styleId],
    centre,
    zoom,
    motion,
    ramp: palette.altitudeRamp,
    unknown: palette.fgMuted,
    selected: palette.accent,
    emergency: palette.danger,
    outline: palette.scheme === 'dark' ? '#05080D' : '#FFFFFF',
    background: palette.bgSunken,
  });

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no" />
<link rel="stylesheet" href="${MAPLIBRE_CSS}" />
<style>
  html, body, #map { margin: 0; padding: 0; height: 100%; width: 100%; overflow: hidden; }
  body { background: ${palette.bgSunken}; }
  /* Attribution is a licence condition of both CARTO and OpenStreetMap. */
  .maplibregl-ctrl-attrib { font-size: 10px; }
</style>
</head>
<body>
<div id="map"></div>
<script>${BOOTSTRAP}</script>
<script>window.__wfConfig = ${config};</script>
<script>${PAGE_SCRIPT}</script>
<!-- Last, and only now: the parser has already defined __wfStart, which an
     onload firing before this point would not have found. -->
<script src="${MAPLIBRE_JS}" onerror="__wfPost({type:'unsupported'})" onload="__wfStart()"></script>
</body>
</html>`;
}

/**
 * Defined before MapLibre loads so the `onerror` handler above has something to
 * call, and so an early crash is still reportable.
 */
const BOOTSTRAP = /* js */ `
function __wfPost(message) {
  if (window.ReactNativeWebView) {
    window.ReactNativeWebView.postMessage(JSON.stringify(message));
  }
}
window.onerror = function (message) {
  __wfPost({ type: 'error', message: String(message) });
  return true;
};
`;

/**
 * Everything below runs once MapLibre is present. `__wfStart` is called by the
 * script tag's `onload` rather than `DOMContentLoaded`, because the ordering of
 * those two is not guaranteed to be what you want on Android WebView.
 */
const PAGE_SCRIPT = /* js */ `
(function () {
  var config = window.__wfConfig;
  var SOURCE = 'aircraft';
  var FLAG_ON_GROUND = 1;
  var FLAG_EMERGENCY = 2;

  /** id -> positional tuple, mirroring the native side's FeatureSet. */
  var features = new Map();
  var selectedId = null;
  var motion = config.motion;
  var map = null;
  var ready = false;
  var tileErrors = 0;
  var pendingFlush = false;
  var lastFlushAt = 0;
  /** setData is the expensive call; once a second is plenty at these speeds. */
  var FLUSH_INTERVAL_MS = 1000;

  function hasWebgl() {
    try {
      var canvas = document.createElement('canvas');
      return Boolean(canvas.getContext('webgl2') || canvas.getContext('webgl'));
    } catch (error) {
      return false;
    }
  }

  /**
   * Draws one aircraft glyph and registers it as a map image.
   *
   * Pre-colouring one image per altitude band avoids SDF icons, whose
   * recolouring is convenient but blurs the outline that keeps the marker
   * legible against a busy basemap.
   */
  function addIcon(id, colour, shape) {
    var size = 40;
    var canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    var ctx = canvas.getContext('2d');
    ctx.translate(size / 2, size / 2);
    ctx.scale(size / 28, size / 28);
    ctx.translate(-12, -12);

    var path;
    if (shape === 'plane') {
      // Top-down silhouette, nose up: rotation then reads as true track.
      path = new Path2D('M12 2 L14 9 L22 13 L22 15 L14 13 L13.5 19 L16 21 L16 22 L12 21 L8 22 L8 21 L10.5 19 L10 13 L2 15 L2 13 L10 9 Z');
    } else if (shape === 'circle') {
      // Heading unknown: a shape with no front, so nothing is implied.
      path = new Path2D();
      path.arc(12, 12, 7, 0, Math.PI * 2);
    } else {
      // On the ground: hollow, so it reads differently at a glance and in greyscale.
      path = new Path2D();
      path.rect(7, 7, 10, 10);
    }

    ctx.lineJoin = 'round';
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = config.outline;
    ctx.stroke(path);
    if (shape === 'ground') {
      ctx.lineWidth = 2;
      ctx.strokeStyle = colour;
      ctx.stroke(path);
    } else {
      ctx.fillStyle = colour;
      ctx.fill(path);
    }

    var image = ctx.getImageData(0, 0, size, size);
    if (map.hasImage(id)) map.removeImage(id);
    map.addImage(id, image, { pixelRatio: 2 });
  }

  function addIcons() {
    for (var i = 0; i < config.ramp.length; i++) {
      addIcon('plane-' + i, config.ramp[i], 'plane');
      addIcon('circle-' + i, config.ramp[i], 'circle');
    }
    addIcon('plane-unknown', config.unknown, 'plane');
    addIcon('circle-unknown', config.unknown, 'circle');
    addIcon('ground', config.unknown, 'ground');
  }

  /** Expression picking the pre-coloured icon for a feature's band and state. */
  function iconExpression() {
    var match = ['match', ['get', 'band']];
    for (var i = 0; i < config.ramp.length; i++) {
      match.push(i, ['case', ['==', ['get', 'track'], -1], 'circle-' + i, 'plane-' + i]);
    }
    match.push(['case', ['==', ['get', 'track'], -1], 'circle-unknown', 'plane-unknown']);
    return ['case', ['==', ['%', ['get', 'flags'], 2], 1], 'ground', match];
  }

  function colourExpression() {
    var match = ['match', ['get', 'band']];
    for (var i = 0; i < config.ramp.length; i++) match.push(i, config.ramp[i]);
    match.push(config.unknown);
    return match;
  }

  function collection() {
    var list = [];
    features.forEach(function (f) {
      list.push({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [f[1], f[2]] },
        properties: { id: f[0], track: f[3], band: f[4], flags: f[5] },
      });
    });
    return { type: 'FeatureCollection', features: list };
  }

  function flush() {
    pendingFlush = false;
    lastFlushAt = Date.now();
    var source = map && map.getSource(SOURCE);
    if (source) source.setData(collection());
  }

  /** Coalesces bursts into one setData per second, on a frame boundary. */
  function scheduleFlush() {
    if (!ready || pendingFlush) return;
    pendingFlush = true;
    var wait = Math.max(0, FLUSH_INTERVAL_MS - (Date.now() - lastFlushAt));
    setTimeout(function () { requestAnimationFrame(flush); }, wait);
  }

  function addLayers() {
    map.addSource(SOURCE, { type: 'geojson', data: collection() });

    // A halo under the selection, so the choice survives a crowded view.
    map.addLayer({
      id: 'aircraft-selected',
      type: 'circle',
      source: SOURCE,
      filter: ['==', ['get', 'id'], ''],
      paint: {
        'circle-radius': 16,
        'circle-color': config.selected,
        'circle-opacity': 0.25,
        'circle-stroke-width': 2,
        'circle-stroke-color': config.selected,
      },
    });

    map.addLayer({
      id: 'aircraft-emergency',
      type: 'circle',
      source: SOURCE,
      filter: ['>=', ['%', ['floor', ['/', ['get', 'flags'], 2]], 2], 1],
      paint: {
        'circle-radius': 14,
        'circle-color': 'rgba(0,0,0,0)',
        'circle-stroke-width': 3,
        'circle-stroke-color': config.emergency,
      },
    });

    // Zoomed out, individual headings are unreadable and the symbols overlap
    // into mush. Dots carry the density; symbols take over close in.
    map.addLayer({
      id: 'aircraft-dots',
      type: 'circle',
      source: SOURCE,
      maxzoom: 6,
      paint: {
        'circle-radius': 3.5,
        'circle-color': colourExpression(),
        'circle-stroke-width': 1,
        'circle-stroke-color': config.outline,
      },
    });

    map.addLayer({
      id: 'aircraft-symbols',
      type: 'symbol',
      source: SOURCE,
      minzoom: 6,
      layout: {
        'icon-image': iconExpression(),
        'icon-rotate': ['case', ['==', ['get', 'track'], -1], 0, ['get', 'track']],
        'icon-rotation-alignment': 'map',
        // Nothing may be hidden: an aircraft dropped by collision detection is
        // indistinguishable, to the user, from one the app failed to fetch.
        'icon-allow-overlap': true,
        'icon-ignore-placement': true,
        'icon-size': ['interpolate', ['linear'], ['zoom'], 6, 0.6, 11, 1],
      },
    });
  }

  function applySelection() {
    if (!map || !map.getLayer('aircraft-selected')) return;
    map.setFilter('aircraft-selected', ['==', ['get', 'id'], selectedId || '']);
  }

  function reportViewport() {
    var bounds = map.getBounds();
    var centre = map.getCenter();
    __wfPost({
      type: 'viewport',
      lamin: bounds.getSouth(),
      lomin: bounds.getWest(),
      lamax: bounds.getNorth(),
      lomax: bounds.getEast(),
      centre: { latitude: centre.lat, longitude: centre.lng },
      zoom: map.getZoom(),
    });
  }

  function idOf(event) {
    var hit = event.features && event.features[0];
    return hit ? hit.properties.id : null;
  }

  window.__wf = {
    applyDelta: function (delta) {
      if (!delta) return;
      var i;
      for (i = 0; i < delta.a.length; i++) features.set(delta.a[i][0], delta.a[i]);
      for (i = 0; i < delta.u.length; i++) features.set(delta.u[i][0], delta.u[i]);
      for (i = 0; i < delta.d.length; i++) features.delete(delta.d[i]);
      scheduleFlush();
    },
    select: function (id) {
      selectedId = id;
      applySelection();
      var feature = id ? features.get(id) : null;
      if (feature) {
        map.easeTo({ center: [feature[1], feature[2]], duration: motion ? 500 : 0 });
      }
    },
    setMotion: function (enabled) {
      motion = enabled;
    },
    flyTo: function (target) {
      if (!map || !target) return;
      var options = { center: [target.longitude, target.latitude], duration: motion ? 800 : 0 };
      if (typeof target.zoom === 'number') options.zoom = target.zoom;
      map.easeTo(options);
    },
    zoomBy: function (delta) {
      if (map) map.easeTo({ zoom: map.getZoom() + delta, duration: motion ? 250 : 0 });
    },
    resetNorth: function () {
      if (map) map.resetNorth({ duration: motion ? 250 : 0 });
    },
  };

  window.__wfStart = function () {
    if (!hasWebgl()) {
      __wfPost({ type: 'unsupported' });
      return;
    }

    map = new maplibregl.Map({
      container: 'map',
      style: config.styleUrl,
      center: [config.centre.longitude, config.centre.latitude],
      zoom: config.zoom,
      attributionControl: { compact: true },
      // Pitch and rotation have no equivalent native control, and a tilted map
      // is harder to read for no benefit here.
      pitchWithRotate: false,
      dragRotate: false,
      fadeDuration: motion ? 300 : 0,
    });

    map.on('load', function () {
      addIcons();
      addLayers();
      applySelection();
      ready = true;
      flush();
      __wfPost({ type: 'ready' });
      reportViewport();
    });

    map.on('moveend', reportViewport);

    ['aircraft-symbols', 'aircraft-dots'].forEach(function (layer) {
      map.on('click', layer, function (event) {
        var id = idOf(event);
        if (id) {
          event.originalEvent.__wfHandled = true;
          __wfPost({ type: 'select', icao24: id });
        }
      });
    });

    // A tap on empty map means "never mind", which has to reach the native
    // side or the detail sheet stays open over nothing.
    map.on('click', function (event) {
      if (!event.originalEvent.__wfHandled) __wfPost({ type: 'deselect' });
    });

    map.on('error', function (event) {
      // Tile requests fail one by one; a handful is a blip, a stream is an
      // outage worth telling the user about.
      tileErrors += 1;
      if (tileErrors === 8) __wfPost({ type: 'degraded' });
      if (event && event.error && tileErrors < 3) {
        __wfPost({ type: 'log', message: String(event.error.message || event.error) });
      }
    });
  };
})();
`;
