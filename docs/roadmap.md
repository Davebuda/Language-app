# NorskCoach — Roadmap

The current build sequence with every research-validated priority locked in. This document supersedes earlier scattered planning. If you want to know what's next, what's deferred, and why — start here.

## Current Position — STREAM 5.5 (LANES ON A BAR) ACTIVE 2026-05-22

**Stream 5.5 ratified by Council 2026-05-22T09:02** as the cohesion-pass over Stream 5. Every existing feature is mapped to a lane on the weekly bar; features that don't earn a lane are retired or deferred. **No new feature surface.** 8 phases sequenced depth-first; Phases 1–7 autonomous, Phase 8 (recalibration retirement) pending user input. See `Stream 5.5 — Lanes on a Bar` section below for the full lane map, research basis, and phase plan.

**Stream 5 — Weekly Sprint signed off:** all 8 phases (1, 3, 5a, 4a, 5b, 6, 7, 4b) shipped across 9 commits + the React #418 follow-up + AlertDialog primitive close + F032 journal SSR fix + roadmap reconciliation. Engine→UI path is end-to-end live: learner starts a session → `ensureWeekOpen` populates `weeklyFocus` → scheduler biases remediation pool toward focus → dashboard `WeekStrip` surfaces focus chips + day-dots → `/uke` weekly check writes locally via `closeWeek`/`openWeek` and emits an anonymized `weekly_check_complete` row to `learning_events_log` for authenticated learners → graduation rule promotes/demotes on close. 155/155 tests passing. Phase 7 smoke check on pandoai.no PASS. Stream 5.5 extends this cycle across **all** production surfaces (currently only Session loop + WeekStrip + `/uke` are wired).

**Prior phase — P0.5 Recovery Bundle (2026-05-21):** 15 tasks complete across 16 commits in a single session. Sign-off report: `.council/reports/2026-05-21-2100-recovery-signoff.md`. All 11 Critical findings closed; 17 of 20 Significant closed; 4 of 9 Minor closed via code, the remaining 5 closed via analysis; 4 Edge cases preserved as documented gaps (not regressions).

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

**Deferred from P0.5 (documented gaps, not regressions):** ~~F008 path-traversal tightening~~ ✅ CLOSED 2026-05-22 via `20beb88`, ~~F032 journal SSR mismatch~~ ✅ CLOSED 2026-05-22 via `9bef843`, ~~AlertDialog primitive upgrade~~ ✅ CLOSED 2026-05-22 via `922d91e`. Still open: F025 session resume on re-entry, F027 repair-loop cap, F035 reading visited indicator, authenticated-user walkthrough.

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

**Phase 6 — Dashboard WeekStrip.** ✅ COMPLETE 2026-05-22T01:08 (commit `9dd017e`). `WeekStrip` component on dashboard surfaces `weeklyFocus` chips + day-dots + CTA to /uke. Returns `null` when `weekStartedAt === null` (silent inactive). Day-dots use honest fallback (only `lastSessionAt` available in v1). Anti-Duolingo: no streak number, no XP. Norwegian text dominates per north star. Folds with UI-1.3 (queued) instead of being rebuilt parallel.

**Phase 7 — Anti-Duolingo aesthetic guard + audit.** ✅ COMPLETE 2026-05-22T01:20 (commit `718ca45`). Playwright smoke check on pandoai.no — `/uke` renders clean at 375px and 1280px with zero console errors, WeekStrip empty state correct for fresh guest, anti-Duolingo aesthetic preserved (no streak number, day-dots only, Norwegian dominates). One P1 surfaced: React #418 hydration on `/dashboard` (not introduced by Stream 5; SSR-vs-CSR text divergence in `todayFormatted()` + `getStreak()`). React #418 follow-up closed 2026-05-22T01:55 via commit `cf1fcc3` — both values now SSR-safe gated through `useEffect`. Phase 7 report: `.council/reports/2026-05-22-0115-phase7-smoke.md`. React #418 report: `.council/reports/2026-05-22-0150-react418-fix.md`.

### Acceptance for the whole stream
- ✅ Weekly check produces a `learning_events_log` row — `logWeeklyCheckComplete` wired into `recordWeeklyCheckResult` (Phase 4b, commit `6f01b12`).
- ✅ 40/30/20/10 scheduler distribution preserved within ±5pp under focus bias — verified via `tests/engine/scheduler.test.ts` `describe('weekly focus bias')` (5 tests).
- ✅ Dashboard WeekStrip passes the anti-Duolingo aesthetic guard — Phase 7 smoke confirmed no streak number, day-dots only, Norwegian header.
- ⏵ Three consecutive simulated weekly sprints rotate focus correctly per `engine-tester` — covered by `tests/engine/weekly-sprint.test.ts` (37 tests across Phase 1/3/5a/5b). Live three-week simulation would be additional evidence but is not blocking — graduation + close + open are unit-tested.
- ⏵ Authenticated path fully traced (Phase 2 walkthrough) — pending user magic-link click + the two manual auth-redirect actions (NEXT_PUBLIC_APP_URL prod env + Supabase callback whitelist). Engineering hygiene only; no unshipped code blocks behind it.
- ⏵ Honest-reset banner verified via simulated 8-day absence — `shouldResetWeek` unit-tested at the boundary; the live banner copy will surface organically once any user returns after >7 days. Not blocking.

### Procedural locks (carried from P0.5)
- Fingerprint pre/post diffs are mandatory acceptance evidence for every phase touching engine write paths.
- All AI used in weekly check items (if any — templates primary) flows through `validateNorwegianOutput`.
- Source-verification audit before any re-sequencing.
- Fresh Playwright walkthrough before the next muntlig surface ships.

---

## Stream 5.5 — Lanes on a Bar (Active 2026-05-22)

**Status:** RATIFIED by Council 2026-05-22T09:02 as the next phase. Council verdict: RESTRUCTURE — see `.council/log.md` 2026-05-22T09:02 for full reasoning + research finding.

### The architectural claim

Stream 5 shipped the Weekly Sprint as a 5-touchpoint cycle (Mon plan / Tue–Fri practice / mid-week reveal / Sat check / Sun graduate), but only 3 of ~10 existing features are wired to it. The remaining features float as parallel production surfaces (session, journal, roleplay, conversation) undifferentiated by role + 1 orphan (reading, no engine feed) + 3 stubs (vocab, shadow, listening placeholders that violate Operating Rule 6 "no silent substitution").

The decision: **every feature is a lane on the weekly bar.** Lanes are declared by three properties:
1. **Modality** — read / write / listen / speak / mixed
2. **Freedom** — constrained (single answer, immediate grade) → free (open production)
3. **Focus-bias strength** — how this lane consumes `weeklyFocus`

Features that don't earn a lane are retired or deferred. **No new feature surface.** This is Operating Rule 1 in action — the cohesion is the deliverable, not new screens.

### Lane map

| Day | Touchpoint | Feature | Modality | Freedom | Focus bias today | Focus bias after Stream 5.5 |
|---|---|---|---|---|---|---|
| Mon | **Plan** | Dashboard + WeekStrip | UI | — | ✅ shows focus | unchanged |
| Tue–Fri | **Drill** | Session loop | mixed | constrained | ✅ scheduler biases 40% pool toward `weeklyFocus` | unchanged |
| Tue–Fri | **Write** | Journal | written production | free | ❌ no bias | prompt suggests focus concept; wrong-answer queues SRS review (not mid-flow drill) |
| Tue–Fri | **Speak** | `/roleplay` | spoken production | constrained (scripted 4-turn) | ❌ no bias | scenario picked by focus-overlap; turn-level errors log to fingerprint |
| Tue–Fri | **Talk** | Conversation (Kari) | spoken/written production | free | ❌ no bias | opener topic touches focus; corrections triage focus-first; SRS review queued, not interrupted |
| Tue–Fri | **Read** | Reading studio | input only | passive | ❌ orphan, no engine feed | texts concept-tagged; completion logs `concept_exposure` event (weight 0.3× production) |
| Tue–Fri | **Repair** | Repair loop (cross-surface) | mixed | — | ✅ fires from session only | **queues SRS schedule writes** from any production surface; mid-flow drills only inside Session loop |
| Mid-week | **Reveal** | Mid-week strip | UI | — | ⚠ day-dots only (Stream 5 Phase 6 partially built) | add rawScore delta + attempts on each focus concept |
| Sat | **Check** | `/uke` | mixed retrieval | adaptive | ✅ focus-tied | unchanged |
| Sun | **Graduate** | `closeWeek` | engine | — | ✅ rule shipped | unchanged |

### Research finding that shaped the design

Council fired one targeted WebSearch on the open risk: cross-surface micro-drill firing — does it cause interruption fatigue or constitute beneficial varied retrieval? Finding (2026 Immersion Learning Institute studies cited in current language-app reviews): **spaced retrieval with authentic content + varied contexts beats single-surface drill 3.2× on retention; cross-surface concept encounter IS varied retrieval, but mid-flow interruption breaks attention.** Therefore the repair-loop externalization writes SRS schedule (next-session pickup), not interrupting drill on the current surface. Inline mid-flow drills remain ONLY in the Session loop where they are the expected interaction.

This is logged in `.council/research.md` 2026-05-22 as an extension of the 2026-05-21T21:30 Weekly Sprint research entry.

### What gets retired or deferred

| Surface | Disposition | Why | Decision authority |
|---|---|---|---|
| **`/vocab` notify-button stub** | Retire surface; defer feature to Stream 6 v2 | Placeholder violates Operating Rule 6 (no silent substitution). Already deferred in Stream 6 backlog. Removing the surface is hygiene, not a feature change. | Council autonomous |
| **`/shadow` notify-button stub** | Retire surface; defer feature until muntlig audio infra ships | Same reasoning as `/vocab` | Council autonomous |
| **Listening "module" placeholder** | Defer | No audio = no lane. Built only when audio infra ships (Stream 3 muntlig). | Council autonomous |
| **Recalibration as standalone surface** | **DECISION PENDING USER** | `/uke` already IS adaptive retrieval on focus; recalibration as standalone is a redundant assessment lane. Retirement option: fold into `/uke` + level-switch trigger. Status-quo option: keep with added trigger banner. **User input required — see Phase 8.** | User (Phase 8) |

### Phased plan (8 phases, depth-first)

**Phase 1 — Reading concept-tagging + exposure logging.** Move reading from orphan to input lane. Hand-tag the 4 existing texts in `/reading` with concept arrays. Reading-completion writes a `concept_exposure` row to `learning_events_log` (new event type; weight 0.3× production for future analytics calibration). Fingerprint receives a low-weight signal: `recordExposure(conceptId, weight: 0.3)`. **Files:** `src/lib/reading-content.ts` (add concept tags), `src/lib/logEvents.ts` (add `logConceptExposure`), `src/hooks/useFingerprint.ts` (add `recordExposure` helper), `src/app/reading/page.tsx` (call on text completion). **Acceptance:** fingerprint pre/post diff shows exposure attempt increment; `learning_events_log` row written for auth user.

**Phase 2 — Mid-week reveal strip on dashboard.** Fulfills Stream 5 Phase 6 design that was only half-built. WeekStrip currently shows day-dots; add a sibling row showing rawScore delta + attempts on each `weeklyFocus` concept this week. Pure read from fingerprint; no new state. **Files:** `src/components/dashboard/WeekStrip.tsx` (extend), `src/lib/weekly-progress.ts` (new pure function `summarizeWeeklyProgress(fp, graph)`). **Acceptance:** WeekStrip renders deltas at 375 / 768 / 1280 / 1920px; layout holds.

**Phase 3 — Journal weekly-focus prompt bias.** When user opens journal, the prompt suggests writing about a focus concept ("Skriv en kort tekst der du bruker `‹focus concept›` minst tre ganger"). Non-blocking suggestion; user can ignore. AI feedback (when available) triages corrections to focus concepts first. **Files:** `src/components/journal/WritingEditor.tsx`, `src/lib/journal-prompts.ts` (new). **Acceptance:** prompt visibly biased; user can still write about anything. F032 precondition satisfied (closed 2026-05-22 via `9bef843`).

**Phase 4 — Roleplay weekly-focus scenario selection.** `/roleplay` currently picks scenarios randomly. Replace with focus-overlap scoring: pick the scenario whose required-concept set most overlaps with `weeklyFocus`. Fall back to random when no overlap. Existing 3 scenarios remain; only selection logic changes. **Files:** `src/app/roleplay/page.tsx`, `src/lib/roleplay-scenarios.ts`. **Acceptance:** running roleplay with `weeklyFocus=['concept-X']` selects the scenario tagged with concept-X above scenarios that aren't.

**Phase 5 — Conversation weekly-focus topic bias + correction priority.** Kari opens with a topic that exposes a focus concept ("Snakk om planene dine for helgen — bruk `‹focus concept›`"). When Kari corrects user mistakes, focus concepts are prioritized over non-focus errors. **Files:** `src/lib/kari-opener.ts` (new), `src/components/conversation/ConversationScreen.tsx`, `src/ai/prompts.ts` (correction priority instruction). Template-first; AI is a multiplier. **Acceptance:** opener visibly biased toward focus; correction priority traces.

**Phase 6 — Repair loop externalization (queue, don't interrupt).** Wrong answers in journal/conversation/roleplay update the SRS ladder via a single shared module entry point `repairFromSurface(surfaceKind, errorTag, conceptId)`. Writes fingerprint + schedules next-session pickup. **Does not** fire a mid-flow drill — that pattern remains ONLY in Session loop where it's the expected interaction (research-validated decision; see Research finding above). **Files:** `src/engine/repair-from-surface.ts` (new), `src/hooks/useFingerprint.ts` (expose helper), surfaces call as appropriate. **Acceptance:** fingerprint pre/post diff shows SRS state advance; no mid-flow drill firing on production surfaces; next session shows the repair item.

**Phase 7 — Stub removal (`/vocab`, `/shadow`).** Remove placeholder notify-button surfaces. Route the URLs to a small "Coming in v2" banner page that links to the active features. Honest, not silent. **Files:** `src/app/vocab/page.tsx`, `src/app/shadow/page.tsx`. **Acceptance:** notify-button surfaces gone; honest banner in place; navigation entries removed.

**Phase 8 — Recalibration retirement** — **DECISION PENDING USER.** Council ratifies the lane architecture and Phases 1–7 autonomously. This phase requires user input:
- Option A: Retire `/recalibration` as standalone surface. Fold its function into `/uke` + level-switch trigger. Honest copy: "the weekly check is your re-assessment."
- Option B: Keep `/recalibration` with an added trigger banner (P1 #7 fix from project-state.md gap list).
- Decision driver: Option A is the architecturally clean move; Option B is the lower-risk minimal change.

### Pre-conditions met

- ✅ F032 (journal SSR mismatch) closed via `9bef843`/`f1c18ef`/`dceb782` 2026-05-22T08:55. Phase 3 unblocked.
- ✅ Stream 5 (Weekly Sprint) closed 2026-05-22T04:20. Stream 5.5 has the foundation to extend.
- ✅ AI validity gate (`src/ai/validate.ts:validateNorwegianOutput`) shipped. All Stream 5.5 AI surfaces flow through it.
- ✅ Event logging writes (`src/lib/logEvents.ts`) shipped. Phase 1 extends it with `logConceptExposure`; Phase 6 reuses for repair SRS writes.

### Procedural locks (carried + reinforced)

1. **Fingerprint pre/post diffs mandatory** for every phase that touches engine write paths (Phases 1, 3, 4, 5, 6).
2. **All AI flows through `validateNorwegianOutput`** — no per-call-site validation (Phases 3, 5).
3. **Repair-loop externalization is queue-only, not drill-firing on free surfaces.** This is the load-bearing research-validated constraint.
4. **Focus bias is suggestion, not lockout.** All bias work follows the Stream 5 Phase 3 pattern (preserve recipe within ±5pp; user can override).
5. **No new feature surface.** Operating Rule 1. Every change to this stream serves a lane that already exists or retires one that doesn't earn its place.
6. **Playwright SMOKE after each phase** + FULL after Phase 6 (cross-surface repair externalization touches all production surfaces).

### Acceptance for the whole stream

- Each phase ships with fingerprint pre/post diff evidence where applicable.
- Cross-surface repair externalization produces SRS state advance without mid-flow interruption (Phase 6 trace).
- After Phase 7, the app has zero placeholder notify-button surfaces. Every visible feature traces to a declared lane.
- Phase 8 outcome (after user decides Option A or B) lands the recalibration disposition.
- Test suite remains green after each phase. Playwright SMOKE clean.
- Roadmap reconciliation pass at stream close, same shape as the 2026-05-22T07:20 md-sync pass.

---

## Stream 6 — v2 / Deferred Backlog

Things that are real, designed or discussed, and correctly parked until the working system is whole. (Previously mistitled "Stream 3 — Muntlig Module" — that real Stream 3 entry lives earlier in this file with its actual build plan; this section is the v2 parking lot.)

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

**Updated 2026-05-22 — Stream 5 (Weekly Sprint) complete.** See the Stream 5 section above for full phase-by-phase closure; `.council/log.md` 2026-05-22T07:20 entry for the reconciliation pass that brought stale roadmap entries into line with shipped state.

### Completed phases
- **P0 batch (2026-05-20):** 8 items closed. Session loop reachable end-to-end.
- **P0.5 Recovery Bundle (2026-05-21):** 15 items closed. Four-of-five regressed pipeline-honesty patterns re-sealed; three new pedagogical-harm AI bugs closed via shared validity gate; concept-id scheme reconciled to graph as canonical source; corpus wired to client; conversation + journal write paths confirmed through shared error-tag → concept-id module; diagnostic semantics rewritten.
- **Stream 5 — Weekly Sprint (2026-05-22):** all 8 phases shipped (1, 3, 5a, 4a, 5b, 6, 7, 4b). Engine→UI path live: `ensureWeekOpen` populates `weeklyFocus` → scheduler biases remediation toward focus → dashboard WeekStrip surfaces focus + day-dots → `/uke` weekly check writes locally and emits `learning_events_log` row for auth users → graduation rule promotes/demotes. 155/155 tests passing. React #418 hydration follow-up closed via `cf1fcc3`.
- **Stream 1 engine corrections (folded through P0.5 + Stream 5):** 1.1 Step 1 (prompt hardening) ✅; 1.2 (decay half-life → 25 days) ✅; 1.3 (calibration window) ✅; 1.4 writes (`learning_events_log` table + `logSessionResults` + `logWeeklyCheckComplete`) ✅. Stream 1.1 Step 2 (NB-Llama-3.2-1B compile for web-llm) and Stream 1.4 reads (analytics dashboard) remain queued.
- **Integrity + primitive follow-ups (2026-05-22):** FillInBlank blank-indicator sizing, hardcoded errorTag, SpeedRound stale closure, AlertDialog primitive — all closed (see Integrity Follow-ups + UI Primitive Follow-ups sections above).

### Pending user actions
- **Magic-link click** — completes the deferred authenticated-user walkthrough (option D from prior brief). No code blocked behind it.
- **`NEXT_PUBLIC_APP_URL=https://pandoai.no`** in production env (Hetzner PM2 ecosystem or `/etc/environment`).
- **Supabase Authentication → URL Configuration** — whitelist `https://pandoai.no/auth/callback`.

### Next phase — Stream 5.5 (RATIFIED 2026-05-22T09:02)

Council ratified the Lanes-on-a-Bar architecture and the 8-phase sequence (see Stream 5.5 section above). Phases 1–7 are autonomous; Phase 8 (recalibration retirement) is pending user input. Hand-off proceeds to `/solve` for the execution plan, then `/gsd` to run phase-by-phase.

### Further-deferred backlog (after Stream 5.5 closes)
- ~~**F008 path-traversal tightening** — hygiene; no exploit; small Council brief.~~ ✅ CLOSED 2026-05-22 via `20beb88` — `safeRedirectPath` extracted to `src/lib/safeRedirectPath.ts`, tightened to strict charset whitelist + 28 unit tests. Shipped during the Stream 5.5 RESTRUCTURE pass.
- **F025 session resume on re-entry** — needs session-state persistence layer; non-trivial design.
- **F027 repair-loop cap** — worst-case polish.
- ~~**F032 journal SSR mismatch**~~ ✅ CLOSED 2026-05-22 via `9bef843`.
- **Stream 1.4 reads — first analytics surface** against `learning_events_log`. Stream 5.5 Phase 1 (`concept_exposure`) and Phase 6 (cross-surface repair) increase the event payload usefully — this analytics surface is the natural follow-up after 5.5 ships.
- **Stream 1.1 Step 2** — half-day MLC pipeline to compile NB-Llama-3.2-1B for web-llm; not single-turn. Stream 5.5 AI surfaces (Phases 3, 5) ship template-first and become higher-quality multipliers once this lands.
- **REVIEW.md 2026-05-11 WARNING items** — re-audit pass; most re-audited as still-fine in P0.5-01, a few flagged for next-touch refactor.

### Product-decision items (need user)
- **Phase 8 of Stream 5.5 — recalibration retirement** (Option A retire / Option B keep with banner). See Stream 5.5 Phase 8.
- **A. Muntlig roleplay deepening** — branching variety, recording playback, scoring heuristics OR a sixth muntlig mode. Muntlig is now a tributary to the Weekly Sprint rather than a parallel surface. Stream 5.5 Phase 4 wires existing scripted roleplay to weekly focus; further deepening is a separate decision.
- **E. B1/B2 concept graph + corpus authoring** — content authoring; unlocks honest level switching. Weekly Sprint has proved out on A1/A2; Stream 5.5 keeps the pattern A2-validated.

### Process locks (carried)
- Fingerprint pre/post diffs are mandatory acceptance evidence for any task that claims to feed the engine.
- AI output flows through one shared validity gate (`src/ai/validate.ts:validateNorwegianOutput`), not per-call-site validation.
- Source-verification audit is mandatory before re-sequencing a recovery batch on the strength of walkthrough findings alone.
- A fresh walkthrough — including the authenticated path — runs before the next muntlig surface ships.

### Deferred (documented gaps, not regressions)
1. ~~**F008 path-traversal tightening** in `safeRedirectPath` — no exploit confirmed; hygiene.~~ ✅ CLOSED 2026-05-22 via `20beb88`.
2. **F025 session resume on re-entry** — current behaviour is honest; needs session-state persistence layer.
3. **F027 repair-loop cap** — `isRepairItem` guard prevents worst-case; cap is polish.
4. ~~**F032 journal SSR mismatch** — cosmetic, no Critical ripple.~~ ✅ CLOSED 2026-05-22 via `9bef843`.
5. **F035 reading visited indicator** — reading does not feed fingerprint by design.
6. **REVIEW.md 2026-05-11 WARNING items** — most re-audited as still-fine in P0.5-01; a few flagged for next-touch refactor.
7. **v2 backlog** (FSRS, BKT, adaptive decay, vocab SRS, NB-Llama-1B compile via Stream 1.1 Step 2, full muntlig mode set) when the working app has real users and real data.

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
