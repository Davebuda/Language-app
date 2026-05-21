# Task Brief
**Task:** P1-9 — Diagnostic counter shows misleading "/ 12" when quiz terminates early
**Date:** 2026-05-21
**Status:** APPROVED — 2026-05-21

---

## What

`src/components/onboarding/DiagnosticQuiz.tsx` line 100 shows `{answered} / {MAX_Q}` where `MAX_Q = 12`. The IRT engine (`isDiagnosticComplete`) can exit early when confidence converges — typically at 5 questions. The user sees "5/12" and terminates to results, expecting 12 questions but only seeing 5. The "12" is misleading because it implies a fixed-length quiz.

**One file to change:** `src/components/onboarding/DiagnosticQuiz.tsx`

## How

**Read the file first.**

Find line 100 (approximately):
```tsx
<span className="text-[11px] font-bold uppercase tracking-[0.08em] text-nc-text-dim">{answered} / {MAX_Q}</span>
```

Replace with:
```tsx
<span className="text-[11px] font-bold uppercase tracking-[0.08em] text-nc-text-dim">{answered}</span>
```

The progress bar already communicates visual position via `scaleX: progress`. The text counter only needs to show how many questions have been answered — the denominator commits to a total that the adaptive engine does not guarantee.

**Also remove the unused `MAX_Q` constant** on the line above if it is no longer referenced anywhere else in the file. Check whether `MAX_Q` is used in the `progressbar` `aria-valuemax` attribute — if so, keep the constant but remove only the text reference.

Check the `aria-valuemax` attribute on the progressbar div. It likely reads `aria-valuemax={MAX_Q}` — that should remain. So keep the `const MAX_Q = 12` declaration; only remove `/ {MAX_Q}` from the text span.

## Model
sonnet

## Acceptance Criteria

1. The text counter next to the progress bar shows only `{answered}` — no denominator, no `/12`
2. The progress bar `aria-valuemax` and `aria-valuenow` attributes are unchanged
3. The visual progress bar animation is unchanged (still animates `scaleX: answered / 12`)
4. No TypeScript errors introduced
5. The `const MAX_Q = 12` constant is retained in the file (used by aria-valuemax and progress calculation)

## Blocking Flags

Stop and write `BLOCKED: [reason]` to this file if:
- `MAX_Q` is used in more than `progressbar aria-valuemax` and `progress = answered / MAX_Q` — list all usages before changing
- Any TypeScript error is introduced

## Playwright Checkpoint
yes

What to test:
- Navigate to `/onboarding` — start the diagnostic quiz
- Answer questions — confirm the counter shows `1`, `2`, `3`, etc. with no `/12`
- Progress bar should still animate correctly
