# Task Brief
**Task:** A2 — Shorten decay half-life from 46 → 25 days
**Date:** 2026-05-21
**Status:** APPROVED — 2026-05-21

---

## What

One-constant change in `src/engine/fingerprint.ts` line 12:

```ts
// BEFORE
const DECAY_HALF_LIFE_DAYS = 46;  // ~6.5 weeks — research-backed forgetting curve

// AFTER
const DECAY_HALF_LIFE_DAYS = 25;  // ~3.5 weeks — forgetting-curve research shows steepest decay in first month
```

No other changes. The floor (`DECAY_FLOOR = 35`) stays at 35. The formula, the SRS ladder, and all other constants are untouched.

---

## How

1. Open `src/engine/fingerprint.ts`
2. Change line 12: `DECAY_HALF_LIFE_DAYS = 46` → `DECAY_HALF_LIFE_DAYS = 25`
3. Update the inline comment to explain the new value
4. Run `npx tsc --noEmit` — confirm no TypeScript errors
5. Trace three acceptance points manually:

```
formula: decayed = 35 + (rawScore - 35) * e^(-ln2/25 * days)

rawScore=85, days=30: 35 + 50 * e^(-0.832) = 35 + 21.8 = 57  (was 67 at 46 days)
rawScore=60, days=45: 35 + 25 * e^(-1.247) = 35 + 7.2  = 42  (was 48 at 46 days)
rawScore=50, days=60: 35 + 15 * e^(-1.663) = 35 + 2.9  = 38  (was 41 at 46 days)
```

All three: materially lower than the old values, none below the floor of 35.

---

## Model
sonnet

## Acceptance Criteria

1. `DECAY_HALF_LIFE_DAYS` is 25 in `src/engine/fingerprint.ts`
2. Comment updated to reflect the new value
3. Three-point trace confirmed (see How section above)
4. No TypeScript errors introduced
5. `DECAY_FLOOR`, SRS ladder, and all other constants unchanged

## Blocking Flags

Stop and write `BLOCKED: [reason]` to this file if:
- Any other constant changes alongside `DECAY_HALF_LIFE_DAYS`
- Any TypeScript error is introduced
- The trace points do not match the expected values

## Playwright Checkpoint
no

This is a pure engine constant — no UI surface to test. The change takes effect on the next session's `recordFingerprintResult` call. No visual regression to check.
