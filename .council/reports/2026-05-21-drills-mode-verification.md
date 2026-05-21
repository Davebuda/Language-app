# Playwright Report: Pronunciation Drills Mode
**Date:** 2026-05-21
**Result:** PASS (after correction cycle)
**Tests run:** 6 | **Passed:** 6 | **Failed:** 0

## What Was Tested
1. `/drills` selection screen
2. Drill set click → exercise transition
3. `DrillExercise` idle state with Norwegian word as T1 dominant element
4. Dashboard MUNTLIG card — three links present (conversation, shadowing, drills)
5. Production build (`next build`) success
6. 0 console errors on both pages

## Test Results
| Test | Result | Error |
|------|--------|-------|
| /drills selection screen renders | ✅ PASS | — |
| All 4 drill sets visible with preview words | ✅ PASS | — |
| kj-lyden drill set → DrillExercise transition | ✅ PASS | — |
| Norwegian word "kjøpe" is h2 dominant element | ✅ PASS | — |
| Dashboard: "Skygging" link → /shadow | ✅ PASS | — |
| Dashboard: "Uttaleøvelser" link → /drills | ✅ PASS | — |
| next build passes with no errors | ✅ PASS | — |

## Corrections Applied Before Approve
1. **scheduler.ts:50 — `pickExerciseType` dead code removed.** ESLint `@typescript-eslint/no-unused-vars` error blocked `next build`. Function was replaced in a prior commit by the `addItem` closure which does the same job plus eligibility checking. 3-line deletion.
2. **Dashboard MUNTLIG card — navigation links added.** Both `/shadow` (Skygging) and `/drills` (Uttaleøvelser) were orphaned pages with no in-app navigation path. Three secondary links added to the MUNTLIG card: "Start samtale" (primary), "Skygging" (ghost), "Uttaleøvelser" (ghost).

## Console Errors
None on `/drills`. Dashboard shows 12 scheduler warnings (`[scheduler] skipping "..." — no eligible sentence`) — pre-existing, guest-user cold-start state, not new.

## Screenshots
- `.council/reports/drills-exercise-kjlyd.png` — exercise screen
- `.council/reports/drills-dashboard-muntlig-links.png` — dashboard MUNTLIG card with 3 links

## Verdict
PASS — pronunciation drills mode approved.
