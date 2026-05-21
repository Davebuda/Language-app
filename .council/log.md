# Council Decision Log

_Decisions made by Opus 4.7 during council sessions are recorded here._

---

## 2026-05-21 — Council session start

**Control plane read:**
- CLAUDE.md: loaded — constitution, moat, operating rules confirmed
- ROADMAP.md: P0 batch complete; P1 items are next phase
- STATE.md: STALE (reflects 2026-05-10 Phase 2) — will be updated on first APPROVE
- REVIEW.md: 2026-05-11 review — both CRITICAL security issues (open redirect, env guard) confirmed fixed. WARNINGs: auto-skip timer fixed by P0-8; remaining warnings noted but not blocking P1 work.
- recovery-backlog.md: P0 BATCH COMPLETE 2026-05-21. P1 and P2 items listed.

**Recent work verified (not council-executed):**
- P1-2 (mic consent): Fixed in 2e32d29 — auto-activate useEffect removed
- P1-3 (conversation opener): Fixed in 2e32d29 — template checks messages.length
- P1-4 (journal quality): Plan exists in git history, not yet executed
- C1 diagnostic plan (2026-05-19): SCOPE VIOLATION — B1/B2/C1 content is explicitly deferred in roadmap v2 backlog. Council will not execute this plan.

**Next task: P1-1** — Diagnostic explanation shows next question's topic
Root cause confirmed: `setDiagState(nextState)` triggers useEffect → `currentQuestion` updates to next question before explanation renders. Fix: snapshot `answeredQuestion` in `handleSelect` before state update; use `displayedQuestion` derived value throughout render.

**Blocking flags from REVIEW.md:** None. Both CRITICAL issues resolved.

## 2026-05-21 APPROVE — P1-1 Diagnostic explanation

Criteria met:
- Q1 explanation shows "question formation" text (not Q2's V2 text) ✅
- Q1 label and prompt remain visible during reveal ✅
- Q2 explanation shows V2 subordinate clause rule (not Q3's) ✅
- Option coloring works correctly ✅
- TypeScript: zero new errors ✅

Playwright: PASS — report at `.council/reports/2026-05-21-p1-1-diagnostic-explanation.md`
Screenshot: `.council/reports/p1-1-explanation-q2.png`

Fix: 5-line change in `src/components/onboarding/DiagnosticQuiz.tsx` — `answeredQuestion` state + `displayedQuestion` derived value.

Next task: P1-4 — Journal feedback quality (plan exists in git history, needs execution)

---
