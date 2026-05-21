# Comparison vs prior P0/P1 fixes

This report cross-references the findings of the third stress walkthrough (2026-05-21) against the eight P0 items closed after the first walkthrough and the regression patterns the project's CLAUDE.md explicitly warns against.

The prior P0 list was paraphrased into CLAUDE.md Operating Rule 8 as:

> "Five separate surfaces during P0 recovery were found to silently contribute nothing: the AI badge, error tags, session progression, journal correction, and conversation grammar logging. Before any 'feeds the engine' feature ships, trace the write."

Plus the explicitly-noted P1 ("mic does NOT auto-activate") and the B1/B2 honest banner work.

---

## Status per previously-fixed item

### P0-A — "AI badge silently contributing nothing"
**Status: PARTIAL REGRESSION**
- The badge itself ("AI ready") still shows honestly only when AI is ready — that part holds.
- But the *content* the badge gates is broken: F022 (gender rules flipped), F029 (Kari gibberish), F033 (journal fabricated words). The badge says "AI ready" while shipping factually wrong Norwegian to the learner. The badge is no longer dishonest about *availability*, but is now misleading about *quality*.

### P0-B — "Error tags silently contributing nothing"
**Status: REGRESSED**
- F010: every error in `recentErrors` carries `errorTag: "word-order"`. `errorPatterns[]` has a single entry of frequency 23, also `word-order`. The pattern detector has collapsed to a single tag regardless of the actual mistake type (a translation-direction error, an English-instead-of-Norwegian answer, and a true V2 error all get the same tag).
- The error-taxonomy skill defines 17 distinct tags. None of the other 16 are being applied.

### P0-C — "Session progression silently contributing nothing"
**Status: REGRESSED**
- F012: `totalSessionsCompleted: 0` with 24 historical errors logged. Sessions are not registering as completed.
- F023: `/session/complete` is directly accessible without a guard — completion celebration screen can be reached without any session play.
- F025: mid-session exit + re-entry generates a new session, dropping prior progress; the persistent session-state required to make "progression" meaningful does not exist.
- F018: dashboard shows 95% accuracy with 0 sessions completed — the dashboard is reading a derived number from somewhere that isn't backed by completed-session data.

### P0-D — "Journal correction silently contributing nothing"
**Status: REGRESSED (this is the documented worst-case pattern)**
- F034: I submitted a journal entry with 4 deliberate errors. The AI surfaced 3 corrections on screen. **Zero of them** were written to `recentErrors`. `updatedAt` did not change. The journal "looks like it teaches" but the engine learns nothing from the user's writing.
- This is the exact failure mode CLAUDE.md operating rule 8 lists by name.

### P0-E — "Conversation grammar logging silently contributing nothing"
**Status: REGRESSED**
- F030: I sent Kari a message with a clear V2 negation error and an adverb-placement error. No correction card appeared. No fingerprint write occurred.
- F028: opener even uses the raw English slug `daily-routine` — the prompt is unmistakably broken even before any user message lands.
- Again, this is the named pattern in operating rule 8.

---

## Other previously-known items

### P1 — "Mic does NOT auto-activate"
**Status: HOLDS**
- /conversation loads with the mic button present but inactive. /shadow text-mode fallback is the default when no mic. /drills shows the four sets without requesting mic. No mic auto-activation observed.

### B1/B2 "honest banner"
**Status: HOLDS**
- Switching the dashboard level switcher to B1 produced: *"B1 content is in development. You're practicing A2 material at higher intensity until it ships."*
- B2 shows the matching banner.
- Lesestudio at B1 shows "Tekster tilgjengelig for lesing" (with no count) rather than fabricating a B1 count — that's also honest by omission.

### Reading does not feed the fingerprint (per design)
**Status: HOLDS**
- Clicking through "En dag i Oslo" and "Ferdig lesing" produces no fingerprint write. The design decision (reading is input-only) is intact. Minor finding F035 about UX missing visited-state is a polish item, not a regression.

### "0 / 22" mastered concept count
**Status: NEW REGRESSION (related to P0-C)**
- F036: progress page says "0 of 22 in maintenance or consolidation" — even with `prepositions-place: 100, modal-verbs: 100, past-tense-regular: 100` already in the fingerprint. Concept-ID mismatch between fingerprint and the progress concept graph is the likely cause. Once C-1 above is fixed, the progress page must be re-checked because its numerator is reading something other than what the diagnostic writes.

---

## Net assessment

| Previously closed P0 item | Status in this walkthrough |
|---|---|
| AI badge contributes nothing | **Partial regression** — badge is honest about availability but the AI content it gates is shipping wrong Norwegian |
| Error tags contribute nothing | **Regressed** — all errors collapse to `word-order` (F010) |
| Session progression contributes nothing | **Regressed** — counter never increments (F012); /session/complete unguarded (F023) |
| Journal correction contributes nothing | **Regressed** — zero fingerprint writes from journal (F034) |
| Conversation grammar logging contributes nothing | **Regressed** — zero fingerprint writes from conversation (F030); opener uses raw slug (F028) |
| Mic auto-activation | **Holds** |
| B1/B2 honest banner | **Holds** |

**The recovery did not hold.** Four of the five named "supposedly fixed" P0 patterns are visibly regressed in this walkthrough; one is partially regressed. The two surfaces the project's CLAUDE.md singles out by name as the documented worst-case failure mode — journal correction and conversation grammar logging — are *both* contributing nothing to the engine again.

This is the third walkthrough. Walkthrough 1 found eight P0 bugs and they were closed. Walkthrough 2 confirmed the recovery held. This walkthrough finds the same family of bugs back, with new AI-quality bugs (F022/F029/F033) layered on top.
