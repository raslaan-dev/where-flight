# Accessibility

The organising principle: **the map is a visualisation, not the interface.**
Every piece of information and every action in this app is reachable without a
single map gesture, without colour vision, and without sight.

This document explains each decision, where it lives in the code, and how it
was verified.

## The map has a full non-visual equivalent

A WebGL canvas is an unlabelled black box to a screen reader. Rather than
sprinkling labels onto something fundamentally visual, the app treats the map
as one of two renderers over the same store:

- The WebView is hidden from assistive tech (`accessibilityElementsHidden`,
  `importantForAccessibility="no-hide-descendants"` in
  `src/features/map/flight-map.tsx`), so a screen reader never wanders into an
  unlabelled canvas.
- A **List view** toggle in the Map tab header swaps the map for the same
  aircraft, from the same store, as an accessible list — and the **Live tab**
  is that list as a first-class screen.
- When a screen reader is running, the Map tab **defaults to list view**
  (`src/app/(tabs)/index.tsx`), so the first experience is usable, not a
  recovery.
- A **polite live region** announces "142 aircraft in view, updated 8 seconds
  ago", throttled to one announcement per 20 seconds so it informs rather than
  interrupts.
- If WebGL is unavailable, `OfflineRadar` (`src/features/map/offline-radar.tsx`)
  renders the same snapshot as a native SVG plot — no network, no canvas.

### Gesture → equivalent

Screen-reader users navigate by *place and name*, not by dragging, so each
gesture maps to a named control, not a nudge:

| Map gesture | Non-gesture equivalent |
|---|---|
| Pinch to zoom | Zoom in / Zoom out buttons (native, labelled) |
| Drag to pan | Region is a named choice; airport search jumps by place |
| Rotate | Reset north button |
| Tap an aircraft | The same aircraft as a row in List view / Live tab |
| Read a marker | `describeAircraft()` spoken sentence on every row |
| Tap an airport | Airports tab search — type a city, name or code |

## Everything is described in sentences, not fragments

- `describeAircraft()` (`src/lib/describe-aircraft.ts`) is a pure, unit-tested
  function producing one sentence: *"BAW117. Altitude 11,300 feet, climbing.
  Speed 452 knots. Heading north-east. Last seen 12 seconds ago."* Nulls become
  "unknown", never "zero" — an aircraft with no altitude is not at sea level.
  ICAO hex codes are spelled out character by character for TalkBack.
- Rows set `accessible` on the wrapper so they read as **one focus stop**, not
  six disconnected fragments (`aircraft-list-item.tsx`, airport board rows).
- The altitude ribbon on the flight detail screen hides its SVG and instead
  speaks `describeTrack()` (`src/features/flights/track-summary.ts`): duration,
  peak altitude, and current trend — the same information the line shows.
- The grouping rule is applied with care: `accessible` collapses descendants,
  so **buttons always sit outside grouped text**. `ErrorState`, `EmptyState`
  and `Banner` group their copy but keep their retry/action buttons as separate
  focusable elements — otherwise "Try again" could be heard but never pressed.

## Touch targets

`src/components/ui/pressable.tsx` enforces a **48dp floor** on every
interactive element — the strictest of WCAG 2.2 (24px), Android (48dp) and
Apple (44pt) — via `minWidth`/`minHeight` plus computed `hitSlop` when the
visual is smaller. `src/components/ui/__tests__/pressable.test.tsx` asserts it,
so a regression fails CI rather than a fingertip.

## Text scales, layout adapts

- `allowFontScaling` is never disabled anywhere in the app.
- Heights are never fixed on anything containing text — buttons and fields use
  padding + `minHeight`, so 200% text grows the control instead of clipping.
- At `fontScale ≥ 1.3` the theme exposes `stackedLayout` and screens actually
  change: the tab bar goes icon-only (with explicit
  `tabBarAccessibilityLabel`s, since the visible labels are gone), telemetry
  rows stack vertically, and data rows wrap instead of truncating.

## Colour is never the only channel

- Four palettes: dark, light, and high-contrast variants of both (≥7:1 for
  body text), selected in Settings or inherited from the system.
- The altitude ramp is **cividis-derived** — monotonic in lightness — so it
  survives deuteranopia, protanopia, tritanopia and greyscale. Altitude is also
  carried by a text badge; vertical trend by ▲/▼ glyphs plus words; on-ground
  status by shape and the word "On ground".
- Banner tone is carried by a glyph (ℹ/⚠) as well as colour.

Two test suites make this **verifiable rather than asserted**:

- `src/theme/__tests__/contrast.test.ts` iterates every foreground/background
  pair in all four palettes and asserts WCAG ratios.
- `src/theme/__tests__/cvd.test.ts` runs every altitude-ramp stop through
  deuteranope/protanope/tritanope simulation matrices and asserts adjacent
  stops remain distinguishable.

## Motion

`useTheme().reduceMotion` merges the system setting with a three-way override
in Settings. When reduced: the map uses `jumpTo` instead of `flyTo`, symbol
fades are zeroed (`__wf.setMotion(false)` pushed into the WebView), and
loading states are static instead of animated.

## Forms and controls

- `TextField` makes `accessibilityLabel` **required at the type level** — an
  unlabelled edit box cannot compile.
- `SegmentedControl` exposes radio-group semantics with per-option labels
  (including expansions like "Aviation: feet and knots").
- Switches, buttons and links carry roles, labels, hints where the label alone
  is ambiguous, and `accessibilityState` for disabled/selected.
- Search result counts and schedule boards announce changes through polite
  live regions; errors use `accessibilityRole="alert"`.

## Loading, error and empty states

Every data screen renders one of three shared components
(`src/components/ui/states.tsx`) rather than a blank view. Spinners are
announced as `progressbar` with a label. Every error state names a way
forward — retry, view cached data, or fix credentials — and empty regions say
*why* they are empty ("OpenSky's coverage is crowdsourced and genuinely sparse
here") rather than implying a fault.

## Manual verification checklist

Run on a physical device (TalkBack on Android / VoiceOver on iOS) at 200%
system text:

1. Every tab reachable and announced by name from the tab bar.
2. Map tab opens in list view with the screen reader on; the toggle announces
   its state.
3. Every aircraft row reads as a single sentence; activating it opens details.
4. Flight detail: every data row reads label and value together; hex code is
   spelled out; the track section explains itself before spending credits.
5. Airports: search field is labelled, result count is announced politely,
   board rows read as one sentence each.
6. Error states announce as alerts and the retry button is individually
   focusable and pressable.
7. No text is clipped at 200%; the tab bar shows icons only.
8. High-contrast palettes selected in Settings apply to every screen and
   control; the basemap follows the dark/light choice.
