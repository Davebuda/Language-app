# Task Brief
**Task:** Diagnosis visibility — surface `runDiagnosis` output on the dashboard session card
**Date:** 2026-05-21
**Status:** COMPLETED — APPROVED 2026-05-21T17:45
**corrections:** 0

---

## What

The diagnosis engine (`src/engine/diagnosis.ts`) runs four root-cause rules on every session generation. `runDiagnosis(fingerprint)` returns `DiagnosisResult[]` with a learner-facing `reasoning` string — the visible piece of the moat. The scheduler attaches the result to `SchedulerOutput` as `diagnosisResults`.

**Verified pipeline-honesty defect:** `diagnosisResults` is never consumed in any UI. `src/hooks/useSession.ts:164` and `src/app/dashboard/page.tsx:105` both call `generateSession(...)` but neither reads the `diagnosisResults` field. The moat is computed and silently discarded. This is the same class as the P0 "no silent substitution" finds (AI badge, error tags, session auto-skip).

This task surfaces the highest-confidence diagnosis on the dashboard session card so the learner sees *why* today's session is what it is. No new engine logic, no new rules, no schema changes — only render an existing string when present.

**Files in scope:**
- `src/app/dashboard/page.tsx` (only)

That is the entire scope. If the implementer is about to touch any other file (including diagnosis.ts, scheduler.ts, types, components), STOP and write BLOCKED.

---

## How

In `src/app/dashboard/page.tsx`:

1. Extract the highest-confidence diagnosis from the existing `plan` state. `plan.diagnosisResults` is already part of `SchedulerOutput` — no import or type change needed.

   ```tsx
   const topDiagnosis = plan?.diagnosisResults?.[0] ?? null
   ```

   Place this after the existing `remediation / review / newMaterial` derivations (around line ~135).

2. Inside the "TODAY'S SESSION" card (the `nc-glass-cream` block that starts at line ~298, currently containing label / title / estimated time / Start button / composition badges / grammar moment), insert a new conditional block **between the "Estimated: X min" paragraph (line ~308–310) and the Start button (line ~311)**:

   ```tsx
   {topDiagnosis && (
     <div className="mt-3 rounded-[var(--radius)] border border-[rgba(4,14,8,0.14)] bg-[rgba(4,14,8,0.04)] px-3 py-2.5">
       <div className="nc-label mb-1 text-[var(--nc-cream-dim)]">Why this</div>
       <p className="text-[12px] leading-relaxed text-[var(--nc-cream-text)] text-pretty">
         {topDiagnosis.reasoning}
       </p>
     </div>
   )}
   ```

   - Use exactly the styling above — it matches the existing `nc-glass-cream` card's tone (cream surface, subtle inner border, label-then-body pattern, established `nc-label` class).
   - `text-pretty` is already used elsewhere in this card; keep it for consistency.
   - The "Why this" label is English. This is consistent with the dashboard's existing English-prefix pattern ("Today's session ·", "Estimated:") — the dashboard is an orientation surface, not a learning surface per CLAUDE.md's Norwegian-dominates principle.

3. Render absolutely nothing when `topDiagnosis` is null. Do not show a placeholder, fallback string, or empty state. If diagnosis hasn't fired yet (cold start, sparse error log), the surface is silent — that's correct.

### Constraints — do NOT do any of these

- Do not modify `src/engine/diagnosis.ts`, `src/engine/scheduler.ts`, or any engine file.
- Do not change the `DiagnosisResult` type or add fields.
- Do not add a "loading" / "we're learning your patterns" placeholder. Silent absence is the intended state.
- Do not surface diagnosis on the repair card, session-complete screen, or any other surface — that's a separate decision for a future task.
- Do not introduce any new dependencies, hooks, or stores.
- Do not refactor the dashboard layout. Insert the block in place.
- Do not change the existing "Grammar moment" block at the bottom of the session card.

---

## Model

sonnet — mechanical insert into an established UI surface, established patterns, established design tokens.

---

## Acceptance Criteria

1. `src/app/dashboard/page.tsx` is the only file changed in the diff.
2. The "Why this" block renders inside the "Today's session" card on the dashboard, between the estimated-time line and the Start button.
3. The block renders only when `plan?.diagnosisResults?.[0]` is present; renders nothing otherwise.
4. The block displays the `reasoning` string from the highest-confidence diagnosis result.
5. No TypeScript errors.
6. No existing tests broken.
7. Visual: at 375px and 1280px, the block sits cleanly inside the session card without breaking the existing rhythm; the cream tones match.
8. No new console errors on page load.

---

## Blocking Flags

Stop immediately and write `BLOCKED: [reason]` to this file if:

- Any TypeScript error is introduced.
- The diagnosis surface requires importing the `DiagnosisResult` type (it should not — the `plan` state is already typed `SchedulerOutput`).
- Any file outside `src/app/dashboard/page.tsx` would need to be changed to satisfy the brief.
- You are about to modify the engine, scheduler, type definitions, or any component file.
- You are about to add a non-silent fallback when diagnosis is absent.

---

## Playwright Checkpoint

FULL

Tests:
1. Navigate to `/dashboard` — verify the page renders without error.
2. Take a screenshot at 375px (mobile) and 1280px (desktop) of the dashboard.
3. Inspect the DOM for the "Why this" block:
   - If the learner has no recent errors (likely default mock state), block should be absent.
   - If a diagnosis result is present, the `reasoning` text should be visible inside the session card.
4. Critical-path regression: navigate to `/`, start a session (or `/session` if dashboard Start button is the entry), submit one wrong answer, verify repair loop still appears, finish session.
5. No new console errors anywhere on the tested pages.

Save screenshots to `.council/reports/screenshots/[timestamp]-diagnosis-visibility/`.
