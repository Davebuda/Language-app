# Fingerprint Pre/Post Diff: Stream 5.5 Phase 2 — Mid-week reveal strip

**Date:** 2026-05-22
**Phase identifier:** A1 / Stream 5.5 Phase 2
**Procedural lock satisfied:** Fingerprint pre/post diffs are mandatory acceptance evidence for any task that touches engine write paths (carried from P0.5; reinforced in Stream 5.5 procedural locks #1).
**Test count change:** 196 → 209 (+13). All passing.

## What Changed in the Engine

Two write paths are affected, both in `src/engine/weekly-sprint.ts`. One new fingerprint field in `src/types/fingerprint.ts`. The mid-week reveal pure function in `src/lib/weekly-progress.ts` is read-only and has no engine-write side effects.

| File | Change |
|---|---|
| `src/types/fingerprint.ts` | New field `weekStartSnapshots: Record<string, {rawScore: number; decayedScore: number; attemptCount: number}>` on `MistakeFingerprint`. Seeded `{}` in `createEmptyFingerprint`. |
| `src/engine/weekly-sprint.ts` `openWeek` | After selecting `weeklyFocus`, snapshots `{rawScore, decayedScore, attemptCount}` for each focus concept into `weekStartSnapshots`. Falls back to zeros for concepts without existing mastery. |
| `src/engine/weekly-sprint.ts` `closeWeek` | Reads `weekStartSnapshots[conceptId].decayedScore` to write the real `startScore` into `focusOutcomes`. Per-week `attempts` derived from `m.attemptCount - snapshot.attemptCount`. Snapshot map cleared on close. **Closes the Stream 5 Phase 5 TODO carry-over** (`startScore: 0` hardcoded).
| `src/engine/weekly-sprint.ts` `migrateWeeklySprintFields` | Extended to seed `weekStartSnapshots: {}` idempotently on Stream-5-era fingerprints. |

## Diff Trace: `openWeek`

### Pre-state (fresh fingerprint, no week open)

```jsonc
{
  "weeklyFocus": [],
  "weekStartedAt": null,
  "weekStartSnapshots": {},
  "conceptMastery": {
    "c1": { "rawScore": 30, "decayedScore": 35, "attemptCount": 4, /* … */ },
    "c2": { "rawScore": 50, "decayedScore": 48, "attemptCount": 8, /* … */ },
    "c3": { "rawScore": 70, "decayedScore": 65, "attemptCount": 12, /* … */ }
  }
}
```

### After `openWeek(fp, graph, now)` (now = 2026-01-15T10:00:00.000Z)

```jsonc
{
  "weeklyFocus": ["c1", "c2", "c3"],                                  // populated by selectWeeklyFocus
  "weekStartedAt": "2026-01-15T10:00:00.000Z",                        // populated
  "weekStartSnapshots": {                                             // NEW: populated per focus concept
    "c1": { "rawScore": 30, "decayedScore": 35, "attemptCount": 4 },
    "c2": { "rawScore": 50, "decayedScore": 48, "attemptCount": 8 },
    "c3": { "rawScore": 70, "decayedScore": 65, "attemptCount": 12 }
  },
  "conceptMastery": { /* unchanged */ },
  "updatedAt": "2026-01-15T10:00:00.000Z"
}
```

**Trace verified by test** `openWeek snapshots {rawScore, decayedScore, attemptCount} for each focus concept` (`tests/engine/weekly-sprint.test.ts`).

### Edge case — focus concept without existing mastery

If `weeklyFocus` contains a concept with no `conceptMastery` entry, the snapshot for that concept is `{rawScore: 0, decayedScore: 0, attemptCount: 0}`. Guarantees the snapshot map is always well-formed for downstream `closeWeek` and `summarizeWeeklyProgress` reads.

**Trace verified by test** `openWeek snapshots zero values for focus concepts that have no existing mastery`.

## Diff Trace: `closeWeek`

### Pre-state (week open, learner practised during the week)

```jsonc
{
  "weeklyFocus": ["c1"],
  "weekStartedAt": "2026-01-08T10:00:00.000Z",
  "weekStartSnapshots": {
    "c1": { "rawScore": 40, "decayedScore": 42, "attemptCount": 4 }   // baseline from openWeek
  },
  "conceptMastery": {
    "c1": { "rawScore": 75, "decayedScore": 72, "attemptCount": 12, /* … */ }   // after a week of practice
  },
  "weeklySprintHistory": []
}
```

### After `closeWeek(fp, graph, {status: 'completed', checkResult: null})`

```jsonc
{
  "weeklyFocus": [],                                                  // cleared
  "weekStartedAt": null,                                              // cleared
  "weekStartSnapshots": {},                                           // NEW: cleared (was populated)
  "conceptMastery": { /* unchanged */ },
  "weeklySprintHistory": [                                            // gains one record at head
    {
      "weekStartedAt": "2026-01-08T10:00:00.000Z",
      "weekEndedAt": "<now>",
      "focus": ["c1"],
      "status": "completed",
      "focusOutcomes": {
        "c1": {
          "startScore": 42,                                           // FIXED: from snapshot.decayedScore (was hardcoded 0)
          "endScore": 72,                                             // from current decayedScore
          "attempts": 8,                                              // FIXED: per-week delta (12 lifetime - 4 snapshot)
          "graduated": false
        }
      },
      "checkResult": null
    }
  ],
  "updatedAt": "<now>"
}
```

**Trace verified by tests**:
- `records focusOutcomes with endScore, per-week attempts, and startScore from snapshot`
- `closeWeek clears weekStartSnapshots after writing focusOutcomes`
- `closeWeek falls back to startScore: 0 when snapshot is missing (legacy week)`

### Backwards compatibility — legacy week opened before Stream 5.5 Phase 2

If a week was opened before this phase shipped (no `weekStartSnapshots` populated for that concept), `closeWeek` falls back to `startScore: 0` and `attempts: <lifetime attemptCount>`. Identical to pre-Phase-2 behavior. No throw, no NaN.

## Migration Diff

### Pre-state (Stream-5-era fingerprint, no `weekStartSnapshots`)

```jsonc
{
  /* … all other fields … */
  "weeklyFocus": ["c1"],
  "weekStartedAt": "2026-01-08T10:00:00.000Z",
  "weeklySprintHistory": []
  // weekStartSnapshots intentionally absent
}
```

### After `migrateWeeklySprintFields(fp)`

```jsonc
{
  /* … all other fields preserved verbatim … */
  "weeklyFocus": ["c1"],
  "weekStartedAt": "2026-01-08T10:00:00.000Z",
  "weeklySprintHistory": [],
  "weekStartSnapshots": {},                                           // NEW: seeded empty
  "updatedAt": "<now>"
}
```

**Idempotency verified by test** `seeds weekStartSnapshots on a fingerprint that has the three older fields but not snapshots`. Second call returns `changed: false`.

## Behaviour Preserved

- `selectWeeklyFocus`, `shouldResetWeek`, `isGraduated`, `ensureWeekOpen`: untouched.
- Scheduler bias toward `weeklyFocus`: untouched.
- `weeklySprintHistory` cap of 26 entries: untouched.
- All 37 pre-existing weekly-sprint tests: still passing.
- Stream 5 Phase 1/3/5a/4a/4b/5b/6/7 surfaces: untouched.

## Verdict

PASS for procedural lock #1 (fingerprint pre/post diff evidence). Engine writes are pure, type-safe, migration-idempotent, fall back gracefully on legacy data, and close the unshipped Stream 5 Phase 5 TODO as a side effect.
