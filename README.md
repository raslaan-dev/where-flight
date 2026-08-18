# where-flight

A live flight tracker for the UK and Ireland, built with Expo and React
Native for my UFCF7H-15-3 Mobile Applications practical assessment.

It pulls live aircraft positions from the [OpenSky Network](https://opensky-network.org),
a free public API that anyone can query without paying for anything, and
turns that into something you can actually use on a phone: a map, a
searchable list, per-flight detail pages, a place to keep flights you care
about, and airport arrival/departure boards. It's a "utility app" in the same
spirit as the weather-app suggestion in the brief — one live data source,
several honest ways of looking at it — it just turned out more ambitious than
a five-screen weather app once I got into it.

Two decisions shaped almost everything else in this codebase, so it's worth
saying them up front rather than letting you find out by reading the code:

1. **The map is not the only way to use the app.** A canvas full of moving
   dots means nothing to a screen reader, so from the start I treated the map
   as one of two views over the same data, not the "real" app with an
   accessible mode bolted on afterwards. Everything the map can show — every
   aircraft, every action — also works as a plain accessible list.
2. **OpenSky's free tier is not unlimited, and I wanted the app to be honest
   about that.** Anonymous use gets 400 API credits a day; a free registered
   account gets 4,000. Rather than hide that ceiling, the app budgets it:
   background polling backs off automatically, and anything expensive (flight
   paths, airport boards) sits behind a button that tells you what it costs
   before you press it.

## Getting it running

You don't need an account or an API key for any of this — anonymous mode is
the default and it just works.

```bash
npm install
npx expo start
```

Scan the QR code with [Expo Go](https://expo.dev/go) on your phone. I'd
genuinely recommend a physical device over a simulator/emulator if you can —
the map runs on WebGL inside a WebView, and a lot of emulators either don't
support that properly or run it painfully slowly. The app detects when WebGL
isn't available and drops back to a plain SVG radar view instead of just
showing a blank map, but a real device shows the actual thing.

If you do want to open it directly on a specific platform's tooling:

```bash
npm run ios       # opens in the iOS Simulator (needs Xcode, macOS)
npm run android   # opens in an Android emulator/device (needs Android Studio)
```

To check the project is actually in a working state:

```bash
npx tsc --noEmit   # TypeScript compiles clean
npm test           # 30 suites, 451 tests
npx expo-doctor    # Expo config/dependency health check
```

### A note on the Expo SDK version

The project is pinned to Expo SDK 54, not the newest one. That's deliberate,
not me being behind: Apple hadn't approved a new build of the Expo Go app
past SDK 54 by the time I was building this, so anyone opening the project
in the App Store version of Expo Go — which is how I'd expect a marker to
actually run it — gets stuck if the project targets anything newer. Nothing
in this app needs an SDK 55+ feature, so there was no real cost to staying
on 54, and it means the project just opens for anyone with the ordinary free
app.

## What it does

- **Map** — live aircraft over the UK and Ireland on a MapLibre vector map.
  Aircraft rotate to their actual heading and are coloured by altitude; tap
  one to select it, and it's redrawn larger and in the accent colour (not
  just ringed, so it still reads correctly without colour vision) with a
  trail behind it showing where it's been. If you've connected an OpenSky
  account, that trail can be upgraded to the aircraft's real flown path back
  to take-off, plus its route (e.g. `LHR → DXB`). Native zoom/recentre/
  reset-north buttons sit over the map so nothing depends on a pinch gesture
  working. A **List view** toggle swaps the canvas for the exact same
  aircraft as an accessible list, and if a screen reader is running, list
  view is what you get by default — you're not expected to fight the map
  first.
- **Search** — the same live traffic as a proper list (one sentence per
  aircraft, read out fully rather than as scattered fragments), with
  pull-to-refresh and honest loading/empty/error states. The search box at
  the top searches live aircraft, anything you've tracked, and a bundled
  directory of major airports — all of that is already on the device, so
  searching costs no API credits and works offline.
- **Flight detail** — full telemetry for one aircraft: altitude, speed,
  heading, squawk, position source, all of it. Track or untrack it from
  here, and if you've got an account connected, load its route and altitude
  profile.
- **Track** — flights you've chosen to keep an eye on, stored with their
  last known telemetry so the tab still works with no signal at all. Each
  card has its own "Map" button in the corner to jump straight to that
  flight on the map, separate from tapping the card itself for the full
  detail screen.
- **Airports** — arrival and departure boards for about 40 bundled
  airports. These are by far the most expensive calls OpenSky offers, so
  nothing loads automatically — you pick an airport, see the price, and
  decide. Boards are cached to disk so re-opening one you've already loaded
  costs nothing.
- **Settings** — theme (including two high-contrast palettes), units,
  reduced motion, whether to show grounded aircraft, haptics, connecting an
  OpenSky account, and a budget meter that shows exactly what today's API
  spend has gone on.

## Screenshots

| Map | Search list | Flight detail |
|---|---|---|
| ![Map](docs/screenshots/map.png) | ![Search](docs/screenshots/search.png) | ![Detail](docs/screenshots/detail.png) |

| Airports | Track (offline) | Settings |
|---|---|---|
| ![Airports](docs/screenshots/airports.png) | ![Track](docs/screenshots/track.png) | ![Settings](docs/screenshots/settings.png) |

All six live in [`docs/screenshots/`](docs/screenshots/) under those exact
filenames, because that's what the table above links to. I tested this app
on both platforms the brief asks for — a physical iPhone 11 on iOS 26.3
through Expo Go day to day, and an Android emulator for the Android-specific
bits (the adaptive icon, the predictive back gesture, WebView recovery after
Android kills the process). [`docs/screenshots/README.md`](docs/screenshots/README.md)
has the exact steps for capturing and dropping in a screenshot from either
an iOS device/simulator or an Android device/emulator, since the process
(and where the file lands on your computer afterwards) is different enough
between the two that it's worth writing down properly rather than assuming
it's obvious.

## Technologies used

- **Expo SDK 54** on **React Native 0.81** and **React 19**, written in
  **TypeScript**.
- **expo-router** for file-based navigation — tab bar plus stacked detail
  screens.
- **Zustand** for state management, one small store per concern (aircraft,
  map camera, followed/tracked flights, airports, budget, credentials,
  settings, network status) rather than one giant global store.
- **AsyncStorage** and **expo-secure-store** for persistence — most state
  goes to AsyncStorage via Zustand's `persist` middleware; anything that
  counts as a credential goes to the hardware-backed keystore instead (see
  below).
- The **OpenSky Network REST API** — a free, public, pre-made API — for
  `/states/all` (live positions), `/tracks/all` (flight paths),
  `/flights/aircraft` (routes) and `/flights/arrival` / `/flights/departure`
  (airport boards), with OAuth2 client-credentials auth for anyone who
  connects their own account.
- **MapLibre GL JS**, running inside a `react-native-webview`, talking to
  the native side over a small typed message protocol I wrote for this
  (positions in, taps and viewport changes out).
- **react-native-svg** for the offline radar fallback and the altitude
  ribbon chart on the flight detail screen.
- **@shopify/flash-list** for the long lists (aircraft, tracked flights,
  airport boards).
- **Jest**, **jest-expo** and **@testing-library/react-native** for testing.

## How it's put together

```
src/
  api/opensky/      token manager, HTTP client, response mappers, credit
                     costs, typed errors
  app/               expo-router file-based routes
    (tabs)/          map · search · airports · track · settings
    flight/[icao24]  telemetry + altitude ribbon + route
  components/        a small shared UI kit (Button, Banner, loading/error/
                     empty states, ErrorBoundary, ...)
  features/
    map/             the WebView bridge, GeoJSON diffing, the offline radar
                     fallback, on-screen map controls
    flights/         list rows, the polling controller, the flight-path
                     summary logic
    settings/        the account-connection UI, the budget meter
  stores/            one Zustand slice per concern
  theme/             the four palettes, plus the contrast and colour-vision
                     tests that check they're actually readable
  lib/               plain functions with no React in them — geo maths,
                     formatting, the spoken descriptions for accessibility
```

**How data actually moves.** One polling loop, started once at the tab
layout rather than once per screen, fetches `/states/all` for whatever
viewport is currently on screen. It's debounced and snapped to a coarse grid
so a small pan doesn't trigger a fresh fetch, and it backs off (or stops
outright) when the app is backgrounded, offline, or running low on today's
credit budget. Everything downstream — the map, the list, search — reads
from the one Zustand store that fetch writes to, so there's only ever one
version of "what's currently flying" in the app.

**The map, specifically.** MapLibre needs a real browser engine, so it runs
inside a WebView, and React Native talks to it through a small message
protocol I wrote: position updates go in as a diff (only what changed since
the last frame, not the whole aircraft list every time), and taps/viewport
changes come back out. If Android kills the WebView process in the
background, the bridge notices, remounts it, and replays the last known
state rather than leaving a blank map. If the device can't do WebGL at all,
the app falls back to a native SVG radar showing the same aircraft — you
lose the basemap, not the data.

**Persistence.** Each store only keeps what's actually worth keeping: the
last aircraft snapshot (written to disk on a throttle, not on every poll),
tracked flights with their full last-known telemetry, airport boards,
settings, the day's credit spend, recent searches, the map's last camera
position. Everything waits behind a hydration gate on startup, so the app
never flashes the wrong theme or shows an empty Track tab for a frame before
the real data loads in.

**Errors.** Every API failure gets mapped to one of a handful of known
kinds, each with plain-English copy and something you can actually do about
it (retry, fall back to cached data, go fix your credentials) rather than a
raw error dumped on screen. There are error boundaries at the root of the
app and specifically around the map, so if the WebView crashes, you lose the
map and nothing else — the tab bar and every other screen keep working.

## The credit budget, in detail

| Request | Cost | When it happens |
|---|---|---|
| `/states/all` (viewport) | 1–4, depending on the area shown | automatic background polling |
| `/tracks/all` (flight path) | 4 | on request, needs a connected account |
| `/flights/aircraft` (route) | 8, for a 12-hour window | on request, fetched alongside the path |
| `/flights/arrival` / `/flights/departure` (airport board) | 20, for a 24-hour window | on request |

The airport boards use a full day's window rather than a cheaper couple of
hours, and that's not me being wasteful with your credits — I tried the
cheap version first. OpenSky derives its arrivals data from flights that
have already landed *and been processed*, which lags well behind real time.
I confirmed this by hitting the live API directly with a short window at
Heathrow, Frankfurt and Schiphol and got nothing back every time, while
departures over the exact same window came back fine. A day-long window is
the shortest one that actually answers reliably for both directions.

Today's spend is tracked in a small persisted ledger, keyed to the UTC date
because that's when OpenSky's own daily allowance resets (not midnight
wherever you happen to be), and reconciled against the server's own
rate-limit header when it sends one, since that's a better source of truth
than my own running total. About 10% of the daily allowance is held back so
that even after a day of background polling, tapping something you actually
want to see still works.

## Why there's no API secret anywhere in the app

Settings lets you connect your own OpenSky API client for the higher,
4,000-credit tier. Whatever you type in there goes straight into
**expo-secure-store** — the phone's hardware-backed keystore — and nowhere
else. Not AsyncStorage, not a config file, not a log line.

I thought about just baking a shared API secret into the app so nobody would
need to sign up for anything, but that's not actually possible to do safely.
Anything shipped inside an app — in the source, in `app.config`, in an
`EXPO_PUBLIC_*` env variable — ends up inside the bundle a user's phone
downloads, and a bundle is just a file anyone can unzip and read. A `.env`
file keeps a secret out of the *Git repository*; it does nothing to keep it
out of the *installed app*. The properly correct answer to this, if it were
a real product, is a small server that holds the real credentials and hands
out short-lived tokens instead. That's out of scope for a device-only
coursework app, so letting the user supply and keep their own credentials in
the keystore is the most honest version of this I could build — and
anonymous mode stays the default specifically so that not having an account
is never a barrier to using the app at all.

## Accessibility

I didn't treat this as a checklist to run through at the end — it shaped
some fairly fundamental decisions (the map/list split above is the biggest
one). The full write-up, including a table mapping every map gesture to a
non-gesture equivalent and a manual TalkBack/VoiceOver test script, is in
[docs/accessibility.md](docs/accessibility.md). The short version:

- A working non-visual equivalent to the map, not just "the map has some
  labels on it."
- Every aircraft and flight path has a real spoken sentence describing it —
  a pure function, unit tested, so the same information the chart shows is
  also said out loud.
- A 48dp minimum touch target on every interactive control, enforced by the
  one shared Pressable component in the app and checked by a test, so a
  regression here fails the build rather than getting noticed by a user
  with shaky hands.
- Four colour palettes, including two high-contrast ones, with their
  contrast ratios checked by an actual test against WCAG's numbers rather
  than eyeballed. The altitude colour scale is separately checked against
  three different colour-vision-deficiency simulations, because altitude is
  meaningful information and colour alone can't be the only way to read it.
- Real support for larger text sizes: nothing is disabled that shouldn't be,
  and at large scale the layout actually reflows (the tab bar drops its
  labels down to icons-only, telemetry rows stack) instead of clipping.

## Testing

30 suites, 451 tests, run with jest-expo. I put the effort where the actual
risk was rather than chasing a coverage number: the OpenSky response
mappers (every odd shape I found in the real data — nulls, malformed rows,
a 404 that means "nothing happened" rather than an error), the credit-cost
maths and its UTC-day rollover, the token manager's single-flight refresh
logic, the map's diffing (so a redraw only sends what changed), the spoken
accessibility descriptions, the palette/contrast/colour-vision guarantees
above, the touch-target floor, and the stores' offline fallbacks and cache
eviction.

One thing worth mentioning honestly: I hit a genuinely confusing bug early
on where four out of five tests for the map's viewport hook failed with
"result.current is not a function" for no obvious reason. It turned out this
version of React Native Testing Library's `act()` is always asynchronous
under the hood, and an un-awaited call anywhere in the file leaves React's
test environment in a bad state for every test that runs after it. Once I
found that in the library's own source, the fix was mechanical — await every
`act()` — but finding it took isolating the minimal reproduction line by
line, which was a good reminder that "the test framework is definitely
working correctly" is an assumption worth actually checking.

## Known issues, and what I'd add given more time

- OpenSky's coverage is crowdsourced, which means it's genuinely sparse over
  oceans, most of Africa, and a lot of Asia. An empty result there is
  correct, not a bug, and the empty-state text says so rather than just
  showing nothing.
- The map's basemap tiles and the MapLibre library itself load from a CDN
  the first time you open the map — the aircraft data has a proper offline
  story, but the map's visuals don't work from a completely cold start with
  no network at all. It falls back to the radar view in that case.
- Flight paths only work with a connected account — that's OpenSky's
  restriction on that endpoint, not mine, and the app explains that rather
  than just failing silently or throwing a raw error at you.
- The bundled airport directory only covers around 40 major airports with
  proper names attached. Boards for anything else still work, they just
  show the raw ICAO code instead of a city name.
- If I kept going with this: a real backend token broker instead of
  user-supplied keystore credentials, a bigger (or properly geocoded)
  airport directory instead of a hardcoded list, a longer history in the
  budget meter than just today, and letting someone set their own home
  region instead of it being fixed to the UK and Ireland.

## Reflection

This ended up being a bigger build than I expected when I picked "flight
tracker" over something like the suggested expense tracker or weather app,
mostly because the two constraints I set myself — accessibility as a first
design decision rather than a pass at the end, and actually respecting
OpenSky's free-tier limits instead of pretending they don't exist — both
turned out to touch nearly every screen rather than living in one place.

A few concrete things I learned building this. First, that platform
constraints outside your own code can genuinely dictate architecture
decisions — I didn't choose Expo SDK 54 because it's the best version, I
chose it because Apple's App Store review queue for a new Expo Go build was
stuck, and that meant a newer SDK would have been unusable for anyone
running the ordinary free app on a real phone. That's the kind of thing
MO1 asks you to notice about mobile platforms specifically, and it's not
something you'd run into building for the web. Second, that "the docs say
X" is worth checking against the real API rather than trusting blindly —
the airport boards genuinely looked broken with a short time window, and I
only found out why by hitting OpenSky's live endpoints directly and
comparing arrivals against departures over the identical window. Third,
expo-router's tab ordering quietly falls back to alphabetical order for any
route you don't explicitly list — a small thing, but it's exactly the kind
of framework behaviour that only shows up once you've already renamed a
file and wondered why a tab jumped position.

On licensing and best practice specifically: flight data and map tiles here
come from OpenSky, OpenStreetMap and CARTO respectively, all under
non-commercial terms, and their attribution stays visible in the app rather
than in a settings page nobody opens — that felt like the right way to
actually respect a licence rather than just satisfy the letter of it. Same
logic applied to how I handled API credentials: the honest answer for a
device-only app is the phone's own secure keystore, not a shared secret
baked into the bundle, even though the latter would have been less work.

If I were marking this myself, the part I'm least certain about is the
airport data lag — I fixed the specific bug I found, but I can't rule out
OpenSky having other timing quirks I haven't hit yet with the accounts and
regions I tested against.

## Attribution and licence

- Flight data © [The OpenSky Network](https://opensky-network.org), used
  under its [terms](https://opensky-network.org/about/terms-of-use) for
  non-commercial research and education.
- Basemap © [OpenStreetMap](https://www.openstreetmap.org/copyright)
  contributors, © [CARTO](https://carto.com/attributions).

Coursework project, not for commercial use.
