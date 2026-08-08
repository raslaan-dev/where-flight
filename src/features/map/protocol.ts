/**
 * The contract between React Native and the MapLibre page inside the WebView.
 *
 * Both halves are written in this repo but run in different JavaScript engines
 * with no shared module graph, so nothing enforces that they agree except this
 * file. It is the single place either side may change, and the message builders
 * below are what the native side is expected to call — hand-written
 * `injectJavaScript` strings are how the two drift apart.
 */

import type { FeatureDelta } from './diff';
import type { Trail } from './trail';

/** Messages the WebView posts out to React Native. */
export type OutboundMessage =
  /** The style has finished loading; the GeoJSON source now exists. */
  | { type: 'ready' }
  /** The camera settled. Coordinates are the visible bounds, not the centre. */
  | {
      type: 'viewport';
      lamin: number;
      lomin: number;
      lamax: number;
      lomax: number;
      centre: { latitude: number; longitude: number };
      zoom: number;
    }
  | { type: 'select'; icao24: string }
  | { type: 'deselect' }
  /** Tiles are failing but the map itself is alive. */
  | { type: 'degraded' }
  /** No WebGL. Nothing will ever render here. */
  | { type: 'unsupported' }
  | { type: 'error'; message: string }
  | { type: 'log'; message: string };

/**
 * Anything can post a message to a WebView, including a script on a page that
 * was navigated to unexpectedly. Parse defensively and drop what does not fit.
 */
export function parseOutbound(raw: string): OutboundMessage | null {
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return null;
  }
  if (typeof value !== 'object' || value === null) return null;

  const message = value as { type?: unknown };
  switch (message.type) {
    case 'ready':
    case 'deselect':
    case 'degraded':
    case 'unsupported':
      return { type: message.type };
    case 'select':
      return isString(value, 'icao24') ? (value as OutboundMessage) : null;
    case 'error':
    case 'log':
      return isString(value, 'message') ? (value as OutboundMessage) : null;
    case 'viewport':
      return isViewport(value) ? (value as OutboundMessage) : null;
    default:
      return null;
  }
}

function isString(value: object, key: string): boolean {
  return typeof (value as Record<string, unknown>)[key] === 'string';
}

function isViewport(value: object): boolean {
  const v = value as Record<string, unknown>;
  const centre = v.centre as Record<string, unknown> | undefined;
  return (
    ['lamin', 'lomin', 'lamax', 'lomax', 'zoom'].every((key) => Number.isFinite(v[key])) &&
    typeof centre === 'object' &&
    centre !== null &&
    Number.isFinite(centre.latitude) &&
    Number.isFinite(centre.longitude)
  );
}

/**
 * Calls into the page. Each returns a statement for `injectJavaScript`, which
 * must end in `true;` — without it the return value is marshalled back across
 * the bridge, and on iOS a non-serialisable one throws.
 */
export const inject = {
  applyDelta(delta: FeatureDelta): string {
    return call('applyDelta', delta);
  },
  select(icao24: string | null): string {
    return call('select', icao24);
  },
  /** The line behind the selected aircraft. Null clears it. */
  setTrail(trail: Trail | null): string {
    return call('setTrail', trail);
  },
  /** Off means jump rather than ease, everywhere. */
  setMotion(enabled: boolean): string {
    return call('setMotion', enabled);
  },
  flyTo(latitude: number, longitude: number, zoom?: number): string {
    return call('flyTo', { latitude, longitude, zoom });
  },
  zoomBy(delta: number): string {
    return call('zoomBy', delta);
  },
  resetNorth(): string {
    return call('resetNorth');
  },
};

function call(method: string, ...args: unknown[]): string {
  const encoded = args.map((arg) => JSON.stringify(arg ?? null)).join(',');
  // Guarded: an injection racing a reload would otherwise throw inside the page.
  return `window.__wf && window.__wf.${method}(${encoded}); true;`;
}
