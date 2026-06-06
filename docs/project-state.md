# NorskCoach — Project State Snapshot

> ⚠️ **STALE SNAPSHOT (2026-05-22) — NOT maintained.** For the canonical **current** state see `CLAUDE.md` → "Current State" (latest: the 2026-06-06 live-bug + moat-visibility sweep box) and `docs/roadmap.md` → "Completed phases". Test counts, AI status, and the gap list below have been superseded by work through 2026-06-06 (server-side AI generation live, corpus integrity clean, AI corrections decoupled from the fingerprint, root-cause diagnosis surfaced on the dashboard).

**Date:** 2026-05-22 (Stream 5.5 active — Council ratified 09:02)  
**Status:** **Stream 5.5 — Lanes on a Bar** is the active phase. Council ratified the architecture: every feature is a lane on the weekly bar (Drill / Write / Speak / Talk / Read / Repair / Plan / Reveal / Check / Graduate). Features without a lane are retired (`/vocab`, `/shadow` notify-button stubs; `/recalibration` standalone surface) or deferred (listening). 8 phases sequenced depth-first; all 8 autonomous after Council ratified Phase 8 Option A 2026-05-22T09:15 via engine-evidence reasoning. **Phase 1 (reading concept-tagging + exposure logging) shipped 2026-05-22T09:34 via `6624937`** — reading is now the Read lane feeding fingerprint at 0.3× exposure weight. Test count: 196/196. Next: Phase 2 (mid-week reveal strip on dashboard). See `docs/roadmap.md` "Stream 5.5" section for the full lane map + phase plan. Stream 5 — Weekly Sprint COMPLETE (all 8 phases + React #418 hydration follow-up + AlertDialog primitive + F032 journal SSR fix all shipped). Stream 1 engine corrections all live (decay 25, calibration window, event logging writes, prompt hardening Stream 1.1 Step 1). 14 test files / 155 tests passing. Stream 5.5 extends the Weekly Sprint pattern across journal / roleplay / conversation / reading / cross-surface repair, ratifies retirement of `/vocab` + `/shadow` stub surfaces, and gates recalibration retirement on user input.

> **History:** 2026-05-21 morning state "P0 recovery batch complete; session loop completable end-to-end" held the critical-path sense but the third walkthrough that afternoon proved the broader pipeline-honesty contract had regressed across journal + conversation + diagnostic semantics. P0.5 Recovery Bundle sealed those regressions same day (15 of 15 tasks across 16 commits). Stream 5 (Weekly Sprint) followed 2026-05-22 as the next committed phase — selected via super-orchestrator on strongest moat trace. Sign-off reports: `.council/reports/2026-05-21-2100-recovery-signoff.md` (P0.5); `.council/reports/2026-05-22-0115-phase7-smoke.md` (Stream 5 Phase 7); `.council/reports/2026-05-22-0150-react418-fix.md` (Stream 5 hydration follow-up).

---

## What This Is

An adaptive Norwegian language learning web app. Not a course — a coach. It builds a per-user mistake fingerprint, generates a personalized session every time, and runs every wrong answer through a repair loop with spaced-repetition follow-up.

**One-line positioning:** A personal Norwegian tutor that finds your weak spots, explains why they happen, and fixes them with targeted practice — and pushes you to actually speak.

---

## Verified Engine State (post-P0)

The adaptive engine is complete and the session loop is now end-to-end verified:

### Session loop — verified working
- **Scheduler guard:** Sessions only queue exercises with eligible seed sentences. Concepts with no compatible seeds are skipped with `console.warn` and excluded from the session. No blank cards.
- **Grader alignment:** `deriveCorrectAnswer` correctly maps exercise types to expected answer fields. `sentence-transformation → english`, `translation-to-norwegian → norwegian`, `fill-in-blank → notes`. Three-way contract (scheduler pool, component render, grader derivation) is consistent across all exercise types.
- **Word-order exercise:** Two-zone click model. Source zone (scrambled tiles) + answer zone (ordered). Click to arrange; submit disabled until source is empty. Fully keyboard/click accessible.
- **Repair loop:** Wrong answer → explain → micro-drills (2, varied type/sentence) → retry (same sentence, same type) → SRS scheduling. The retry correctly uses the original sentence (pre-seeded in contentCache) and the original exercise type. Templates route by error tag, not always V2 boilerplate.
- **Error tags:** All exercise components derive `errorTag` from `sentence.errorTagsDetectable[0]`. `ListeningExercise` uses `'listening-recognition'` as a deliberate channel-level exception. No hardcoded tags remain in exercise components.
- **Session progression:** `advanceItem()` is only reachable via `submitResult` (user submits) or `continueAfterRepair` (user clicks "Prøv igjen"). The 3-second silent auto-skip has been removed.
- **AI status:** `useAIStatusStore` (states: `idle | loading | ready | unavailable`) is the single source of truth. The badge shows "AI unavailable" when generation fails. Two consecutive empty engine responses trigger the `unavailable` state.

### Engine modules — verified correct
- **Diagnostic placement:** IRT-style adaptive quiz, seeds fingerprint. Early-exit confirmed (5 of 12 questions in prior testing; confidence-based). Semantics rewritten in P0.5-07 (merge not overwrite; persist on result-ready; dedupe by `askedDiagnosticQuestionIds`; `Math.max` floor on wrong answers removed).
- **Mistake fingerprint:** JSON blob in IndexedDB + Supabase. Per-concept mastery, SRS state, error log, production gap, speaking minutes, preference. **Weekly Sprint fields (Stream 5):** `weeklyFocus: string[]`, `weekStartedAt: string | null`, `weeklySprintHistory: WeeklySprintRecord[]`, `calibrationSessionsRemaining: number`.
- **Mastery scoring:** Phase-adaptive EMA, slip detection, geometric-mean confidence.
- **Decay:** Exponential with floor of 35. `DECAY_HALF_LIFE_DAYS = 25` at `src/engine/fingerprint.ts:12` (Stream 1.2 shipped — ~3.5 weeks reflects steepest forgetting in first month).
- **Calibration window (Stream 1.3):** First 5 sessions use a calibration recipe (30/30/30/10) read at `src/hooks/useSession.ts:154`. Counter decrements on session completion.
- **Phase model:** locked → intro → practice → consolidation → maintenance.
- **Scheduler:** Recipe 40/30/20/10 with `firstEligibleType` guard, concept-repeat cap, production guarantee, Fisher-Yates shuffle. **Weekly Sprint bias (Stream 5 Phase 3):** the 40% remediation pool biases (does not lock) toward `weeklyFocus`. Distribution preserved within ±5pp.
- **Weekly Sprint engine (Stream 5):** `selectWeeklyFocus`, `shouldResetWeek`, `closeWeek`, `openWeek`, `ensureWeekOpen` in `src/engine/weekly-sprint.ts`. All pure functions; optional `now` param; no I/O. Graduation rule on `closeWeek` (Phase 5b): mastery threshold + min attempts; weekly check score <50 demotes; null check doesn't punish.
- **Event logging (Stream 1.4 writes):** `src/lib/logEvents.ts` exposes `logSessionResults` (per-exercise rows on session completion) and `logWeeklyCheckComplete` (per-weekly-check rows). Both fire-and-forget; auth users only; guests excluded. `anonymous_session_id` = SHA-256(user_id) first 16 hex. Table: `supabase/migrations/003_learning_events_log.sql`. Reads (analytics surface) deferred.
- **Diagnosis engine:** 4 root-cause rules. Output surfaced on the dashboard session card as a conditional "Why this" block (2026-05-21) — silent when no rule fires.
- **Repair loop:** template explanation + 2 micro-drills + retry + SRS scheduling (1→3→7→14→30 day ladder).
- **AI validity gate (P0.5-06):** All AI surfaces flow through `validateNorwegianOutput` in `src/ai/validate.ts` before reaching the learner. Heuristic check (char-set match, ≤18-char words, ≤25% English drift, ≥1 Norwegian function word). Failed validation → per-surface template fallback.
- **Prompt hardening (Stream 1.1 Step 1):** All 5 prompt builders in `src/ai/prompts.ts` carry Norwegian-enforcement system rules ("ONLY Norwegian Bokmål", "V2 word order is mandatory", "Use only real, everyday Norwegian words"). Bridges current Llama-3.2-3B until NB-Llama-1B compile (Step 2) ships.

---

## Features Today

### Working end-to-end
- Diagnostic placement (onboarding flow, 5 slides + quiz)
- Dashboard (session preview, level selector, A1/A2/B1/B2 with honest B1/B2 banner, WeekStrip surface for Weekly Sprint focus + day-dots)
- Session loop: fill-in-blank, word-order, translation-to-norwegian, sentence-transformation, speed-round
- Repair loop: explain → micro-drills → retry → SRS
- Conversation mode (AI tutor + template fallback when model unavailable)
- Journal (text + voice input, AI feedback + template fallback, corrected version with honest partial-correction note)
- Reading studio (4 texts, level filter, parallel translation, word lookup stub)
- Progress page (concept phases, locked prerequisites)
- Profile (level, streak, sessions, weak concepts, session style preference)
- Recalibration (7-question quiz; no trigger banner — P1)
- **Weekly Sprint (Stream 5):** `/uke` weekly retrieval check (6–8 items from focus concepts + prior-week graduates); dashboard WeekStrip; weekly graduation on close; honest reset on >7-day absence
- **Muntlig scripted roleplay (step 5):** `/roleplay` — 3 scenarios × 4 turns. Shipped 2026-05-21 prior to P0.5 close.
- **Mid-session exit confirmation:** AlertDialog primitive (Radix-based) at `src/components/ui/alert-dialog.tsx` — replaced `window.confirm()`.

### Stubs (by design)
- `/vocab` — Vocabulary SRS placeholder with notify button
- `/shadow` — Pronunciation lab placeholder with notify button

### Known gaps (not stubs, actual missing pieces)
- Listening exercises: have their own three-tier fallback but no audio files served yet
- Muntlig module: shadowing, pronunciation drills, listen-and-respond designed but not built; only step 5 (scripted roleplay) is live
- Analytics surface for `learning_events_log` (Stream 1.4 reads — first read use case deferred until there's enough data)
- NB-Llama-3.2-1B compile for web-llm (Stream 1.1 Step 2 — half-day MLC pipeline)
- F025 session resume on re-entry, F027 repair-loop cap, F035 reading visited indicator — all documented in `docs/recovery-backlog.md`. F032 closed 2026-05-22 via `9bef843`. F008 closed 2026-05-22 via `20beb88` (safeRedirectPath tightened to strict whitelist + 28 unit tests).

---

## Architecture

**Platform:** Web. Next.js 15 (App Router), TypeScript strict, Tailwind, shadcn/ui, Framer Motion.  
**Backend:** Supabase (Postgres + Auth + RLS).  
**State:** Zustand stores; fingerprint persists to IndexedDB, syncs to Supabase fire-and-forget for auth users.  
**Local AI:** WebLLM in a Web Worker via WebGPU. Model: Llama-3.2-3B-Instruct (base; not Norwegian-tuned). Quality issues documented — see AI Status below.  
**Typography:** Schibsted Grotesk (single family, display 700 / body 400).  
**Hosting target:** Hetzner VPS + Supabase EU region. Free per user is a hard constraint.

### Key architectural decisions locked in
- No `expectedAnswer` column in the sentences schema. `deriveCorrectAnswer(exerciseType, norwegian, english, notes)` derives it at grading time.
- `useAIStatusStore` is the single source of truth for AI status. Do not add parallel boolean flags.
- `resolveItem` ignores `contentId` — it always resolves by concept pool from `seedsByConceptId`. ContentCache pre-seeding (used for retry items) bypasses this.
- Session progression: only `submitResult` and `continueAfterRepair` may call `advanceItem()`. No auto-advance via timers.
- Error tags are a three-way contract: scheduler pool assigns types, component renders them, grader derives the expected answer. All three layers must be consistent. A two-layer check misses bugs.

---

## AI Status

The local model (Llama-3.2-3B-Instruct) has documented Norwegian quality issues:
- English drift mid-response
- Swedish vocabulary appearing (observed: "Hur" instead of "Hvordan")
- Garbled compound words
- Contextually wrong explanations

**Current state:** The model is intermittently functional. During P0 recovery verification, the AI produced a real, accurate V2 word-order explanation. During the 2026-05-21 walkthrough it returned template fallbacks. The `consecutiveGenerationFailures` counter (threshold 2) sets state to `unavailable` when generation consistently fails.

**What's in place:**
- `AIStatusBadge` shows "AI ready" / "AI unavailable" honestly
- Template fallbacks exist for all AI paths (explanations, conversation, journal feedback, writing review)
- `explainMistake` returns `{ text, source }` — `source: 'template'` vs `source: 'ai'`
- **Prompt hardening (Stream 1.1 Step 1, shipped):** all 5 prompt builders in `src/ai/prompts.ts` carry Norwegian-enforcement system rules
- **Shared validity gate (P0.5-06, shipped):** `validateNorwegianOutput` in `src/ai/validate.ts` gates all AI surfaces; failed validation falls back to per-surface template

**What's not in place:**
- NB-Llama-3.2-1B compile for web-llm (Stream 1.1 Step 2 — queued; half-day MLC pipeline)
- Server-side Ollama on VPS (Stream 1.1 Step 3 — last resort, only if Step 2 fails the bar)
- Native speaker gate for model quality validation

---

## UI Status

**Completed passes:**
- UI-0: Foundation (token contract, viewport, colour system)
- UI-1.0: Typeface (Schibsted Grotesk, æ/ø/å as primary)
- UI-1.1: Onboarding pass (white-on-dark slop fixed, role="progressbar" accessibility)
- UI-1.2: Session loop (Norwegian dominates principle applied across all exercise types; 1.6× ratio at all 4 breakpoints)

**Pending:**
- UI-1.3: Dashboard composition pass (dead buttons resolved)
- UI-2: Conversation, Progress, Landing
- UI-3: Cleanup (dead `nc-*` classes, Lighthouse pass, dnd-kit removal from package.json)

**Aesthetic direction:** Declared as "precise dark intelligence — Norwegian is the hero." Token contract: single red system (`--nc-red*`), Schibsted Grotesk, deep dark background with topographic grid. Three documented "Norwegian dominates" exemptions: assessment surfaces (diagnostic/recalibration), word-order tiles, listening phase.

---

## Gap List

### P1 (status post-P0.5 + Stream 5)
1. ~~Diagnostic explanation shows next question's topic after wrong answer~~ — closed via P0.5-07 (semantics rewrite)
2. Conversation mic auto-starts recording without user consent — **OPEN** (P1, mic-consent UX)
3. Conversation opener context-free — **closed** via P0.5-05 (Norwegian topic label in Kari opener)
4. ~~Journal feedback quality nonsensical~~ — closed via P0.5-06 (validity gate on `reviewWriting`)
5. Profile/Progress SSR hydration flash (A1→A2) — partially closed via P0.5-11 (read-on-render); **dashboard hydration React #418 closed 2026-05-22 via `cf1fcc3`** (SSR-safe gates on `todayLabel` + `streak`); **journal SSR mismatch (F032) closed 2026-05-22 via `9bef843`** (`WritingEditor` no longer auto-flips `inputMode` post-hydration). All known SSR hydration mismatches now sealed.
6. Progress page shows wrong level's concept graph — closed via P0.5-02 (canonical concept-id scheme)
7. ~~Recalibration starts without trigger banner or opt-in~~ — closed-by-retirement Stream 5.5 Phase 8 (surface retired; level-switch + Profile escape hatch replace the standalone trigger)
8. ~~Recalibration accessibility tree empty~~ — closed-by-retirement Stream 5.5 Phase 8 (standalone surface goes away)
9. Diagnostic terminates at 5/12 with "12" visible in counter — partially addressed in P0.5-07 (dedupe via askedIds); counter cosmetic remains
10. Dashboard notifications bell dead — **OPEN** (UI-1.3 scope: dead button)
11. Waitlist form cosmetic — closed via analysis in P0.5-13 (server action wired to Supabase)
12. Conversation end has no summary/save confirmation — **OPEN** (P1, session bookend)
13. Session complete screen untestable via direct navigation — closed via P0.5-08 (pre-render guard)
14. Mid-session exit used `window.confirm()` — closed 2026-05-22 via `922d91e` (Radix AlertDialog primitive)

### P2 (polish, after P1)
- Grey rectangle visual artifact on login/onboarding cards
- Excess whitespace below footer
- Footer missing Norwegian special characters ("Laer. Forsta. Mestre.")
- Dashboard accuracy stat misleading for 0-session guest
- Favicon 404 on all pages
- Vocab/Shadow "Varsle meg" buttons have no feedback
- Shadow stub description overpromises phoneme-level analysis
- scroll-behavior:smooth warning on navigation
- Journal hydration mismatch (SSR voice mode vs client text mode)
- SpeedRound stale-closure timer bug (fingerprint pollution on timer expiry)
- FillInBlank blank indicator size mismatch at 1280px+ (cosmetic)

### Corpus gaps (content authoring, not code)
- `negation-placement` concept: zero seed sentences → always excluded from sessions
- `modal-verbs` concept: zero seed sentences → always excluded from sessions
- `adjective-agreement` concept: insufficient seeds for most exercise types → sessions short
- `v2-word-order` concept: sparse seeds → sessions short
- `sentence-transformation` exercise type: only mock-s11 test fixture exists, no production sentences
- Result: post-P0 sessions are 2–7 items instead of 12–16

### Deferred (post-P1, strategic)
- ~~A2 decay half-life shortening (46 → 25 days)~~ ✅ shipped Stream 1.2
- ~~Calibration window for first 5 sessions~~ ✅ shipped Stream 1.3
- ~~Anonymized event logging~~ (writes) ✅ shipped Stream 1.4; reads (analytics surface) still deferred
- NB-Llama-3.2-1B compile for web-llm (Stream 1.1 Step 2)
- Muntlig module — shadowing, pronunciation drills, listen-and-respond (step 5 scripted roleplay shipped)
- FSRS/BKT adaptive spacing migration (v2)
- B1/B2 concept graph + corpus authoring
- Reading comprehension scoring
- Vocabulary SRS (schema exists, no content seeded, no UI)
- Listening module

---

## Operating Setup

**Key files:**
- `CLAUDE.md` — project context, operating rules, tech stack, moat, north star
- `docs/roadmap.md` — current sequencing with P0 re-sequencing documented
- `docs/recovery-backlog.md` — P0 batch complete, P1/P2 items, durable context
- `docs/ui-1/aesthetic-direction.md` — visual direction, token contract, exemptions

**Operating rules (summary of the ones that recurred most during P0):**
1. No silent substitution. Honest banners over silent fallbacks. This fired at 4 distinct layers during recovery: AI badge, error tags, session auto-skip, journal correction.
2. Analysis-first on decisions; direct on mechanics. 3-layer mismatch check before implementing.
3. Verify, don't assume. Evidence before assertions.
4. One move at a time. Finish, verify, stop.
5. Scope discipline. Fix X, don't also refactor Y.

**Test suite:** 14 test files / 155 tests passing (verified 2026-05-22 via `npm test`). Coverage spans `tests/engine/` (incl. `weekly-sprint.test.ts`, `scheduler.test.ts` with weekly-focus-bias suite), `tests/exercises/`, `tests/hooks/`, `tests/ai/`, `tests/journal/`, `tests/lib/` (incl. `weekly-check.test.ts`).

---

## Competitive Truth

- The engine architecture (fingerprint + repair loop + phase model + production-gap tracking) is genuinely differentiated. No Norwegian app does root-cause diagnosis.
- Lingu has adaptive placement but not continuous adaptation.
- Babbel and Busuu have Norwegian but fixed curriculum and paid.
- The feature set (SRS, exercise types) is table stakes. The moat is the diagnostic coaching intelligence.
- The moat is an architectural bet, not proven differentiation, until there is usage data showing the repair loop actually accelerates learning.

---

## Success Criteria for Next Phase

Stream 5 (Weekly Sprint) closure leaves two parallel decision tracks:

**Engineering-eligible (can ship via Council without user input):**
- ~~**F008 path-traversal tightening** in `safeRedirectPath` — hygiene; no exploit. Small.~~ ✅ CLOSED 2026-05-22 via `20beb88`.
- ~~**F032 journal SSR mismatch** — cosmetic; same shape as the React #418 fix on dashboard.~~ ✅ CLOSED 2026-05-22 via `9bef843`.
- **F027 repair-loop cap** — worst-case polish (`isRepairItem` guard prevents the failure mode).
- **F025 session resume on re-entry** — non-trivial; needs session-state persistence layer.
- **Stream 1.4 reads — analytics surface** against `learning_events_log`. First read use case. Needs design — how to surface "is the repair loop accelerating learning?" without becoming Duolingo's stats page.
- **Stream 1.1 Step 2 — NB-Llama-3.2-1B MLC compile for web-llm.** Half-day pipeline; not single-turn.
- **REVIEW.md 2026-05-11 WARNING items re-audit pass.**

**Product-decision (need user input):**
- **A. Muntlig roleplay deepening** — branching variety, recording playback, scoring heuristics OR a sixth muntlig mode.
- **E. B1/B2 concept graph + corpus authoring** — content authoring; unlocks honest level switching.

**Pending user actions (unblock options):**
- ~~Magic-link click for authenticated walkthrough~~ ✅ DONE — replaced by email OTP login (`verifyOtp`), verified e2e cross-device 2026-06-05.
- `NEXT_PUBLIC_APP_URL=https://pandoai.no` in production env.
- Supabase Authentication → URL Configuration → whitelist `https://pandoai.no/auth/callback`.

### Procedural locks (apply to whichever build is chosen)
1. Fingerprint pre/post diffs are mandatory acceptance evidence for any task that claims to feed the engine.
2. AI output flows through `validateNorwegianOutput` (one shared gate), not per-call-site validation.
3. Source-verification audit before re-sequencing a recovery batch on walkthrough findings alone.
4. A fresh walkthrough — including authenticated path — runs before the next muntlig surface ships.

---

*Snapshot date: 2026-05-22 | Recent commits: `0fd8248` /gsd close + AlertDialog + roadmap reconciliation, `922d91e` AlertDialog primitive, `cf1fcc3` React #418 hydration fix, `6f01b12` weekly_check_complete telemetry wire, `9dd017e` dashboard WeekStrip, `85504e4` graduation rule, `d81b2e4` /uke route + WeeklyCheckScreen, `b73cb35` openWeek/ensureWeekOpen, `4fbd654` scheduler weekly-focus bias, `0821e75` Stream 5 Phase 1 data model.*
