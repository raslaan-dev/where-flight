import { inject, parseOutbound } from '../protocol';

const VIEWPORT = {
  type: 'viewport',
  lamin: 49,
  lomin: -10,
  lamax: 59,
  lomax: 2,
  centre: { latitude: 54, longitude: -4 },
  zoom: 5.5,
};

describe('parseOutbound', () => {
  it('accepts the messages the page actually sends', () => {
    expect(parseOutbound('{"type":"ready"}')).toEqual({ type: 'ready' });
    expect(parseOutbound('{"type":"select","icao24":"4b1815"}')).toEqual({
      type: 'select',
      icao24: '4b1815',
    });
    expect(parseOutbound(JSON.stringify(VIEWPORT))).toEqual(VIEWPORT);
  });

  it('survives a page that posts something that is not JSON at all', () => {
    // Any script in the WebView can post. A throw here would crash the screen.
    expect(parseOutbound('not json')).toBeNull();
    expect(parseOutbound('')).toBeNull();
    expect(parseOutbound('null')).toBeNull();
  });

  it('rejects messages of an unknown type rather than passing them through', () => {
    expect(parseOutbound('{"type":"navigate","url":"https://example.com"}')).toBeNull();
  });

  it('rejects a message whose payload is the wrong shape', () => {
    expect(parseOutbound('{"type":"select"}')).toBeNull();
    expect(parseOutbound('{"type":"select","icao24":42}')).toBeNull();
    expect(parseOutbound('{"type":"viewport","lamin":49}')).toBeNull();
  });

  it('rejects a viewport with a non-finite bound, which would poison the bbox', () => {
    expect(parseOutbound(JSON.stringify({ ...VIEWPORT, lamax: null }))).toBeNull();
    expect(parseOutbound(JSON.stringify({ ...VIEWPORT, centre: { latitude: 54 } }))).toBeNull();
  });
});

describe('inject', () => {
  it('ends every statement in true, which iOS requires', () => {
    // Returning a value from injectJavaScript throws on iOS when it cannot be
    // marshalled, and the failure is silent on Android.
    [
      inject.applyDelta({ a: [], u: [], d: [] }),
      inject.select('4b1815'),
      inject.select(null),
      inject.setMotion(false),
      inject.flyTo(51.5, -0.1, 9),
      inject.zoomBy(1),
      inject.resetNorth(),
    ].forEach((script) => expect(script.trimEnd().endsWith('true;')).toBe(true));
  });

  it('guards against the page not being there, which happens during a reload', () => {
    expect(inject.resetNorth()).toContain('window.__wf &&');
  });

  it('serialises arguments rather than interpolating them into source', () => {
    const script = inject.select('"); alert(1); ("');
    expect(script).toContain(JSON.stringify('"); alert(1); ("'));
  });

  it('passes a null selection through as null, not as the string undefined', () => {
    expect(inject.select(null)).toContain('select(null)');
  });

  it('sends a trail as a serialised path and source', () => {
    const script = inject.setTrail({
      path: [
        [-0.45, 51.47],
        [-1.2, 52],
      ],
      source: 'track',
    });

    expect(script).toContain('setTrail(');
    expect(script).toContain('[[-0.45,51.47],[-1.2,52]]');
    expect(script).toContain('"source":"track"');
  });

  it('clears the trail with an explicit null', () => {
    expect(inject.setTrail(null)).toContain('setTrail(null)');
  });
});
