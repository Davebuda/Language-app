---
gsd_state_version: 1.0
milestone: stabilization
milestone_name: Stabilization — harden the shipped core loop; prove the moat
status: in progress
stopped_at: Baseline ultraaudit AUDIT-CLEAN (5/5 PASS) 2026-06-08; recourse four-lever program defined; lever 1 (hygiene + standing gate) in progress.
last_updated: "2026-06-08"
last_activity: 2026-06-08 — recourse re-anchor + baseline ultraaudit (AUDIT-CLEAN) + working-tree drift reconciled (benign; corpus already committed) + standing audit:gate codified.
head: db88cf5
test_count: 685 passing (tsc clean)
deployed: pandoai.no (Hetzner) — live matches HEAD
---

# Project State

## Project Reference

**Project:** NorskCoach — diagnostic Norwegian language learning web app
**Moat:** Diagnosis → Scheduling → Remediation (root-cause coaching no competitor does)
**North star:** make the learner produce + speak Norwegian
**Current focus:** STABILIZATION — harden the shipped core loop, keep the tree audit-clean, prove the moat with real users.

> **Note (2026-06-08):** This file previously described the long-closed "P0.5 Recovery Bundle"
> (Stream 5 era, last_updated 2026-05-22). That milestone and the 7-phase QA-walkthrough plan are
> done. Authoritative current state is `CLAUDE.md` → "Current State" (2026-06-06 box). This file is
> now the stabilization-phase tracker.

## Current Position

Phase: STABILIZATION. Phase 1 (core session engine) runtime-verified closed on HEAD (Playwright walkthrough + green suite + clean tsc, 2026-06-03). All 2026-06-05/06 live-bug + moat-visibility sweep fixes deployed (server-side Groq generation, corpus integrity 112→0, 39 B1 word-order keys, repair-loop phantom filter, conversation+journal AI corrections decoupled from the fingerprint, root-cause diagnosis surfaced as the dashboard coach line).

Verified 2026-06-08 (baseline ultraaudit, 5/5 PASS with evidence):
- Corpus integrity: `npm run audit:corpus` 0 ERRORS (68 concepts / 2,834 sentences — A1 879 · A2 758 · B1 620 · B2 577; all ≥30/concept).
- Type safety: `npx tsc --noEmit` 0 errors.
- Tests: vitest 685/685 green (one tolerable Windows worker-fork teardown flake; resolves on retry).
- Returning-user read safety: locked guard 10/10; `normalizeFingerprint` (`src/types/fingerprint.ts:163`) backfills.
- AI-never-grades-mastery: both correction flags hardcoded `false`; AI-error write paths provably dead while gated.
- Moat visibility: `runDiagnosis()[0].reasoning → dashboard coachReason → ProductionWall` chain intact.

## Recourse four-lever program (2026-06-08)

Sequenced to respect HARD RAIL #1 (depth-not-breadth): one code lever in-flight at a time; ops runs parallel.

| # | Lever | Class | Route | Status |
|---|---|---|---|---|
| 1 | Hygiene + standing ultraaudit gate (`npm run audit:gate`) | hygiene | execute directly | IN PROGRESS |
| 2 | NB-Llama-1B compile (Wave 0.5) | infra | scout → make-plan-pro → executor | QUEUED |
| 3 | Noun-gender deterministic corrector (re-arms conversation + journal) | build (depth) | scout → council → solve → executor; Rule-8 live trace = acceptance | QUEUED (after/with 2) |
| 4 | Get real users (unblocks Wave 5 V2 + moat-proof) | ops | feature-challenger (activation funnel) → feature-to-layout | PARALLEL LANE |

Critical path: 1 → 2 → 3. Lever 3 can ship on the dictionary path alone if scout finds a clean Norwegian gender source — Council decides whether 2 hard-gates 3.

## Deferred-by-decision (parked, not forgotten)

- Deterministic V2/conjugation correction (harder than gender; proper fix = NB-Llama) — lever 2/3.
- MCQ engine — gated on a 2nd consumer (`docs/mcq-engine-contract.md`).
- `acceptedOrders` population for word-order corpus.
- Translate-EN paraphrase tolerance (exact-match rigidity).
- Wave 5 V2 engine (FSRS-7, BKT, adaptive decay) — blocked on real users + usage data.
- B1/B2 cloze passages (0 exist; separate linguist-gated content task).

## Non-blocking content debt (corpus WARN, tracked not gating)

From `audit:corpus`: 334 nonstandard-blank-marker rows (5 underscores vs canonical 3), 39 over-length-for-level, 38 norwegian-invalid (no NO function words), 1 blank-without-fib. Kept as WARN in the standing gate — visible, not blocking.

## Decisions logged this session (2026-06-08)

- Ran a 5-dimension baseline ultraaudit as a Workflow → AUDIT-CLEAN. Codified the 4 load-bearing checks as a standing recurring gate (`npm run audit:gate`, `scripts/ultraaudit.mjs`) with a one-retry rule on the Windows vitest flake.
- Reconciled working-tree drift: the 12 `output/staging-b1-*.json` + merge/fix `.mjs` scripts are build inputs whose content is ALREADY committed (B1 at 50–56/concept). No unlanded content at risk. `output/` scratch + stray PNGs now gitignored.
- Refreshed this STATE.md (was 2-milestones stale) and corrected the vision-doc content baseline.
