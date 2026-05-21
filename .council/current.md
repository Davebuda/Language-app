# Task Brief
**Task:** Stream 5 — Weekly Sprint — Phase 1: Data Model + Selection Logic
**Date:** 2026-05-21T21:40
**Status:** IN PROGRESS
**corrections:** 0

---

## What

Add the data model and pure selection logic for the Weekly Sprint. No UI in this phase. No scheduler integration in this phase. No new route. Mechanical extension of the existing fingerprint + engine API.

**Files in scope (explicit list — scope creep detection uses this):**
- `src/types/fingerprint.ts` — add three new fields to `MistakeFingerprint`; update `createEmptyFingerprint`; add `WeeklySprintRecord` interface.
- `src/engine/weekly-sprint.ts` — NEW. Pure functions: `selectWeeklyFocus`, `shouldResetWeek`, `closeWeek`.
- `src/engine/index.ts` — export the new module's public API.
- `src/hooks/useFingerprint.ts` — extend the existing migration helper so legacy fingerprints (without the new fields) get them seeded on bootstrap. Use the same idempotent pattern as `migrateConceptIds` from P0.5-02.
- `tests/engine/weekly-sprint.test.ts` — NEW. Unit tests for the three functions and the migration.

**Out of scope (defer to later phases):**
- `src/engine/scheduler.ts` — DO NOT modify. Scheduler bias is Phase 3.
- Any UI files (`src/app/uke/*`, `src/app/dashboard/page.tsx`, components) — Phases 4/6.
- Graduation job orchestration — Phase 5.
- `learning_events_log` event writes — Phase 4.
- Authenticated walkthrough — Phase 2 (separate work).

---

## How

### Data model — `src/types/fingerprint.ts`

Add new interface above `MistakeFingerprint`:

```ts
export interface WeeklySprintRecord {
  weekStartedAt: string;             // ISO date — the Monday this sprint started
  weekEndedAt: string;               // ISO date — when the record was closed
  focus: string[];                   // concept IDs that were the focus that week
  status: 'completed' | 'abandoned'; // completed = honored the cadence; abandoned = absence reset
  focusOutcomes: Record<string, {    // per-concept progress during the week
    startScore: number;              // decayedScore at week start
    endScore: number;                // decayedScore at week end
    attempts: number;                // count of practice events during the week
  }>;
  checkResult: {
    takenAt: string;
    score: number;                   // 0–100, accuracy on the weekly check
    items: number;                   // number of items in the check
  } | null;                          // null if learner skipped the check
}
```

Add to `MistakeFingerprint` interface (group with engine state fields):

```ts
weeklyFocus: string[];                       // concept IDs, ≤5; the current week's focus
weekStartedAt: string | null;                // ISO date; null before first sprint
weeklySprintHistory: WeeklySprintRecord[];   // newest first, capped at 26 entries (~6 months)
```

Update `createEmptyFingerprint` to seed the three new fields:

```ts
weeklyFocus: [],
weekStartedAt: null,
weeklySprintHistory: [],
```

### Selection logic — `src/engine/weekly-sprint.ts` (NEW)

Three pure functions, no I/O:

```ts
import type { MistakeFingerprint, WeeklySprintRecord } from '@/types/fingerprint';
import type { ConceptGraph } from '@/types/concepts';
import { getConceptPhase } from './fingerprint';

const MAX_FOCUS_COUNT = 5;
const WEAK_PICK_COUNT = 3;
const SRS_PICK_COUNT = 2;
const WEEK_DURATION_MS = 7 * 24 * 60 * 60 * 1000;
const HISTORY_CAP = 26;

/**
 * Pick the focus concepts for a new weekly sprint.
 * Union of: weakest N by decayedScore + up to M SRS-due concepts where
 * nextReviewAt <= weekEnd. Locked concepts excluded.
 * Returns <=5 concept IDs, deduped. Weakest-N takes priority on dedupe.
 */
export function selectWeeklyFocus(
  fp: MistakeFingerprint,
  graph: ConceptGraph,
  now: Date = new Date(),
): string[] {
  const weekEnd = new Date(now.getTime() + WEEK_DURATION_MS).toISOString();

  // Filter: only concepts that exist in the graph and are NOT locked.
  const eligible = Object.values(fp.conceptMastery).filter((m) => {
    const node = graph.concepts.find((c) => c.id === m.conceptId);
    if (!node) return false;
    return getConceptPhase(m, node) !== 'locked';
  });

  // Weakest N by decayedScore (ascending).
  const weakest = [...eligible]
    .sort((a, b) => a.decayedScore - b.decayedScore)
    .slice(0, WEAK_PICK_COUNT)
    .map((m) => m.conceptId);

  // SRS-due within the week (nextReviewAt <= weekEnd). Earliest-due first.
  const srsDue = eligible
    .filter((m) => m.nextReviewAt !== null && m.nextReviewAt <= weekEnd)
    .sort((a, b) => (a.nextReviewAt ?? '').localeCompare(b.nextReviewAt ?? ''))
    .slice(0, SRS_PICK_COUNT)
    .map((m) => m.conceptId);

  // Union, dedupe, cap at MAX_FOCUS_COUNT. Weakest takes priority on dedupe.
  return Array.from(new Set([...weakest, ...srsDue])).slice(0, MAX_FOCUS_COUNT);
}

/**
 * Returns true if the learner has been absent long enough that the current
 * week should be closed as 'abandoned' and a new week started. Threshold:
 * >7 days since weekStartedAt.
 */
export function shouldResetWeek(
  fp: MistakeFingerprint,
  now: Date = new Date(),
): boolean {
  if (fp.weekStartedAt === null) return false;
  const elapsed = now.getTime() - new Date(fp.weekStartedAt).getTime();
  return elapsed > WEEK_DURATION_MS;
}

/**
 * Close the current week into a WeeklySprintRecord and return an updated
 * fingerprint. Pure: caller persists. status='abandoned' if shouldResetWeek
 * fired without a checkResult; 'completed' otherwise.
 */
export function closeWeek(
  fp: MistakeFingerprint,
  options: {
    status: 'completed' | 'abandoned';
    checkResult: WeeklySprintRecord['checkResult'];
    now?: Date;
  },
): MistakeFingerprint {
  if (fp.weekStartedAt === null) return fp;

  const now = (options.now ?? new Date()).toISOString();
  const focusOutcomes: WeeklySprintRecord['focusOutcomes'] = {};
  for (const conceptId of fp.weeklyFocus) {
    const m = fp.conceptMastery[conceptId];
    if (!m) continue;
    focusOutcomes[conceptId] = {
      startScore: 0,           // Phase 5 will capture startScore at week-open
      endScore: m.decayedScore,
      attempts: m.attemptCount,
    };
  }

  const record: WeeklySprintRecord = {
    weekStartedAt: fp.weekStartedAt,
    weekEndedAt: now,
    focus: fp.weeklyFocus,
    status: options.status,
    focusOutcomes,
    checkResult: options.checkResult,
  };

  const history = [record, ...fp.weeklySprintHistory].slice(0, HISTORY_CAP);

  return {
    ...fp,
    weeklySprintHistory: history,
    weeklyFocus: [],
    weekStartedAt: null,
    updatedAt: now,
  };
}
```

**Phase boundary note:** `closeWeek` records `endScore` but hardcodes `startScore: 0` in Phase 1. Phase 5 (graduation job) will capture `startScore` at `selectWeeklyFocus` time and thread it through to `closeWeek`. Do not solve this in Phase 1.

### Engine export — `src/engine/index.ts`

Append:

```ts
export { selectWeeklyFocus, shouldResetWeek, closeWeek } from './weekly-sprint';
```

### Migration — `src/hooks/useFingerprint.ts`

The existing `migrateConceptIds` function uses an idempotent pattern. Add a sibling helper `migrateWeeklySprintFields`:

```ts
function migrateWeeklySprintFields(fp: MistakeFingerprint): { migrated: MistakeFingerprint; changed: boolean } {
  const hasFocus = Array.isArray((fp as Partial<MistakeFingerprint>).weeklyFocus);
  const hasStarted = 'weekStartedAt' in fp;
  const hasHistory = Array.isArray((fp as Partial<MistakeFingerprint>).weeklySprintHistory);
  if (hasFocus && hasStarted && hasHistory) return { migrated: fp, changed: false };
  return {
    migrated: {
      ...fp,
      weeklyFocus: (fp as Partial<MistakeFingerprint>).weeklyFocus ?? [],
      weekStartedAt: (fp as Partial<MistakeFingerprint>).weekStartedAt ?? null,
      weeklySprintHistory: (fp as Partial<MistakeFingerprint>).weeklySprintHistory ?? [],
      updatedAt: new Date().toISOString(),
    },
    changed: true,
  };
}
```

Wire `migrateWeeklySprintFields` into `applyMigration` so it composes with the existing concept-id migration. Order: concept-id migration first, then weekly-sprint-fields migration. Compose the `changed` flags with `||`.

### Tests — `tests/engine/weekly-sprint.test.ts` (NEW)

Mirror the style of existing tests in `tests/engine/`. Coverage targets:

1. `selectWeeklyFocus`:
   - Returns ≤5 concept IDs.
   - Excludes locked concepts (mock a graph where one concept's mastery is below the phase threshold).
   - Prefers weakest 3 by decayedScore.
   - Includes up to 2 SRS-due concepts when `nextReviewAt <= weekEnd`.
   - Dedupes when a concept appears in both pools (weakest takes priority).
   - Empty fingerprint returns `[]`.

2. `shouldResetWeek`:
   - Returns false when `weekStartedAt === null`.
   - Returns false when elapsed ≤7 days.
   - Returns true when elapsed >7 days (test at 7.5 days).

3. `closeWeek`:
   - When `weekStartedAt === null`, returns fp unchanged.
   - Status `completed` produces a record with that status.
   - Status `abandoned` produces a record with that status.
   - History capped at 26 entries (insert 27, assert length 26 with the oldest dropped).
   - `weeklyFocus` and `weekStartedAt` cleared after close.
   - `updatedAt` updated to `options.now`.
   - `checkResult: null` accepted (skipped check).

4. Migration helper (test the helper directly, not the hook):
   - Legacy fingerprint without the three new fields gets them seeded.
   - Idempotent: second call returns `changed: false`.
   - Existing `conceptMastery` and `recentErrors` untouched.

---

## Model
sonnet — mechanical implementation from complete spec.

---

## Acceptance Criteria

1. `npx tsc --noEmit` passes with zero errors.
2. `npm test` passes 100% (existing 106 tests + the new weekly-sprint suite).
3. New test file covers all four targets above.
4. `git diff HEAD --name-only` matches exactly the "Files in scope" list (no incidental files).
5. `selectWeeklyFocus`, `shouldResetWeek`, `closeWeek` are pure (no I/O, no `Date.now()` without an optional `now` param, no `Math.random()`).
6. Migration is idempotent — a second `applyMigration` call on the migrated fingerprint returns `changed: false`.
7. Commit message follows project convention: `feat(engine): Stream 5 Phase 1 — weekly sprint data model + selection logic`.

---

## Blocking Flags

Stop immediately and write `BLOCKED: [reason]` to this file if:
- Any TypeScript error is introduced that cannot be resolved within the brief.
- Any existing test fails.
- The selection logic produces results inconsistent with the test plan above (specifically, the dedupe-priority test).
- You are about to modify a file not in the "Files in scope" list.
- You are about to make a design decision not specified here.

---

## Playwright Checkpoint

**none** — no UI surface in this phase. Data model + pure functions only. Playwright resumes in Phase 4 (Weekly Check route) and Phase 6 (dashboard week-strip).
