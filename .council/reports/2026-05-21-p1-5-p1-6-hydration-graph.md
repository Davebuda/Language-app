# Playwright Report: P1-5 + P1-6 — SSR hydration flash and wrong concept graph
**Date:** 2026-05-21
**Result:** PASS
**Tests run:** 6 | **Passed:** 6 | **Failed:** 0

## What Was Tested
- `/progress` — loading skeleton, content loads with correct level label
- `/profile` — level stat shows "–" during load (no A1 flash)
- `/journal` — console error count after page load (hydration fix)

## Test Results
| Test | Result | Error |
|------|--------|-------|
| `/progress` renders loading skeleton (blank main) before fingerprint | ✅ PASS | — |
| `/progress` loads concept list with correct level label after fingerprint | ✅ PASS | — |
| `/progress` console errors: 0 | ✅ PASS | — |
| `/profile` Nivå stat shows "–" (not "A1") while loading | ✅ PASS | — |
| `/profile` Nåværende nivå shows "–" while loading | ✅ PASS | — |
| `/journal` console errors: 0 (was 1 hydration error before fix) | ✅ PASS | — |

## Console Errors
None on any page. Previous hydration error on `/journal` is gone.

## Network Failures
None.

## What Was Fixed

**P1-5 (SSR hydration flash):**
- `progress/page.tsx`: Added `status` from store. `status === 'loading'` guard returns skeleton before fingerprint loads, preventing A1→actual level flash.
- `profile/page.tsx`: Added `status` from store. Nivå stat and Nåværende nivå section show "–" while `status === 'loading'`, preventing A1→actual level flash.

**P1-6 (wrong concept graph):**
- Both `progress/page.tsx` and `profile/page.tsx` now import both `a1-graph.json` and `a2-graph.json` and select `conceptGraph = fingerprint?.currentLevel === 'A2' ? a2Graph : a1Graph`. A2 users now see A2 concepts on both pages.

**Bonus — WritingEditor SSR hydration:**
- `WritingEditor.tsx`: `hasSpeechAPI` changed from computed-at-render to `useState(false)` with a `useEffect` that detects SpeechRecognition only on the client after mount. This eliminates the server/client render mismatch that caused a React hydration error on every `/journal` page load.

## Verdict for Council
PASS — proceed to APPROVE.
