# NorskCoach — Project Context for Claude Code

## What This Is

An adaptive Norwegian language learning web app. Not a course — a coach. It builds a per-user mistake fingerprint, generates a personalized session every time, runs every wrong answer through a repair loop with spaced-repetition follow-up, and pushes the user to speak.

**One-line positioning:** A personal Norwegian tutor that finds your weak spots, explains why they happen, and fixes them with targeted practice — and pushes you to actually speak.

This file is the operating context. The full durable plan lives in `docs/roadmap.md` (must-read), with feature-specific specs in `docs/muntlig/architecture.md`, `docs/ui-1/`, and other `docs/` files. If this file conflicts with `docs/roadmap.md`, the roadmap wins. If either conflicts with observed code, stop and flag it.

---

## Read in This Order Before Working

1. `docs/roadmap.md` — the durable plan: current state, must-change items, build sequence, deferred backlog
2. `docs/muntlig/architecture.md` — the speaking-practice module spec (Phase C)
3. `docs/ui-1/` — the active UI transformation phase documents

---

## The Moat

Three things working together. Everything serves these:

1. **Diagnosis** — knowing precisely what the learner is failing at, including root causes.
2. **Scheduling** — generating a personalized session that mixes remediation, review, new material, and interleaving.
3. **Remediation** — every wrong answer triggers explain → micro-drill → retry → schedule for spaced review.

AI is a power tool. AI is never the headline. Every AI path has a non-AI fallback.

---

## The North Star (Results Principle)

The app exists to make the user speak more Norwegian and build sentences confidently. Two layered outcomes: production fluency and speaking confidence. Every feature pushes toward production. The muntlig module is the most literal embodiment of this and exists for it.

---

## Tech Stack (ACTUAL — not aspirational)

- **Platform:** Web. Next.js (App Router), TypeScript strict, Tailwind.
- **Backend:** Supabase (Postgres + Auth + RLS), EU region.
- **State:** Zustand stores; fingerprint persists to IndexedDB, syncs to Supabase fire-and-forget for auth users.
- **Local AI:** web-llm in a Web Worker via WebGPU. Target model: NB-Llama-3.2-3B (National Library of Norway, Norwegian-fine-tuned). Currently running vanilla Llama-3.2-3B — must swap in Phase A1. Core engine does NOT depend on AI — every AI path has a template/rule fallback.
- **Typography:** Schibsted Grotesk (single family, display 700 / body 400). Designed by Norwegian media company for Scandinavian digital reading.
- **Hosting target:** small EU VPS + Supabase EU region. Free per user is a hard constraint.

There is no iOS app, no Swift, no MLX. Earlier docs describing those are historical artifacts from a deferred native plan. Do not act on them.

---

## Current State Snapshot

**Engine:** complete and verified. Diagnostic, fingerprint, mastery scoring (phase-adaptive EMA + slip detection), decay (floor 35), phase model, scheduler (40/30/20/10), four-rule diagnosis, repair loop with full SRS ladder, honest error tagging, content dedup, full pipeline parity across session/conversation/journal.

**UI transformation:** in progress. UI-0 done (aesthetic direction, token contract, dirty diff triaged), UI-1.0 done (Schibsted Grotesk, shadcn audit), UI-1.1 done (onboarding pass). UI-1.2 (session loop) is next.

**Muntlig:** designed, not built. See `docs/muntlig/architecture.md`. Blocked on Phase A1.

**Deferred:** vocab SRS, listening module, B1/B2 graph, reading scoring, v2 engine upgrades (FSRS, BKT, dual storage). See roadmap.

---

## Current Phase

**Phase A — Engine corrections (research-mandated, mandatory, cheap).** Sequence per roadmap:

- **A1:** Swap to NB-Llama-3.2-3B in web-llm, re-validate AI tasks against Norwegian eval harness.
- **A2:** Reduce decay half-life from 46 days to 21–30 days.
- **A3:** Add 5-session calibration window flag to scheduler.
- **A4:** Add anonymized event-log table; write on session complete / repair triggered / level changed / conversation completed.

After Phase A: continue UI transformation (Phase B, UI-1.2 next). Phase C (muntlig) starts after A1 is verified.

Out of scope right now: new engine features beyond the four corrections, anything in the deferred backlog, native/iOS anything.

---

## Operating Rules (HARD RAILS — earned from real project failures)

1. **Depth, not breadth.** No new feature surface while foundations are unfinished. Breadth-while-foundations-open is the documented failure mode of this project.

2. **Analysis-first on decisions; direct on mechanics.** Architectural choices get 2–3 options analyzed and stop for approval. Mechanical changes go direct to diff. Don't analyze one-liners; don't build architectural changes without analysis.

3. **Verify, don't assume.** Concrete trace against acceptance criteria before declaring done. Visual verification (actual screenshots, not just gate-checks) for UI work. This caught the wrong cold-start audit, confirmed conversation parity, surfaced the diagnostic question-structure ambiguity in UI-1.1. Mandatory.

4. **One move at a time.** Finish, verify, summarize, stop. Don't chain unprompted.

5. **Surface drift, don't route around it.** If a request seems to contradict the moat, the north star, or the roadmap, raise it as an explicit question — don't silently reinterpret.

6. **No silent substitution.** Honest banners over silent fallbacks (the B1/B2-runs-A2 pattern). If something isn't fully built, say so in the UI.

7. **Scope discipline on prompts.** Fix X means fix X. Note adjacent issues; don't act on them.

---

## The Architect Subagent

This project has an architect subagent at `.claude/agents/architect.md`. Its job is direction, sequencing, and pushback — not writing code. Consult it before starting any phase, when a request might be breadth-not-depth, when scope is unclear, or when a decision has architectural weight. Its scope/direction flags are blocking until resolved with the user.

---

## When in Doubt

Re-read `docs/roadmap.md`, the moat, and the north star. Every decision should trace to one of them. If it doesn't, it's probably out of scope — raise it, don't build it.

---

## How to Start a Session

1. Read this file fully.
2. Read `docs/roadmap.md` for current state and phase.
3. State the current phase and what's in scope before acting.
4. For anything non-trivial, propose a plan and stop for approval.
5. Do not ask the user to re-explain the project. It's all in `docs/`.
