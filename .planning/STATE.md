---
gsd_state_version: 1.0
milestone: P1-recovery
milestone_name: P1 bug fix batch
status: executing
stopped_at: P1-12 closed. P1-13 (session complete screen) is last P1 item.
last_updated: "2026-05-21"
last_activity: 2026-05-21 — P1-12 (conversation summary screen) fixed and playwright-verified
progress:
  p0_items: 8/8 complete
  p1_items_closed: 12
  p1_items_total: 13
  p2_items_closed: 0
  p2_items_total: 9
---

# Project State

## Project Reference

**Project:** NorskCoach — diagnostic Norwegian language learning web app
**Core value:** Diagnosis + Scheduling + Remediation beats lesson-based apps for any motivated learner
**Current focus:** P1 bug fix batch — significant issues ordered by user-impact severity

## Current Position

Phase: P1 recovery (post-P0) + Stream 4 ambient learning (parallel)
Status: Executing
Last activity: 2026-05-21 — P1-12 (conversation summary) closed; Stream 4 restructured into roadmap in parallel

Progress: [████████████████████] P0 done. 12/13 P1 closed.

## P0 Summary (COMPLETE 2026-05-21)

All 8 P0 items closed. Session loop is completable end-to-end.

## P1 Status

| Item | Status |
|------|--------|
| P1-1 Diagnostic explanation shows wrong topic | ✅ CLOSED 2026-05-21 |
| P1-2 Conversation mic auto-starts without consent | ✅ CLOSED 2026-05-21 (commit 2e32d29) |
| P1-3 Conversation opener context-free | ✅ CLOSED 2026-05-21 (commit 2e32d29) |
| P1-4 Journal feedback quality | ✅ CLOSED 2026-05-21 (commit 5d98c6b) |
| P1-5 Profile/Progress SSR hydration flash | ✅ CLOSED 2026-05-21 (commit 196e6ce) |
| P1-6 Progress page shows wrong level's concept graph | ✅ CLOSED 2026-05-21 (commit 196e6ce) |
| P1-7 Recalibration starts without trigger banner | ✅ CLOSED 2026-05-21 |
| P1-8 Recalibration accessibility tree empty | ✅ CLOSED 2026-05-21 |
| P1-9 Diagnostic terminates at 5/12 with "12" visible | ✅ CLOSED 2026-05-21 |
| P1-10 Dashboard notifications bell dead | ✅ CLOSED 2026-05-21 |
| P1-11 Waitlist form cosmetic — no data captured | ✅ CLOSED 2026-05-21 |
| P1-12 Conversation end no summary or save confirmation | ✅ CLOSED 2026-05-21 |
| P1-13 Session complete screen untestable | Open |

## Decisions

- P0 → P1 sequence enforced per roadmap.
- C1 diagnostic placement plan (docs/superpowers/plans/2026-05-19-c1-diagnostic-placement.md) is SCOPE VIOLATION — B1/B2/C1 content is explicitly deferred in roadmap v2 backlog. Council will not execute it.
- **2026-05-21 RESTRUCTURE:** Stream 4 (Ambient Learning — Daily Learning Card, Daily Word Pack, Progress Strip) added as parallel stream to P1 by explicit user direction. Architect concerns noted in .council/log.md. Stream 4 executes after P1-12 and P1-13 close, or interleaved at user discretion.

## Blockers/Concerns

- Pre-existing TypeScript errors in OnboardingFlow.tsx (srsLevel/nextReviewAt missing) and TopographicGrid.tsx — not blocking P1 work, noted for engine corrections phase.
- P1-4 (journal feedback) is AI-model-quality dependent — may need model swap (A1) to fully resolve. Execute the code fix first, note AI quality gap separately.

## Active parallel streams

- **P1:** P1-12 (conversation end summary), P1-13 (session complete screen) — 2 items remain
- **Stream 4:** Daily Learning Card → Daily Word Pack → Progress Reassurance Strip

## Deferred (resumes after P1 + Stream 4 clear)

- UI-1.3 dashboard (progress strip folds into this)
- A2 decay half-life (A2)
- A3 calibration window
- A4 event log
- Muntlig module
- Stream 1.1 model swap (continuing on its own three-step path)
