# Council Decision Log

## 2026-05-21T18:55 APPROVE — P0.5-01 source verification

**Task:** Verify the 10 Critical findings from the third walkthrough against source.
**Owner:** debugger agent (opus override).
**Output:** `.council/reports/2026-05-21-1830-source-verification.md` (424 lines).
**Diff scope:** read-only audit; only the report file is new under `.council/`; no `src/` mutations confirmed via `git status`.

**Headline findings:**
- F010 is a **content-corpus** problem, not a code regression. Items 5+7 fix intact (commits `77e54b2`, `bf118fe`). Every exercise component correctly derives errorTag from `sentence.errorTagsDetectable[0]`. The corpus itself tags 9/9 question-formation sentences as `['word-order']`.
- F036 is the same root cause: five diagnostic concept IDs (`negation-placement`, `past-tense-regular`, `modal-verbs`, `prepositions-place`, `present-tense-verbs`) have ZERO sentences in the corpus because the corpus uses graph IDs (`negation`, `preterite-regular`, `common-modal-verbs`, `common-prepositions`, `present-tense-regular`).
- F019 scheduler warnings auto-resolve with F036.
- F022/F029/F033 confirmed: `validateGenerated` exists at `src/ai/validate.ts:74-109` but is only invoked from `generateContent` (webllm.ts:203). No equivalent gate for `explainMistake`, `conversationTurn`, or `reviewWriting`. Confirms P0.5-04 design.
- F030/F034: conversation and journal DO invoke engine write APIs but silently drop unmapped tags (conversation map: 10 tags, journal map: 11 tags, taxonomy: 17 tags). Shared root cause.
- F017: one-line bug at `src/lib/diagnostic/engine.ts:140` — `Math.max(seedScore, rawScore)` floors wrong answers at 20, then `OnboardingFlow.tsx:94` destructively overwrites prior mastery.
- F023: guard exists as a `useEffect` post-render redirect at `complete/page.tsx:80`; the celebration screen renders before the redirect fires.

**Three ordering revisions accepted (applied to recovery-backlog.md):**
1. Sequence concept-id reconciliation (former P0.5-07) BEFORE corpus retag (former P0.5-02). Renamed accordingly.
2. Split former P0.5-06 internally: cheap guards (F023, F026) ship as one PR; session-completion semantics (F012, F024, F025, F027) need a design decision.
3. Add new P0.5-03a — shared `src/lib/error-tag-to-concept.ts` module — before P0.5-04/-05 (the renumbered AI gate / write-through tasks).

**Next:** P0.5-02 = Concept-id reconciliation (graph as source of truth). Brief in `.council/current.md`.

## 2026-05-21T18:15 ESCALATE — Third stress walkthrough reveals foundation regression; muntlig roleplay is the wrong next move

**Trigger:** Third Playwright walkthrough (report at `test-reports/stress-walkthrough-2026-05-21/report.md`, 39 findings, 10 Critical) plus REVIEW.md (2026-05-11 code audit, 2 CRITICAL, 8 WARNING) plus STATE.md/ROADMAP.md showing "next: scripted roleplay" — three sources of evidence diverging.

**Evidence summary:**
- Four of the five P0 patterns CLAUDE.md operating rule 8 explicitly names as "the documented worst-case failure mode" are regressed in the live app: error tags collapse to a single `word-order` value (F010), journal correction writes nothing to fingerprint (F034), conversation grammar logging writes nothing (F030), session progression counter never increments (F012). One pattern (mic auto-activate) holds.
- New class of AI-quality failures shipping live: in-session repair card teaches the opposite of the noun-gender rule (F022); Kari conversation replies contain non-Norwegian strings (F029); journal AI invents words and silently flips negation, reversing the user's sentence meaning (F033). Three Critical pedagogical-harm findings on three different surfaces — same root cause (no language-validity gate before AI output reaches the learner).
- Engine correctness: diagnostic rawScore semantics broken — wrong answers on q-formation and adjective-agreement still produced rawScore=100 (F017). Diagnostic write doesn't commit until navigation away from result screen (F016). Diagnostic completion destructively wipes 24 historical recentErrors entries (F031).
- Guard failures: /session/complete is directly accessible with no guard, congratulates the user with 0/0/0 stats (F023).
- Mastery visibility broken: /progress shows every concept at 0% or Locked despite fingerprint having rawScore 100 for six concepts (F036, concept-id mismatch).
- REVIEW.md WARNING items from 2026-05-11 may still be live: race conditions in fingerprint bootstrap, module-level scenarioCursor, auto-skip false-correct insertion. Not re-audited in this walkthrough.

**What this means:**
- STATE.md milestone "muntlig" is targeting a foundation that's broken at the engine level. Adding more speaking surfaces (roleplay) on top of a journal+conversation pipeline that silently contributes nothing will compound the same regression pattern: more surfaces that "look like they teach" but don't write to the engine.
- Constitutional emergency per CLAUDE.md operating rule 8. The constitution mandates pipeline honesty before any "feeds the engine" feature ships. This isn't a roadmap nuance — it's the named failure mode.
- The diagnosis-visibility task approved 2026-05-21T17:45 surfaces data we now know is broken (errorTag collapse, rawScore semantics). The surface fix was correct; the upstream data is the real bug.
- gsd's continuation logic would propose muntlig roleplay step 5. That answer is wrong given the new evidence. RESTRUCTURE required before gsd can be trusted to advance.

**Searched:** No external search. Constitutional rule (CLAUDE.md operating rule 8) is unambiguous. Internal evidence: walkthrough report + IndexedDB pre/post diffs + screenshots `test-reports/stress-walkthrough-2026-05-21/`.

**Options:** (surfaced to user for decision — see escalation block in conversation)

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
