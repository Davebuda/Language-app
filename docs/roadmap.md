# NorskCoach — Roadmap

The current build sequence with every research-validated priority locked in. This document supersedes earlier scattered planning. If you want to know what's next, what's deferred, and why — start here.

## Current Position — P0.5 RECOVERY COMPLETE 2026-05-21T21:00

**P0.5 Recovery Bundle signed off:** 15 tasks complete across 16 commits in a single session. Sign-off report: `.council/reports/2026-05-21-2100-recovery-signoff.md`. All 11 Critical findings closed; 17 of 20 Significant closed; 4 of 9 Minor closed via code, the remaining 5 closed via analysis; 4 Edge cases preserved as documented gaps (not regressions).

**Headline closures across the moat:**
- Diagnosis: F036 (concept-id reconciliation), F017 (diagnostic rawScore floor), F031 (history wipe), F022 (AI explainer correctness) — all closed.
- Scheduling: F019 (scheduler warnings 36+ → 0), F011 (`[unavailable]` placeholder), F010 (errorTag collapse) — all closed.
- Remediation: F030/F034 (conversation/journal silent-drop), F029/F033 (Kari + journal AI gibberish), F012/F023 (session lifecycle) — all closed.

**Muntlig scripted roleplay (step 5) is UNBLOCKED.** Whether to resume immediately, or course-correct based on recovery learnings, is the next product decision.

**Two procedural locks added this round:**
1. Fingerprint pre/post diffs are mandatory acceptance evidence for any task claiming to feed the engine.
2. AI output passes through one shared validity gate (`validateNorwegianOutput`), not per-call-site validation.

The prior plan's three streams resume from a clean foundation:
- Stream 1 engine corrections (A1 model swap bridged by the validity gate; A2–A4 unchanged status from prior closure)
- Stream 2 UI transformation (UI-1.3 shipped; UI-2 remaining screens still queued)
- Stream 3 muntlig module (steps 1–4 shipped; step 5 scripted roleplay shipped before P0.5, now unblocked for the build target decision)

**Deferred from P0.5 (documented gaps, not regressions):** F008 path-traversal tightening, F025 session resume on re-entry, F027 repair-loop cap, F032 journal SSR mismatch, F035 reading visited indicator, AlertDialog primitive upgrade, authenticated-user walkthrough.

Recovery backlog: `docs/recovery-backlog.md` (P0.5 task table)
Walkthrough report: `test-reports/stress-walkthrough-2026-05-21/report.md`
Sign-off: `.council/reports/2026-05-21-2100-recovery-signoff.md`

---

## Stream 1 — Engine Corrections

These four changes are correctness, not optimization. They emerged from the validation research and address things that have been silently degrading the system. **They are not peers — 1.1 is a correctness gate; 1.2–1.4 are deferred until UI-1.2 is verified done.** Order within 1.2–1.4 matters; see the operating sequence below.

### 1.1 Norwegian model quality — CORRECTNESS GATE, three-step path

**Why:** Vanilla Llama-3.2-3B has documented Norwegian failure modes — English drift mid-response, V2 word-order violations, fabricated compound words. Every shipped AI surface (conversation, constraint evaluation, semantic grading, mistake explanations) is affected. This is a live correctness defect, not an enhancement.

**Research finding:** NB-Llama-3.2-3B is NOT in the web-llm prebuilt registry and exists only in GGUF format (llama.cpp/Ollama). There is no 3B Instruct variant from NbAiLab. The prior claim that this was "a model identifier change" was incorrect. See three-step path below.

**Step 1 — Prompt-harden the current Llama-3.2-3B (in progress).**
Explicit Norwegian-enforcement rules added to every AI call site: require Bokmål output, prohibit English drift, enforce V2 word order in generated sentences, compound-word heuristic (words >18 chars trigger retry with simpler-vocabulary note). Applied across all five prompt builders. Run `/eval`, user reviews JSON. Three outcomes: (a) clears the bar → provisionally done; (b) partial → proceed to Step 2 with Step 1 as interim; (c) no improvement → Step 2 urgent.

**Step 2 — Compile NB-Llama-3.2-1B-Instruct for web-llm (if Step 1 insufficient).**
`NbAiLab/nb-llama-3.2-1B-Instruct` exists on HuggingFace. MLC compile pipeline: `mlc_llm convert_weight` → `gen_config` → WebGPU WASM → host artifacts → register custom `appConfig`. Keeps in-browser AI. Uses 1B (smaller, but Norwegian-tuned and Instruct-tuned). The 3B base model has no Instruct variant. Estimated half-day pipeline.

**Step 3 — Server-side Ollama on VPS (last resort only).**
NB-Llama GGUF via Ollama on the Hetzner VPS. AI module calls VPS endpoint instead of web worker. Full 3B quality. Loses local-first AI property. Only considered if Step 2 also fails the bar.

**Reasoning:** prove the cheap fix doesn't work before committing to the expensive one — same discipline as the rest of the project.

**Eval harness:** Real and runnable at `/eval`. 19 tasks × 3 runs. Human-reviewed JSON output, not automated. No build needed.

**Native speaker gate (Option B, provisional):** User reviews `/eval` JSON at their current Norwegian level. Pass: no English drift, no V2 violations, no obvious grammar errors. Native speaker review queued as follow-up before any muntlig content generation depends on the model.

**Runs in parallel with:** UI-1.2 scoping pass. Does not run concurrently with UI-1.2 build.

**Priority:** Highest. Unblocks muntlig. Fixes a live defect.

### 1.2 Shorten decay half-life — deferred to post-UI-1.2

**Why:** Current half-life is 46 days. Forgetting-curve research shows the steepest decay happens in the first month. The floor-of-35 concept is correct; the half-life is too slow.

**Scope:** Change the half-life constant in `applyDecayWithFloor` from 46 to ~25 days. No other changes. The floor stays at 35.

**Acceptance:** Trace at minimum three points along the decay curve (not just one): rawScore 85 at 30 days, rawScore 60 at 45 days, rawScore 50 at 60 days — confirm all sit materially lower under the new constant without punching through the floor of 35.

**Priority:** Medium. One-constant change. Do as a standalone move after UI-1.2 ships.

### 1.3 Calibration window for first 5 sessions — deferred to post-A2, analysis-first

**Why:** Diagnostic-seeded estimates have wide confidence intervals for the first ~5 sessions. The engine should gather data aggressively and personalize less aggressively until real performance data accumulates.

**Scope:** Add a `calibration_sessions_remaining` counter to the fingerprint (initialized to 5 after diagnostic). While > 0, the scheduler skews toward variety: wider concept pool, reduced repeat-concept allowance, slightly higher new-material weight. Decrement on session completion. Standard behavior resumes after 5.

**Architecture note — requires analysis pass before coding:** This is not a one-constant change. Three questions must be answered before a line is written: (1) does the counter live in the fingerprint blob or as a separate field? (2) how do existing users (no calibration flag in their fingerprint) get initialized — default to 0 or treated as post-calibration? (3) does the scheduler read the flag from the Zustand store directly or from a derived selector? Brief 2–3 option analysis required; stop for approval before building.

**Acceptance:** First 5 sessions cover more distinct concepts than later sessions; the fingerprint records the calibration flag; standard behavior resumes correctly after session 5.

**Priority:** Medium. Improves first-impression experience. Slot after A2.

### 1.4 Anonymized event logging — deferred to post-A3

**Why:** All learner state is a JSON blob. There is no way to query "does the repair loop accelerate learning?" — the architectural moat is unproven without data. The fix doesn't compromise local-first privacy; it adds a parallel write of anonymized events.

**Scope:** A new Postgres table `learning_events_log`. Schema: `{event_type, concept_id, correct_bool, timestamp, anonymous_session_id}` — no user id, no content. Write fire-and-forget on session completion for auth users. Anonymous guests excluded. Nothing reads it back in v1; it exists for future analytics.

**`anonymous_session_id` scheme — decided:** Per-user-hashed (one-way hash of the user id). Rationale: the log's purpose is longitudinal — "does repair loop usage correlate with mastery gains over time?" Per-session-random cannot answer that. Per-device-stable compromises the privacy story. Per-user-hashed gives per-learner continuity while keeping the analytics dataset structurally separate from user-identifying data.

**Acceptance:** Sessions produce log rows; no PII in the schema; anonymous guests produce no rows; existing learner-facing flows unchanged.

**Priority:** Medium. Cheap to add now; impossible to retroactively backfill. Slot after A3. Has future-value-only payoff and can wait the longest of the four corrections.

---

## Stream 2 — UI Transformation (in progress)

Aesthetic and component foundation laid. Continuing through the screens in the architect's reordered sequence (simplest surface first to prove the visual language; most complex last).

### UI-0 — Foundation (DONE)

Diff triage, aesthetic direction declared, token contract resolved (--nc-red* is the single brand system, violet dropped), commit sequence staged.

### UI-1.0 — Typeface + Primitive Audit (DONE)

Schibsted Grotesk selected as single family. Shadcn primitives audited; install at the surface that needs them, not speculatively. Type scale documented in `docs/ui-1/` and inherited by subsequent screens.

### UI-1.1 — Onboarding Pass (DONE)

White-buttons-on-dark-canvas slop fixed. Tokens remapped. `role="progressbar"` accessibility added without a Radix install. PlacementQuiz cleanup. The type scale was applied and verified — T1 prompt is the dominant element. The "Norwegian dominates" principle was sharpened in docs to apply to learning surfaces, not assessment surfaces.

### UI-1.2 — Session Loop (DONE — closed 2026-05-20)

All four exercise surfaces (TranslationExercise, SpeedRound, WordOrderExercise, FillInBlankExercise) pass the 1.6× Norwegian-dominates acceptance test at all four breakpoints (375/768/1280/1920px). The Playwright walkthrough on the same date subsequently surfaced session-loop correctness bugs (P0 recovery batch) — the UI work is preserved; the correctness work is what's open.

### UI-1.3 — Dashboard

Composition pass once the session loop has set the component vocabulary. Wires or removes dead buttons (hamburger, notifications, share).

### UI-2 — Remaining Screens

Conversation, Progress, Landing. Order TBD by architect when UI-1 closes.

### UI-3 — Cleanup

Dead `nc-*` classes removed, dead buttons resolved one way or the other, single Lighthouse pass.

---

## Integrity Follow-ups (noted, not scheduled)

Small correctness issues surfaced during UI-1.2 that are out of scope for the current pass. Each needs a slot — don't let them disappear.

**1. Blank indicator size mismatch in FillInBlankExercise (UI polish).**
At `lg`+ breakpoints the inline blank indicator (`text-xl` / 20px) sits visibly smaller than the surrounding sentence text (32px at `lg`). The hierarchy between prompt and answer buttons still passes the 1.6× rule; this is cosmetic. Belongs in the UI-3 polish pass alongside the `nc-*` cleanup.

**2. Hardcoded `errorTag: 'verb-conjugation'` in FillInBlankExercise (correctness bug).**
Both `MultipleChoice.choose()` and `FreeText.submit()` hardcode `errorTag: 'verb-conjugation'` regardless of the actual error. This is the same fingerprint-pollution pattern fixed elsewhere with the `error_tags_detectable` swap — wrong answers get tagged with the wrong error type, which corrupts the mistake fingerprint and misdirects the repair loop. Fix: derive the error tag from `sentence.errorTagsDetectable[0]` (or the concept's primary tag) instead of hardcoding. This is a real bug — not cosmetic — but out of scope for UI-1.2. Schedule as part of the engine-correctness clean-up pass after UI-1.2 closes.

**3. Stale `userInput` closure in SpeedRound timer (correctness bug).**
The `setInterval` in `SpeedRound` captures `userInput` from the `useEffect` closure at mount time. When the timer expires and auto-submits, it calls `submitAnswer(userInput)` with the stale empty string, not the value the user has actually typed. This means a learner who was mid-answer when time ran out gets recorded as a wrong answer with `userAnswer: ''` — corrupting the fingerprint with fake failure data. This is the same shape as the `inferErrorTag` pollution already fixed: wrong data flowing into the learning model from a production exercise surface, not a cosmetic issue. Fix: use a `useRef` to track the live input value alongside the `useState`, and reference `inputRef.current.value` (or a parallel `userInputRef.current`) in the timer callback. Schedule after UI-1.2 closes.

---

## Stream 3 — Muntlig Module (next major build after UI-1 converges)

The full speaking-practice system. Designed, costed, and validated as zero-cost-buildable in `docs/muntlig/architecture.md`. Will require:

- Batch-generating Norwegian audio with chatterbox-tts-norwegian (offline, stored as static files)
- Seeding content from the NoCoLA dataset (144,867 learner-corrected Norwegian sentences, free)
- Implementing the four modes: shadowing, scripted roleplay, pronunciation drills, listen-and-respond
- Self-listening playback + rule-based heuristics for pronunciation feedback (not phoneme-level scoring, which is impossible at zero cost — and that's research-supported as pedagogically fine)
- Visible JavaScript countdown for listen-and-respond timing

**NB-Llama dependency is scoped:** Audio infrastructure (chatterbox-tts-norwegian), NoCoLA content seeding, and all four mode UIs do not require NB-Llama. Only the _batch content generation_ step (generating variety beyond the NoCoLA corpus) needs NB-Llama. Those two workstreams are now decoupled. Build order: audio infra → shadowing UI → pronunciation drills → listen-and-respond → scripted roleplay → NB-Llama content generation (when model swap completes).

See `docs/muntlig/architecture.md` for the full spec.

---

## Stream 4 — Ambient Learning (parallel with P1, added 2026-05-21)

Three lightweight features that create daily learning moments outside of full sessions. Added by explicit user direction after architect review — architect concerns (moat trace, deferred backlog adjacency) are logged in `.council/log.md`. These are display/reassurance surfaces; they do not feed the adaptive engine in v1.

### 4.1 Daily Learning Card

One grammar rule + Norwegian example sentence + reveal interaction. Rotates daily via `new Date().getDate() % 7`. Appears on landing page and dashboard.

**Files:** `src/components/DailyLearningCard.tsx`, `src/lib/dailyContent.ts`, `src/app/page.tsx`, `src/app/dashboard/page.tsx`

**Seed:** 7 grammar rules (V2 word order, noun gender, definite forms, adjective agreement, prepositions, reflexive verbs, question formation).

**UX decisions locked:** translation always visible on landing, tap-to-reveal on dashboard.

**Acceptance:** Renders on `/` and `/dashboard` with same content on a given day. Norwegian sentence is T1 dominant element. Accessible (ARIA, keyboard). No new dependencies.

### 4.2 Daily Word Pack

4–6 Norwegian words with meaning + example sentence. Same date-based rotation. Dashboard only. Display-only in v1 (no "mark as learned" interaction — deferred to v2 with vocab SRS).

**Files:** `src/components/DailyWordPack.tsx`, `src/lib/dailyContent.ts` (words added), `src/app/dashboard/page.tsx`

**Seed:** 42 words (7 days × 6 words) covering daily routines, common verbs, emotions, food, travel. Bokmål.

**Acceptance:** 4–6 words render daily, no horizontal scroll on mobile, screen-reader friendly.

### 4.3 Progress Reassurance Strip

Small strip reading from fingerprint — concepts practiced, speaking minutes, grammar themes improved. Reads only, writes nothing. Falls back to "Start your first session to see progress." for new users.

**Files:** `src/components/ProgressReassuranceStrip.tsx`, `src/app/dashboard/page.tsx`

**Note:** This strip is the closest to the engine (reads fingerprint). It belongs inside UI-1.3 dashboard long-term — once UI-1.3 runs, fold this component in rather than building a parallel version.

**Acceptance:** Renders with real fingerprint data or fallback. Layout holds on 375px and 1280px. No layout shift.

---

## Stream 5 — Weekly Sprint (Curriculum Cohesion Layer)

Added 2026-05-21T21:35 as the next committed phase. Selected by super-orchestrator on strongest moat trace; Council ran research gate (3 web searches), resolved 3 product decisions via constitutional reasoning, and RESTRUCTUREd the roadmap. See `.council/log.md` 2026-05-21T21:35 entry and `.council/research.md` for full reasoning.

### Why this is the next phase

The engine produces per-session and per-day signals today. The SRS ladder already operates on weekly-scale intervals (1→3→7→14→30 days). But the learner has no weekly-scale visibility, no weekly target, and no weekly retention proof. This is the smallest structural change that lands on **all three moat legs** (diagnosis + scheduling + remediation), pushes toward the north star (speaking minutes target), and unlocks the first read use case for `learning_events_log` — answering "is the repair loop accelerating learning week-over-week?"

### The shape — Weekly Sprint

A 7-day cycle with five touchpoints that interlock with existing systems:

| Day | Touchpoint | What changes | Engine integration |
|---|---|---|---|
| Mon | **Plan** — "Denne ukens fokus" | Dashboard shows 5 focus concepts the scheduler picks from fingerprint weakest + SRS-due nodes | Writes `weeklyFocus` array + `weekStartedAt` to fingerprint |
| Tue–Fri | **Practice** — daily sessions | Scheduler biases (not locks) toward week's focus concepts; recipe stays 40/30/20/10 but the 40% remediation pool prefers focus | Scheduler reads `weeklyFocus`; existing repair loop, SRS, decay unchanged |
| Mid-week | **Reveal** — small strip on dashboard | Shows rawScore delta + attempts on each focus concept this week | Reads existing fingerprint deltas; no new state |
| Sat | **Ukens repetisjon** — short adaptive retrieval check at `/uke` | 6–8 items drawn from this week's focus + last week's graduates. Functions like a mini-diagnostic | New surface; uses existing exercise components; results flow through normal `recordResult` path |
| Sun | **Graduation** — automatic | Concepts that hit threshold AND cleared the weekly check graduate; misses re-queue into next week | One snapshot write on first session of new week: closes the week, opens the next |

Learner's mental model: *"I have 5 concepts to lock in this week. The app picks them. I'll know on Saturday if I've actually got them."*

### Product decisions (resolved via constitutional reasoning, not escalated)

1. **Weekly check is OPTIONAL with a strong nudge + honest banner.** No mandatory gate. Week closes whether or not the learner takes it. Honest banner if skipped.
2. **Minimalist presentation.** No streak number on the week-strip; day-dots only (filled when practiced). Existing `currentStreak` field stays on profile where it already lives. Explicit anti-Duolingo posture.
3. **Honest reset on absence.** Returning after >7 days from `weekStartedAt` closes the previous week as `abandoned`, picks fresh focus from current fingerprint state. Decay already does its work; no need to duplicate at the week level.

### Phased plan

**Phase 1 — Data model + selection logic.** No UI. Mechanical.
- `MistakeFingerprint` gains: `weeklyFocus: ConceptId[] (≤5)`, `weekStartedAt: ISODate | null`, `weeklySprintHistory: WeeklySprintRecord[]`.
- `WeeklySprintRecord` = `{ weekStartedAt, focus, status: 'active'|'completed'|'abandoned', focusOutcomes: Record<ConceptId, {startScore, endScore, attempts}>, checkResult?: {takenAt, score, items} }`.
- New module `src/engine/weekly-sprint.ts`: `selectWeeklyFocus(fingerprint, conceptGraph): ConceptId[]` — union of (a) weakest 3 by `decayedScore`, (b) up to 2 SRS-due where `nextReviewAt <= weekEnd`, capped at 5, deduped, respecting phase model (no locked concepts).
- Idempotent migration in `useFingerprint.ts` (same pattern as P0.5-02 concept-id migration).
- Tests: focus selection deterministic; migration idempotent; absence-reset triggers correctly at >7 days.

**Phase 2 — Authenticated-user walkthrough + Supabase sync verification.** One session. Slotted between Phase 1 and Phase 3 because Weekly Sprint adds new Supabase write paths that have never been exercised.

**Phase 3 — Scheduler bias pass.** Adjust `generateSession` so the 40% remediation pool prefers `weeklyFocus` concepts while honouring existing `firstEligibleType` guard and concept-repeat cap. Recipe stays 40/30/20/10. Tests: existing scheduler invariants preserved; focus bias measurable.

**Phase 4 — Weekly Check surface.** `/uke` route + `WeeklyCheckScreen` component. Reuses `ExerciseCard`. 6–8 adaptive items drawn from focus + previous-week graduates. Result writes to fingerprint via normal `recordResult` AND a new `learning_events_log` event type `weekly_check_complete`. AlertDialog primitive installed (deferred from P0.5) for "Skip weekly check" confirmation.

**Phase 5 — Sunday graduation job.** Runs on first session of any new week (no cron, no server cost). Closes previous week into `weeklySprintHistory`, picks new focus, writes new `weekStartedAt`. Tests: simulated learner across 3 consecutive weeks.

**Phase 6 — Dashboard week-strip.** Composition into UI-1.3 dashboard (queued anyway). 375px compact horizontal bar showing focus-concept progress dots; 1280px+ expanded card with rawScore deltas. Folds with UI-1.3 instead of being built parallel.

**Phase 7 — Anti-Duolingo aesthetic guard + audit.** `/baseline-ui` against week-strip and `/uke`. No bright streak rockets, no XP numbers, no league badges. `/audit` for P0–P3 scored review.

### Acceptance for the whole stream
- Three consecutive simulated weekly sprints rotate focus correctly per `engine-tester`.
- Weekly check produces a `learning_events_log` row (first read use case unlocked).
- 40/30/20/10 scheduler distribution preserved within ±5pp under focus bias.
- Dashboard week-strip passes `/baseline-ui` and `/baseline-ui` typographic dominance test.
- Authenticated path fully traced (Phase 2 walkthrough).
- Honest-reset banner verified via simulated 8-day absence.

### Procedural locks (carried from P0.5)
- Fingerprint pre/post diffs are mandatory acceptance evidence for every phase touching engine write paths.
- All AI used in weekly check items (if any — templates primary) flows through `validateNorwegianOutput`.
- Source-verification audit before any re-sequencing.
- Fresh Playwright walkthrough before Phase 6 ships.

---

## Stream 3 — Muntlig Module (next major build after UI-1 converges)

Things that are real, designed or discussed, and correctly parked until the working system is whole.

- **FSRS or ARTS adaptive spacing** — research says it outperforms fixed ladder by 20–30% in review load. v1 fixed ladder is "adequate and defensible." Migrate in v2 when there's data to tune against.
- **Bayesian Knowledge Tracing instead of EMA** — more principled mastery model. EMA + slip detection approximates BKT's core idea and is "good enough for v1." Migrate in v2 if data shows it's needed.
- **Vocabulary SRS** — schema exists, no content seeded, no UI. Full feature build, deferred.
- **Listening module** — designed (the six-phase authentic-content engagement), content sourcing is the hard part. Defer until a Norwegian content partner is secured or audio generation pipeline is in place.
- **B1/B2 concept graph** — currently selecting B1/B2 shows an honest banner explaining the user is practicing A2 at higher intensity. Building real B1/B2 concept graphs is content authoring work, deferred.
- **Reading comprehension scoring** — `/reading` shows hardcoded texts without scoring. Needs concept-tagged passages and question generation. Deferred.
- **Pronunciation scoring at phoneme level** — research confirmed this is impossible at zero cost. Defer permanently or until revenue justifies a paid API (Speechace, Azure Speech).
- **Adaptive per-user decay half-life** — Duolingo-style HLR personalized per user and item. Strong improvement; v2.

---

## Validated As Fine — Stop Second-Guessing These

The validation research closed these debates. They're settled. Do not reopen them without new evidence.

- **12-question adaptive diagnostic** — rough placement (±1 CEFR sublevel), acceptable with calibration window and recalibration feature in place.
- **Constrained-response practice** — research-backed (Swain, Conti EPI). Your phase model handles the constraint ratio correctly (heavier constraints in intro/practice, lighter in consolidation/maintenance).
- **Decay toward a floor of 35** — concept correct, just tune the half-life (see Stream 1.2).
- **Input/production preference with per-level defaults** — A1 input-heavy, A2/B1 balanced, B2 production-heavy, user-overridable. Smart and SLA-supported.
- **JSON blob fingerprint for v1** — defensible local-first architecture. Address analytics blindness with the event log (Stream 1.4), not by re-architecting the fingerprint.
- **Repair loop with template explanations + AI upgrade** — every error tag has a template; AI replaces it async when available. Both paths work.

---

## The Competitive Truth

The validation research was explicit: the engine architecture (fingerprint + repair loop + phase model + production-gap tracking) is genuinely differentiated. No Norwegian app does root-cause diagnosis. Lingu has adaptive placement but not continuous adaptation. Babbel and Busuu have Norwegian but fixed curriculum and paid.

The feature set (SRS, exercise types) is table stakes. Everyone has those.

The moat is the diagnostic coaching intelligence — but it's an architectural bet, not proven differentiation, until there's usage data showing the repair loop actually accelerates learning versus simpler approaches. That's why the event logging (Stream 1.4) isn't just analytics; it's the only way the moat ever gets proven.

---

## Operating Sequence

**Updated 2026-05-21T21:00 — P0.5 Recovery Bundle complete.** See `docs/recovery-backlog.md` for the closed task table and `.council/reports/2026-05-21-2100-recovery-signoff.md` for the sign-off report.

### Completed phases
- **P0 batch (2026-05-20):** 8 items closed. Session loop reachable end-to-end.
- **P0.5 Recovery Bundle (2026-05-21):** 15 items closed. Four-of-five regressed pipeline-honesty patterns re-sealed; three new pedagogical-harm AI bugs closed via shared validity gate; concept-id scheme reconciled to graph as canonical source; corpus wired to client; conversation + journal write paths confirmed through shared error-tag → concept-id module; diagnostic semantics rewritten (merge not overwrite, persist on result-ready, dedupe by askedIds).

### Next phase committed — Stream 5: Weekly Sprint (Curriculum Cohesion Layer)

Selected 2026-05-21T21:35 via super-orchestrator + Council restructure. Moat trace: lands directly on diagnosis (focus selection from fingerprint), scheduling (recipe bias), remediation (failures from weekly check feed repair loop), AND unlocks the first read use case for `learning_events_log`. See `.council/log.md` 2026-05-21T21:35 entry for full reasoning; `.council/research.md` for Scout findings on the 5 questions.

**Options A, C, D, E held as follow-ups in this order:**
- D. **Authenticated-user walkthrough** — slotted between Weekly Sprint Phase 1 and Phase 2 as a one-session engineering hygiene pass. The auth path has not been exercised across three walkthroughs and Weekly Sprint adds Supabase write paths.
- C. **Stream 1.1 model swap** — re-evaluated after Weekly Sprint ships. Validity gate continues to bridge current quality.
- A. **Muntlig roleplay deepening** — re-evaluated after Weekly Sprint Phase 1 ships. Muntlig becomes a tributary to the weekly target rather than a parallel surface.
- E. **B1/B2 concept graph + corpus authoring** — re-evaluated after Weekly Sprint proves out on A1/A2.

### Process locks added this round
- Fingerprint pre/post diffs are mandatory acceptance evidence for any task that claims to feed the engine.
- AI output flows through one shared validity gate (`src/ai/validate.ts:validateNorwegianOutput`), not per-call-site validation.
- Source-verification audit is mandatory before re-sequencing a recovery batch on the strength of walkthrough findings alone (P0.5-01 caught one mis-framed Critical and surfaced three ordering revisions).
- A fresh walkthrough — including the authenticated path — runs before the next muntlig surface ships.

### Deferred (documented gaps, not regressions)
1. **F008 path-traversal tightening** in `safeRedirectPath` — no exploit confirmed; hygiene.
2. **F025 session resume on re-entry** — current behaviour is honest; needs session-state persistence layer.
3. **F027 repair-loop cap** — `isRepairItem` guard prevents worst-case; cap is polish.
4. **F032 journal SSR mismatch** — cosmetic, no Critical ripple.
5. **F035 reading visited indicator** — reading does not feed fingerprint by design.
6. **AlertDialog primitive** — mid-session exit uses `window.confirm()` with a TODO; install `@radix-ui/react-alert-dialog` and migrate in next UI sweep.
7. **REVIEW.md 2026-05-11 WARNING items** — most re-audited as still-fine in P0.5-01; a few flagged for next-touch refactor.
8. **v2 backlog** (FSRS, BKT, adaptive decay, vocab SRS) when the working app has real users and real data.

### Phase plan moving forward — sequence TBD by super-orchestrator
- Whichever build target (A–E above) is chosen, run it under the same procedural locks added this round.
- Hold the prior plan's Stream 1 engine corrections (A2 decay half-life, A3 calibration window, A4 event log reads) as bounded follow-ups slottable between major builds — they are correctness/observability work, not feature work.

Anything proposed outside this sequence is breadth, and breadth without justification is the failure mode we've already paid for.

---

## The Moat (Permanent Context)

Three things working together. Everything serves these:

1. **Diagnosis** — knowing precisely what the learner is failing at, including root causes.
2. **Scheduling** — generating a personalized session that mixes remediation, review, new material, and interleaving.
3. **Remediation** — every wrong answer triggers explain → micro-drill → retry → schedule for spaced review.

AI is a power tool. AI is never the headline. Every AI path has a non-AI fallback.

---

## The North Star (Results Principle)

The app exists to make the user speak more Norwegian and build sentences confidently. Two layered outcomes: production fluency and speaking confidence. Every feature pushes toward production. The muntlig module is the most literal embodiment of this and exists for it.

---

## When in Doubt

Re-read the moat and the north star. Every decision should trace to one of them. If it doesn't, it's probably out of scope — raise it, don't build it.
