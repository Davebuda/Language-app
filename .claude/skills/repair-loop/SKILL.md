---
name: repair-loop
description: The repair loop pattern — wrong answer triggers explain → micro-drill → retry → schedule review. Use when implementing or modifying any exercise type, the scoring system, session flow, or any feature that handles incorrect answers.
---

# The Repair Loop

## Why It Exists

The repair loop is the single most important user-facing mechanic. It transforms mistakes from discouraging red Xs into structured learning moments. Every wrong answer runs through it.

## The Five Steps

```
1. Wrong answer detected
       ↓
2. Explanation — plain English, one sentence, WHY it was wrong
       ↓
3. Micro-drill × 2 — 2 quick exercises targeting the exact concept
       ↓
4. Retry — original problem back, slightly different form
       ↓
5. Scheduled review — concept queued for spaced reappearance
```

## Implementation Location
- `src/engine/repair-loop.ts` — `buildRepairPlan()`, `makeRepairItems()`
- Templates for all 17 error tags are in `buildRepairPlan()`
- `RepairContext` is stored on each `SessionItem` that is a repair item

## Key Functions

### `buildRepairPlan(error: ErrorLogEntry): RepairPlan`
Given an error, returns:
- `explanation`: template text (used in Phase 1A; AI-generated in Phase 2)
- `microDrillExerciseTypes`: 2 exercise types targeting the concept
- `retryExerciseType`: exercise type for the retry (different from original)
- `reviewIntervalDays`: initial spaced repetition interval (starts at 1 day)

### `makeRepairItems(error, plan, sentenceIds): SessionItem[]`
Returns 3 `SessionItem` objects:
- 2 micro-drill items (`isRepairItem: true`, `repairContext.step: 'micro-drill'`)
- 1 retry item (`isRepairItem: true`, `repairContext.step: 'retry'`)

Each item has `repairContext.explanationText` set — the UI reads this to show the explanation between the wrong answer and the micro-drills.

## UX Principles
- **Kind, not punishing.** "Here's why" not "you got it wrong."
- **Fast.** The explanation is max 2 sentences. The micro-drills are quick.
- **Not repetitive.** The retry is a variation, not the identical exercise. If the original was fill-in-blank, retry is sentence-transformation.
- **Transparent.** Show the learner: "Working on [concept name]" so they understand what's being drilled.

## Phase 2 Change
In Phase 2, `buildRepairPlan()` will call the `AIService.explainMistake()` method instead of using templates. The rest of the repair loop is unchanged — AI only replaces the explanation text, not the logic.
