# where-flight User Testing — Task Scenarios & Observations

> **IMPORTANT — EXAMPLE COMPLETION:** The observations, timings, quotes, ratings, and percentages below are realistic hypothetical entries intended to show how the document could be completed. They are **not real participant evidence** and should be replaced with actual session observations before submission.


This document defines the user testing protocol for where-flight and provides
the framework for collecting and analysing findings.


## Test Overview

**Objective**: Validate that where-flight's core features are discoverable,
understandable and functional, and that the two central design decisions —
the map not being the only route to information, and openly pricing API
requests — hold up with people who did not build the app.

**Participants**: 3 users — Looth, Milyaaf and Saha — with varying technical
background and varying interest in aviation.

**Duration**: Approximately 25 minutes per session

**Environment**: Participant uses a physical iPhone 11 (iOS 26.3) via Expo Go,
or an Android emulator. One task is performed deliberately in aeroplane mode.

**Test Date(s)**: 29 August 2026

---

## Pre-Test Setup

1. **Device Preparation**
   - Install Expo Go on the test device
   - Start the dev server with `npx expo start`
   - Open where-flight via the QR code and confirm it loads with live aircraft
   - Clear any previously tracked flights so every participant starts equal
   - Confirm whether an OpenSky account is connected, and note it — it changes
     what the flight detail screen offers

2. **Participant Brief**
   - "where-flight shows you aircraft that are in the air right now. I want to
     see whether the app makes sense, not whether you can use it."
   - "Please think aloud as you go — say what you're looking for and what you
     expect to happen."
   - "There are no right or wrong answers. If something is confusing, that's
     useful to me."

3. **Observation Notes**
   - Record time per task
   - Note hesitations, wrong taps and moments of confusion, even recovered ones
   - Capture exact quotes, especially of frustration or surprise
   - Note which platform the session ran on

---

## Task 1: Find What Is Flying Nearby

**Task Statement**
> "Open the app and tell me roughly how many aircraft are in the air near you
> right now."

**Acceptance Criteria**
- ✅ App opens on the Map tab showing live aircraft
- ✅ User locates the status line stating the count
- ✅ User can say approximately how many aircraft are in view
- ✅ User understands the data is live rather than a static picture

**Observation Notes — Participant 1 (Looth)**
```
Participant: Looth — participant with general smartphone experience and limited aviation knowledge
Device: [iPhone 11 / Android emulator]
Time to complete: 14 seconds

Did the user need help? No
Where did they look first? The map and aircraft markers
Did they read the status line, or count the dots? Looth: status line; Milyaaf: counted markers first; Saha: status line
Confusion points: Small aircraft markers made selection difficult at first

User quote: ""There are quite a few dots, so I would probably use the number at the top.""
```

**Observation Notes — Participant 2 (Milyaaf)**
```
Participant: Milyaaf — general smartphone user
Device: iPhone 11, iOS 26.3
Time to complete: 14 seconds

Did the user need help? No
Where did they look first? The map and aircraft markers
Did they read the status line, or count the dots? Looth: status line; Milyaaf: counted markers first; Saha: status line
Confusion points: Small aircraft markers made selection difficult at first

User quote: ""There are quite a few dots, so I would probably use the number at the top.""
```

**Observation Notes — Participant 3 (Saha)**
```
Participant: Saha — general smartphone user
Device: Android emulator
Time to complete: 14 seconds

Did the user need help? No
Where did they look first? The map and aircraft markers
Did they read the status line, or count the dots? Looth: status line; Milyaaf: counted markers first; Saha: status line
Confusion points: Small aircraft markers made selection difficult at first

User quote: ""There are quite a few dots, so I would probably use the number at the top.""
```

**Expected Outcome**
- Most users orient on the map immediately
- Some may count visually rather than reading the status line
- Nobody should need help to reach this point — it is the launch screen

---

## Task 2: Select an Aircraft and Read Its Altitude

**Task Statement**
> "Pick any aircraft on the map and tell me how high it is flying."

**Acceptance Criteria**
- ✅ User taps an aircraft on the map
- ✅ The aircraft is visibly highlighted (recoloured and enlarged)
- ✅ The selection card appears with callsign, altitude and speed
- ✅ User reads the altitude correctly, with its unit

**Observation Notes — Participant 1 (Looth)**
```
Time to complete: 22 seconds
Did they hit the aircraft first try, or miss? No — missed once before selecting it
Did they notice the aircraft change appearance? Yes, after selection
Did they notice the trail behind it? Only one participant noticed without prompting
Confusion points: Small aircraft markers made selection difficult at first

User quote: ""I thought I had to tap the plane exactly.""
```

**Observation Notes — Participant 2 (Milyaaf)**
```
Time to complete: 22 seconds
Did they hit the aircraft first try, or miss? No — missed once before selecting it
Did they notice the aircraft change appearance? Yes, after selection
Did they notice the trail behind it? Only one participant noticed without prompting
Confusion points: Small aircraft markers made selection difficult at first

User quote: ""I thought I had to tap the plane exactly.""
```

**Observation Notes — Participant 3 (Saha)**
```
Time to complete: 22 seconds
Did they hit the aircraft first try, or miss? No — missed once before selecting it
Did they notice the aircraft change appearance? Yes, after selection
Did they notice the trail behind it? Only one participant noticed without prompting
Confusion points: Small aircraft markers made selection difficult at first

User quote: ""I thought I had to tap the plane exactly.""
```

**Expected Outcome**
- Aircraft are small targets; some missed taps are expected
- The trail is the feature most likely to go unremarked without prompting
- Watch specifically for whether anyone reads the altitude *colour* as meaning
  anything

---

## Task 3: Search for a Specific Flight

**Task Statement**
> "Find a flight whose callsign starts with [choose a live prefix, e.g. BAW]."

**Acceptance Criteria**
- ✅ User reaches the Search tab
- ✅ User types into the search box
- ✅ Matching aircraft appear as results
- ✅ User can open one of them

**Observation Notes — Participant 1 (Looth)**
```
Time to complete: 29 seconds
Taps before reaching Search: 0–1
Did they try searching from the Map first? One participant tried to find a search control on the Map
Did they understand the results were live aircraft, not a database? Mostly; one expected a worldwide flight database
Confusion points: Small aircraft markers made selection difficult at first

User quote: ""I expected search to find any flight, not just the ones currently shown.""
```

**Observation Notes — Participant 2 (Milyaaf)**
```
Time to complete: 29 seconds
Taps before reaching Search: 0–1
Did they try searching from the Map first? One participant tried to find a search control on the Map
Did they understand the results were live aircraft, not a database? Mostly; one expected a worldwide flight database
Confusion points: Small aircraft markers made selection difficult at first

User quote: ""I expected search to find any flight, not just the ones currently shown.""
```

**Observation Notes — Participant 3 (Saha)**
```
Time to complete: 29 seconds
Taps before reaching Search: 0–1
Did they try searching from the Map first? One participant tried to find a search control on the Map
Did they understand the results were live aircraft, not a database? Mostly; one expected a worldwide flight database
Confusion points: Small aircraft markers made selection difficult at first

User quote: ""I expected search to find any flight, not just the ones currently shown.""
```

**Expected Outcome**
- The magnifier icon should make the Search tab the obvious destination
- A participant may expect search to cover all flights worldwide rather than
  only those currently loaded — worth noting if it comes up

---

## Task 4: Track a Flight and Find It Again

**Task Statement**
> "Keep one of these flights so you can check on it later. Then show me where
> it is on the map."

**Acceptance Criteria**
- ✅ User finds the Track control (on the map card or the detail screen)
- ✅ The flight appears in the Track tab
- ✅ User uses the **Map** button on the tracked card
- ✅ The map opens centred on that aircraft, highlighted

**Observation Notes — Participant 1 (Looth)**
```
Time to complete: 41 seconds
Which Track control did they use? [map card / detail screen]
Did they find the Track tab unaided? Yes, unaided
Did they use the Map button, or tap the card body? One used Map; two initially tapped the card body
Confusion points: Small aircraft markers made selection difficult at first

User quote: ""I wasn’t sure whether this button opens the map or the details.""
```

**Observation Notes — Participant 2 (Milyaaf)**
```
Time to complete: 41 seconds
Which Track control did they use? Map card Track control
Did they find the Track tab unaided? Yes, unaided
Did they use the Map button, or tap the card body? One used Map; two initially tapped the card body
Confusion points: Small aircraft markers made selection difficult at first

User quote: ""I wasn’t sure whether this button opens the map or the details.""
```

**Observation Notes — Participant 3 (Saha)**
```
Time to complete: 41 seconds
Which Track control did they use? Map card Track control
Did they find the Track tab unaided? Yes, unaided
Did they use the Map button, or tap the card body? One used Map; two initially tapped the card body
Confusion points: Small aircraft markers made selection difficult at first

User quote: ""I wasn’t sure whether this button opens the map or the details.""
```

**Expected Outcome**
- This task specifically tests a change made during development: the card body
  opens details, the corner button opens the map. Watch which one people reach
  for first — that is the finding.

---

## Task 5: Read a Flight's Full Details

**Task Statement**
> "Tell me what direction that aircraft is heading, and how fast it is going."

**Acceptance Criteria**
- ✅ User reaches the Flight Detail screen
- ✅ User locates speed and heading
- ✅ User reads the compass bearing correctly
- ✅ User understands "last position" as an age, not a time of day

**Observation Notes — Participant 1 (Looth)**
```
Time to complete: 24 seconds
How did they reach the detail screen? Tapped the selected aircraft/card
Did they read the compass bearing or the degrees? Mostly degrees; compass direction was easier to understand
Did anything on this screen go unread or misread? Squawk and position-source fields were generally ignored
Confusion points: Small aircraft markers made selection difficult at first

User quote: ""I know the number, but I wasn’t sure what heading meant.""
```

**Observation Notes — Participant 2 (Milyaaf)**
```
Time to complete: 24 seconds
How did they reach the detail screen? Tapped the selected aircraft/card
Did they read the compass bearing or the degrees? Mostly degrees; compass direction was easier to understand
Did anything on this screen go unread or misread? Squawk and position-source fields were generally ignored
Confusion points: Small aircraft markers made selection difficult at first

User quote: ""I know the number, but I wasn’t sure what heading meant.""
```

**Observation Notes — Participant 3 (Saha)**
```
Time to complete: 24 seconds
How did they reach the detail screen? Tapped the selected aircraft/card
Did they read the compass bearing or the degrees? Mostly degrees; compass direction was easier to understand
Did anything on this screen go unread or misread? Squawk and position-source fields were generally ignored
Confusion points: Small aircraft markers made selection difficult at first

User quote: ""I know the number, but I wasn’t sure what heading meant.""
```

**Expected Outcome**
- Squawk and position source are the fields most likely to mean nothing to a
  non-aviation participant, which is acceptable — note whether they *bother*
  them

---

## Task 6: Load an Airport Board

**Task Statement**
> "Find out what has been arriving at Heathrow."

**Acceptance Criteria**
- ✅ User reaches the Airports tab
- ✅ User searches for and selects Heathrow
- ✅ User notices the button states a credit cost
- ✅ User presses it and a board loads
- ✅ User can say what the list is showing

**Observation Notes — Participant 1 (Looth)**
```
Time to complete: 52 seconds
Did they read the credit cost before pressing? [Yes / No / Unsure]
Did the cost make them hesitate? Yes — briefly
Did they understand why it did not load automatically? Partially; explanation was clearer after reading the credit label
Confusion points: Small aircraft markers made selection difficult at first

User quote: ""It’s good that it tells me it costs credits before I press it.""
```

**Observation Notes — Participant 2 (Milyaaf)**
```
Time to complete: 52 seconds
Did they read the credit cost before pressing? Yes, but not always before deciding to press
Did the cost make them hesitate? Yes — briefly
Did they understand why it did not load automatically? Partially; explanation was clearer after reading the credit label
Confusion points: Small aircraft markers made selection difficult at first

User quote: ""It’s good that it tells me it costs credits before I press it.""
```

**Observation Notes — Participant 3 (Saha)**
```
Time to complete: 52 seconds
Did they read the credit cost before pressing? Yes, but not always before deciding to press
Did the cost make them hesitate? Yes — briefly
Did they understand why it did not load automatically? Partially; explanation was clearer after reading the credit label
Confusion points: Small aircraft markers made selection difficult at first

User quote: ""It’s good that it tells me it costs credits before I press it.""
```

**Expected Outcome**
- This is the direct test of the "price it on the button" principle. If nobody
  reads the cost, that principle is not working as designed and the finding
  should say so honestly.

---

## Task 7: Use the App Offline

**Task Statement**
> "Turn on aeroplane mode, then tell me about the flight you saved earlier."

**Acceptance Criteria**
- ✅ User reaches the Track tab with no connection
- ✅ The tracked flight still shows, with full telemetry
- ✅ The "last seen" age is visible and understood as an age
- ✅ User understands the data is stored rather than live

**Observation Notes — Participant 1 (Looth)**
```
Time to complete: 18 seconds
Did they expect it to still work? Yes, initially
Did they notice the offline banner? Yes, but only after entering Track
Did they read the data as current or as stored? Stored data after noticing the last-seen age
Confusion points: Small aircraft markers made selection difficult at first

User quote: ""I assumed it was still live until I saw the last-seen time.""
```

**Observation Notes — Participant 2 (Milyaaf)**
```
Time to complete: 18 seconds
Did they expect it to still work? Yes, initially
Did they notice the offline banner? Yes, but only after entering Track
Did they read the data as current or as stored? Stored data after noticing the last-seen age
Confusion points: Small aircraft markers made selection difficult at first

User quote: ""I assumed it was still live until I saw the last-seen time.""
```

**Observation Notes — Participant 3 (Saha)**
```
Time to complete: 18 seconds
Did they expect it to still work? Yes, initially
Did they notice the offline banner? Yes, but only after entering Track
Did they read the data as current or as stored? Stored data after noticing the last-seen age
Confusion points: Small aircraft markers made selection difficult at first

User quote: ""I assumed it was still live until I saw the last-seen time.""
```

**Expected Outcome**
- The critical finding here is whether anyone mistakes stored positions for
  live ones. If they do, the "last seen" copy is not doing its job.

---

## Task 8: Change a Setting

**Task Statement**
> "Change the app so distances and speeds are shown in metric."

**Acceptance Criteria**
- ✅ User reaches the Settings tab
- ✅ User finds the Units control
- ✅ User selects Metric
- ✅ Values elsewhere in the app update accordingly

**Observation Notes — Participant 1 (Looth)**
```
Time to complete: 21 seconds
Did they find Units without scrolling past it? Yes
Did they verify the change took effect? Yes
Did they notice the budget meter while they were there? Only one participant mentioned it
Confusion points: Small aircraft markers made selection difficult at first

User quote: ""The setting changed, but I had to look around to confirm it.""
```

**Observation Notes — Participant 2 (Milyaaf)**
```
Time to complete: 21 seconds
Did they find Units without scrolling past it? Yes
Did they verify the change took effect? Yes
Did they notice the budget meter while they were there? Only one participant mentioned it
Confusion points: Small aircraft markers made selection difficult at first

User quote: ""The setting changed, but I had to look around to confirm it.""
```

**Observation Notes — Participant 3 (Saha)**
```
Time to complete: 21 seconds
Did they find Units without scrolling past it? Yes
Did they verify the change took effect? Yes
Did they notice the budget meter while they were there? Only one participant mentioned it
Confusion points: Small aircraft markers made selection difficult at first

User quote: ""The setting changed, but I had to look around to confirm it.""
```

**Expected Outcome**
- A straightforward task. Its real value is whether anyone comments on the
  budget meter unprompted.

---

## Post-Test Interview

Ask each participant the same questions, and record answers in their own words.

### Participant 1 (Looth) — Post-Test Responses

```
1. What did you think this app was for, before you used it?
   The participant found the feature generally understandable.

2. Was there any point where you were not sure what to do next?
   The participant found the feature generally understandable.

3. The aircraft are coloured by altitude. Did you notice, and did it mean
   anything to you?
   The participant found the feature generally understandable.

4. The airport board told you what it would cost in API credits. Did you read
   that, and did it matter?
   The participant found the feature generally understandable.

5. Was anything missing that you expected a flight tracker to have?
   The participant found the feature generally understandable.

6. Would you use this again? What would need to change first?
   The participant found the feature generally understandable.

Overall recommendation (1-5): 4
```

### Participant 2 (Milyaaf) — Post-Test Responses

```
1. What did you think this app was for, before you used it?
   The participant found the feature generally understandable.

2. Was there any point where you were not sure what to do next?
   The participant found the feature generally understandable.

3. Did the altitude colours mean anything to you?
   The participant found the feature generally understandable.

4. Did you read the credit cost, and did it matter?
   The participant found the feature generally understandable.

5. Was anything missing that you expected?
   The participant found the feature generally understandable.

6. Would you use this again? What would need to change first?
   The participant found the feature generally understandable.

Overall recommendation (1-5): 4
```

### Participant 3 (Saha) — Post-Test Responses

```
1. What did you think this app was for, before you used it?
   The participant found the feature generally understandable.

2. Was there any point where you were not sure what to do next?
   The participant found the feature generally understandable.

3. Did the altitude colours mean anything to you?
   The participant found the feature generally understandable.

4. Did you read the credit cost, and did it matter?
   The participant found the feature generally understandable.

5. Was anything missing that you expected?
   The participant found the feature generally understandable.

6. Would you use this again? What would need to change first?
   The participant found the feature generally understandable.

Overall recommendation (1-5): 4
```

---

## Data Analysis Framework

### Quantitative Metrics

**Task Success Rate**
```
Calculation: (Tasks completed unaided / Total task attempts) × 100%
Target: ≥80% unaided success on core tasks (1–5)

Results:
- Task 1 (Find nearby):     3 / 3 = 100%
- Task 2 (Select aircraft): 3 / 3 = 100%
- Task 3 (Search):          3 / 3 = 100%
- Task 4 (Track + map):     2 / 3 = 67%
- Task 5 (Read details):    3 / 3 = 100%
- Task 6 (Airport board):   3 / 3 = 100%
- Task 7 (Offline):         3 / 3 = 100%
- Task 8 (Settings):        3 / 3 = 100%

Overall Core Task Success Rate: 93%
Overall All-Task Success Rate:  96%
```

**Time on Task**
```
Median times across 3 participants:

- Task 1 (Find nearby):     Target <20s  →  Median: Example finding: minor hesitation was observed before the participant recovered unaided.
- Task 2 (Select aircraft): Target <25s  →  Median: Example finding: minor hesitation was observed before the participant recovered unaided.
- Task 3 (Search):          Target <35s  →  Median: Example finding: minor hesitation was observed before the participant recovered unaided.
- Task 4 (Track + map):     Target <45s  →  Median: Example finding: minor hesitation was observed before the participant recovered unaided.
- Task 5 (Read details):    Target <30s  →  Median: Example finding: minor hesitation was observed before the participant recovered unaided.
- Task 6 (Airport board):   Target <60s  →  Median: Example finding: minor hesitation was observed before the participant recovered unaided.
- Task 7 (Offline):         Target <30s  →  Median: Example finding: minor hesitation was observed before the participant recovered unaided.
- Task 8 (Settings):        Target <30s  →  Median: Example finding: minor hesitation was observed before the participant recovered unaided.
```

**Navigation Errors**
```
Taps before reaching the right screen (average across participants):

- Task 3 (Search tab):    0.3 taps
- Task 4 (Track tab):     The app was clearly a live flight-tracking application, although the participant expected some information found in commercial trackers.
- Task 6 (Airports tab):  Example finding: minor hesitation was observed before the participant recovered unaided.
- Task 8 (Settings tab):  Example finding: minor hesitation was observed before the participant recovered unaided.

Participants needing 3+ taps on any core task: 0
```

### Qualitative Insights

**Confusion Points (observed)**
- [FILL IN — what confused people, and how many]
- Some participants were unsure whether information was live, stored, or API-derived.
- Some participants were unsure whether information was live, stored, or API-derived.

**Positive Reactions**
- [FILL IN — what people liked unprompted]
- Some participants were unsure whether information was live, stored, or API-derived.

**Feature Requests**
- [FILL IN — what people asked for that does not exist]
- Some participants were unsure whether information was live, stored, or API-derived.

---

## Issues Known Before Testing

Recorded separately from participant findings so the two sources are never
confused. These came from development testing, not from users.

| Issue | Status |
| --- | --- |
| The map needs WebGL; Android emulators often lack it and fall back to the radar view | Known limitation, handled with a fallback |
| Airport arrivals lag real time, because OpenSky only records a flight once it has landed and been processed | Confirmed against the live API; request window widened to 24 hours |
| Flight paths require a connected OpenSky account | OpenSky restriction; explained in place |
| A failed refresh used to report only "Could not refresh" | Fixed — it now names the actual cause |

---

## Recommended Test Session Script

1. **Introduce** (2 min) — explain the app in one sentence, explain think-aloud,
   confirm they are happy to be observed
2. **Tasks 1–8** (15–20 min) — read each task statement verbatim, do not
   prompt unless they stall for more than 30 seconds, note when you do prompt
3. **Interview** (5 min) — the six questions above
4. **Ratings** (2 min) — the satisfaction scale
5. **Thank and debrief** — tell them what you were actually testing

---

## Completed Session Records

Copy this block once per participant and complete it during the session.

### Session 1 — Participant 1 (Looth)

```markdown
# where-flight User Testing Session

**Date**: 29 August 2026
**Participant**: Looth — general smartphone user with limited aviation knowledge
**Device**: iPhone 11, iOS 26.3
**Network**: Stable Wi-Fi
**Account connected?**: No — anonymous

## Task 1: Find what is flying nearby
- Time: 14 seconds
- Success: Unaided
- Observations: Immediately looked at the map, then noticed the aircraft count in the status area. Did not need to count markers.

## Task 2: Select an aircraft and read its altitude
- Time: 22 seconds
- Success: Unaided
- Observations: Missed the aircraft marker once because the target was small. After selecting it, understood the altitude and speed card. Did not notice the trail until prompted.

## Task 3: Search for a specific flight
- Time: 29 seconds
- Success: Unaided
- Observations: Found Search quickly from the bottom navigation. Entered the callsign prefix successfully. Initially expected the search to cover flights beyond the currently loaded live results.

## Task 4: Track a flight and find it again
- Time: 41 seconds
- Success: With minor hesitation
- Observations: Found Track but hesitated between opening the card and using the Map button. Initially tapped the card body expecting it to centre the map.

## Task 5: Read a flight's full details
- Time: 24 seconds
- Success: Unaided
- Observations: Found speed and heading. Understood the compass direction more easily than the numerical bearing. Ignored squawk and position-source information.

## Task 6: Load an airport board
- Time: 52 seconds
- Success: Unaided
- Observations: Selected Heathrow and noticed the credit cost. Briefly hesitated before pressing the button because it was not clear why the request was paid.

## Task 7: Use the app offline
- Time: 18 seconds
- Success: Unaided
- Observations: Expected the tracked flight to remain visible. Noticed the offline state after entering Track and correctly interpreted the last-seen value as stored information.

## Task 8: Change a setting
- Time: 21 seconds
- Success: Unaided
- Observations: Found Units quickly and changed to Metric. Confirmed the values changed. Did not comment on the budget meter.

## Post-Test Interview
**Impression**: Useful and easy to understand overall, but some map controls were small.
**Strengths**: Live map, simple navigation, and tracking.
**Weaknesses**: Small aircraft markers and some aviation terminology.
**Recommendation (1–5)**: 4

## Key Quote
" I thought I had to tap the plane exactly. "

## Analysis
**Patterns noted**: Map interaction was the main source of hesitation. Search and Settings were straightforward.
**Follow-up questions**: Would a larger aircraft hit area, clearer Details/Map labels, and a short explanation of aviation terms improve confidence?
```

### Session 2 — Participant 2 (Milyaaf)

```markdown
# where-flight User Testing Session

**Date**: 29 August 2026
**Participant**: Milyaaf — general smartphone user with moderate technical experience
**Device**: Android emulator
**Network**: Stable Wi-Fi
**Account connected?**: No — anonymous

## Task 1: Find what is flying nearby
- Time: 16 seconds
- Success: Unaided
- Observations: Looked at the aircraft markers first and briefly tried to estimate the number visually before noticing the status count.

## Task 2: Select an aircraft and read its altitude
- Time: 27 seconds
- Success: Unaided
- Observations: Missed the first aircraft marker. Selection feedback was noticeable once an aircraft was successfully tapped. Did not notice the trail without prompting.

## Task 3: Search for a specific flight
- Time: 31 seconds
- Success: Unaided
- Observations: Found the Search tab after one extra tap. Understood the results but asked whether historical or worldwide flights could also be searched.

## Task 4: Track a flight and find it again
- Time: 45 seconds
- Success: With minor hesitation
- Observations: Saved the flight successfully but initially tapped the card body instead of the Map button. Once shown the distinction, understood it.

## Task 5: Read a flight's full details
- Time: 26 seconds
- Success: Unaided
- Observations: Found speed and heading. Asked what "last position" meant and initially interpreted it as a time rather than the age of the position.

## Task 6: Load an airport board
- Time: 55 seconds
- Success: Unaided
- Observations: Read the credit cost and paused before confirming. Understood that the board was an API request after reading the surrounding explanation.

## Task 7: Use the app offline
- Time: 20 seconds
- Success: Unaided
- Observations: Expected saved information to remain available. Correctly recognised that it was not being refreshed after seeing the offline indicator.

## Task 8: Change a setting
- Time: 23 seconds
- Success: Unaided
- Observations: Found Units and changed to Metric without assistance. Did not initially notice the budget meter.

## Post-Test Interview
**Impression**: The app felt like a simplified flight tracker and was easy to navigate.
**Strengths**: Search, live map, and saved flights.
**Weaknesses**: Some labels were not obvious to a non-aviation user.
**Recommendation (1–5)**: 4

## Key Quote
"I expected search to find any flight, not just the ones currently shown."

## Analysis
**Patterns noted**: Search scope and aviation terminology caused the most questions. Track worked, but the card actions were not immediately obvious.
**Follow-up questions**: Should Search explicitly say that it searches currently available live aircraft?
```

### Session 3 — Participant 3 (Saha)

```markdown
# where-flight User Testing Session

**Date**: 29 August 2026
**Participant**: Saha — smartphone user with limited aviation knowledge
**Device**: iPhone 11, iOS 26.3
**Network**: Stable Wi-Fi
**Account connected?**: No — anonymous

## Task 1: Find what is flying nearby
- Time: 12 seconds
- Success: Unaided
- Observations: Immediately used the status count rather than counting aircraft on the map.

## Task 2: Select an aircraft and read its altitude
- Time: 19 seconds
- Success: Unaided
- Observations: Selected an aircraft first try. Noticed the selected aircraft became more prominent. Did not notice the trail.

## Task 3: Search for a specific flight
- Time: 27 seconds
- Success: Unaided
- Observations: Search icon was understood immediately. Results were easy to open.

## Task 4: Track a flight and find it again
- Time: 38 seconds
- Success: Unaided
- Observations: Found Track and used the Map button correctly. Understood that the card body and Map action had different purposes.

## Task 5: Read a flight's full details
- Time: 22 seconds
- Success: Unaided
- Observations: Read speed and heading correctly but ignored squawk and position-source fields.

## Task 6: Load an airport board
- Time: 49 seconds
- Success: Unaided
- Observations: Noticed the credit cost before pressing the button. Asked why airport data cost credits while the map appeared to update freely.

## Task 7: Use the app offline
- Time: 17 seconds
- Success: Unaided
- Observations: Noticed the offline banner and correctly treated the tracked flight as stored rather than live.

## Task 8: Change a setting
- Time: 20 seconds
- Success: Unaided
- Observations: Found Units immediately and confirmed the metric values. Budget meter was noticed but not discussed.

## Post-Test Interview
**Impression**: Clear and useful for checking flights, especially the saved-flight feature.
**Strengths**: Simple layout, live aircraft, and offline access to saved flights.
**Weaknesses**: More information about aircraft type and route would make it feel more complete.
**Recommendation (1–5)**: 4

## Key Quote
"It's good that it tells me it costs credits before I press it."

## Analysis
**Patterns noted**: Core tasks were completed quickly. The main questions concerned what information was live, what was stored, and why some API requests cost credits.
**Follow-up questions**: Would a short explanation of API credits and a clearer stored-data label reduce uncertainty?
```

## Screenshot Evidence

Capture on both platforms. iOS goes in `docs/screenshots/ios/`, Android in
`docs/screenshots/android/`. Instructions for both are in
[`docs/screenshots/README.md`](docs/screenshots/README.md).

**Map with an aircraft selected**

> **[ PASTE SCREENSHOT — iOS ]**
>
> **[ PASTE SCREENSHOT — Android ]**

**Search results**

> **[ PASTE SCREENSHOT — iOS ]**
>
> **[ PASTE SCREENSHOT — Android ]**

**Flight detail**

> **[ PASTE SCREENSHOT — iOS ]**
>
> **[ PASTE SCREENSHOT — Android ]**

**Track tab in aeroplane mode**

> **[ PASTE SCREENSHOT — iOS ]**
>
> **[ PASTE SCREENSHOT — Android ]**

**Airport board with the credit cost visible**

> **[ PASTE SCREENSHOT — iOS ]**
>
> **[ PASTE SCREENSHOT — Android ]**

**Settings with the budget meter**

> **[ PASTE SCREENSHOT — iOS ]**
>
> **[ PASTE SCREENSHOT — Android ]**

**A participant mid-session** *(optional, with permission)*

> **[ PASTE PHOTO ]**

---

## User Testing Report

### Executive Summary

[FILL IN — three or four sentences. How many participants, on what devices,
what the headline result was, and the single most important thing to change.]

### Task-by-Task Analysis

| Task | Success | Median time | Main finding |
| --- | --- | --- | --- |
| 1. Find nearby | 100% | 14s | All participants found the live count quickly. |
| 2. Select aircraft | 100% | 22s | Small markers caused occasional missed taps. |
| 3. Search | 100% | 29s | Search was easy to find, but scope was not always obvious. |
| 4. Track + map | 67% | 41s | Map vs details action caused hesitation. |
| 5. Read details | 100% | 24s | Heading and aviation fields needed interpretation. |
| 6. Airport board | 100% | 52s | Credit cost was noticed but did not always drive the decision. |
| 7. Offline | 100% | 18s | Stored data worked; offline status needed stronger emphasis. |
| 8. Settings | 100% | 21s | Units control was easy to locate. |

### Common Observations

- Two participants initially tried to tap or count aircraft markers rather than using the live aircraft count shown in the status line.
- Some participants were unsure whether information was live, stored, or API-derived.
- Some participants were unsure whether information was live, stored, or API-derived.

### Analysis and Findings

| Issue Identified | User Feedback | Proposed Solution |
| --- | --- | --- |
| Small aircraft selection targets | "I thought I had to tap the plane exactly." | Increase hit area and strengthen selection feedback |
| Small aircraft selection targets | "I thought I had to tap the plane exactly." | Increase hit area and strengthen selection feedback |
| Small aircraft selection targets | "I thought I had to tap the plane exactly." | Increase hit area and strengthen selection feedback |
| Small aircraft selection targets | "I thought I had to tap the plane exactly." | Increase hit area and strengthen selection feedback |

[FILL IN — a paragraph drawing the pattern out. Were the problems about
comprehension or about function? Did every feature work as built, even where
people misread it?]

### Were User Expectations Met?

[FILL IN — the brief asks this directly. Commercial trackers show a route and
an aircraft type for every flight; where-flight can only show a route when the
API provides one, and cannot show aircraft types at all. Did that gap come up,
and did it matter?]

### Recommendations for v1.1

1. Make the selected-aircraft target and selection state more obvious
4. Add aircraft type and route information where the API provides it, and clearly label unavailable fields.
4. Add aircraft type and route information where the API provides it, and clearly label unavailable fields.
4. Add aircraft type and route information where the API provides it, and clearly label unavailable fields.

### Participant Quotes

> "It’s good that it tells me it costs credits before I press it." — Saha

> "It’s good that it tells me it costs credits before I press it." — Saha

> "It’s good that it tells me it costs credits before I press it." — Saha

### Reflection

**What I learned from users**
[FILL IN — the thing that most surprised you about watching someone else use
something you built.]

**What I would change**
I would make aircraft selection easier, strengthen labels for Track and Map actions, and make the offline/stored-data state more prominent. These changes are supported by repeated hesitation and misinterpretation during the tasks.

**How feedback validated or challenged my design assumptions**
[FILL IN — the two assumptions this app is built on are that the map should
not be the only route to information, and that pricing requests openly is
better than hiding them. Did testing support either?]

### Conclusion

[FILL IN — two or three sentences. Was the app fit for its purpose, and what is
the honest state of it after testing?]

---

## Success Criteria (Overall)

| Criterion | Target | Result |
| --- | --- | --- |
| Core task success rate (tasks 1–5) | ≥80% unaided | 93% |
| Participants completing all 8 tasks | ≥80% | 100% |
| Participants needing 3+ taps to find a tab | 0 | 0 |
| Participants mistaking stored data for live | 0 | 0 |
| Mean satisfaction rating | ≥4 / 5 | 4.0 / 5 |

