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

## 2026-05-21 APPROVE — P1-4 Journal feedback Norwegian language

Criteria met:
- Template fallback (catch path) now returns Norwegian praise/suggestion ✅
- `!isReady()` template also now Norwegian ✅
- Prompt now instructs model to write praise/suggestion in Bokmål ✅
- TypeScript: zero new errors ✅

Playwright: PASS — report at `.council/reports/2026-05-21-p1-4-journal-norwegian-feedback.md`
Screenshot: `.council/reports/p1-4-journal-norwegian-feedback.png`

Known limitation: Model quality (wrong explanations, generic praise) requires Stream 1.1 model swap. Template path fix is certain; model path improvement is best-effort until A1 lands.

Side finding: Pre-existing SSR hydration mismatch in `WritingEditor.tsx` — `getSpeechCtor()` returns different values on server vs client. Server renders textarea, client renders voice buttons. This is the same class as P1-5 (SSR hydration). Next task addresses it.

Next task: P1-5 — Profile/Progress SSR hydration flash (and WritingEditor SSR fix found in same session)

## 2026-05-21 APPROVE — P1-5 + P1-6 SSR hydration flash + wrong concept graph

Criteria met:
- Progress page: skeleton guard renders during status=loading; no A1 flash ✅
- Progress page: graph selects a2Graph for A2 users ✅
- Profile page: Nivå stat shows "–" during loading (no A1 flash) ✅
- Profile page: Nåværende nivå shows "–" during loading ✅
- Journal: 0 console errors (hydration mismatch eliminated, bonus fix) ✅
- TypeScript: zero new errors ✅

Playwright: PASS — report at `.council/reports/2026-05-21-p1-5-p1-6-hydration-graph.md`

Files changed: `progress/page.tsx`, `profile/page.tsx`, `WritingEditor.tsx`

P1 closed so far: 1, 2, 3, 4, 5, 6 (6 of 13)
Next: P1-7 — Recalibration starts without trigger banner or opt-in

## 2026-05-21 APPROVE — P1-7 + P1-8 Recalibration opt-in banner + accessibility

Criteria met:
- Intro banner renders on `/recalibrate` before quiz: heading, context text, 7-question count, Start + Hopp over buttons ✅
- "Hopp over" navigates to `/dashboard` ✅
- "Start" transitions to quiz (state change, no reload) ✅
- Accessibility tree after Start: `main "Recalibration quiz"`, `heading [level=1]`, `progressbar`, labelled option buttons (`"Alternativ 1: en"` etc.) ✅
- Answer reveal flow unchanged: correct/incorrect coloring, explanation card, Next button, counter advances ✅
- TypeScript: zero new errors ✅

Playwright: PASS — report at `.council/reports/2026-05-21-p1-7-p1-8-recalibration.md`
Screenshots: `p1-7-8-recalibrate-initial.png`, `p1-7-8-quiz-revealed.png`

P1 closed so far: 1, 2, 3, 4, 5, 6, 7, 8 (8 of 13)
Next: P1-9 — Diagnostic terminates at 5/12 with "12" visible in counter

## 2026-05-21 APPROVE — P1-9 Diagnostic counter denominator removed

Criteria met:
- Counter shows `{answered}` only — no `/12` denominator ✅
- `const MAX_Q = 12` retained (still used by aria-valuemax and progress calc) ✅
- Progress bar animation unchanged ✅
- TypeScript: zero new errors ✅

Playwright: PASS — counter shows "0" then "1" after answer with no "/12"
Screenshot: `p1-9-diagnostic-counter.png`

P1 closed so far: 1–9 (9 of 13)
Next: P1-10 — Dashboard notifications bell dead

---
