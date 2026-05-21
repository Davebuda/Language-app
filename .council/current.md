# Task Brief
**Task:** A3 — Calibration window for first 5 sessions
**Date:** 2026-05-21
**Status:** APPROVED — 2026-05-21

---

## Architectural decisions (approved)

- Q1: Counter lives in **fingerprint blob** — `calibrationSessionsRemaining?: number`
- Q2: Existing users default to **0** (`?? 0` = post-calibration, no backfill)
- Q3: Scheduler receives **recipe override from caller** (`useSession.ts`) — engine stays pure

---

## What

Four files to change:

1. `src/types/fingerprint.ts` — add field to type + default
2. `src/engine/fingerprint.ts` — decrement counter on session completion
3. Diagnostic completion path — initialize counter to 5 when fingerprint is seeded after diagnostic
4. `src/app/session/page.tsx` or `src/hooks/useSession.ts` — compute recipe override when counter > 0

---

## How

### 1. `src/types/fingerprint.ts`

**Read the file first.** Find the `MistakeFingerprint` interface and add the field alongside `totalSessionsCompleted`:

```ts
calibrationSessionsRemaining: number;  // counts down 5→0 after diagnostic; 0 = standard behavior
```

Find `DEFAULT_FINGERPRINT` (the initial value object) and add:
```ts
calibrationSessionsRemaining: 5,
```

The default of 5 means new users who get a fresh fingerprint (from diagnostic) start in calibration mode.

### 2. `src/engine/fingerprint.ts`

**Read the file first.** Find the function that handles session completion and increments `totalSessionsCompleted`. In that same function, decrement `calibrationSessionsRemaining` if > 0:

```ts
calibrationSessionsRemaining: Math.max(0, (prev.calibrationSessionsRemaining ?? 0) - 1),
```

The `?? 0` handles existing users who don't have the field yet — they skip calibration silently.

### 3. Diagnostic seeding path

**Find where the fingerprint is first seeded from diagnostic results.** This is likely in `src/components/onboarding/PlacementQuiz.tsx` or a similar onboarding component. Find where `createFingerprint` or the initial `MistakeFingerprint` object is constructed after the diagnostic completes.

The `DEFAULT_FINGERPRINT` already has `calibrationSessionsRemaining: 5`, so if the diagnostic path uses `DEFAULT_FINGERPRINT` as the base, this is automatically handled. Verify this is the case — if so, no change needed here. If a custom object is constructed without spreading `DEFAULT_FINGERPRINT`, add the field explicitly.

### 4. `src/hooks/useSession.ts` — calibration recipe override

**Read the file first.** Find where `generateSession` is called (look for the `generateSession({...})` call). Add a calibration recipe override:

```ts
// Calibration: wider variety for first 5 sessions
const isCalibrating = (fingerprint.calibrationSessionsRemaining ?? 0) > 0

const calibrationRecipe: Partial<SessionRecipe> = isCalibrating
  ? {
      newMaterialRatio: 0.30,   // up from 0.20 — wider concept exposure
      remediationRatio: 0.30,   // down from 0.40 — less drilling of early errors
      reviewRatio: 0.30,        // keep review present
      interleavingRatio: 0.10,  // unchanged
    }
  : {}

const output = generateSession({
  fingerprint,
  graph: activeGraph,
  availableSentenceIds,
  sentences,
  recipe: calibrationRecipe,
})
```

Import `SessionRecipe` if not already imported from `@/types/session`.

**Important:** Only add the `isCalibrating` logic where `generateSession` is called from within the session flow. Do not add it to the dashboard preview call.

---

## Model
sonnet

## Acceptance Criteria

1. `calibrationSessionsRemaining` field added to `MistakeFingerprint` type with default 5
2. Field decrements by 1 on each session completion, floors at 0
3. Existing users without the field (`?? 0`) behave as post-calibration — no disruption
4. `generateSession` receives calibration recipe override when counter > 0: `newMaterialRatio: 0.30`
5. Standard recipe (`newMaterialRatio: 0.20`) resumes when counter reaches 0
6. TypeScript: zero new errors — run `npx tsc --noEmit`
7. No changes to `DECAY_FLOOR`, SRS ladder, or any other constants

## Blocking Flags

Stop and write `BLOCKED: [reason]` to this file if:
- `generateSession` is called in more than 2 places — identify all call sites before choosing where to add the override
- The session completion function that increments `totalSessionsCompleted` cannot be found
- The diagnostic seeding path constructs a custom fingerprint object that bypasses `DEFAULT_FINGERPRINT`
- Any TypeScript error that cannot be resolved correctly

## Playwright Checkpoint
no

Pure engine + type change. No UI surface — the recipe ratios don't render visibly. Behavior verification happens via `npx tsc --noEmit` + code review.
