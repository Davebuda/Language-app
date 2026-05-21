---
gsd_state_version: 1.0
milestone: p0.5-recovery-complete
milestone_name: P0.5 Recovery Bundle — COMPLETE
status: signed off
stopped_at: All 15 P0.5 tasks complete. Muntlig scripted roleplay UNBLOCKED — pending product decision on whether to resume immediately or course-correct after recovery learnings.
last_updated: "2026-05-21"
last_activity: 2026-05-21T21:00 — Recovery sign-off report at .council/reports/2026-05-21-2100-recovery-signoff.md.
progress:
  walkthrough_iterations: 3 of (target 4 to seal)
  p0.5_tasks_complete: 15/15
  p0.5_tasks_total: 15
  p0.5_task_re_sequenced_at: "2026-05-21T18:55 — source verification surfaced corpus-vs-code distinction; tasks re-ordered, two new tasks split out"
  blocking_finding_count: 10 critical
  significant_count: 20
  minor_count: 9
  edge_case_count: 4
  prior_p0_patterns_regressed: 4 of 5
---

# Project State

## Project Reference

**Project:** NorskCoach — diagnostic Norwegian language learning web app
**Core value:** Diagnosis + Scheduling + Remediation beats lesson-based apps for any motivated learner
**Current focus:** P0.5 Recovery Bundle — pipeline-honesty re-seal across the surfaces the third walkthrough flagged

## Current Position

Phase: P0.5 Recovery Bundle (task 01 — source verification)
Status: Executing
Last activity: 2026-05-21 — Third Playwright walkthrough produced 39 findings (10 Critical, 20 Significant, 9 Minor, 4 Edge cases); roadmap restructured

Progress: [████░░░░░░░░░░░░░░░░] P0.5: 0/13 tasks complete

## Honest current state (post-third-walkthrough)

The prior STATE.md ("P0 ✅ P1 ✅ Stream 4 ✅ Engine corrections ✅ Shadowing ✅") was true at the time of writing. The third stress walkthrough on 2026-05-21 revealed that four of the five P0 pipeline-honesty patterns CLAUDE.md operating rule 8 names by example are regressed in the live app, and three new Critical AI-quality bugs are shipping. The "everything green" framing is paused while P0.5 Recovery seals the regression set.

### What is verified working today (held since prior recovery)
- Critical-path session loop is reachable end-to-end (start → exercise → wrong answer → repair card → retry → next exercise). Verified during walkthrough.
- Word-order exercise click-to-arrange model holds.
- Repair-loop sequence (explain → 2 micro-drills → retry on original sentence) holds.
- Mic does NOT auto-activate (P1 held).
- B1/B2 honest banner displays correctly on dashboard level switch (held).
- Auth callback open-redirect protection holds (CRITICAL from REVIEW.md is fixed).

### What is broken right now (the P0.5 backlog addresses each)
- AI grammar explanation in repair card teaches the opposite of the noun-gender rule (F022)
- Kari (conversation AI) produces non-Norwegian strings (F029)
- Journal AI invents words and reverses sentence meaning by removing user's negation (F033)
- Conversation contributes nothing to fingerprint (F030)
- Journal contributes nothing to fingerprint (F034)
- All recentErrors collapse to a single `word-order` tag regardless of mistake type (F010)
- /progress shows every concept at 0% or Locked despite fingerprint having rawScore 100 (F036)
- /session/complete is directly accessible with no guard (F023)
- Diagnostic seeds rawScore=100 even when answer was wrong (F017)
- Session completion counter never increments (F012)

Full inventory: `test-reports/stress-walkthrough-2026-05-21/report.md`.

## Muntlig Build Order (per architecture.md) — PAUSED

| Step | Mode | Status |
|------|------|--------|
| 1 | Audio infrastructure | ✅ |
| 2 | Shadowing | ✅ |
| 3 | Pronunciation drills | ✅ |
| 4 | Listen-and-respond | ✅ |
| 5 | Scripted roleplay | ⏸ **PAUSED until P0.5-13** |

## P0.5 Build Order (re-sequenced after P0.5-01)

| Step | Task | Status |
|------|------|--------|
| 01 | Verify findings against source | ✅ complete |
| 02 | Concept-id reconciliation (graph as source of truth) | ✅ complete |
| 03 | Corpus wiring + orphan placeholder cleanup | ✅ complete |
| 04 | Shared error-tag → concept-id module | ✅ complete |
| 05 | Conversation + Journal write-through | ✅ (F028 fixed; F030/F034 fold into 06) |
| 06 | AI language-validity gate + correction fallback | ✅ complete |
| 07 | Diagnostic semantics rewrite | ✅ complete |
| 08 | Session lifecycle — immediate guards | ✅ complete |
| 09 | Session lifecycle — completion semantics | ✅ complete |
| 10 | Dashboard stat honesty | ✅ complete |
| 11 | Profile read-on-render | ✅ complete |
| 12 | Onboarding mid-flow state persistence | ✅ complete |
| 13 | Auth/waitlist truthfulness | ✅ complete |
| 14 | Polish bundle | ✅ complete |
| 15 | Recovery sign-off | ✅ complete |

## Decisions logged this session

- 2026-05-21T18:15: RESTRUCTURE — Pause muntlig scripted roleplay; insert P0.5 Recovery Bundle. User-approved direction "make a plan and work through all to the end with guidance from /council and updated documentation for proper paths." See `.council/log.md`.
- AI output across three surfaces is failing for the same reason: no shared validity gate. P0.5-04 centralises this.
- Fingerprint pre/post diffs are mandatory acceptance evidence for any task touching engine write paths.

## Deferred

- Stream 1.1 model swap — bridged by P0.5-04 validity gate; revisit after P0.5 sign-off.
- v2 backlog (FSRS, BKT, adaptive decay, vocab SRS).
- Authenticated-pass walkthrough — the third walkthrough was guest-only; P0.5-13 should attempt both passes (will require user to click magic link).
