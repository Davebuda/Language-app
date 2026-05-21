---
gsd_state_version: 1.0
milestone: muntlig
milestone_name: Muntlig module build
status: executing
stopped_at: Listen-and-respond (Step 4) complete. Scripted roleplay (Step 5) is next.
last_updated: "2026-05-21"
last_activity: 2026-05-21 — Listen-and-respond verified. Dashboard has all 4 muntlig links.
progress:
  p0_items: 8/8 complete
  p1_items_closed: 13
  p1_items_total: 13
  stream4_items: 3/3 complete
  engine_corrections: A2 ✅ A3 ✅ A4 ✅
  muntlig_modes: shadowing ✅ | drills ✅ | listen-respond ✅ | roleplay →
---

# Project State

## Project Reference

**Project:** NorskCoach — diagnostic Norwegian language learning web app
**Core value:** Diagnosis + Scheduling + Remediation beats lesson-based apps for any motivated learner
**Current focus:** Muntlig module — pronunciation drills next

## Current Position

Phase: Muntlig module build (Step 5 — scripted roleplay)
Status: Executing
Last activity: 2026-05-21 — Listen-and-respond verified (5s countdown, keyword chips, fingerprint, dashboard nav)

Progress: [████████████████████] P0 ✅ P1 ✅ Stream 4 ✅ Engine corrections ✅ Shadowing ✅

## What shipped this session (beyond P1 + Stream 4)

| Item | Commit | Status |
|------|--------|--------|
| A2 — decay half-life 46→25 days | (was already in place) | ✅ |
| A3 — calibration window first 5 sessions | 832d15c | ✅ |
| A4 — learning_events_log Supabase + fire-and-forget | 66a7c5c | ✅ |
| UI-1.3 — dashboard composition + grammar in session card | 2cf5b48 | ✅ |
| TS fixes — TopographicGrid + OnboardingFlow | 5ba5a3a | ✅ |
| Muntlig shadowing mode | 1943584 | ✅ |

## Muntlig Build Order (per architecture.md)

| Step | Mode | Status |
|------|------|--------|
| 1 | Audio infrastructure | ✅ Proven by shadowing (seed sentences, audioUrl field, static assets ready) |
| 2 | Shadowing | ✅ Working — idle→listen→result, word match, fingerprint, honest text-mode fallback |
| 3 | Pronunciation drills | ✅ Verified — 4 sets, heuristics, fingerprint, dashboard nav |
| 4 | Listen-and-respond | ✅ Verified — 7 questions, 5s countdown, keyword chips, dashboard nav |
| 5 | Scripted roleplay | ▶ NEXT |

## Decisions

- NB-Llama dependency scoped: audio infra + UI modes proceed now; NB-Llama content generation waits for model swap
- TS errors (TopographicGrid, OnboardingFlow) — CLOSED this session
- A3 calibration recipe: `totalSessionsCompleted < 5` derived flag, no new fingerprint field; recipe weights confirmed in implementation
- Progress Strip: folded into UI-1.3 dashboard session card (DailyLearningCard removed from dashboard)

## Deferred

- Stream 1.1 model swap (three-step path, not yet evaluated)
- Scripted roleplay — last muntlig mode, most complex
- v2 backlog (FSRS, BKT, adaptive decay, vocab SRS)
