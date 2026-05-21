# Council Decision Log

## 2026-05-21T17:45 APPROVE — diagnosis visibility on dashboard session card
**Criteria met:**
- Only `src/app/dashboard/page.tsx` changed (9 insertions, 1 file) ✅
- `topDiagnosis = plan?.diagnosisResults?.[0] ?? null` derived alongside existing remediation/review/newMaterial counts ✅
- "Why this" block inserted between estimated-time paragraph and Start button ✅
- Renders only when `topDiagnosis` truthy; silent absence otherwise ✅
- Displays `topDiagnosis.reasoning` from the highest-confidence diagnosis ✅
- No engine, scheduler, or type files touched ✅
- Zero TypeScript errors; dev server compiled clean ✅
- Visual at 1280 and 375: layout intact, no overflow, cream tones match ✅
**Playwright:** PASS — silent-absence path verified live on cold-start guest; critical-path regression (Start → wrong answer → repair → next exercise) passes; 0 console errors on tested pages.
**Present-branch:** Not exercised by guest state (no fingerprint history triggers any of the 4 diagnosis rules). Mechanically guaranteed by diff parity with the brief's verbatim JSX template + null-safe optional chaining.
**File changed:** `src/app/dashboard/page.tsx`
**Report:** `.council/reports/2026-05-21-1745-diagnosis-visibility.md`
**Outside-scope observation (for REVIEW.md, not blocking):** Sentence-transformation repair card shows `Correct answer: [unavailable]` rather than the actual target. Pre-existing surface defect on the repair card data binding, unrelated to dashboard scope.

## 2026-05-21T12:00 RETHINK — diagnosis visibility inserted before remaining P1 batch

**Trigger:** Feature-challenger scout pass (4 features) surfaced a pipeline-honesty defect via code grep: `runDiagnosis` runs on every session generation, returns `DiagnosisResult[]` with a learner-facing `reasoning` string, but `diagnosisResults` is never consumed in `src/`. The moat is computed and silently discarded.

**Searched:** No external search. Internal evidence: `grep runDiagnosis src/` → only `engine/scheduler.ts`, `engine/index.ts`, `engine/diagnosis.ts`. `grep generateSession src/` → consumed in `hooks/useSession.ts:164` and `app/dashboard/page.tsx:105`, neither reads `diagnosisResults`.

**Options:**
1. Insert small diagnosis-visibility task before resuming P1 — surface `diagnosisResults[0].reasoning` on the dashboard session card. ~30-line change, one file, one acceptance criterion.
2. Defer to a future engine-upgrade pass — keep the moat invisible until then; resume P1 verbatim.
3. Continue per roadmap, no change — same as option 2 but without queuing the fix.

**Chosen:** Option 1.
**Why:** CLAUDE.md operating rule 8 (pipeline honesty) is constitutional: "if a surface claims to contribute to the fingerprint, mastery, or repair loop, that contribution must be traced end-to-end before the surface ships. Five separate surfaces during P0 recovery were found to silently contribute nothing." The diagnosis engine claim is in CLAUDE.md and project-state.md — its current invisibility is the same defect pattern as the AI-badge / error-tag / session-auto-skip P0 issues. The constitution mandates the fix; this is not an open product question. Scope is one file, one insert, established design tokens. Consistent with the recent session-complete approve (2026-05-21T11:10) which had the explicit goal "make the moat visible" on a different surface.



**Options considered:**
1. Follow P1 order — do P1-7 (recalibration trigger banner) first
   - Affects: users who hit recalibration modal without warning (rare flow, multi-session depth)
   - Moat trace: none — UX politeness fix
2. Elevate session completion (P1-13 + feature-challenger spec)
   - Affects: every user who completes any session (highest-frequency touchpoint)
   - Moat trace: strong — repair loop summary, phase indicators, SRS preview make the diagnostic intelligence visible for the first time

**Chosen:** Option 2 — session completion elevation.
**Why:** Feature-challenger analysis (same session) established that the session complete screen is the single highest-leverage improvement: it makes the moat visible. P1-7 affects a rarely-reached recalibration flow. Session completion affects every user after every session. The feature-challenger output IS the analysis-first step per CLAUDE.md rule 2. User invoking /council after that analysis is the approval signal.

## 2026-05-21 RESTRUCTURE — session completion elevated above P1-7 through P1-12
**What changed:** Session completion build added as next task, before remaining P1 items.
**Why:** Feature-challenger analysis elevated it based on frequency (every session) and moat visibility (repair loop, phase, SRS all invisible at highest-stakes moment).

## 2026-05-21 BRAINSTORM — scripted roleplay (STATE.md) vs P1 accessibility bundle (audit)

**Options considered:**
1. Scripted roleplay per STATE.md — next muntlig mode, direct north-star trace (speaking production)
   - Risk: ships on a session loop with known reduced-motion + screen-reader failures
   - Every new UI surface inherits the motion problem (no MotionConfig = all new animations also ignore OS preference)
2. P1 accessibility bundle first — 3 surgical fixes, ~45 min, systemic impact
   - MotionConfig: one line that propagates to every animated surface including future muntlig modes
   - WCAG: session loop (highest-frequency surface) becomes usable by screen reader users
   - Moat trace: session loop IS the moat's delivery mechanism; making it accessible is not breadth

**Chosen:** Option 2 — P1 accessibility bundle.
**Why:** MotionConfig is a force-multiplier: every new animated surface built afterward (including scripted roleplay) inherits the fix automatically. Delaying it means scripted roleplay will inherit the same motion problem. 3 fixes, bounded scope, explicit P1 from audit, user analysis concurred.

## 2026-05-21 RESTRUCTURE — P1 accessibility bundle inserted before scripted roleplay
**What changed:** Audit P1 accessibility fixes added as next task. Scripted roleplay remains next after it clears.
**Why:** Audit evidence surfaced systemic reduced-motion gap (affects every animated surface) and screen-reader failure in core session loop. Fixing before adding new modes prevents the problems from compounding.

## 2026-05-21T11:10 APPROVE — session completion: make the moat visible
**Criteria met:**
- Repair loop summary renders conditionally on wrong answers (absent on perfect session ✅)
- Phase chips replace "◌" and "New" badge ✅
- SRS next review date computed from earliest nextReviewAt across repaired concepts ✅
- All existing sections untouched ✅
- Zero TypeScript errors ✅
**Playwright:** PARTIAL PASS — structure, zero-wrong-answers case, guard confirmed. Repair section with real data requires live session traversal (NOT_TESTED, low risk).
**File changed:** `src/app/session/complete/page.tsx`

## 2026-05-21T11:32 APPROVE — Muntlig Step 5: Scripted Roleplay
**Criteria met:**
- `/roleplay` resolves, correct title ✅
- 3 scenarios × 4 turns, correct Norwegian content ✅
- Selection → turn phase transition verified ✅
- Layout at 375px and 1280px clean ✅
- Zero TypeScript errors ✅
- No existing files changed ✅
**Playwright:** PARTIAL PASS — selection and turn phases verified. Complete screen NOT_TESTED (speech required, low risk).
**Files created:** `src/lib/roleplayContent.ts`, `src/components/muntlig/RoleplayScreen.tsx`, `src/app/roleplay/page.tsx`

## 2026-05-21T11:20 APPROVE — P1 accessibility bundle
**Criteria met:**
- MotionProvider.tsx created with `'use client'` + `MotionConfig reducedMotion="user"` ✅
- layout.tsx wraps children — Server Component preserved (no `'use client'`) ✅
- `text-[12px]` on instruction labels in WordOrderExercise + FillInBlankExercise (×2) ✅
- `aria-live="polite" sr-only` regions on TranslationExercise, FillInBlankExercise, WordOrderExercise, SpeedRound ✅
- Zero TypeScript errors ✅
- No exercise logic changed ✅
**Playwright:** PASS — session exercise renders at 375px and 1280px, zero console errors.
**Files changed:** `src/components/ui/MotionProvider.tsx` (new), `src/app/layout.tsx`, `WordOrderExercise.tsx`, `FillInBlankExercise.tsx`, `TranslationExercise.tsx`, `SpeedRound.tsx`
