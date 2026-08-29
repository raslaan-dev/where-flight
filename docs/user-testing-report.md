# User Testing Report — where-flight

**Module:** Mobile Applications (UFCF7H-15-3)
**Student Name:** Mohamed Raslaan Najeeb
**App Title:** where-flight — Live Flight Tracker
**Word Count:** ≈ [FILL IN once placeholders are completed — target 1,000–1,500]

> **How to use this document.** Everything about the app itself is already
> written. Anything in **[FILL IN]** needs your real session data, and anything
> marked **[SCREENSHOT]** is a slot for an image you take yourself. Delete this
> box before submitting.

---

## 1. Overview

This report documents the user testing and evaluation of *where-flight*, a live
flight-tracking app I built with React Native and Expo. The app shows aircraft
currently in the air over the UK and Ireland using the OpenSky Network's free
public API, and presents that data four ways: a map, a searchable list, detail
pages for individual flights, and airport arrival/departure boards.

The purpose of testing was to find out whether people could actually complete
the things the app is *for* — finding a specific flight, understanding what
they were looking at, and keeping track of a flight over time — without being
told how. A secondary aim was to check whether two design decisions I made
early on actually worked in practice: that the map should never be the only way
to reach information, and that the app should be openly honest about the API's
daily limits rather than hiding them.

---

## 2. Testing Design & Methodology

### 2.1 Objectives

- Evaluate whether users can find a specific flight without guidance.
- Test whether the tab structure and navigation are intuitive.
- Check that users understand what the altitude colours and trails mean.
- Establish whether the credit-cost buttons are understood or ignored.
- Confirm that tracked flights and cached data genuinely work offline.
- Measure overall satisfaction with the interface on both platforms.

### 2.2 Test Environment

- **Devices:** physical iPhone 11 (iOS 26.3) and an Android emulator
  (Pixel, Android Studio AVD)
- **App Version:** v1.0.0, running through Expo Go (Expo SDK 54)
- **Build:** React Native 0.81, TypeScript, run from the development server
- **Network:** home Wi-Fi, with one task performed deliberately in aeroplane
  mode to test offline behaviour
- **Duration:** [FILL IN — e.g. 20–25 minutes per session]
- **Number of Participants:** [FILL IN — the brief asks for 3–5]

### 2.3 User Personas

| Name | Age / Occupation | Tech Familiarity | Goal | Pain Points |
|---|---|---|---|---|
| [FILL IN] | [FILL IN] | [High / Medium / Low] | [What they wanted from the app] | [What frustrated them] |
| [FILL IN] | [FILL IN] | [High / Medium / Low] | [FILL IN] | [FILL IN] |
| [FILL IN] | [FILL IN] | [High / Medium / Low] | [FILL IN] | [FILL IN] |
| [FILL IN] | [FILL IN] | [High / Medium / Low] | [FILL IN] | [FILL IN] |

> Aim for a spread of technical confidence and of interest in aviation — someone
> who already uses flight trackers will judge this very differently from someone
> who has never opened one.

---

## 3. Test Scenarios and Tasks

Each participant was given these tasks in order, without being shown how to
complete them. Fill in the Result column from what you observed.

| Scenario | Expected Outcome | Result |
|---|---|---|
| Find out how many aircraft are currently in the air nearby | User reaches the Map or Search tab and reads the count | [FILL IN] |
| Select an aircraft on the map and say how high it is flying | Aircraft is highlighted, card appears showing altitude | [FILL IN] |
| Search for a flight by its callsign | Search tab used, matching aircraft found | [FILL IN] |
| Keep a flight so it can be checked later | Flight is tracked and appears in the Track tab | [FILL IN] |
| Return to a tracked flight and see where it is on the map | "Map" button on the tracked card opens the map on that flight | [FILL IN] |
| Open a flight's full details and find its speed and heading | Flight detail screen reached and read correctly | [FILL IN] |
| Find out which flights arrived at Heathrow today | Airports tab, airport selected, board loaded via the priced button | [FILL IN] |
| Turn on aeroplane mode and check a tracked flight | Tracked flight still shows, with a clear "last seen" age | [FILL IN] |
| Change the app to metric units | Settings reached, units switched, values update | [FILL IN] |
| Switch the map to List view | List view toggle used, same aircraft shown as a list | [FILL IN] |

---

## 4. Execution & Evidence

[FILL IN — one short paragraph: how many sessions ran, on which devices, and
whether participants completed the core tasks. Note any session that had to be
cut short or repeated.]

### 4.1 Key Observations

- [FILL IN — what everyone managed easily]
- [FILL IN — where people hesitated or looked lost]
- [FILL IN — anything a participant suggested unprompted]
- [FILL IN — differences you noticed between the iOS and Android sessions]

### 4.2 Screenshot Evidence

Each screen was captured on both platforms so that layout differences are
visible. Instructions for capturing these are in
[`docs/screenshots/README.md`](screenshots/README.md).

**Map tab — aircraft selected**

> **[SCREENSHOT — iOS]** *iPhone 11, iOS 26.3*
>
> **[SCREENSHOT — Android]** *Pixel emulator*

**Search tab — results for a callsign**

> **[SCREENSHOT — iOS]**
>
> **[SCREENSHOT — Android]**

**Flight detail — full telemetry**

> **[SCREENSHOT — iOS]**
>
> **[SCREENSHOT — Android]**

**Track tab — a tracked flight in aeroplane mode**

> **[SCREENSHOT — iOS]**
>
> **[SCREENSHOT — Android]**

**Airports tab — an arrivals board**

> **[SCREENSHOT — iOS]**
>
> **[SCREENSHOT — Android]**

**Settings — units and the API budget meter**

> **[SCREENSHOT — iOS]**
>
> **[SCREENSHOT — Android]**

**A participant mid-session** *(optional, with their permission)*

> **[SCREENSHOT / PHOTO]**

---

## 5. Analysis & Findings

| Issue Identified | User Feedback | Proposed Solution |
|---|---|---|
| [FILL IN] | "[direct quote]" | [FILL IN] |
| [FILL IN] | "[direct quote]" | [FILL IN] |
| [FILL IN] | "[direct quote]" | [FILL IN] |
| [FILL IN] | "[direct quote]" | [FILL IN] |

[FILL IN — a short paragraph drawing the pattern out of the table above. Were
the problems visual, or functional? Did anything work better than you expected?]

### 5.1 Issues Already Known Before Testing

These were found during my own development testing rather than reported by
participants, and are recorded separately so the two sources are not confused:

- **The map needs WebGL.** Android emulators frequently cannot provide it, so
  the app detects this and falls back to a native radar view showing the same
  aircraft without a basemap. Worth noting if an emulator session looks
  different from a device session.
- **Airport arrivals lag behind real time.** OpenSky only records an arrival
  once a flight has landed *and* been processed, so a short time window returns
  nothing. I confirmed this against the live API and widened the window to a
  full day.
- **Flight paths require a connected OpenSky account.** This is a restriction
  on OpenSky's endpoint, not a bug. The app explains it in place rather than
  showing an error.
- **A failed refresh used to say only "Could not refresh".** It now names the
  actual cause, e.g. rate limiting versus rejected credentials.

---

## 6. Reflection & Recommendations

### 6.1 What I Learned

- [FILL IN — the thing that most surprised you about watching someone use it]
- [FILL IN — an assumption of yours that testing challenged]
- [FILL IN — something users did that you had not designed for]

### 6.2 Were User Expectations Met?

[FILL IN — the brief asks this directly. Did people expect the app to do
something it does not? Commercial trackers show routes and aircraft types for
every flight; this one can only show a route when the API provides it. Did that
gap come up?]

### 6.3 Recommendations

- [FILL IN — the change with the strongest evidence behind it]
- [FILL IN — a second change]
- [FILL IN — something worth testing again after changes are made]

---

## 7. Structure & Presentation

All findings above are drawn from the session logs recorded at the time of
testing, using the template in
[`docs/user-testing-log.md`](user-testing-log.md). Screenshots were captured on
both an iOS device and an Android emulator so that platform differences are
visible in the evidence rather than described second-hand. The completed logs
are attached as an appendix.

---

## 8. Appendix (Evidence)

- Session log 1 — [FILL IN participant reference, date, device]
- Session log 2 — [FILL IN]
- Session log 3 — [FILL IN]
- Session log 4 — [FILL IN]
- Screenshot set — iOS (six screens)
- Screenshot set — Android (six screens)
- [Optional: survey responses or feedback forms]

---

## 9. Marking Criteria Reference

For my own checking against the brief before submitting:

| Criteria | Marks | Covered in |
|---|---|---|
| Testing Design & Methodology | 20 | Section 2, Section 3 |
| Execution & Evidence of Testing | 20 | Section 4, Section 8 |
| Analysis & Findings | 25 | Section 5 |
| Reflection & Recommendations | 20 | Section 6 |
| Structure, Presentation & Writing Quality | 15 | Throughout |
| **Total** | **100** | |
