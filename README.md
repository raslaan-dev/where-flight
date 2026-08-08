# where-flight

A live flight tracker built on the [OpenSky Network](https://opensky-network.org)
API — designed around two ideas most flight trackers ignore:

1. **The map is a visualisation, not the interface.** Every aircraft, every
   action and every piece of telemetry is reachable through fully accessible
   native screens. The map is one of two renderers over the same state.
2. **API credits are the user's money.** OpenSky gives 400 free credits a day.
   The app budgets them: polling adapts to what is left, expensive requests
   show their price on the button before they run, and everything fetched is
   cached so a second look is free.

Built with Expo (React Native + TypeScript) for UFCF7H-15-3 Mobile
Applications.

## Screenshots

| Map | Live list | Flight detail |
|---|---|---|
| ![Map](docs/screenshots/map.png) | ![Live](docs/screenshots/live.png) | ![Detail](docs/screenshots/detail.png) |

| Airports | Saved (offline) | Settings |
|---|---|---|
| ![Airports](docs/screenshots/airports.png) | ![Saved](docs/screenshots/saved.png) | ![Settings](docs/screenshots/settings.png) |

## Running it

No configuration is needed — the app works anonymously out of the box.

```bash
npm install
npx expo start
```

Scan the QR code with [Expo Go](https://expo.dev/go) on a physical device
(recommended — many emulators lack the WebGL the map uses; the app detects
this and falls back to a native radar view).

Checks:

```bash
npx tsc --noEmit   # types
npm test           # 27 suites, 418 tests
npx expo-doctor    # project health
```

### Why Expo SDK 54 and not the latest

Deliberate, not neglect. Apple has not approved a new Expo Go build since
SDK 54, so the App Store version is capped there and every later SDK requires
either a paid Apple Developer account (`eas go`, TestFlight) or a custom
development build to run on a physical iPhone. Pinning to 54 keeps the app
installable on any marker's device with nothing but the free Expo Go app.
Nothing here uses an SDK 55+ API, so the ceiling costs the project nothing.

## Features

- **Map** — live aircraft over the UK on a MapLibre vector map, rendered as a
  single GeoJSON layer (no per-plane DOM nodes), with rotation by heading,
  altitude-coloured markers, tap-to-select, and native zoom/recentre/reset
  controls. Selecting an aircraft recolours and enlarges the aircraft itself,
  and draws its **trail**: free positions observed since launch, or — once the
  full path is fetched — the real trajectory with its take-off point ringed.
  A **List view** toggle swaps it for the same data as a list; with a screen
  reader running, list view is the default.
- **Live** — the same traffic as an accessible list: one spoken sentence per
  aircraft, pull-to-refresh, honest loading/error/empty states.
- **Flight detail** — full telemetry, follow/unfollow, and (with an account)
  the flight's altitude profile drawn from `/tracks` with a spoken summary.
- **Saved** — followed flights persist with their full last-known telemetry,
  so the tab works completely offline with "last seen 14 minutes ago"
  timestamps.
- **Airports** — arrivals and departures for ~40 bundled airports. These are
  OpenSky's most expensive calls, so nothing loads until a button showing the
  credit price is pressed; fetched boards are cached to disk.
- **Search** — one box over live aircraft, followed flights and the airport
  directory. Costs nothing; works offline; remembers recent queries.
- **Settings** — theme (incl. two high-contrast palettes), units, motion,
  on-ground filter, haptics, an OpenSky account connection, and a budget
  meter that receipts every API request.

## Architecture

```
src/
  api/opensky/      token manager, HTTP client, mappers, credit costs, errors
  app/              expo-router file-based routes
    (tabs)/         map · live · saved · airports · settings
    flight/[icao24] telemetry + altitude ribbon
    search          modal over everything the app knows
  components/       themed UI kit (Button, Banner, states, ErrorBoundary…)
  features/
    map/            WebView bridge, GeoJSON diffing, offline radar, controls
    flights/        list items, polling controller, track summary
    settings/       account connection, budget meter
  stores/           zustand slices, each with its own persist config
  theme/            palettes, WCAG contrast + CVD simulation (both tested)
  lib/              pure logic: geo, formatting, spoken descriptions
```

**Data flow.** One polling controller (mounted once, at the tab layout) fetches
`/states/all` for the current viewport — debounced, quantised to a grid so
small pans don't burn credits, and gated on focus, foreground, connectivity
and remaining budget. Results land in a zustand store; the map and every list
render from that same store.

**The map bridge.** The WebView runs MapLibre GL JS; React Native talks to it
over a typed message protocol (positional diffs in, viewport/selection events
out) with a ready handshake, throttled `setData`, and crash recovery — if
Android kills the WebView process, the map remounts and replays its snapshot.
If WebGL is missing entirely, a native SVG radar renders the same aircraft.

**Persistence.** Each store persists exactly what is worth keeping: the last
aircraft snapshot (throttled writes), followed flights with full telemetry,
airport boards, settings, the credit ledger, recent searches, and the map
camera. A hydration gate holds the splash screen until every store is read
back, so the app never flashes the wrong theme or an empty Saved tab.

**Error handling.** Every API failure maps to a typed kind with plain-English
copy and a route forward (retry, view cached, fix credentials) — never a dead
end. Error boundaries sit at the root and around the map specifically, so a
WebView crash degrades one component instead of the app.

## The credit budget

| Request | Cost | Policy |
|---|---|---|
| `/states/all` (viewport) | 1–4 by area | polled automatically, adaptive interval |
| `/tracks/all` (flight path) | 4 | button, price shown, account required |
| `/flights/arrival`/`departure` | 8 for the 2 h window | button, price shown, board cached |

Spend is tracked in a persisted ledger keyed to the UTC day (OpenSky's reset
boundary), reconciled against the server's `X-Rate-Limit-Remaining` header
when present, and 10% is held in reserve so a deliberate tap still works after
polling has spent the rest.

## Why the client secret is not in the app

Settings can connect a personal OpenSky API client for the 4,000-credit tier.
The credentials go into **expo-secure-store** (the hardware-backed
Keychain/Keystore) — never AsyncStorage, never the JS bundle, never a log
line. Shipping a shared secret inside the app (in code, `app.config`, or an
`EXPO_PUBLIC_*` variable) would be extractable in minutes; a `.env` file
protects the *repository*, not the *installed app*. The production-correct
design is a server-side token broker; for a device-local coursework app,
user-supplied credentials in the keystore are the honest ceiling — and
anonymous mode remains the zero-config default so the app runs with no setup.

## Accessibility

Accessibility is the app's organising principle, not a checklist item — the
full write-up, including the gesture→equivalent table and the manual
TalkBack/VoiceOver checklist, is in
[docs/accessibility.md](docs/accessibility.md). Highlights:

- Screen-reader-first map alternative (list view, live announcements, named
  controls instead of gestures).
- Pure, unit-tested spoken descriptions for every aircraft and flight path.
- A 48 dp touch-target floor enforced by the shared Pressable *and by a test*.
- Four palettes with WCAG ratios asserted in tests; the altitude ramp is
  verified against three colour-vision-deficiency simulations.
- Full dynamic-type support: at 130%+ scale the tab bar, rows and grids
  genuinely re-lay-out rather than clipping.

## Testing

418 tests across 27 suites (jest-expo), aimed where the risk is: the OpenSky
mappers (every documented data quirk), credit-cost boundaries, UTC budget
rollover, the token manager's single-flight refresh, geo maths, map diffing,
spoken descriptions, palette contrast/CVD guarantees, the 48 dp floor, and
store behaviour including offline fallbacks and cache eviction.

## Known limitations

- OpenSky coverage is crowdsourced: sparse over oceans, Africa and much of
  Asia. Empty results in those regions are correct, and the empty-state copy
  says so.
- MapLibre GL JS loads from a CDN on first map use; without any network the
  map falls back to cached tiles or the radar view (aircraft data itself
  follows the app's offline story).
- Flight paths (`/tracks`) are only available to authenticated accounts —
  OpenSky's restriction, explained in-app rather than hidden.
- The bundled airport directory covers ~40 major airports; arbitrary ICAO
  codes still render on boards, just without friendly names.

## Attribution & licence

- Flight data: © [The OpenSky Network](https://opensky-network.org), used
  under its [terms](https://opensky-network.org/about/terms-of-use) for
  non-commercial research and education.
- Basemap: © [OpenStreetMap](https://www.openstreetmap.org/copyright)
  contributors, © [CARTO](https://carto.com/attributions) (attribution is kept
  visible on the map).

Coursework project — not for commercial use.
