---
name: session-recipe
description: The daily session composition rules — target ratios of remediation, review, new material, and interleaving. Use when modifying the scheduler, adjusting session length, or building any feature related to how daily sessions are assembled.
---

# Session Recipe

## The Recipe

Every session is a mix of four purposes:

| Purpose | Target ratio | What it means |
|---|---|---|
| Remediation | ~40% | Practice on weak spots from the mistake fingerprint |
| Review | ~30% | Concepts going shaky (decayed score dropping below threshold) |
| New material | ~20% | The next unlocked concept in the dependency graph |
| Interleaving | ~10% | Mixed practice — concepts already in progress, varied types |

Plus an always-include rule: **every session must have at least 3 new vocabulary items**, regardless of how heavy the remediation load is. Visible daily growth is motivating.

## Default Values (in `src/types/session.ts`)
```typescript
export const DEFAULT_SESSION_RECIPE: SessionRecipe = {
  remediationRatio: 0.40,
  reviewRatio: 0.30,
  newMaterialRatio: 0.20,
  interleavingRatio: 0.10,
  targetDurationSeconds: 750, // 12.5 minutes
  minNewVocabItems: 3,
};
```

## How Ratios Shift

The ratios are defaults. The scheduler can adjust them:
- Heavy remediation mode (fingerprint has many weak concepts): bump remediation to 50–55%, cut new material to 10%
- Near level-up mode (most A1 concepts nearly mastered): bump new material to 30%, cut remediation to 25%
- First session ever: no weak spots yet, so all goes to new material + new vocab

## Session Length

Default: 750 seconds (12.5 min). This produces ~16 exercises at 45s average.
Short session: 450s (7.5 min) — about 10 exercises
Long session (exam prep): 1200s (20 min) — about 26 exercises

## The Interleaving Principle

**Never put 5 of the same concept/exercise type in a row.** The scheduler enforces this via `pickExerciseType()` which avoids repeating the last 2 exercise types. This prevents fatigue and forces the brain to actually parse (not pattern-match).

## Session Structure Rule

The first item in every session is always a warm-up review (something the learner has seen before and likely knows). Never start cold with a new concept or a failure-inducing difficult item.
