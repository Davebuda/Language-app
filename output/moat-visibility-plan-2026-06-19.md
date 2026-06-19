# Plan: Moat-Visibility Rewire (3 pillars)

> make-plan-pro output · 2026-06-19 · HEAD `f3d9056` · rail phase **p3** (active)
> Surface the coaching the engine already computes. **No new page, no new engine, no new fingerprint field → no Rule-3 schema migration.** Depth-not-breadth (HARD RAIL #1).

## Context
- **Intent:** Make the learner *feel coached* by rendering computed-but-hidden diagnosis / repair / scheduling signals inside existing surfaces. Approve-able build order required.
- **Stack (installed):** next `^15.3.2` (App Router), react `^19.1.0`, framer-motion `^11.18.2`, lucide-react `^0.511.0`, tailwindcss `^3.4.17`, typescript `^5.8.3` (strict).
- **Patterns leveraged (all already in the target files):** `motion`/`AnimatePresence` + `useReducedMotion`; lucide stroke icons; Tailwind CSS-var tokens (`var(--nc-*)`); `runDiagnosis()` already called at `dashboard/page.tsx:280`; `selectionReason` already mapped at `SessionScreen.tsx:51`.
- **New patterns introduced:** none. No new library API — every change extends an API already imported in the file it touches.

## Phase 0 — Discovery Summary
**Installed versions:** as above (manifest `package.json:18-64`).
**Vendor docs (Context7):** NOT REQUIRED — no new library surface; all edits reuse already-imported framer-motion / lucide / Tailwind patterns. (Per make-plan-pro Check 2, Context7 is gated to *new* library usage.)
**Existing patterns found (Check 3):**
- Diagnosis already computed + top result in hand: `dashboard/page.tsx:280` `const topDiagnosis = runDiagnosis(fingerprint)[0]` — only `.reasoning` consumed (`:281`).
- `DiagnosisResult` shape confirmed: `{rootCauseConceptId, confidence, reasoning, affectedConceptIds, recommendedFocus}` (`diagnosis.ts:4-10`).
- ProductionWall STATUS half = `ProductionWall.tsx:92-134`; props `{view, sessionMeta, coachReason, startHref}` (`:39-47`).
- `selectionReason` badge + `WHY_LABELS` map: `SessionScreen.tsx:51-60`, rendered `:214-221`.
- `RepairPlan` = `{explanation, microDrillExerciseTypes, retryExerciseType, reviewIntervalDays}` (`repair-loop.ts:62-67`); **`reviewIntervalDays` hardcoded `1`** (`:93`).
- `repairContext` (`{triggeredBy: ErrorLogEntry, step}`) set on repair items (`repair-loop.ts:124-129, 143-146`); **0 UI consumers** (confirmed by trace).
- Concept id→label available in session via `getGraphForLevel(...).concepts` (already used `SessionScreen.tsx:330`).

**Discovery status: PASS.**

---

## Tasks (one-sentence-one-diff)

### PILLAR 1 — Diagnosis depth (dashboard) · isolated from session surfaces

**Task 1 — render diagnosis highlight in ProductionWall STATUS half**
- **Diff:** Add an optional `diagnosis?: { focusLabel: string; affectedLabels: string[]; confidenceTier: 'strong' | 'early' }` prop to `ProductionWall` and render a focus chip + ≤2 affected-concept pills + a qualitative confidence cue below the objective title (`:104`).
- **Files:** `src/components/dashboard/ProductionWall.tsx`
- **Depends on:** none
- **Verification:** 375/768/1280/1920 screenshots show the highlight under the title, no overflow; Norwegian copy only; lucide/SVG icons only.

**Task 2a — pure derive-helper for the highlight**
- **Diff:** Add `deriveDiagnosisHighlight(diagnosis, conceptLabelLookup)` to `src/lib/production-wall.ts` returning `{focusLabel, affectedLabels, confidenceTier}` with `confidenceTier = confidence >= 0.7 ? 'strong' : 'early'` and slug→label fallback for unknown affected ids.
- **Files:** `src/lib/production-wall.ts`
- **Depends on:** none
- **Verification:** unit test — strong vs early tier, label resolution, unknown-slug humanization, empty `affectedConceptIds`.

**Task 2b — feed the highlight from the dashboard**
- **Diff:** In `dashboard/page.tsx`, build `diagnosis` from the existing `topDiagnosis` + `activeGraph.concepts` via `deriveDiagnosisHighlight` and pass it to `<ProductionWall diagnosis={…} />`, gated to `topDiagnosis != null`.
- **Files:** `src/app/dashboard/page.tsx`
- **Depends on:** Task 1, Task 2a
- **Verification:** returning-user fingerprint renders focus + pills; brand-new guest (no diagnosis) renders nothing extra (honest gate).

### PILLAR 2 — Repair coaching trace (repair card + repair step) · touches SessionScreen

**Task 3 — surface what was caught in the repair card**
- **Diff:** Thread the triggering `errorTag` into `ExplanationCard` and render a "Fanget: «klasse»" chip (Norwegian error-class label) alongside the existing explanation.
- **Files:** `src/components/session/ExplanationCard.tsx`, `src/components/session/SessionScreen.tsx` (pass one new prop)
- **Depends on:** none — but **shares `SessionScreen.tsx` with Task 4 & Task 5b → sequential**
- **Discovery micro-step:** confirm where the triggering `errorTag` is available at `ExplanationCard` render (`useSession` repair state / `lastResultRef` / `currentItem.repairContext.triggeredBy`); read-only — do not add a write.
- **Verification:** force a wrong answer on a returning-user fingerprint; chip shows the correct Norwegian error class; no mastery write introduced.

**Task 4 — repair step indicator during micro-drills**
- **Diff:** In the `SessionScreen` header, when `currentItem.repairContext?.step === 'micro-drill'`, render a "Reparasjon · steg N/M" indicator derived from `repairContext` + repair-item count.
- **Files:** `src/components/session/SessionScreen.tsx`
- **Depends on:** Task 3 (same file, serialize)
- **Verification:** repair flow shows step progress; non-repair items show nothing.

### PILLAR 3 — "Why this" bridge (in-session badge) · touches SessionScreen

**Task 5a — pure justification helper (testable, isolated)**
- **Diff:** Create `src/lib/selection-justification.ts` exporting `selectionJustification(reason, conceptMastery?)` → a short Norwegian phrase, deriving the recent-miss count from `conceptMastery.recentOutcomes` for `weak_concept` and a fixed phrase per other reason.
- **Files:** `src/lib/selection-justification.ts` (new)
- **Depends on:** none — **parallel-safe**
- **Verification:** unit test per `selectionReason`; `weak_concept` miss-count math; undefined-mastery fallback.

**Task 5b — render the justification under the badge**
- **Diff:** In `SessionScreen`, render `selectionJustification(currentItem.selectionReason, fingerprint.conceptMastery[currentItem.conceptIds[0]])` as a one-line caption under the existing `selectionReason` badge (`:219`).
- **Files:** `src/components/session/SessionScreen.tsx`
- **Depends on:** Task 5a; **shares `SessionScreen.tsx` → serialize after Task 4**
- **Verification:** weak-concept item shows "Valgt fordi du bommet N av M"; other reasons show their phrase; 375px no overflow.

---

## Dependency Graph
| Task | File(s) | Depends on | Parallel-safe with |
|---|---|---|---|
| 1 | ProductionWall.tsx | none | 2a, 3, 4, 5a, 5b |
| 2a | production-wall.ts | none | 1, 3, 4, 5a, 5b |
| 2b | dashboard/page.tsx | 1, 2a | 3, 4, 5a, 5b |
| 3 | ExplanationCard.tsx + SessionScreen.tsx | none | 1, 2a, 2b, 5a |
| 4 | SessionScreen.tsx | 3 (same file) | 1, 2a, 2b, 5a |
| 5a | selection-justification.ts (new) | none | all |
| 5b | SessionScreen.tsx | 5a, 4 (same file) | 1, 2a, 2b |

**Conflict finding:** `SessionScreen.tsx` is the shared file across **Tasks 3, 4, 5b** → they MUST serialize (no parallel agents on that file). Pillar 1 (dashboard files) and the two new helper files are fully isolated.

## Build order (recommended)
**Pillar 1 → Pillar 2 → Pillar 3**, verify between each (Rule 4: one move at a time).
- P1 first: fully isolated, lowest risk, highest "feel the moat" per line, first thing a user sees.
- P2 before P3: both edit `SessionScreen.tsx`; serialize to avoid rebasing the same file.
- (P1 *could* run parallel to P2/P3 by file-isolation, but Rule 4 + verify-between favors sequential.)

## Subagent Handoffs (5-field, one per pillar)
```yaml
handoff_pillar_1:
  intent: "Surface diagnosis focus + affected concepts + confidence tier in the dashboard ProductionWall STATUS half; engine already computes runDiagnosis()[0]. AC: returning-user shows it, new guest shows nothing."
  slug: moat-vis-p1-diagnosis-depth
  status: READY_FOR_BUILD
  artifacts:
    - src/engine/diagnosis.ts (read-only)
    - src/lib/production-wall.ts (will modify)
    - src/components/dashboard/ProductionWall.tsx (will modify)
    - src/app/dashboard/page.tsx (will modify)
  constraints:
    in_scope_files: [production-wall.ts, ProductionWall.tsx, dashboard/page.tsx]
    forbidden_actions: ["no fingerprint field", "no mastery write", "no new page", "Norwegian copy only", "lucide/SVG icons only", "no raw confidence %"]
    time_budget: 35
```
```yaml
handoff_pillar_2:
  intent: "Render what-was-caught (errorTag chip) + repair step N/M in the repair surfaces. Presentation only; data in repairPlan/repairContext. AC: no mastery write; chip shows correct Norwegian error class."
  slug: moat-vis-p2-repair-trace
  status: READY_FOR_BUILD
  artifacts:
    - src/engine/repair-loop.ts (read-only)
    - src/components/session/ExplanationCard.tsx (will modify)
    - src/components/session/SessionScreen.tsx (will modify)
  constraints:
    in_scope_files: [ExplanationCard.tsx, SessionScreen.tsx]
    forbidden_actions: ["DO NOT surface reviewIntervalDays as a next-review date (hardcoded 1 — false claim)", "no mastery write", "Norwegian copy only", "serialize with pillar 3 on SessionScreen.tsx"]
    time_budget: 40
```
```yaml
handoff_pillar_3:
  intent: "Expand the bare selectionReason badge into a one-line Norwegian justification tied to recent-miss evidence, derived at render from the fingerprint. AC: weak_concept shows miss count; no scheduler change."
  slug: moat-vis-p3-why-this
  status: READY_FOR_BUILD
  artifacts:
    - src/types/fingerprint.ts (read-only — confirm recentOutcomes shape)
    - src/lib/selection-justification.ts (create)
    - src/components/session/SessionScreen.tsx (will modify)
  constraints:
    in_scope_files: [selection-justification.ts, SessionScreen.tsx]
    forbidden_actions: ["no new fingerprint field", "no scheduler threading", "no mastery write", "Norwegian copy only", "serialize after pillar 2 on SessionScreen.tsx"]
    time_budget: 35
```

## Verification Strategy (per pillar)
1. `npm run audit:gate` clean (corpus / tsc / vitest+retry / returning-user 10/10).
2. Unit tests: Task 2a (highlight derive), Task 5a (justification) — pure functions.
3. **Returning-user Playwright trace** (Rule 3 — not just fresh guest): seed a returning-user fingerprint, screenshot the surfaced behavior at 375/768/1280/1920, save to `.claude/screenshots/moat-vis-pN/`.
4. Pipeline-honesty assert (Rule 8): grep the diff — confirm zero new mastery-write call sites; these are read-only surfacings.

## Open Risks (flags, not blockers)
- **R1 (honesty flag, load-bearing):** `repair-loop.ts:93` `reviewIntervalDays` is hardcoded `1` and is NOT the concept's real next-review. Surfacing "neste gjennomgang om 1 dag" would be a false schedule claim → **excluded from P2 v1.** Re-add only after wiring the real SRS value (separate, approval-gated).
- **R2 (design):** raw confidence % reads oddly to a learner → qualitative tier only (`strong` ≥0.7 = "Sikker diagnose" / `early` =0.45 fallback = "Tidlig signal"). Confirm wording with density rules.
- **R3:** `errorTag` availability at `ExplanationCard` render — locate before building (read-only); if unexposed, surface from `useSession`/`repairContext.triggeredBy`.
- **R4 (density):** 375px — pills + justification risk overflow; must pass mobile visual QA (memory `feedback_design_density` / `feedback_slop_patterns`); no filler text.
- **R5:** some `affectedConceptIds` may be absent from `activeGraph` (cross-level) → humanize slug fallback (mirror `diagnosis.ts:147`).
- **R6:** confirm `normalizeFingerprint` backfills `recentOutcomes` + `attemptCount` for legacy fingerprints (core fields — almost certainly yes; verify, don't assume — Rule 3).

## Estimated Scope
- Files affected: 6 (3 modified components, 1 modified page, 1 modified lib, 2 new libs/tests) + tests.
- Tasks: 7 (across 3 pillars).
- Parallel-safe tasks: P1 trio vs P2/P3; but SessionScreen serializes P2↔P3.
- Rough tokens: ~25–40k build + verify per pillar.
