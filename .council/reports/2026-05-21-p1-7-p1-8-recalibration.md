# Playwright Report: P1-7 + P1-8 — Recalibration opt-in banner + accessibility
**Date:** 2026-05-21
**Result:** PASS
**Tests run:** 5 | **Passed:** 5 | **Failed:** 0

## What Was Tested

- P1-7: Intro banner renders on `/recalibrate` before quiz starts
- P1-7: "Hopp over" skip navigates to `/dashboard`
- P1-7: "Start" transitions to quiz without page reload
- P1-8: Accessibility tree after Start contains `<main>`, `<h1>`, `progressbar`, labelled option buttons
- Answer flow: reveal + progress counter + explanation card + Next button

## Test Results

| Test | Result | Notes |
|------|--------|-------|
| `/recalibrate` shows intro banner (not quiz) | ✅ PASS | "Tid for en liten repetisjon" heading, "7 spørsmål" info card, Start + Hopp over buttons |
| Intro accessibility tree | ✅ PASS | `heading [level=1]`, `button "Start"`, `button "Hopp over"` all visible |
| "Hopp over" → `/dashboard` | ✅ PASS | URL changed to `/dashboard` |
| "Start" → quiz (no reload) | ✅ PASS | State transition, URL stays `/recalibrate` |
| Quiz accessibility tree | ✅ PASS | `main "Recalibration quiz"`, `heading "Recalibration quiz" [level=1]`, `progressbar "Recalibration progress"`, `button "Alternativ 1: en"` etc. |
| Answer reveal flow | ✅ PASS | `"Alternativ 1: en — feil"`, `"Alternativ 3: et — riktig"`, explanation card, Next button, counter `1 / 7` |

## Console Errors

- `favicon.ico 404` — pre-existing (P2-5 in backlog, unrelated)

## Network Failures

None (favicon 404 is cosmetic)

## Screenshots

- `.council/reports/p1-7-8-recalibrate-initial.png` — intro banner on first load
- `.council/reports/p1-7-8-quiz-revealed.png` — quiz after Start, answer revealed

## Verdict for Opus

PASS — proceed to post-execution review
