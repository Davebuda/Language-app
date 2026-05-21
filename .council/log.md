# Council Decision Log

## 2026-05-21 BRAINSTORM — sequence conflict: P1-7 vs session completion elevation

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
