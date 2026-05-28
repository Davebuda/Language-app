# NorskCoach — Full-Depth Specification Audit

**Date:** 2026-05-27
**Baseline:** 415/415 tests passing, build clean
**Method:** 4 parallel deep-audit agents, each reading every relevant source file and tracing documented behavior against actual code paths. Three layers per feature: spec compliance, integration compliance, holistic contribution.
**Scope:** All 15 documented features (A through O) audited against CLAUDE.md, docs/vision-and-plan.md, docs/roadmap.md, and docs/validation-and-research.md.

---

## Executive Summary

| Severity | Count | Pattern |
|----------|-------|---------|
| CRITICAL | 6 | Features documented as shipped but code is dead or unwired |
| SIGNIFICANT | 17 | Partial implementations, doc-code mismatches, missing integrations |
| MINOR | 9 | Edge cases, naming issues, small gaps |
| **Total** | **32** | |

**The dominant failure mode:** Modules were designed, coded, and tested in isolation — then never wired into their consuming components. `kari-opener.ts`, `roleplay-focus-scoring.ts`, `AudioPlayer.tsx`, `WeekStrip.tsx`, and `repairBatchFromSurface` are all dead code with passing tests but zero imports from production surfaces.

**The holistic gap:** The weekly sprint is the cohesion layer that connects all surfaces. But 3 of 5 production lanes (conversation, roleplay, muntlig dashboard) have broken or missing focus-bias wiring. The learner's experience of "everything is helping me practice my 5 focus concepts" is only partially delivered.

---

## CRITICAL Findings (6)

### C1. Repair loop 2x cap does not exist
- **Spec:** F027 repair-loop cap — session capped at 2x original item count via `originalItemCountRef`
- **Docs claim:** CLOSED 2026-05-26 via `86f88f3`
- **Actual:** `originalItemCountRef` does not exist anywhere in `src/`. No session size guard in `session-store.ts:48-62` or `useSession.ts:304-343`. A weak learner who gets every item wrong faces unbounded session growth (10 items + 30 repair items = 40 items, no cap).
- **Evidence:** Zero matches for `originalItemCount` in `src/`. Only reference is `docs/roadmap.md:415` (the claim itself).
- **Impact:** Learner frustration, session abandonment for struggling users.

### C2. Conversation focus-bias is completely unwired
- **Spec:** `suggestFocusTopic` and `buildFocusHint` in `src/lib/kari-opener.ts`. "Ukens fokus" chip on topic card. Focus hint concatenated to system prompt via `combinedSuffix`.
- **Docs claim:** Stream 5.5 Phase 5 COMPLETE
- **Actual:** `kari-opener.ts` is dead code — zero imports from `conversation/page.tsx`. No "Ukens fokus" chip. No focus hint in the system prompt. The conversation AI receives no guidance about the learner's weekly focus.
- **Evidence:** `conversation/page.tsx` lines 1-23 (imports list). Grep for `suggestFocusTopic|buildFocusHint|kari-opener` in `src/app/conversation/` returns zero matches.
- **Impact:** The Talk lane doesn't participate in weekly sprint remediation. The documented "everything is helping me practice my focus concepts" experience breaks here.

### C3. Roleplay focus-ranking is completely unwired
- **Spec:** `scoreFocusOverlap` and `rankScenariosByFocusOverlap` in `src/lib/roleplay-focus-scoring.ts`. "Anbefalt" chip on top-ranked scenario.
- **Docs claim:** Stream 5.5 Phase 4 COMPLETE
- **Actual:** `roleplay-focus-scoring.ts` is dead code — zero imports from `RoleplayScreen.tsx`. Scenarios render in static array order at line 539: `ROLEPLAY_SCENARIOS.map(...)`. No "Anbefalt" chip exists on the ScenarioCard component.
- **Evidence:** Grep in `src/components/muntlig/` returns zero matches. `RoleplayScreen.tsx:35-68` (ScenarioCard) has no focus badge.
- **Impact:** The Speak lane doesn't participate in weekly sprint scheduling. Learners get no guidance on which scenario practices their focus concepts.

### C4. AudioPlayer component is dead code — 1,144 MP3s are orphaned
- **Spec:** AudioPlayer component with browser TTS fallback. All 4 CEFR levels have audio coverage. Ship-Ready criterion #9: "At least one surface plays real Norwegian audio (not browser TTS)."
- **Docs claim:** Wave 1 audio foundation DONE
- **Actual:** `AudioPlayer.tsx` has zero imports across the entire codebase. Content JSON files (`content/sentences/{a1,a2,b1,b2}.json`) contain no `audio_url` field. There is no mapping from sentence IDs to MP3 filenames. The 1,144 generated MP3 files are orphaned assets that no code path can reach.
- **Evidence:** Zero imports of `AudioPlayer` in `src/`. Content JSON files have no `audio_url` property. `ListeningExercise.tsx:79-81` uses Howler for `sentence.audioUrl` but `audioUrl` is always `undefined` because the content doesn't populate it.
- **Impact:** Ship-Ready criterion #9 is NOT met. Learners hear browser TTS (when available) or nothing, despite 1,144 high-quality MP3s sitting in `public/audio/sentences/`.

### C5. WeekStrip component is dead code — no day-dots on dashboard
- **Spec:** WeekStrip shows day-dots (filled when practiced), weekly focus chips, mid-week reveal (rawScore delta + attempts per chip). Anti-Duolingo: no streak number.
- **Docs claim:** Stream 5 Phase 6 DONE, Stream 5.5 Phase 2 extended
- **Actual:** `WeekStrip.tsx` has zero imports from `dashboard/page.tsx` or any other file. No day-dots render. The streak number IS shown twice (dashboard header line 293 and stat strip line 358-363), violating the anti-Duolingo design.
- **Evidence:** Zero imports of `WeekStrip` in `src/`. Dashboard shows streak counters at two locations.
- **Impact:** The learner has no weekly visual rhythm. The documented experience of "I can see which days I practiced and how my focus concepts are progressing" doesn't exist. Two streak counters directly contradict the anti-Duolingo design philosophy.

### C6. All template explanations are in English on learning surfaces
- **Spec:** Norwegian dominates every learning surface (~99% Norwegian).
- **Actual:** Template explanations across all 3 AI backends (`webllm.ts:49-55`, `stub.ts:23-52`, `route.ts:62-70`) and the server-client fallback (`server-client.ts:48`) return English text ("You wrote..."). These display on `ExplanationCard` in the session repair loop — a core learning surface.
- **Evidence:** All template strings start with English ("You wrote", "Try again", etc.).
- **Impact:** Every repair loop explanation — the most pedagogically important moment — breaks the Norwegian-dominates principle. This is the exact moment the learner should be reading Norwegian guidance.

---

## SIGNIFICANT Findings (17)

### S1. Error taxonomy count mismatch
- **Spec:** "17-tag error taxonomy"
- **Actual:** 18 tags (11 grammar + 3 vocabulary + 3 comprehension + 1 meta `unspecified`).
- **Evidence:** `src/types/taxonomy.ts:45-50`, `ALL_ERROR_TAGS` array.

### S2. selectWeeklyFocus algorithm doesn't match docs
- **Spec:** "selectWeeklyFocus picks 5 weakest concepts"
- **Actual:** Picks 3 weakest by decayedScore + up to 2 SRS-due, capped at 5. Not purely weakness-based.
- **Evidence:** `src/engine/weekly-sprint.ts:33-35` (`WEAK_PICK_COUNT=3, SRS_PICK_COUNT=2`).

### S3. B1->B2 level progression is incomplete
- **Spec:** Level progression should seed new concepts and open a weekly sprint (parity with A1->A2 and A2->B1).
- **Actual:** B1->B2 only sets the level string and localStorage flag. No `seedInitialMastery` and no `ensureWeekOpen` call.
- **Evidence:** `src/hooks/useFingerprint.ts:342-345` vs. `:319-330` (A1->A2) and `:334-338` (A2->B1).

### S4. Journal doesn't use repairBatchFromSurface
- **Spec:** "Errors pushed to fingerprint via repairBatchFromSurface"
- **Actual:** Hand-rolled loop calling `logError` + `updateConceptMastery` + `aggregateErrorPatterns` directly. `repairBatchFromSurface` is only imported in its own test file.
- **Evidence:** `src/components/journal/WritingEditor.tsx:11,148-180`.

### S5. Dead config in SessionRecipe
- **Spec:** `targetDurationSeconds` (750) and `minNewVocabItems` (3) exist in the recipe type.
- **Actual:** Neither field is consumed by the scheduler. Actual session size is driven by `LEVEL_BLOCK_SIZES` (25 items for all levels, ~18.75 min at 45s/item).
- **Evidence:** `src/types/session.ts:53-54` (defined), `src/engine/scheduler.ts` (zero references).

### S6. Dashboard missing Muntlig section
- **Spec:** "Dashboard 'Muntlig' section links to all three" (/shadow, /drills, /listen).
- **Actual:** Dashboard only renders `CORE_LANES`. Muntlig lanes are defined in `lane-completion.ts:59` but explicitly marked "Ikke eksponert pa dashbordet" (not exposed on dashboard).
- **Evidence:** `src/app/dashboard/page.tsx:201-203,221-222`.

### S7. Drill conceptIds corrupt grammar mastery
- **Spec:** Drills should feed the fingerprint.
- **Actual:** Drill sets map to unrelated grammar concepts (`kj-sound -> common-prepositions`, `sj-sound -> basic-adjectives`, etc.). Pronunciation practice incorrectly modifies grammar mastery scores.
- **Evidence:** `src/lib/drillContent.ts:18-71`.

### S8. Mid-week reveal incomplete
- **Spec:** "rawScore delta + attempts per focus chip"
- **Actual:** Shows only up to 3 concepts (not 5) with score delta but NOT attempts per chip.
- **Evidence:** `src/app/dashboard/page.tsx:231-241`.

### S9. "Feil niva?" escape hatch missing from profile
- **Spec:** "Feil niva? escape hatch card routing to /uke"
- **Actual:** Not found anywhere in the profile page. Zero results for "Feil niva" in entire codebase.
- **Evidence:** `src/app/profile/page.tsx` (full read, no matching card).

### S10. handleExplain bypasses AI validity gate
- **Spec:** "ALL AI surfaces flow through validateNorwegianOutput"
- **Actual:** `handleExplain` in `route.ts:73-78` and `explainMistake` in `webllm.ts:248-266` do NOT call `validateNorwegianOutput`. AI-generated mistake explanations reach the learner unvalidated.
- **Evidence:** `src/app/api/ai/route.ts:73-78`, `src/ai/webllm.ts:248-266`.

### S11. English labels on learning surfaces
- **Spec:** Norwegian dominates every learning surface.
- **Actual:** `ExplanationCard.tsx:31` — "Repair loop". `ExerciseCard.tsx:37` — "Exercise type". `AIStatusBadge.tsx:15` — "AI unavailable . templates". `RoleplayScreen.tsx:56` — "Voice".
- **Evidence:** Listed files and lines.

### S12. Event logging only covers session loop
- **Spec:** "Auth users produce anonymized rows for every scoreable interaction"
- **Actual:** Only the session completion page calls `logSessionResults`. Conversation, roleplay, listen, drills, and shadow do NOT write to `learning_events_log`.
- **Evidence:** `src/app/session/complete/page.tsx:103` is the only call site. Zero calls from conversation, roleplay, listen, drills, or shadow.
- **Impact:** Analytics surface (`/analytics`) only sees ~50% of learning activity. The moat metric ("repair loop accelerates learning") cannot be computed across all surfaces.

### S13. All listen/roleplay/drills content is A1-only
- **Spec:** B1/B2 learners should practice level-appropriate concepts.
- **Actual:** All content in `listenRespondContent.ts`, `roleplayContent.ts`, and `drillContent.ts` is hardcoded to A1 concepts. A B2 learner doing roleplay practices `present-tense-regular` and `question-formation`.
- **Evidence:** Listed content files — all conceptIds are from `content/concepts/a1-graph.json`.

### S14. Streak number shown on dashboard (anti-Duolingo violation)
- **Spec:** "Day-dots only (filled when practiced). No streak number."
- **Actual:** Streak number displayed prominently at two locations.
- **Evidence:** `src/app/dashboard/page.tsx:293` and `:358-363`.

### S15. No "Ukens fokus" chip on conversation topic card
- **Spec:** "Ukens fokus" chip should appear on the topic card.
- **Actual:** Topic selection grid at lines 354-384 shows hardcoded topics with no focus indication.
- **Evidence:** Grep for "Ukens fokus" in `src/app/conversation/` returns zero matches.

### S16. No "Anbefalt" chip on roleplay scenario cards
- **Spec:** Top-ranked scenario should show "Anbefalt" chip.
- **Actual:** `ScenarioCard` component has no focus badge, no "Anbefalt" text.
- **Evidence:** `src/components/muntlig/RoleplayScreen.tsx:35-68`.

### S17. Diagnosis surfacing is conditional and ephemeral
- **Spec:** "Diagnosis output surfaced on dashboard session card"
- **Actual:** Only surfaces when the session lane is the top-scoring recommendation AND a diagnosis rule fires. No standalone diagnosis view. Results are not stored — ephemeral per scheduler call.
- **Evidence:** `src/lib/coach-recommendation.ts:115,132`.

---

## MINOR Findings (9)

### M1. SRS reset behavior undocumented
- SRS level fully resets to 0 on any wrong answer, rather than stepping back one level. Valid design choice but not documented.
- **Evidence:** `src/engine/fingerprint.ts:122`.

### M2. DiagnosticResult.rawScore naming collision
- `DiagnosticResult.rawScore` is 0-1 IRT scale; `ConceptMastery.rawScore` is 0-100 EMA scale. No functional bug but confusing.
- **Evidence:** `src/lib/diagnostic/engine.ts:21` vs `src/types/fingerprint.ts:38`.

### M3. Interleaving pool bypasses repeat cap
- Interleaving items use `addItem` instead of `addItemCapped`, allowing a concept to appear in both remediation (capped at 2) and interleaving (uncapped).
- **Evidence:** `src/engine/scheduler.ts:290`.

### M4. Graduate detection inconsistency
- `buildWeeklyCheckItems` uses `decayedScore` to find graduates, but `isGraduated` uses `rawScore`. Since `decayedScore <= rawScore`, some graduates may be missed in check items.
- **Evidence:** `src/lib/weekly-check.ts:45` vs `src/engine/weekly-sprint.ts:117`.

### M5. No CEFR filter in weekly check
- `WeeklyCheckScreen.tsx:26-39` resolves sentences without `filterSentencesByLevel`. Could theoretically surface higher-level sentences.
- **Evidence:** `src/components/weekly/WeeklyCheckScreen.tsx:26-39`.

### M6. /listen has 7 questions, not 8
- **Spec:** "8 questions with focus-biased ordering"
- **Actual:** 7 questions in `listenRespondContent.ts`.
- **Evidence:** `src/lib/listenRespondContent.ts:16-87`.

### M7. Shadow fallback conceptId
- `ShadowingScreen.tsx:68` falls back to `'personal-pronouns'` when a sentence has no conceptIds. Defensive but hardcoded.

### M8. Dead "Mer informasjon" button
- `CoachHeroCard.tsx:132-138` has a button with ArrowUpRight icon and no onClick handler. Does nothing.
- **Evidence:** `src/components/dashboard/CoachHeroCard.tsx:132-138`.

### M9. Vestigial config fields
- `targetDurationSeconds` and `minNewVocabItems` in SessionRecipe are never consumed. (Overlap with S5 but listed separately as cleanup item.)

---

## Holistic Assessment

### Does the system deliver the documented learner experience?

**"I have 5 concepts to lock in this week. Every feature in the app is helping me practice them. On Saturday I prove whether I've got them."**

| Lane | Focus-connected? | Verdict |
|------|-----------------|---------|
| Drill (Session) | YES — scheduler biases 40% pool | Working as documented |
| Write (Journal) | YES — focus-biased prompts work | Working (minor: uses hand-rolled repair, not shared module) |
| Talk (Conversation) | NO — kari-opener.ts is dead code | **BROKEN** — no focus awareness |
| Speak (Roleplay) | NO — roleplay-focus-scoring.ts is dead code | **BROKEN** — no focus ranking |
| Read (Reading) | YES — concept-tagged with exposure logging | Working as documented |
| Listen/Shadow/Drills | PARTIAL — listen has focus ordering, but not on dashboard | Missing dashboard visibility |
| Plan (WeekStrip) | NO — WeekStrip.tsx is dead code | **BROKEN** — no weekly visual |
| Check (/uke) | YES — focus-tied retrieval check | Working as documented |
| Graduate (closeWeek) | YES — graduation rule with thresholds | Working as documented |

**3 of 9 lane touchpoints are broken. The weekly sprint engine works internally but its UI layer (WeekStrip) and 2 of its 5 practice lanes (conversation, roleplay) are unwired.**

### Does the moat work end-to-end?

| Moat Pillar | Status | Gap |
|-------------|--------|-----|
| **Diagnosis** | PARTIAL | 4 rules work. Surfacing is conditional. Taxonomy count is wrong in docs. |
| **Scheduling** | PARTIAL | Session loop scheduling is correct. But conversation and roleplay don't consume weekly focus, so the scheduling benefit doesn't reach those surfaces. |
| **Remediation** | PARTIAL | Repair loop works within sessions but has no size cap (C1). Non-session surfaces write SRS state but don't log to analytics (S12). |

### Ship-Ready criteria status

| # | Criterion | Status |
|---|-----------|--------|
| 1 | Get placed | PASS |
| 2 | Practice daily | PASS (session loop works) |
| 3 | Write freely | PASS (journal works) |
| 4 | Converse | PARTIAL (corrections work, focus bias broken) |
| 5 | Practice speaking | PARTIAL (roleplay works, focus ranking broken) |
| 6 | See the week | FAIL (WeekStrip dead code, streak counters violate anti-Duolingo) |
| 7 | Prove it Saturday | PASS (/uke works) |
| 8 | See their profile | PARTIAL (missing "Feil niva?" escape hatch) |
| 9 | Hear Norwegian | FAIL (AudioPlayer dead code, 1,144 orphaned MP3s) |
| 10 | Auth works | PENDING (manual user actions) |
| 11 | No lies | FAIL (dead buttons, dead code documented as shipped) |
| 12 | Tests pass | PASS (415/415) |

**4 of 12 ship-ready criteria have failures. 3 are partial. 4 pass cleanly. 1 pending user action.**

---

## Prioritized Remediation Plan

### Priority 1 — Wire dead code (fixes 4 CRITICAL + 4 SIGNIFICANT)
These modules exist, are tested, and just need to be imported:

| Task | Effort | Fixes |
|------|--------|-------|
| Import `WeekStrip` in dashboard, remove streak counters | 30 min | C5, S14 |
| Import `kari-opener.ts` in conversation page, add "Ukens fokus" chip | 1 hour | C2, S15 |
| Import `roleplay-focus-scoring.ts` in RoleplayScreen, add "Anbefalt" chip | 1 hour | C3, S16 |
| Wire `audio_url` in content JSON, import AudioPlayer on at least one surface | 2-3 hours | C4 |

### Priority 2 — Fix broken contracts (fixes 2 CRITICAL + 3 SIGNIFICANT)

| Task | Effort | Fixes |
|------|--------|-------|
| Implement repair loop 2x cap (`originalItemCountRef` or equivalent) | 1 hour | C1 |
| Translate all template explanations to Norwegian | 2 hours | C6, S11 |
| Add `validateNorwegianOutput` to `handleExplain` paths | 30 min | S10 |

### Priority 3 — Complete missing features (fixes 5 SIGNIFICANT)

| Task | Effort | Fixes |
|------|--------|-------|
| Add Muntlig section to dashboard (lanes already defined) | 1 hour | S6 |
| Add "Feil niva?" escape hatch card to profile | 30 min | S9 |
| Fix B1->B2 level progression (add seedInitialMastery + ensureWeekOpen) | 1 hour | S3 |
| Refactor journal to use `repairBatchFromSurface` | 30 min | S4 |
| Add event logging to conversation, roleplay, listen, drills, shadow | 2-3 hours | S12 |

### Priority 4 — Content + doc cleanup (fixes remaining SIGNIFICANT + MINOR)

| Task | Effort | Fixes |
|------|--------|-------|
| Fix drill conceptIds (add pronunciation concept or neutral mapping) | 1 hour | S7 |
| Update CLAUDE.md: 18 tags not 17, selectWeeklyFocus algorithm, session duration | 30 min | S1, S2, S5 |
| Extend mid-week reveal to show 5 concepts + attempts | 1 hour | S8 |
| Add 8th question to /listen | 15 min | M6 |
| Add B1/B2 content for roleplay/listen/drills | Multi-day | S13 |

### Estimated total effort
- Priority 1 (wire dead code): ~5 hours
- Priority 2 (fix contracts): ~3.5 hours
- Priority 3 (missing features): ~5 hours
- Priority 4 (content + cleanup): ~4 hours + multi-day content work
- **Total code work: ~17.5 hours** (excludes B1/B2 content authoring)

---

## Appendix: Features That Pass All Three Layers

These features are correctly implemented, correctly integrated, and serve the moat as documented:

- **Diagnostic Placement** — IRT-style quiz, seeds fingerprint correctly, calibration window works
- **Session Loop Scheduler** — 40/30/20/10 recipe, weak concept selection, SRS review, repeat cap, production guarantee, Fisher-Yates shuffle, CEFR filter, passed-sentence filtering, selectionReason field — all verified correct
- **Weekly Check /uke** — 6-8 items, focus + graduates, recordResult, closeWeek graduation, event logging
- **Mastery + Decay + SRS** — Phase-adaptive EMA (correct alphas), slip detection, 25-day half-life, floor 35, SRS ladder [1,3,7,14,30] — all verified correct
- **Repair Loop (within sessions)** — explanation + 2 micro-drills + retry, correct SRS scheduling (minus the missing cap)
- **Journal** — Focus-biased prompts work, errors feed fingerprint, AI validation works (minus the shared module issue)
- **Reading** — Concept-tagged, exposure logging works, weight 0.3x correct
- **CEFR Sentence Filter** — Correctly prevents cross-level leakage in the scheduler
- **Shadow Mode** — Feeds fingerprint, feeds lane completion, uses audio
- **Listen Mode** — Focus-biased ordering works, feeds fingerprint, speaking minutes tracked
