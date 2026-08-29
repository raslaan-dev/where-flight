# where-flight Development Guide

This document covers how the application is put together, the patterns it
relies on, and how to extend it. For features and screenshots see
[`README.md`](README.md); for testing see [`USER_TESTING.md`](USER_TESTING.md).

## Project Overview

where-flight is an Expo (React Native) application written in TypeScript. It
reads live aircraft positions from the OpenSky Network REST API and renders
them two ways — a MapLibre map inside a WebView, and ordinary accessible React
Native lists — over a single shared state layer.

| | |
| --- | --- |
| **Framework** | React Native 0.81 on Expo SDK 54 |
| **Language** | TypeScript 5.9, strict |
| **Navigation** | expo-router 6 (file-based) |
| **State** | Zustand 5 with `persist` middleware |
| **Storage** | AsyncStorage, plus expo-secure-store for credentials |
| **Testing** | Jest, jest-expo, React Native Testing Library |

---

## Directory Structure

```
where-flight/
├── app.json                     Expo config: icon, splash, plugins
├── package.json                 Dependencies and scripts
├── jest.config.js               jest-expo preset and transform config
├── tsconfig.json                Strict TypeScript, @/* path alias
│
├── docs/
│   ├── accessibility.md         Full accessibility write-up
│   ├── screenshots/             ios/ and android/ evidence
│   └── submission/              Word versions of the testing documents
│
└── src/
    ├── api/opensky/
    │   ├── token.ts             OAuth2 client_credentials, single-flight
    │   ├── client.ts            HTTP layer, timeouts, retry, cost gating
    │   ├── mappers.ts           Raw OpenSky arrays → typed domain objects
    │   ├── costs.ts             Credit cost per request type
    │   ├── errors.ts            ApiError, the error union, the copy table
    │   └── types.ts             Aircraft, AircraftSnapshot, FlightTrack…
    │
    ├── app/                     expo-router routes (file = route)
    │   ├── _layout.tsx          Root stack, hydration gate, error boundary
    │   ├── (tabs)/
    │   │   ├── _layout.tsx      Tab bar, polling controller mounted once
    │   │   ├── index.tsx        Map
    │   │   ├── search.tsx       Search / live list
    │   │   ├── airports.tsx     Arrival and departure boards
    │   │   ├── track.tsx        Tracked flights
    │   │   └── settings.tsx     Preferences and budget meter
    │   └── flight/[icao24].tsx  Flight detail
    │
    ├── components/ui/           Button, Banner, Text, TextField, Pressable,
    │                            Screen, Section, SegmentedControl, states
    ├── components/error-boundary.tsx
    │
    ├── features/
    │   ├── map/                 flight-map, use-map-bridge, protocol, diff,
    │   │                        trail, offline-radar, map-controls,
    │   │                        selection-card, trail-control
    │   ├── flights/             aircraft-list-item, followed-list-item,
    │   │                        use-polling-controller, freshness,
    │   │                        altitude-ribbon, route-line, track-summary
    │   └── settings/            account-section, budget-meter
    │
    ├── stores/                  One Zustand slice per concern
    ├── theme/                   palette, tokens, contrast, cvd, provider
    └── lib/                     Pure logic — no React imports at all
```

The rule that keeps this maintainable: **`lib/` and `api/` never import
React**. Everything in them is a plain function, which is why most of the test
suite runs without rendering anything.

---

## Key Architectural Patterns

### 1. Zustand stores, one per concern

Each store owns its own state, actions and persistence config. Components
subscribe with selectors, so a component reading `state.status` does not
re-render when a position changes.

```ts
// Reading one field — re-renders only when that field changes
const status = useAircraftStore((state) => state.status);

// Reading an action — stable reference, never causes a re-render
const refresh = useAircraftStore((state) => state.refresh);
```

Persistence is declared per store via `partialize`, so only the fields worth
keeping are written:

```ts
persist(creator, {
  name: 'wf.settings',
  version: 1,
  storage: createJSONStorage(() => AsyncStorage),
  partialize: (state) => ({ theme: state.theme, units: state.units }),
})
```

### 2. The hydration gate

Rendering before persisted state is read shows a visible flash — wrong theme,
empty Track tab, a budget of zero that triggers a fetch it should not have
made. `src/stores/hydration.ts` awaits every persisted store, and
`app/_layout.tsx` holds the splash screen until it resolves.

### 3. The map bridge

MapLibre needs a real browser engine, so it runs inside a WebView and the
native side talks to it over a typed message protocol.

* `webview/map-script.ts` builds the page as a single self-contained HTML
  document with the palette baked in. A theme change remounts the WebView with
  a new document rather than mutating a live style.
* `protocol.ts` defines every call in and every message out. Calls are
  serialised with `JSON.stringify` rather than interpolated into source, so a
  callsign containing a quote cannot break the page.
* `diff.ts` computes what changed since the last frame, so a redraw sends only
  moved aircraft rather than the whole set.
* `use-map-bridge.ts` holds the authoritative feature set natively and can
  replay it, because the page is not always there — Android kills WebViews.

Because that page is a JavaScript *string*, the compiler never checks it.
`__tests__/map-script.test.ts` parses every inline script with `new Function`
against all four palettes, so a typo fails a test rather than showing a blank
map on a device.

### 4. Cost gating in the API client

Every request states its cost, and the client refuses before spending:

```ts
const cost = statesRequestCost(bbox);
if (context.remainingCredits < cost) throw new ApiError('BUDGET_EXHAUSTED', …);
if (!context.isOnline) throw new ApiError('OFFLINE', …);
```

The order matters — the two failures that cost nothing to detect are detected
first. `ClientContext` is passed in rather than imported, so the request
pipeline can be tested with no store and no device.

### 5. One polling loop

`use-polling-controller.ts` is mounted once, at the tab layout. A timer per
screen would multiply the daily credit spend by the number of tabs visited. It
stops when the app is backgrounded, offline, or down to its reserve, and backs
off after consecutive failures.

---

## Development Scripts

```bash
# Start the Metro dev server
npx expo start

# Start with the cache cleared — needed after an SDK or dependency change
npx expo start --clear

# Open directly on a platform
npm run ios
npm run android

# Type-check without emitting
npx tsc --noEmit

# Run the test suite
npm test

# Run one suite
npx jest src/features/map

# Check Expo dependency and config health
npx expo-doctor

# Produce a production bundle (verifies the app actually builds)
npx expo export --platform android
```

---

## Styling and the Design System

There is no inline colour anywhere. Everything comes from the theme.

```ts
const { colors, stackedLayout, reduceMotion } = useTheme();
```

**Four palettes** live in `theme/palette.ts`: dark, light, and high-contrast
variants of both. `theme-provider.tsx` picks one from the user's setting merged
with the system appearance and the system high-contrast preference.

**Tokens** (`theme/tokens.ts`) hold spacing, radii, font sizes, and two values
that carry real rules:

* `MIN_TOUCH_TARGET = 48` — the floor enforced by the shared Pressable
* `STACKED_LAYOUT_FONT_SCALE = 1.3` — above this, layouts reflow rather than clip

**Contrast is proven, not asserted.** `theme/contrast.ts` implements the WCAG
relative-luminance formula, and `__tests__/contrast.test.ts` iterates every
foreground/background pair in all four palettes. `theme/cvd.ts` simulates
deuteranopia, protanopia and tritanopia, and the altitude colour ramp is
checked against all three — changing a colour to something pretty but
unreadable fails the build.

---

## Adding a New Tool or Screen

1. **Create the route.** Add a file under `src/app/(tabs)/` for a tab, or
   `src/app/` for a stack screen. The filename is the route.
2. **Register the tab.** Add an entry to the `TABS` array in
   `(tabs)/_layout.tsx` with a name matching the filename. Order in that array
   is tab order — expo-router falls back to alphabetical for anything not
   listed, which is easy to trip over after a rename.
3. **Use `Screen`.** It handles safe areas, the title block and header actions.
4. **Use the UI kit.** `Button`, `Text`, `Banner`, `Section`, `TextField`.
   Never a raw `Pressable` from React Native — the shared one enforces the
   48 dp target.
5. **Handle all three states.** Loading, error and empty each have a component
   in `components/ui/states.tsx`. A blank screen is not an acceptable state.
6. **Put logic in `lib/`.** If it can be a pure function, it should be, so it
   can be tested without rendering.
7. **Write the spoken label.** Any row that groups several values needs one
   `accessibilityLabel` reading as a sentence, not six separate fragments.

### A trap worth knowing

Setting `accessible` on a container **collapses its descendants** into one
element. A button placed inside such a container can be announced but never
pressed. Group text together and keep interactive controls as siblings — this
caught out `Banner`, `ErrorState`, `EmptyState` and the tracked-flight row
during development.

---

## Verification and Testing

The suite is **461 tests across 30 suites**, aimed where the risk actually is
rather than at a coverage number.

| Area | What is covered |
| --- | --- |
| `api/opensky/mappers` | Every odd shape in real OpenSky data — nulls, malformed rows, a 404 that means "nothing happened" |
| `api/opensky/costs` | Credit-cost boundaries by bounding-box area and time window |
| `api/opensky/token` | Single-flight refresh, expiry skew, 401 retry exactly once |
| `stores/budget-store` | UTC-day rollover, reserve, server reconciliation |
| `stores/aircraft-store` | Offline fallback, cache hydration order, trail accumulation |
| `features/map/diff` | Only changed aircraft are sent to the WebView |
| `features/map/map-script` | The WebView page parses, in all four palettes |
| `features/flights/freshness` | Which failure is named, and whether a retry is offered |
| `theme/contrast`, `theme/cvd` | WCAG ratios and colour-vision safety |
| `components/ui/pressable` | The 48 dp touch-target floor |

### A debugging note

Four of five tests in one file once failed with `result.current is not a
function` for no obvious reason. The cause was that this version of React
Native Testing Library's `act()` is **always asynchronous**, and one
un-awaited call leaves React's test environment dirty for every test after it
in the file. The fix was mechanical — await every `act()` — but finding it
meant isolating a minimal reproduction line by line, and reading the library's
own source. Worth remembering that "the test framework is definitely working"
is an assumption, not a fact.

---

## Common Pitfalls

| Symptom | Cause |
| --- | --- |
| Changes not appearing on device | Metro cache. `npx expo start --clear`, and check the port matches |
| Blank map, radar view instead | No WebGL. Common on Android emulators; use a device |
| A tab in the wrong position | Missing from the `TABS` array, so expo-router sorted it alphabetically |
| A button that reads out but cannot be pressed | It is inside a container with `accessible` set |
| Icons missing | `expo-asset` unresolved — it is a peer of `expo-font` and must be installed explicitly |
