# NorskCoach — Project State Snapshot

**Date:** 2026-05-21 (post third walkthrough)  
**Status:** P0.5 Recovery Bundle in progress. Third Playwright stress walkthrough surfaced 10 Critical findings; four of five named P0 patterns regressed. Muntlig scripted roleplay paused until P0.5-13 sign-off.

> **The earlier line "P0 recovery batch complete. Session loop is completable end-to-end for the first time" is preserved further down as the historical 2026-05-21 morning state.** It remained true for the critical-path session-loop sense but the third walkthrough that afternoon proved that the broader pipeline-honesty contract regressed across journal + conversation + diagnostic semantics, and three new Critical AI-quality bugs are shipping. P0.5 Recovery Bundle in `docs/recovery-backlog.md` seals these before muntlig resumes.

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

### Engine modules — unchanged and verified correct
- **Diagnostic placement:** IRT-style adaptive quiz, seeds fingerprint. Early-exit confirmed (5 of 12 questions in prior testing; confidence-based).
- **Mistake fingerprint:** JSON blob in IndexedDB + Supabase. Per-concept mastery, SRS state, error log, production gap, speaking minutes, preference.
- **Mastery scoring:** Phase-adaptive EMA, slip detection, geometric-mean confidence.
- **Decay:** Exponential with floor of 35. Half-life ~46 days (shortening to ~25 is deferred to post-P0 A2 correction).
- **Phase model:** locked → intro → practice → consolidation → maintenance.
- **Scheduler:** Recipe 40/30/20/10 with `firstEligibleType` guard, concept-repeat cap, production guarantee, Fisher-Yates shuffle.
- **Diagnosis engine:** 4 root-cause rules. Output now surfaced on the dashboard session card as a conditional "Why this" block (2026-05-21) — silent when no rule fires, learner-facing `reasoning` when one does.
- **Repair loop:** template explanation + 2 micro-drills + retry + SRS scheduling (1→3→7→14→30 day ladder).

---

## Features Today

### Working end-to-end
- Diagnostic placement (onboarding flow, 5 slides + quiz)
- Dashboard (session preview, level selector, A1/A2/B1/B2 with honest B1/B2 banner)
- Session loop: fill-in-blank, word-order, translation-to-norwegian, sentence-transformation, fill-in-blank, speed-round
- Repair loop: explain → micro-drills → retry → SRS
- Conversation mode (AI tutor + template fallback when model unavailable)
- Journal (text + voice input, AI feedback + template fallback, corrected version with honest partial-correction note)
- Reading studio (4 texts, level filter, parallel translation, word lookup stub)
- Progress page (concept phases, locked prerequisites)
- Profile (level, streak, sessions, weak concepts, session style preference)
- Recalibration (7-question quiz; no trigger banner — P1)

### Stubs (by design)
- `/vocab` — Vocabulary SRS placeholder with notify button
- `/shadow` — Pronunciation lab placeholder with notify button

### Known gaps (not stubs, actual missing pieces)
- Session complete screen: cannot test via direct navigation (guarded); reachable via completing a session
- Listening exercises: have their own three-tier fallback but no audio files served yet
- Speed round: stale-closure timer bug (queued in integrity follow-ups)
- Muntlig module: designed, not built

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

**What's not in place:**
- NB-Llama model swap (Stream 1.1 — three-step path in roadmap)
- Prompt hardening v2
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

### P1 (next to schedule, no blocking dependency)
In order of user-impact severity:
1. Diagnostic explanation shows next question's topic after wrong answer (not current)
2. Conversation mic auto-starts recording without user consent
3. Conversation opener is context-free ("Bra! Kan du fortelle mer?" on load)
4. Journal feedback quality — nonsensical praise, wrong explanations, English output (AI quality)
5. Profile/Progress SSR hydration flash (A1→A2)
6. Progress page shows wrong level's concept graph
7. Recalibration starts without trigger banner or opt-in
8. Recalibration accessibility tree empty (screen reader gets nothing)
9. Diagnostic terminates at 5/12 with "12" visible in counter
10. Dashboard notifications bell dead
11. Waitlist form cosmetic — no network request
12. Conversation end has no summary or save confirmation
13. Session complete screen untestable via direct navigation

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
- A2 decay half-life shortening (46 → 25 days)
- Calibration window for first 5 sessions
- Anonymized event logging
- Muntlig module (full speaking system)
- FSRS/BKT adaptive spacing migration (v2)
- B1/B2 concept graph authoring
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

**Test suite:** 106 tests passing across `tests/engine/`, `tests/exercises/`, `tests/hooks/`, `tests/ai/`, `tests/journal/`.

---

## Competitive Truth

- The engine architecture (fingerprint + repair loop + phase model + production-gap tracking) is genuinely differentiated. No Norwegian app does root-cause diagnosis.
- Lingu has adaptive placement but not continuous adaptation.
- Babbel and Busuu have Norwegian but fixed curriculum and paid.
- The feature set (SRS, exercise types) is table stakes. The moat is the diagnostic coaching intelligence.
- The moat is an architectural bet, not proven differentiation, until there is usage data showing the repair loop actually accelerates learning.

---

## Success Criteria for Next Phase

The P1 batch should close the remaining session coherence gaps (mic consent, conversation opener, diagnostic feedback) before moving to corpus authoring. Corpus authoring (filling seed gaps for negation-placement, modal-verbs, adjective-agreement) should happen in parallel with model swap scoping — producing real sessions of expected length requires both working AI (for topUpConcept) and real seeds.

The muntlig module should not start until:
1. NB-Llama model swap is complete (Stream 1.1)
2. Corpus has adequate A1/A2 coverage (no major concept gaps)
3. P1 items are cleared

---

*Snapshot date: 2026-05-21 | Commits through: `ee5f886` (P0 item 6 — closes batch)*
