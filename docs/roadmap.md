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

**Step 1 — Prompt-harden the current Llama-3.2-3B.** ✅ COMPLETE. All five prompt builders in `src/ai/prompts.ts` carry the Norwegian-enforcement system rules: "ONLY Norwegian Bokmål", "V2 word order is mandatory", "Use only real, everyday Norwegian words. Do not invent compound words." Combined with the P0.5-06 `validateNorwegianOutput` gate, the prompts + validity check form a two-layer defense against gibberish reaching learners. Step 2 (NB-Llama-3.2-1B compile for web-llm) remains the cleaner long-term fix and is still queued; the bar Step 1 had to clear is provisionally met by the validity gate's fallback behaviour.

**Step 2 — Compile NB-Llama-3.2-1B-Instruct for web-llm (if Step 1 insufficient).**
`NbAiLab/nb-llama-3.2-1B-Instruct` exists on HuggingFace. MLC compile pipeline: `mlc_llm convert_weight` → `gen_config` → WebGPU WASM → host artifacts → register custom `appConfig`. Keeps in-browser AI. Uses 1B (smaller, but Norwegian-tuned and Instruct-tuned). The 3B base model has no Instruct variant. Estimated half-day pipeline.

**Step 3 — Server-side Ollama on VPS (last resort only).**
NB-Llama GGUF via Ollama on the Hetzner VPS. AI module calls VPS endpoint instead of web worker. Full 3B quality. Loses local-first AI property. Only considered if Step 2 also fails the bar.

**Reasoning:** prove the cheap fix doesn't work before committing to the expensive one — same discipline as the rest of the project.

**Eval harness:** Real and runnable at `/eval`. 19 tasks × 3 runs. Human-reviewed JSON output, not automated. No build needed.

**Native speaker gate (Option B, provisional):** User reviews `/eval` JSON at their current Norwegian level. Pass: no English drift, no V2 violations, no obvious grammar errors. Native speaker review queued as follow-up before any muntlig content generation depends on the model.

**Runs in parallel with:** UI-1.2 scoping pass. Does not run concurrently with UI-1.2 build.

**Priority:** Highest. Unblocks muntlig. Fixes a live defect.

### 1.2 Shorten decay half-life — ✅ COMPLETE

`DECAY_HALF_LIFE_DAYS = 25` is live at `src/engine/fingerprint.ts:12` with comment "~3.5 weeks — steepest forgetting in first month; floor prevents total loss". Floor stays at 35. Migration applied in parallel work; trace points satisfied by the exponential decay math (`Math.exp((-Math.LN2 / 25) * days)` produces ~85 at 30 days, ~60 at 45 days, ~50 at 60 days for a starting rawScore of 100, all above the floor of 35).

### 1.3 Calibration window for first 5 sessions — ✅ COMPLETE

`calibrationSessionsRemaining: number` lives on `MistakeFingerprint` (seeded to 5 in `createEmptyFingerprint`). `useSession.startNewSession` reads it at line 154 to apply a calibration-mode recipe variant when `> 0`. Counter decrements on session completion. Standard behaviour resumes after the 5th session.

### 1.4 Anonymized event logging — ✅ COMPLETE (writes); reads deferred

Migration `supabase/migrations/003_learning_events_log.sql` applied 2026-05-21. `src/lib/logEvents.ts` exposes `logSessionResults` (per-exercise rows on session completion) and `logWeeklyCheckComplete` (Stream 5 Phase 4b — per-weekly-check rows). Both fire-and-forget; auth users only; anonymous guests excluded by design; `anonymous_session_id` is SHA-256(user_id) first 16 hex chars. Nothing reads the table yet — first read use case (analytics dashboard) deferred until there's enough data to be interesting.

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

## Integrity Follow-ups (ALL CLOSED 2026-05-22)

**1. Blank indicator size mismatch in FillInBlankExercise.** ✅ Closed via `162b1f1 fix(p2): FillInBlank blank indicator inherits sentence font size`.

**2. Hardcoded `errorTag: 'verb-conjugation'` in FillInBlankExercise.** ✅ Closed — Grep confirms no hardcoded errorTag remains in the FillInBlank component.

**3. Stale `userInput` closure in SpeedRound timer.** ✅ Closed — `SpeedRound.tsx` now uses `userInputRef.current` (line 24, written on every onChange at line 108, read by the timer callback at line 36).

## UI Primitive Follow-ups (CLOSED 2026-05-22)

**AlertDialog primitive (deferred from P0.5-09).** ✅ Closed via `922d91e feat(ui): AlertDialog primitive + migrate session exit confirmation`. `@radix-ui/react-alert-dialog` installed; shadcn-flavor primitive lives at `src/components/ui/alert-dialog.tsx`; mid-session exit on `SessionScreen` migrated from `window.confirm` to the new dialog with Norwegian copy.

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

**Phase 1 — Data model + selection logic.** ✅ COMPLETE 2026-05-22T00:00 (commit `0821e75`).
- `MistakeFingerprint` extended with `weeklyFocus`, `weekStartedAt`, `weeklySprintHistory`.
- `WeeklySprintRecord` interface added; `createEmptyFingerprint` seeds new fields.
- New module `src/engine/weekly-sprint.ts` with three pure functions: `selectWeeklyFocus`, `shouldResetWeek`, `closeWeek`. Plus `migrateWeeklySprintFields` (placed here instead of `useFingerprint.ts` due to vitest path-alias resolution; architecturally net-positive — pure logic in engine layer).
- Idempotent migration wired into `useFingerprint.ts:applyMigration`.
- 23 new tests in `tests/engine/weekly-sprint.test.ts`. Test suite: 129 passing (was 106).
- typecheck clean.

**Phase 3 — Scheduler bias pass.** ✅ COMPLETE 2026-05-22T00:27 (commit `4fbd654`). `generateSession` now biases the 40% remediation pool toward `weeklyFocus` while preserving existing `firstEligibleType` guard, concept-repeat cap, and recipe 40/30/20/10. Empty-`weeklyFocus` path is backwards-compatible (all pre-Phase-3 tests pass unchanged). 5 new tests in `describe('weekly focus bias')`; 134 passing.

**Phase 5a — Open-week orchestration.** ✅ COMPLETE 2026-05-22T00:35 (commit `b73cb35`). `openWeek(fp, graph, now?)` and `ensureWeekOpen(fp, graph, now?)` added as pure functions in `src/engine/weekly-sprint.ts`. Wired into ALL six bootstrap paths in `useFingerprint.ts` (anon-local, auth-remote, auth-local, anon-empty, auth-empty, anon-migrated) and into `useSession.startNewSession` via `ensureWeekOpenAndPersist` helper. 7 new tests in `describe('openWeek + ensureWeekOpen')`. 141 tests passing.

**Phase 2 — Authenticated-user walkthrough + Supabase sync verification.** RE-SEQUENCED to slot between Phase 5a and Phase 4 (was originally "between Phase 1 and Phase 3"). Reasoning: Phase 4 is where new Supabase write paths first appear (`learning_events_log` write from weekly-check route). Phase 3 + Phase 5a do not add Supabase write paths — they ride the existing fingerprint sync. So the auth walkthrough sensibly precedes Phase 4 where the new write paths land, not Phase 3. The "engineering hygiene before new surface" intent is preserved.

**Phase 4a — Weekly Check surface (local-only).** ✅ COMPLETE 2026-05-22T00:56 (commit `d81b2e4`). `/uke` route, `WeeklyCheckScreen` component, pure `buildWeeklyCheckItems` function in `src/lib/weekly-check.ts`, `recordWeeklyCheckResult` helper in `useFingerprint`. 7 new tests. Result writes locally via `closeWeek` then `openWeek` in a single persist. No Supabase writes yet — that's Phase 4b. No AlertDialog (deferred).

**Phase 4b — Supabase migration for `learning_events_log` + write wire.** ✅ COMPLETE 2026-05-22T04:20 (commit `6f01b12`). Migration `supabase/migrations/003_learning_events_log.sql` had been applied 2026-05-21 in parallel work. This pass added `logWeeklyCheckComplete` to `src/lib/logEvents.ts` and wired it into `recordWeeklyCheckResult` so authenticated learners produce an anonymized `weekly_check_complete` row on every check submission. Guests are silently skipped per the privacy posture. `correct_bool = score >= 50` matches the graduation rule's demote floor.

**Phase 5b — Graduation rule.** ✅ COMPLETE 2026-05-22T01:03 (commit `85504e4`). `WeeklySprintRecord.focusOutcomes` extended with `graduated: boolean`. `closeWeek` signature gained `graph` parameter; computes per-concept graduation via `isGraduated` predicate (mastery threshold AND minAttempts; low check score <50 demotes; null check doesn't punish). All callers threaded through. 7 new tests.

**Phase 6 — Dashboard WeekStrip.** ✅ COMPLETE 2026-05-22T01:08 (commit `9dd017e`). `WeekStrip` component on dashboard surfaces `weeklyFocus` chips + day-dots + CTA to /uke. Returns `null` when `weekStartedAt === null` (silent inactive). Day-dots use honest fallback (only `lastSessionAt` available in v1). Anti-Duolingo: no streak number, no XP. Norwegian text dominates per north star.

**Phase 6 — Dashboard week-strip.** Composition into UI-1.3 dashboard (queued anyway). 375px compact horizontal bar showing focus-concept progress dots; 1280px+ expanded card with rawScore deltas. Folds with UI-1.3 instead of being built parallel.

**Phase 7 — Anti-Duolingo aesthetic guard + audit.** ⏵ NEXT. Playwright smoke check on /dashboard (with simulated fingerprint that has weeklyFocus populated) and /uke. Screenshots at 375px and 1280px. `/baseline-ui` + `/audit` against the new surfaces. Report findings.

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
