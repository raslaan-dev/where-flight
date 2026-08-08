import { PALETTES } from '@/theme/palette';
import { mapHtml } from '../webview/map-script';

/**
 * The page inside the WebView is a JavaScript *string*, so the compiler never
 * looks at it. A typo there does not fail the build — it fails at runtime, on
 * a device, as a blank map. These tests are the only thing standing between an
 * edit to that file and a silent regression.
 */

function pageOf(palette = PALETTES.dark) {
  return mapHtml({
    palette,
    styleId: 'dark',
    centre: { latitude: 54, longitude: -2 },
    zoom: 5.5,
    motion: true,
  });
}

/** The contents of every inline <script> block, in document order. */
function inlineScripts(html: string): string[] {
  return [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((match) => match[1]);
}

describe('generated page', () => {
  it('emits inline scripts that actually parse', () => {
    const scripts = inlineScripts(pageOf());
    expect(scripts.length).toBeGreaterThanOrEqual(3);

    for (const source of scripts) {
      // `new Function` parses without executing, so nothing here touches the
      // browser globals the script expects at runtime.
      expect(() => new Function(source)).not.toThrow();
    }
  });

  it('parses for every palette, since the colours are interpolated in', () => {
    for (const palette of Object.values(PALETTES)) {
      for (const source of inlineScripts(pageOf(palette))) {
        expect(() => new Function(source)).not.toThrow();
      }
    }
  });

  it('exposes the whole bridge surface the native side injects into', () => {
    const page = pageOf();
    for (const method of [
      'applyDelta',
      'select',
      'setTrail',
      'setMotion',
      'flyTo',
      'zoomBy',
      'resetNorth',
    ]) {
      expect(page).toContain(`${method}: function`);
    }
  });

  it('registers a selected-colour icon for every aircraft shape', () => {
    const page = pageOf();
    expect(page).toContain("addIcon('plane-selected'");
    expect(page).toContain("addIcon('circle-selected'");
    expect(page).toContain("addIcon('ground-selected'");
  });

  it('draws the trail under the aircraft, not over them', () => {
    const page = pageOf();
    // Layer order is paint order in MapLibre, so the trail must be added first.
    expect(page.indexOf("id: 'trail-line'")).toBeLessThan(page.indexOf("id: 'aircraft-dots'"));
    expect(page.indexOf("id: 'trail-line'")).toBeLessThan(page.indexOf("id: 'aircraft-symbols'"));
  });

  it('adds the selected layers last, so the selection sits above nearby traffic', () => {
    const page = pageOf();
    expect(page.indexOf("id: 'aircraft-symbols'")).toBeLessThan(
      page.indexOf("id: 'aircraft-selected-symbol'")
    );
  });

  it('bakes the accent in as the selected colour', () => {
    expect(pageOf(PALETTES.dark)).toContain(PALETTES.dark.accent);
  });
});
