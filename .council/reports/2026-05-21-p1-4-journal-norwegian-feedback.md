# Playwright Report: P1-4 — Journal feedback Norwegian language
**Date:** 2026-05-21
**Result:** PASS
**Tests run:** 3 | **Passed:** 3 | **Failed:** 0

## What Was Tested
- Navigate to `/journal`, switch to text mode, enter 19 words of Norwegian
- Click "Analyser tekst" — model unavailable (catch path fires)
- Verify praise and suggestion fields are in Norwegian, not English

## Test Results
| Test | Result | Error |
|------|--------|-------|
| "Analyser tekst" button appears after 5+ words | ✅ PASS | — |
| Feedback panel renders after analysis | ✅ PASS | — |
| Praise is Norwegian ("Bra forsøk!") not English | ✅ PASS | — |
| Suggestion is Norwegian ("Fokuser på verbplasseringen.") not English | ✅ PASS | — |

## Console Errors
- React hydration mismatch on journal page — **pre-existing bug** in `WritingEditor.tsx`: `getSpeechCtor()` returns different values on server vs client (SSR has no `window.SpeechRecognition`). Server renders textarea, client renders voice mode buttons. This is the SSR pattern described in P1-5 and is NOT caused by our changes.

## Network Failures
None.

## Screenshots
`.council/reports/p1-4-journal-norwegian-feedback.png` — praise "🎉 Bra forsøk!" and suggestion "💡 Fokuser på verbplasseringen." visible in Norwegian.

## What Was Fixed
- **Template fallback (catch path):** Was English ("Good attempt!", "Focus on verb placement.") → Now Norwegian ("Bra forsøk!", "Fokuser på verbplasseringen.")
- **isReady() fallback:** Was English ("Good attempt! Keep writing in Norwegian.") → Now Norwegian ("Bra innsats! Fortsett å skrive på norsk.")
- **Prompt constraint:** `praise` and `suggestion` field descriptions now specify Norwegian Bokmål. System prompt adds "Write the 'praise' and 'suggestion' fields in Norwegian Bokmål."

## Known Limitation (not a regression)
The "wrong explanations" and "nonsensical praise" from the AI model itself are model quality issues requiring Stream 1.1 (model swap). This fix guarantees Norwegian output on the template path and constrains the model path — but model quality ceiling remains until A1 lands.

## Verdict for Council
PASS — proceed to APPROVE.
