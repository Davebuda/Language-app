# Task Brief
**Task:** Holistic-audit α-path + resume Stream 5.5 Phase 3 (Journal)
**Date:** 2026-05-22T15:00
**Status:** α.1 + α.2 SHIPPED ✅ · α.3 (this commit) IN PROGRESS · Phase 3 (Journal) NEXT
**corrections:** 0

---

## Path narrative

User direction reframed Phase A2 from "implement Stream 5.5 Phase 3 = Journal weekly-focus prompt bias" into "holistically audit how the 4 production surfaces trace to the documented vision and propose a restructure."

The audit ran through `super-orchestrator` (background agent), produced one sequenced restructure plan, and surfaced 4 ratification questions. User answered:
1. **C1 disposition:** Defer + remove from selector. (C1 was never in code — no UI removal needed; added to Stream 6 backlog with named dependencies.)
2. **Listening posture:** TTS-wire as v1 fallback (originally chosen).
3. **Reading wrap:** Yes, one comprehension item per text.
4. **Sequence:** Listening first, then Mobile, then Muntlig (sequential).

Architect then blocked the full Listening restructure as out-of-roadmap-scope (Stream 5.5 lane map defers Listening to Stream 3 audio infra) + scope-creep (30-question expansion = content authoring, not bug fix) + iOS Safari auto-speak silent-fail risk.

**User ratified α** (bug-only sliver, resume ratified Stream 5.5 order).

---

## Shipped in this work session

| ID | What | Commit |
|---|---|---|
| α.1 | Listening conceptId routing fix — ListenRespondQuestion type gains conceptId + errorTag; 7 questions tagged; recordResult uses real concept | `784e12b` |
| α.2 | Roleplay conceptId routing fix — RoleplayTurn type gains targetConceptId + errorTag; 12 turns tagged across 3 scenarios; recordResult uses real concept | `1260c22` |
| α.3 | Docs sync — roadmap + council log + this brief reflect the audit + α path + C1 disposition + deferrals | THIS COMMIT |

Test suite: 254/254 (was 209 at session start; +45 across α.1 + α.2 validation tests).
`tsc --noEmit` clean throughout.
`next lint` clean on touched dirs.

---

## Deferred from the audit (not in α scope)

- **Listening TTS-wire + 30-question expansion** — re-opens only on Council re-disposition or Stream 3 audio infra landing.
- **Mobile cross-cutting pass** (5 fixes: lang nb-NO, mic permission prompt, per-platform timer, tap targets, screenshot sweep) — re-evaluate post Stream 5.5 close.
- **Muntlig MediaRecorder self-listening** + **roleplay focus-overlap scenario selection** — focus-overlap half is Stream 5.5 Phase 4 already; self-listening is Stream 3 muntlig scope.
- **Reading comprehension wrap** + **NoCoLA corpus expansion** — Stream 6 backlog ("reading comprehension scoring").
- **Journal weekly archive in /uke** — folds into Stream 5.5 Phase 3 if scoped, else Stream 6.
- **C1 capability** — Stream 6 backlog with three named dependencies (concept graph + native-validated corpus + upgraded model OR paid-API tier).

---

## Next up — Stream 5.5 Phase 3 (Journal weekly-focus prompt bias)

Architect's prior D1–D5 rulings stand:
- D1: literal spec copy `Skriv en kort tekst der du bruker '‹label›' minst tre ganger`
- D2: live-lowest decayedScore concept from weeklyFocus (NOT weeklyFocus[0])
- D3: full prompt replacement + visible "ukens fokus · ‹label›" chip
- D4: silent sort focus errors to top (no visual highlight)
- D5: local Norwegian concept-label dict in src/lib/journal-prompts.ts; missing-label fallback = original daily prompt (never English-in-Norwegian)

Files in scope:
- `src/lib/journal-prompts.ts` (new) — `getJournalPrompt(fp): {prompt, focusConceptId, focusLabel}` pure read
- `src/components/journal/WritingEditor.tsx` — wire getJournalPrompt; render focus chip; sort feedback.errors focus-first
- `tests/lib/journal-prompts.test.ts` (new) — empty-focus fallback, missing-label fallback, error-sort stability, focus-pick correctness

Process for Phase 3: invoke `feature-challenger` + `council` per user's earlier "every decision through council with respondent skills" direction. This phase is more substantive than α — it touches AI feedback ordering, prompt copy, and weekly-focus integration. Deserves the deliberation.

---

## Procedural lesson recorded

The audit completed at ~14:00, α.1 and α.2 shipped at ~15:15 and ~15:20, but the Council log entry was only written at 15:00 retroactively. Future audit synthesis should include a Council `RESTRUCTURE` entry as part of the synthesis output — not as a post-hoc doc-sync step. Logged in `.council/log.md`.
