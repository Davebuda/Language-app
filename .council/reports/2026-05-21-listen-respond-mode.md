# Playwright Report: Listen-and-Respond Mode
**Date:** 2026-05-21
**Result:** PASS
**Tests run:** 7 | **Passed:** 7 | **Failed:** 0

## What Was Tested
1. `/listen` selection screen — 7 question cards
2. Question card click → exercise phase transition
3. Norwegian question as T1 dominant element (h2, ≥1.75rem)
4. English translation visible as subtitle
5. "Start lytting" button present and aria-labeled
6. Dashboard MUNTLIG card — "Lytt og svar" link → /listen
7. TypeScript: 0 errors

## Test Results
| Test | Result | Error |
|------|--------|-------|
| /listen renders with 7 question cards | ✅ PASS | — |
| Each card shows Norwegian question + English translation | ✅ PASS | — |
| Click card → exercise with h2 "Hva gjør du om morgenen?" | ✅ PASS | — |
| Progress indicator "1 / 7" visible | ✅ PASS | — |
| "Start lytting og svar på spørsmålet" button present | ✅ PASS | — |
| Dashboard: "Lytt og svar" link /url: /listen | ✅ PASS | — |
| npx tsc --noEmit: 0 errors | ✅ PASS | — |

## Console Errors
None on `/listen`. Dashboard: 11 scheduler warnings — pre-existing guest cold-start state.

## Key Implementation Details Verified
- `hasResolved` ref guards race condition between timer and speech API
- `transcriptRef` keeps live transcript available to timer closure
- Countdown bar uses `scaleX` transform on `origin-left` div — no layout properties
- Keyword chips use nc-green tokens when matched, dim when missed
- speakingMinutesTotal incremented at session complete via `useFingerprintStore.setFingerprint`

## Screenshots
- `.council/reports/listen-respond-selection.png` — dashboard with all 4 MUNTLIG links
- `.council/reports/listen-respond-questions.png` — /listen question selection screen

## Verdict
PASS — listen-and-respond mode approved.
