# NorskCoach — Project Context for Claude Code

## What This Is

An adaptive Norwegian language learning web app. Not a course — a coach. It builds a per-user mistake fingerprint, generates a personalized session every time, and runs every wrong answer through a repair loop with spaced-repetition follow-up.

**One-line positioning:** A personal Norwegian tutor that finds your weak spots, explains why they happen, and fixes them with targeted practice — and pushes you to actually speak.

This file is the single source of truth for how to work on this project. If anything you believe about the project conflicts with this file, this file wins. If this file conflicts with observed code, stop and flag it — do not silently work around it.

## The Moat

Three things working together. Everything serves these:

1. **Diagnosis** — knowing precisely what the learner is failing at, including root causes under surface mistakes.
2. **Scheduling** — generating a personalized session that mixes remediation, review, new material, and interleaving.
3. **Remediation** — every wrong answer triggers explain → micro-drill → retry → schedule for spaced review.

External research (see `docs/validation-and-research.md`) confirmed this combination is genuinely differentiated against Lingu, Babbel, Busuu, and the Norskprøven prep ecosystem. No competitor does root-cause diagnosis. The moat is the diagnostic coaching intelligence — not the SRS, not the exercise types, not the model.

AI is a power tool that supports the coaching. AI is never the headline. Every AI path has a non-AI fallback.

## The North Star (Results Principle)

The app exists to make the user speak more Norwegian and build sentences confidently. Two layered outcomes: production fluency (can construct sentences) and speaking confidence (actually does, in low-stakes varied contexts). Every feature must push toward production. A pure-recognition feature fails this test unless wrapped with an output requirement.

The "Norwegian dominates the screen" principle applies to learning surfaces (session loop, translation, fill-in-blank, word-order, journal, muntlig). It does not apply to assessment surfaces (diagnostic, recalibration) where English instructions with Norwegian options are correct by design — instruction clarity matters more than immersion when measuring placement.

## Tech Stack (ACTUAL — not aspirational)

- **Platform:** Web. Next.js (App Router), TypeScript strict, Tailwind.
- **Backend:** Supabase (Postgres + Auth + RLS).
- **State:** Zustand stores; fingerprint persists to IndexedDB, syncs to Supabase fire-and-forget for auth users.
- **Local AI:** WebLLM in a Web Worker via WebGPU. Model: NB-Llama-3.2-3B (Norwegian-fine-tuned by the National Library of Norway). Used for conversation replies, constraint evaluation, semantic grading. Core engine does NOT depend on it — every AI path has a template/rule fallback.
- **Typography:** Schibsted Grotesk (single family, display 700 / body 400). Designed by Schibsted (Norwegian media) for Scandinavian digital reading; æ/ø/å are primary design requirements.
- **Hosting target:** small EU VPS + Supabase EU region. Free per user is a hard constraint.

There is no iOS app, no Swift, no MLX, no SwiftUI. Earlier design docs describing those are historical artifacts from a deferred native plan. Do not act on them.

## Current State (VERIFIED — the engine is complete)

The adaptive engine is built, traced, and verified correct:

- **Diagnostic placement** — IRT-style adaptive quiz, seeds the fingerprint (rawScore 60 correct / 20 wrong, confidence 0.4, 1 attempt). Cold-start traced and confirmed: new users get real adaptation from session one.
- **Mistake fingerprint** — JSON blob in IndexedDB + Supabase. Per-concept: rawScore, confidenceScore, decayedScore, attempts, uniqueDaysActive, streak, recentOutcomes, SRS state (nextReviewAt, srsLevel). Plus error log (200 cap), error patterns, production gap, speaking minutes, input/production preference.
- **Mastery scoring** — phase-adaptive EMA (α: intro 0.40 → practice 0.25 → consolidation 0.15 → maintenance 0.08), slip detection (a wrong answer after 4/5 recent correct counts at 30% weight), geometric-mean confidence.
- **Decay** — exponential half-life, decays toward floor of 35 (not zero). Half-life is being shortened from 46 → ~25 days based on research (see roadmap).
- **Phase model** — locked → intro → practice → consolidation → maintenance, computed live.
- **Scheduler** — recipe 40/30/20/10 (remediation/review/new/interleaving), pulls 5 weak concepts, SRS-driven review pool, repeat cap, production guarantee, shuffle.
- **Diagnosis engine** — 4 root-cause rules on real error data.
- **Repair loop** — template explanation + 2 micro-drills + retry + SRS scheduling on the ladder 1→3→7→14→30 days.
- **Error tagging** — uses sentence's real `error_tags_detectable`, not guessed from exercise type.
- **Content dedup** — no repeated sentence within a session.
- **Full pipeline parity** — session, conversation, AND journal all feed the identical mastery + SRS pipeline.

Built features: diagnostic, dashboard, session loop, repair loop, recalibration, conversation mode (AI tutor + constraints), journal, reading (hardcoded texts), progress, profile.

Stubs / not built: muntlig module (designed in `docs/muntlig/architecture.md`), vocab SRS, listening module, reading comprehension scoring, B1/B2 concept graph. Several UI buttons are dead. Landing email form is cosmetic.

## Current Phase

Two phases run in parallel until they reconverge:

- **Engine corrections** (model swap to NB-Llama, decay half-life shortening, calibration window for first 5 sessions, event logging table) — small, surgical, research-driven.
- **UI transformation** (UI-1.2 session loop next, then UI-1.3 dashboard, then UI-2 remaining screens). Underway: UI-0 done, UI-1.0 typeface done, UI-1.1 onboarding done.

After both converge, the muntlig module is the next major build. See `docs/muntlig/architecture.md` for the full zero-cost architecture.

Out of scope right now: vocab SRS, listening module, B1/B2 content authoring, FSRS/BKT migrations (v2), reading comprehension scoring, native/iOS anything.

## Operating Rules (HARD RAILS — these caused real problems when absent)

1. **Depth, not breadth.** Do not add feature surface. Finish and harden the current phase before proposing anything new. Adding features while foundations are open is the documented failure mode of this project.

2. **Analysis-first on decisions; direct on mechanics.** If a task involves a reversible architectural or design choice, produce an analysis with 2–3 options and tradeoffs and STOP for approval. If a task is mechanical and well-understood, do it directly and show the diff. Do not run analysis loops on one-line fixes; do not build architectural changes without analysis.

3. **Verify, don't assume.** Before declaring anything done, produce a concrete trace against stated acceptance criteria. "It should work" is not verification. A wrong audit was caught this way; conversation parity was confirmed this way. This is mandatory.

4. **One move at a time.** Finish the current move, verify it, summarize what changed, then stop. Do not chain into the next move unprompted.

5. **Surface drift, don't route around it.** If code conflicts with this file or a spec, or if a request seems to contradict the moat or north star, raise it as an explicit question. Do not silently reinterpret the request to make it fit.

6. **No silent substitution.** Never make a feature appear to work when it doesn't (the old B1/B2-runs-A2 pattern). Honest banners over silent fallbacks.

7. **Scope discipline on prompts.** If asked to fix X, fix X. Do not also refactor Y, restyle Z, or build the thing you think should come next. Note adjacent issues; don't act on them without approval.

## The Architect Subagent

This project has an architect subagent at `.claude/agents/architect.md`. Its job is direction, sequencing, and pushback — NOT writing code. Consult it before starting any phase, when a request might be breadth-not-depth, when scope is unclear, or when a decision has architectural weight. The architect proposes and challenges; the main session executes after approval. Treat its scope/direction flags as blocking until resolved with the user.

## Documents That Outrank This File On Their Specific Domains

- `docs/roadmap.md` — the current build sequence, what's in progress, what's deferred, with the research-driven priorities locked in.
- `docs/muntlig/architecture.md` — the full muntlig module architecture (audio, pronunciation, content, branching, timing). When muntlig is built, this is the spec.
- `docs/validation-and-research.md` — the research findings on model quality, SRS, decay, mastery, cold-start, competitive position. The reasoning behind the engine corrections lives here. Read this if you wonder why a decision was made.
- `docs/ui-1/` — aesthetic direction, token contract, typeface analysis, shadcn audit, type scale. The UI phase's source of truth.

If those docs conflict with each other or with this file, surface the conflict — don't pick.

## When in Doubt

Re-read the moat and the north star above. Every decision should trace to one of them. If it doesn't, it's probably out of scope — raise it, don't build it.

## How to Start a Session

1. Read this file fully.
2. Read `docs/roadmap.md` for the current sequence.
3. State the current phase and what's in scope.
4. For anything non-trivial, propose a plan and stop for approval (Operating Rule 2).
5. Do not ask the user to re-explain the project. It's all here.
