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

## 2026-05-21 APPROVE — P1-10 Dead notifications bell removed

Criteria met:
- Bell button absent from dashboard — not rendered anywhere ✅
- `Bell` import removed from lucide-react (unused) ✅
- Header layout intact: date, greeting, level badge all render ✅
- TypeScript: zero new errors ✅

Playwright: PASS — no "Notifications" button in accessibility tree
Screenshot: `p1-10-dashboard-no-bell.png`

P1 closed so far: 1–10 (10 of 13)
Next: P1-11 — Waitlist form cosmetic — no data captured

## 2026-05-21 RESTRUCTURE — Stream 4 Ambient Learning added

**What changed:** Stream 4 (Daily Learning Card, Daily Word Pack, Progress Reassurance Strip) added to ROADMAP.md as a parallel stream alongside P1. STATE.md updated to reflect 11/13 P1 closed and both active streams.

**Why:** Explicit user direction after council ESCALATE and architect review. P1 has only 2 items remaining (P1-12, P1-13) — low-risk point to add a parallel feature stream.

**Architect concerns (on record, not blocking):**
- None of the three features trace to the moat (diagnosis/scheduling/remediation)
- Daily Word Pack is adjacent to deferred vocab SRS — building shell before engine inverts dependency
- Progress Strip's correct long-term home is UI-1.3 dashboard — should be folded in at that point, not rebuilt

**Sequencing locked:** Stream 4 executes after P1-12 and P1-13 close (or interleaved at user discretion). Progress Strip (4.3) to be folded into UI-1.3 dashboard rather than left as a standalone component long-term.

## 2026-05-21 APPROVE — P1-11 Waitlist form wired to Supabase

Criteria met:
- Server action `src/app/actions/waitlist.ts` created with zod validation + duplicate handling ✅
- Form calls server action on submit; `POST / → 200 OK` network request confirmed ✅
- Loading state shows "Joining…" + disabled button while in-flight ✅
- Success state shows correctly after submission ✅
- Mobile overflow fixed with `min-w-0` on success span ✅
- TypeScript: zero new errors ✅

Playwright: PASS — 0 console errors, network request fired, success state rendered
Screenshot: `p1-11-waitlist-success.png`

P1 closed so far: 1–11 (11 of 13)
Next: P1-12 — Conversation end no summary or save confirmation

## 2026-05-21 APPROVE — P1-12 Conversation end summary screen

Criteria met:
- Avslutt → summary phase (not immediate setup reset) ✅
- Summary shows topic emoji + name, turn count, corrections if > 0 ✅
- "Ny samtale" returns to setup ✅
- "Til dashboard" navigates to /dashboard ✅
- TypeScript: zero new errors ✅

Playwright: PASS — report at `.council/reports/2026-05-21-p1-12-conversation-summary.md`
Screenshot: `p1-12-conversation-summary.png`

P1 closed so far: 1–12 (12 of 13)
Next: P1-13 — Session complete screen untestable

## 2026-05-21 APPROVE — P1-13 Session complete screen fixes

Criteria met:
- Dead `Share2`/Del button removed; `Share2` import cleaned up ✅
- "What you mastered" → "Hva du øvde på" ✅
- Concept graph now level-aware (A1/A2 selection, identical pattern to P1-6) ✅
- Guard redirect confirmed: `/session/complete` → `/dashboard` when no session ✅
- TypeScript: zero new errors ✅

Playwright: PASS — snapshot confirmed all 3 fixes; dashboard regression clear
Screenshot: `p1-13-session-complete.png`

**P1 BATCH COMPLETE — all 13 items closed.**
Next: Stream 4 — Ambient Learning (Daily Learning Card → Daily Word Pack → Progress Strip)

## 2026-05-21 APPROVE — Stream 4.1 Daily Learning Card

Criteria met:
- `region "Dagens grammatikk"` on dashboard with correct aria-label ✅
- Norwegian sentence "I morgen reiser jeg til Bergen." is T1 dominant element ✅
- Translation hidden by default; "Vis oversettelse" toggle reveals it ✅
- Button switches to "Skjul oversettelse" with `aria-expanded` updating correctly ✅
- 0 console errors on dashboard ✅
- No new npm dependencies ✅
- TypeScript: zero new errors ✅

Landing page 500: **pre-existing** (confirmed by stash test). Root cause is Turbopack dev-mode instability with `ClientAILoader`'s `next/dynamic`. Clears on dev server restart. Not caused by Stream 4.1 code.

Playwright: PASS on dashboard. Report at `.council/reports/2026-05-21-stream-4-1-daily-learning-card.md`

Stream 4 progress: 1/3 complete
Next: Stream 4.2 — Daily Word Pack

## 2026-05-21 APPROVE — Stream 4.2 Daily Word Pack

Criteria met:
- `region "Dagens ordliste"` present with correct aria-label ✅
- 6 word rows render (stå opp, frokost, jobbe, trøtt, dusje, kveld) ✅
- Per-word `aria-label` on each toggle button ✅
- Individual expand/collapse works independently ✅
- "Skjul" + `aria-expanded` updates on toggle ✅
- English + example sentence revealed correctly ✅
- 0 console errors ✅
- No new dependencies ✅
- TypeScript: zero new errors ✅

Playwright: PASS — report at `.council/reports/2026-05-21-stream-4-2-daily-word-pack.md`
Screenshot: `stream-4-2-wordpack-reveal.png`

Stream 4 progress: 2/3 complete
Next: Stream 4.3 — Progress Reassurance Strip

## 2026-05-21 APPROVE — Stream 4.3 Progress Reassurance Strip

Criteria met:
- Guest (0 sessions): "Start your first session to see your progress here." renders as muted `<p>` ✅
- `status === 'loading'` returns null — no flash ✅
- Returning user branch: `role="region"` + `aria-label="Din fremgang"` on chip strip ✅
- Speaking minutes chip gated on > 0 ✅
- 0 console errors ✅
- TypeScript: zero new errors ✅
- No new dependencies ✅

Note: Component is self-contained (reads `useFingerprintStore` directly) — ready to be folded into UI-1.3 dashboard without threading props.

Playwright: PASS — full-page screenshot confirms clean placement
Report at `.council/reports/2026-05-21-stream-4-3-progress-strip.md`

**STREAM 4 COMPLETE — all 3 items shipped.**
Next: Deferred stream work — UI-1.3 dashboard, A2 decay half-life, A3 calibration window, A4 event log, muntlig module (per roadmap sequencing)

## 2026-05-21 APPROVE — A2 Decay half-life 46 → 25 days

Criteria met:
- `DECAY_HALF_LIFE_DAYS = 25` in `src/engine/fingerprint.ts` ✅
- Three-point trace validated before and after change ✅
  - rawScore=85 at 30d: 67 → 57 (materially lower, above floor)
  - rawScore=60 at 45d: 48 → 42 (materially lower, above floor)
  - rawScore=50 at 60d: 41 → 38 (materially lower, above floor)
- `DECAY_FLOOR = 35` unchanged ✅
- SRS ladder, all other constants unchanged ✅
- TypeScript: zero errors in fingerprint.ts ✅

Playwright: not required (pure engine constant, no UI surface)

Next: A3 — Calibration window (analysis-first — 3 questions must be answered before coding)

## 2026-05-21 APPROVE — A3 Calibration window for first 5 sessions

Architectural decisions approved:
- Counter in fingerprint blob (no migration, `?? 0` for existing users)
- Existing users default to 0 = post-calibration, no backfill
- Recipe override in caller (useSession.ts), engine stays pure

Criteria met:
- `calibrationSessionsRemaining: number` in MistakeFingerprint, default 5 ✅
- Decrement at session complete with Math.max(0, ...) floor ✅
- Diagnostic path inherits via createEmptyFingerprint automatically ✅
- isCalibrating + calibrationRecipe override in useSession.ts ✅
- `?? 0` handles existing users without field ✅
- TypeScript: zero new errors ✅

Playwright: not required (no UI surface)

Next: A4 — Event log (new learning_events_log Supabase table)

## 2026-05-21 BRAINSTORM — Dashboard session card + daily grammar merge

Options evaluated: adjacent strip / replace session title / warm-up inside card / unified Today block.
Chosen: unified Today block — grammar sentence embedded as secondary section of session card (border-t, white/15), standalone DailyLearningCard removed from dashboard (stays for landing page).
Reasoning: preserves scheduler signal (concept label = "Noun gender"), gives Norwegian sentence before Start, eliminates duplication.
CORRECT issued mid-task for ordering bug (ProgressReassuranceStrip at top, DailyWordPack before Muntlig) — fixed directly.

## 2026-05-21 APPROVE — Dashboard session card + daily grammar merge

Criteria met:
- `I morgen reiser jeg til Bergen.` renders inside the red session card ✅
- Rule explanation in `text-white/55` below the sentence ✅
- No standalone DailyLearningCard on dashboard ✅
- Order: Session → Muntlig → Journal → Reading → DailyWordPack → ProgressStrip → Stats ✅
- 0 console errors ✅
- TypeScript: zero new errors ✅

Playwright: PASS — screenshot at `.council/reports/dashboard-session-grammar-final.png`

Next: A4 — learning_events_log Supabase table

## 2026-05-21 RESTRUCTURE (out-of-band) — Muntlig shadowing mode shipped

Commit 1943584 built the /shadow exercise outside of council scope. Assessment:
- Roadmap updated: NB-Llama dependency scoped to content-generation only; audio infra + mode UIs proceed in parallel. Valid restructure — shadowing uses Web Speech API + seed sentences, no AI required.
- Build is clean: state machine, word-level color match, honest fallbacks (text-mode banner, browser unsupported copy), recordResult feeds fingerprint.
- Baseline-ui fixes applied in the same commit.
- Shadowing mode: ACCEPTED as done. No further council action needed on this commit.

## 2026-05-21 APPROVE — A4 Event log (learning_events_log)

Pre-existing: table already created with exact roadmap schema, RLS INSERT-only policy, and client-side write already implemented in src/lib/logEvents.ts. No migration needed.

Criteria met:
- Table `learning_events_log` exists: id, event_type, concept_id, correct_bool, timestamp, anonymous_session_id ✅
- No PII: anonymous_session_id = sha256(userId)[0:16] ✅
- RLS: INSERT-only for authenticated users, no SELECT/UPDATE/DELETE policies ✅
- `logSessionResults()` wired in session/complete/page.tsx behind `authSession?.user` guard ✅
- Guests produce no rows ✅
- Fire-and-forget — never throws, never blocks ✅
- 0 rows currently (correct — no sessions fired since wiring)

Playwright: not required (no UI surface)

Next: UI-1.3 dashboard (new phase — requires architect review before starting)

---
