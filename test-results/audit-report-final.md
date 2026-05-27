# Fingerprint-First Audit Report — NorskCoach

**Generated:** 2026-05-26T21:52Z
**Auditor:** Fingerprint-first audit harness (69 contract tests + static analysis)
**Verdict: PASS (with 7 open findings)**

---

## 1. Chain Verification (69 tests)

The harness tested the full adaptive chain: placement → fingerprint → scheduler → mastery update → weekly progress → next sprint. Every link passed.

| Chain Link | Tests | Status | What was proven |
|---|---|---|---|
| Fingerprint contract | 29 | **PASS** | Structure integrity, seeding, mastery scoring, decay floor (35), SRS ladder, slip detection, 4-gate isMastered, phase model |
| Scheduler / daily oppgaver | 16 | **PASS** | Fingerprint-driven (not random), passed-sentence exclusion, review allows passed (SRS), level-specific pools (A1/A2/B1 differ), recipe ratios, selectionReason on every item, production guarantee |
| Weekly progress | 15 | **PASS** | Focus derived from mastery, snapshots match state, close captures real deltas, zero-activity recorded honestly, abandonment closes stale weeks, history capped at 26 |
| End-to-end proof | 9 | **PASS** | Correct answer → mastery up → sentence passed → excluded next session. Wrong answer → error logged → concept stays in remediation. 25 correct answers → score rises above 70. Full weekly cycle: open → practice → close → new week with shifted focus. Level isolation: A1/A2/B1 concepts never cross-contaminate. B2→B1 honest fallback confirmed. |

---

## 2. Findings

### FIXED

| ID | Severity | Category | Component | What was wrong | What was done |
|---|---|---|---|---|---|
| **F-001** | critical | broken | `concept-graph-loader` | `getGraphForLevel("B2")` returned A1 graph via `default` case. B2 users got A1 content with no error. Parameter typed as `string`, no exhaustive check. | Changed parameter to `CEFRLevel`. Added explicit cases for all 4 levels. B2 now returns B1 graph (honest — matches LevelSelector's "B1-innhold" label). Added exhaustive `never` check. Zero type errors, 393/393 tests pass. |
| **F-001b** | major | broken | `OnboardingFlow` | Line 98 capped diagnostic result at A2: `fp.currentLevel = result.rawScore >= 0.55 ? 'A2' : result.cefrLevel`. Comment said "until B1/B2 graphs exist" — B1 graph has existed since Wave 4. | Removed cap. Diagnostic now assigns `result.cefrLevel` directly. B1 scores reach B1. |

### OPEN — Major (fix this week)

| ID | Severity | Category | Component | What's wrong | Evidence | Recommended fix |
|---|---|---|---|---|---|---|
| **F-002** | major | disconnected | `fingerprint/productionGap` | `productionGap` field is never written. Always `{}`. | `computeProductionGap()` exists in `fingerprint.ts` but is never called by `recordResult` in `useFingerprint.ts`. The scheduler reads `fingerprint.productionGap[conceptId] ?? 0` and always gets 0. The `resolvePool()` function has a `> 30` / `< -30` branch that can never fire. | **Option A (wire it):** Call `computeProductionGap()` in `recordResult` after `logError`, write result to `fp.productionGap[conceptId]`. ~10 lines. **Option B (remove it):** Delete `productionGap` from the type, `computeProductionGap` from `fingerprint.ts`, and the `resolvePool` gap branches from `scheduler.ts`. Cleaner. Recommend **Option A** — the feature is correctly designed, just never wired. |
| **F-003** | major | disconnected | `fingerprint/vocabularyMastery` | `VocabularyClusterMastery` type and `vocabularyMastery: Record<string, VocabularyClusterMastery>` exist in the type and are initialized in `createEmptyFingerprint`, but no engine function reads or writes them. | Grep for `vocabularyMastery` outside the type file returns zero hits in engine, hooks, or scheduler. | **Remove the type and field.** It's a V2 feature (vocab SRS is listed as a stub in CLAUDE.md). Dead schema creates false expectations. Re-add when the feature is built. |
| **F-005** | major | fake | `session/exerciseTypes` | `ExerciseType` union includes `dictation`, `reading-comprehension`, and `free-writing`. None appear in any scheduler pool (`PRODUCTION_EXERCISES`, `RECOGNITION_EXERCISES`, `REMEDIATION_EXERCISES`, `REVIEW_EXERCISES`, `NEW_MATERIAL_EXERCISES`). They can never be selected. | Content files may tag sentences with these types, but the scheduler will never pick them because no pool contains them. | **Remove from `ExerciseType` union** unless exercise UI components exist for them. If they exist in content `exercise_types` arrays, remove those tags too. |
| **F-007** | major | broken | `weekly-sprint/graduation` | Three different graduation/mastery criteria across the codebase: (1) `isMastered`: rawScore ≥ threshold AND confidence ≥ 0.7 AND attempts ≥ min AND days ≥ min. (2) `isGraduated` (weekly-sprint.ts): rawScore ≥ threshold AND attempts ≥ min (no confidence, no days). (3) `buildWeeklyCheckItems` grad filter: endScore ≥ threshold only. | A concept can graduate the weekly sprint without meeting `isMastered`. The weekly check includes "last-week graduates" that may not actually be mastered. | **Unify.** Weekly sprint graduation should use `isMastered()` from `fingerprint.ts` — it's the authoritative gate. `isGraduated` in `weekly-sprint.ts` and the grad filter in `weekly-check.ts` should both delegate to `isMastered()`. |

### OPEN — Minor (backlog)

| ID | Severity | Category | Component | What's wrong | Recommended fix |
|---|---|---|---|---|---|
| **F-004** | minor | disconnected | `fingerprint/errorPatterns` | `ErrorPattern.rootCauseConceptId` and `rootCauseConfidence` are declared but `aggregateErrorPatterns` never populates them. The diagnosis engine (`runDiagnosis`) produces `DiagnosisResult[]` separately but doesn't write back to patterns. | Wire `runDiagnosis` output into `aggregateErrorPatterns`, or remove the optional fields. |
| **F-006** | minor | disconnected | `session/minNewVocabItems` | `SessionRecipe.minNewVocabItems` is declared (default 3) but `generateSession` never reads it. The scheduler's new-material slot count comes purely from `totalItems * newMaterialRatio`. | Enforce the minimum in the scheduler (add a `Math.max(counts.newMaterial, recipe.minNewVocabItems)` line), or remove the field. |
| **F-008** | minor | disconnected | `useFingerprint/levelProgression` | Level-up logic only exists for A1→A2 (`checkA1Complete`). No `checkA2Complete` or `checkB1Complete`. Users must manually change level via LevelSelector after A2. | Implement `checkA2Complete` and `checkB1Complete` that mirror `checkA1Complete` using the respective graphs. Or document that level-up after A2 is manual-only and add a dashboard prompt. |

---

## 3. Cross-Cutting Observations (non-finding, informational)

- **`recordExposure` float contamination:** Increments `attemptCount` by `0.3` (a float). `closeWeek` computes `attempts` as `m.attemptCount - snapshot.attemptCount`, producing non-integer attempt counts in weekly records. Not a failure but worth rounding.
- **`primaryFocus: 'general-review'`:** When no weak or new concepts exist, the scheduler sets `primaryFocus` to the string `'general-review'` — not a concept ID. Downstream UI that uses this as a lookup key finds nothing. Harmless but misleading.
- **Supabase sync is fire-and-forget:** All `saveFingerprintToSupabase` calls use `.catch(console.warn)`. Sync failures are silent. Not a correctness issue (IndexedDB is the source of truth) but users who rely on cross-device sync could lose data without knowing.

---

## 4. Execution Plan

### Phase 1 — DONE
- [x] **F-001:** `getGraphForLevel` type-safe, B2→B1 honest, exhaustive switch
- [x] **F-001b:** Diagnostic A2 cap removed, B1 reachable from placement

### Phase 2 — Major findings (estimated: 2-3 hours)
Execute in this order (each is independent, can parallelize):

| Step | Finding | Files touched | Effort |
|---|---|---|---|
| 2a | F-002: Wire `productionGap` | `useFingerprint.ts`, `fingerprint.ts` | 15 min |
| 2b | F-003: Remove `vocabularyMastery` | `fingerprint.ts` types, `createEmptyFingerprint` | 10 min |
| 2c | F-005: Remove dead exercise types | `session.ts` type, content JSON files | 20 min |
| 2d | F-007: Unify graduation gate | `weekly-sprint.ts`, `weekly-check.ts` | 30 min |

After each step: run `npx vitest run` + `npx tsc --noEmit` to verify.

### Phase 3 — Minor findings (backlog, not blocking)
| Step | Finding | Effort |
|---|---|---|
| 3a | F-004: Wire diagnosis → error patterns | 20 min |
| 3b | F-006: Enforce minNewVocabItems | 10 min |
| 3c | F-008: Level progression A2→B1, B1→B2 | 45 min |

---

## 5. Harness Artifacts

| File | Purpose |
|---|---|
| `tests/audit/helpers.ts` | Shared factories: fingerprints, mastery, sentence pools, finding types |
| `tests/audit/A-fingerprint-contract.test.ts` | 29 tests: structure, seeding, mastery, decay, SRS, phases, scheduler reads |
| `tests/audit/B-scheduler-oppgaver.test.ts` | 16 tests: fingerprint-driven sessions, passed exclusion, level isolation, recipe, reasons |
| `tests/audit/C-weekly-progress.test.ts` | 15 tests: focus selection, open/close lifecycle, abandonment, weekly check items, sync |
| `tests/audit/D-end-to-end-proof.test.ts` | 9 tests: single-session proof, multi-session mastery, weekly cycle, cross-session suppression, level transition, error accumulation, B2 isolation |
| `tests/audit/generate-report.ts` | Report generator: reads vitest JSON, classifies findings, outputs MD + JSON |

Run the harness: `npx vitest run tests/audit`
Generate report: `npx tsx tests/audit/generate-report.ts`
