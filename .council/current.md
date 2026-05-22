# Task Brief
**Task:** Stream 5.5 — Lanes on a Bar (architecture ratification + roadmap restructure)
**Date:** 2026-05-22T09:02
**Status:** RESTRUCTURE COMPLETE — hand off to /solve
**corrections:** 0
**Verdict:** RESTRUCTURE (Council ratified the lane architecture; docs/roadmap.md rewritten to lock the 8-phase sequence; F008 displaced to further-deferred backlog)

---

## What was decided

**Architecture ratified:** The Weekly Sprint (Stream 5) becomes the system-wide organizing rhythm. Every feature is a **lane** on the weekly bar, declared by modality + freedom + focus-bias. Features that don't earn a lane are retired or deferred. **No new feature surface.**

**Lane assignments (final):**

| Day | Touchpoint | Lane | Surface |
|---|---|---|---|
| Mon | Plan | Dashboard surface | WeekStrip + session card |
| Tue–Fri | Drill | constrained mixed-modality | Session loop |
| Tue–Fri | Write | free written production | Journal |
| Tue–Fri | Speak | constrained spoken production | `/roleplay` (scripted) |
| Tue–Fri | Talk | free spoken/written production | Conversation (Kari) |
| Tue–Fri | Read | passive input | Reading studio |
| Tue–Fri | Repair | cross-surface SRS queue | Repair loop (externalized) |
| Mid-week | Reveal | UI delta strip | Dashboard mid-week strip |
| Sat | Check | adaptive retrieval | `/uke` |
| Sun | Graduate | engine close | `closeWeek` |

**Retirements ratified autonomously:**
- `/vocab` notify-button stub — retired; honest "Coming in v2" banner
- `/shadow` notify-button stub — retired; honest "Coming in v2" banner
- Listening "module" placeholder — deferred; only built when audio infra ships

**Retirement ratified for Phase 8 (2026-05-22T09:15):**
- Recalibration as standalone surface — **Option A ratified** by Council via engine-evidence reasoning (decay + scheduler + shouldResetWeek already cover cross-concept drift; level-switch is the one legitimate trigger, preserved as an internal call). Surface retired; `recalibrate(level)` retained as internal function callable from level-switch + Profile escape hatch. Closes project-state.md P1 #7 and #8 by retirement. All 8 phases now autonomous.

**Sequencing locked (all 8 phases autonomous after Phase 8 ratification 2026-05-22T09:15):**
1. Reading concept-tagging + exposure logging
2. Mid-week reveal strip on dashboard
3. Journal weekly-focus prompt bias
4. Roleplay weekly-focus scenario selection
5. Conversation weekly-focus topic bias + correction priority
6. Repair loop externalization — **SRS schedule writes only; no mid-flow drill firing on free surfaces** (research-validated constraint)
7. Stub removal (`/vocab`, `/shadow`)
8. Recalibration retirement — Option A ratified (surface retired; internal function preserved; wired to level-switch + Profile escape hatch)

## How (the research finding that shaped the design)

Council fired one targeted WebSearch on the open risk flagged by super-orchestrator: cross-surface micro-drill firing — interruption fatigue vs varied retrieval transfer.

**Finding:** 2026 Immersion Learning Institute research (cited in current language-app reviews) — spaced retrieval with authentic content + varied contexts beats single-surface drill 3.2× on retention. Cross-surface concept encounter IS varied retrieval, but mid-flow interruption breaks attention.

**Design implication:** Phase 6 repair-loop externalization writes SRS schedule for next-session pickup. It does NOT fire mid-flow drills on free production surfaces (journal, conversation, roleplay). Mid-flow drills remain ONLY in the Session loop where they are the expected interaction.

This is now a load-bearing procedural lock for Stream 5.5 (see roadmap Stream 5.5 "Procedural locks" section). Logged in `.council/research.md` 2026-05-22 as an extension of the 2026-05-21T21:30 Weekly Sprint research entry.

## Files changed by this restructure

- `docs/roadmap.md` — added "Stream 5.5 — Lanes on a Bar" section (between Stream 5 procedural locks and Stream 6 deferred backlog); updated "Current Position" header; updated "Next phase — choose one" to point at Stream 5.5; demoted F008/F025/F027/Stream 1.4 reads/Stream 1.1 Step 2/REVIEW.md re-audit to "Further-deferred backlog (after Stream 5.5 closes)".
- `docs/project-state.md` — updated header date + status to reflect Stream 5.5 active.
- `.council/current.md` — this file.
- `.council/log.md` — appended 2026-05-22T09:02 RESTRUCTURE entry.
- `.council/research.md` — extension entry on cross-surface micro-drill firing.

## Files NOT changed

- No production code touched in this restructure pass. Every code change happens within /solve → /gsd execution of the individual phases.
- `CLAUDE.md` — Operating Rules unchanged. Stream 5.5 honors them (Rule 1 depth-not-breadth; Rule 6 no silent substitution drives the stub removal).
- Test suite — 155/155 tests passing prior to restructure; no test changes in this commit.

## Acceptance criteria for the restructure itself

1. ✅ `docs/roadmap.md` contains "Stream 5.5 — Lanes on a Bar" section with full lane map + 8 phases.
2. ✅ `docs/project-state.md` "Date" and "Status" lines updated.
3. ✅ `.council/log.md` has 2026-05-22T09:02 entry.
4. ✅ `.council/research.md` has the cross-surface micro-drill finding logged.
5. ⏵ Commit lands with intent-line first + Constraint/Rejected/Confidence trailers per CLAUDE.md commit protocol.
6. ⏵ Hand-off to /solve invoked next with the ratified Stream 5.5 sequence + open user-decision flagged.

## Playwright Checkpoint

**none** — this restructure pass changes documentation only. No production code, no UI, no behavior change. Each subsequent /gsd execution of a Stream 5.5 phase will run its own Playwright SMOKE (or FULL after Phase 6).

## Next-step handoff

`/solve` with the brief: "Stream 5.5 is fully ratified — all 8 phases autonomous. Produce the execution plan for Phases 1–8 using existing primitives. Honor the load-bearing constraint: Phase 6 writes SRS state for next-session pickup; it does not fire mid-flow drills on free surfaces. Phase 8 retires the `/recalibration` route + wires `recalibrate(level)` to level-switch + Profile escape hatch."

After /solve produces the plan, `/gsd` executes phase-by-phase with the standard Council brief-write → implementer → Playwright SMOKE → review loop.
