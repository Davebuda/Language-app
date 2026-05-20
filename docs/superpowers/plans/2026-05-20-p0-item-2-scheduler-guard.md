# Plan: P0 Item 2 (+ Item 1) — Scheduler Exercise-Type Guard

**Status: APPROVED — plan locked, implement on explicit 'go' from user**  
**Date:** 2026-05-20  
**Source:** `docs/recovery-backlog.md` items 1 and 2  
**Findings:** `test-reports/system-walkthrough-2026-05-20.md` C1 + C3

---

## What this plan addresses

Items 1 and 2 share the same root cause and the same fix. This plan covers both.

**Root cause:** `generateSession` assigns exercise types to session items without verifying that any sentence for the concept actually supports that type. Two failure modes result:

1. **Blank card (C3):** `resolveItem` finds zero eligible sentences for the item → `picked` is `undefined` → `contentCache` has no entry → current content is `undefined` → the exercise component renders a blank dark card with no input or button.

2. **Grader mismatch (C1):** `resolveItem` finds no *compatible* sentence (matching `exerciseType`) but finds an *eligible* fallback. The fallback sentence has a different exercise type. The grader uses the item's original (incorrect) `exerciseType` via `deriveCorrectAnswer`, so the correct answer it derives doesn't match the sentence being displayed. English input never matches a Norwegian expected answer.

---

## Files touched

| File | Change |
|---|---|
| `src/engine/scheduler.ts` | Extend `SchedulerInput`, add `firstEligibleType` helper, update `addItem` |
| `src/hooks/useSession.ts` | Pass `sentences` to `generateSession` at line 152 |
| `src/app/dashboard/page.tsx` | Pass `sentences` alongside `MOCK_SENTENCE_IDS` (dashboard preview only — low risk) |
| `src/engine/scheduler.test.ts` (new) | Unit tests for the guard |

No schema changes. No Supabase migrations. No new stores.

**Dashboard pre-clearance:** The `app/dashboard/page.tsx` change is purely prop-threading — `MOCK_SENTENCES` already exists and is being passed alongside the existing `MOCK_SENTENCE_IDS`. No visual change, no new component, no logic change. Pre-cleared as low-risk: the slop-gate (no new behavior hidden in wiring changes) is satisfied.

---

## The change

### Step 1 — Extend `SchedulerInput`

```typescript
// engine/scheduler.ts
import type { Sentence } from '@/types/content';  // add import

export interface SchedulerInput {
  fingerprint: MistakeFingerprint;
  graph: ConceptGraph;
  availableSentenceIds: Record<string, string[]>;
  sentences: Record<string, Sentence>;  // ← add
  recipe?: Partial<SessionRecipe>;
}
```

### Step 2 — Add `firstEligibleType` helper inside `generateSession`

This helper is a closure inside `generateSession` so it can read `availableSentenceIds` and `sentences` from the outer scope.

```typescript
// Inside generateSession, after destructuring input:
const { fingerprint, graph, availableSentenceIds, sentences } = input;

// Returns the first exercise type from `candidates` for which at least one
// sentence for `conceptId` declares support. Returns null if none qualify.
function firstEligibleType(
  conceptId: string,
  candidates: ExerciseType[],
): ExerciseType | null {
  const ids = availableSentenceIds[conceptId] ?? [];
  if (ids.length === 0) return null;
  for (const type of candidates) {
    if (ids.some((id) => sentences[id]?.exerciseTypes.includes(type))) {
      return type;
    }
  }
  return null;
}
```

### Step 3 — Update `addItem` to use the guard

Replace the current `pickExerciseType` call with `firstEligibleType`. If no eligible type exists, skip the item and return `false`.

**Current `addItem`:**
```typescript
function addItem(
  conceptId: string,
  exercises: ExerciseType[],
  purpose: SessionItem['purpose']
) {
  const contentId = `pending:${conceptId}`;
  const gap = fingerprint.productionGap[conceptId] ?? 0;
  const exerciseType = pickExerciseType(exercises, usedExerciseTypes, gap, preference);
  usedExerciseTypes.push(exerciseType);
  items.push(makeItem(`item-${itemIndex++}`, conceptId, contentId, exerciseType, purpose));
}
```

**New `addItem`:**
```typescript
function addItem(
  conceptId: string,
  exercises: ExerciseType[],
  purpose: SessionItem['purpose']
): boolean {
  const gap = fingerprint.productionGap[conceptId] ?? 0;
  const adjusted = resolvePool(exercises, gap, preference);

  // Avoid repeating the same type more than twice in a row
  const lastTwo = usedExerciseTypes.slice(-2);
  const deduped = adjusted.filter((t) => !lastTwo.includes(t));
  // Try deduped first (anti-repetition), then fall back to full adjusted pool
  const candidates = deduped.length > 0
    ? [...deduped, ...adjusted.filter((t) => !deduped.includes(t))]
    : adjusted;

  const exerciseType = firstEligibleType(conceptId, candidates);
  if (exerciseType === null) {
    // No eligible sentence exists for this concept in this pool — skip it.
    // This prevents both the blank-card trap and the grader type mismatch.
    return false;
  }

  const contentId = `pending:${conceptId}`;
  usedExerciseTypes.push(exerciseType);
  items.push(makeItem(`item-${itemIndex++}`, conceptId, contentId, exerciseType, purpose));
  return true;
}
```

Note: `pickExerciseType` is kept — it is still used in the production-guarantee swap at the end of `generateSession`. That swap does not involve concept-level eligibility (it swaps exercise types on an already-placed item), so the guard does not apply there.

**Update `addItemCapped` signature** to propagate the boolean return from `addItem`. The caller loops already handle the case where a concept produces no item (the loop continues to the next index).

### Step 4 — Thread `sentences` through `useSession`

```typescript
// useSession.ts, line 152
const output = generateSession({
  fingerprint,
  graph: activeGraph,
  availableSentenceIds: availableSentenceIdsProp,
  sentences,  // ← add; already in scope from the hook's parameter
});
```

### Step 5 — Update dashboard call site

```typescript
// app/dashboard/page.tsx
// The dashboard uses MOCK_SENTENCES for its session preview — still correct.
const output = generateSession({
  fingerprint,
  graph: activeGraph,
  availableSentenceIds: MOCK_SENTENCE_IDS,
  sentences: MOCK_SENTENCES,  // ← add
})
```

---

## Edge case decisions

| Scenario | Behavior |
|---|---|
| Concept has 0 sentences | Skip item; loop continues |
| Concept has sentences, none match any pool type | Skip item; loop continues |
| All remediation pool concepts are skipped | Session falls back to unlocked pool (existing behavior) |
| Final item count below target | Session completes short — best-effort, no blocking. The session is shorter but every item it contains is valid. |
| Listening exercise type | **Not affected.** Listening exercises are not in any of the pools that go through `addItem`. They appear only when explicitly assigned by the recipe's recognition slot — and they have their own three-tier audio fallback. Option B confirmed: exclude from this guard. |
| Production guarantee swap at session end | Unaffected. The swap operates on an already-placed item; it only changes the `exerciseType` field, not the sentence. If the swap assigns a type the sentence doesn't support, the existing `resolveItem` fallback handles it at render time as belt-and-suspenders. |

---

## Unit test plan

New file: `src/engine/scheduler.test.ts`

| Test | What it verifies |
|---|---|
| `firstEligibleType — empty ids` | Returns null for concept with no sentences |
| `firstEligibleType — no matching type` | Returns null when no sentence in the pool has matching `exerciseTypes` |
| `firstEligibleType — first match wins` | Returns the first candidate type that has a matching sentence |
| `generateSession — concept with no seeds excluded` | Session items contain no item for the seeded concept |
| `generateSession — concept with seeds but wrong type` | Item is assigned a type the sentence actually supports, not the default pool type |
| `generateSession — all remediation seeds missing` | Session falls back to unlocked pool; no blank items; no throw |
| `generateSession — short session` | Item count below target is acceptable; session object is valid |
| `generateSession — production guarantee preserved` | At least one production exercise exists even after guard filters |
| `generateSession — no regression on valid input` | Standard call with full mock sentences produces same structure as before |

---

## What this does NOT change

- `resolveItem`'s existing `compatible → eligible` fallback in `useSession.ts` — it stays as a runtime safety net. After this fix it should never trigger for types, but removing it is a separate cleanup.
- `gradeAnswer` in `actions.ts` — it is correct as-is.
- Content JSON files — no sentence data changes in this plan.
- The `topUpConcept` path — unaffected; still calls when AI is ready.
- Any UI component — this is engine/scheduler only.

---

## Verification gate

Before claiming this item done:

1. Run the app and navigate to a session. Confirm no blank dark card (pulse skeleton persisting for 3 seconds then silently advancing) appears at any point during the session.
2. Open the browser console. Confirm `console.warn` fires with concept ID and skip reason for any concept the guard excludes (logged, not thrown — session must not crash).
3. Run `npm run type-check` — zero errors.
4. Run `npm test` — all tests in `src/engine/scheduler.test.ts` pass.
5. Complete a full session without interruption. If eligible concept count was below target, session completes short — expected behavior, not a failure.
6. Take a screenshot of the completed session (or a near-completion state) and save to `.claude/screenshots/item-2-guard/`. Include at minimum a 375px and 1280px breakpoint capture.

---

## Acceptance criteria

1. Submit the correct English translation for three "Oversett til engelsk" exercises with `exerciseType === 'translation-to-english'`. All three advance without triggering the repair loop.
2. Load a full session and complete it — no blank dark cards at any point.
3. `console.warn` fires for any concept skipped by the guard (logged, not thrown).
4. Session counter on the progress bar matches the number of items actually presented.
5. TypeScript strict mode passes (`npm run type-check` zero errors).
6. All new unit tests pass.
