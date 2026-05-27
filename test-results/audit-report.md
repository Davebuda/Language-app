# Fingerprint-First Audit Report

**Generated:** 2026-05-26T21:51:55.210Z
**Verdict:** PASS

## Chain Verification

| Chain Link | Status |
|---|---|
| Fingerprint chain intact | PASS |
| Daily oppgaver level-aware | PASS |
| Passed items suppressed | PASS |
| Weekly progress real | PASS |

## Test Summary

- **Total tests:** 69
- **Passed:** 69
- **Failed:** 0
- **Pass rate:** 100%

### A-fingerprint-contract
29 passed / 0 failed

### B-scheduler-oppgaver
16 passed / 0 failed

### C-weekly-progress
15 passed / 0 failed

### D-end-to-end-proof
9 passed / 0 failed

## Known Findings (Static Analysis)

### F-001: B2 level falls through to A1 graph in getGraphForLevel — silent substitution
- **Category:** broken
- **Severity:** critical
- **Component:** concept-graph-loader
- **Evidence:** getGraphForLevel("B2") returns a1Graph via default case. B2 users see A1 content.
- **Fix:** Add explicit B2 case that either returns a B2 graph or throws. Make parameter type CEFRLevel, not string. Add exhaustive switch check.

### F-002: productionGap field is never written — always empty object
- **Category:** disconnected
- **Severity:** major
- **Component:** fingerprint/productionGap
- **Evidence:** computeProductionGap exists but is never called by recordResult or any hook. productionGap stays as {} forever. Scheduler reads it but always gets 0.
- **Fix:** Call computeProductionGap in recordResult after error logging, or remove the field and scheduler references to avoid false advertising.

### F-003: vocabularyMastery field declared but never read or written
- **Category:** disconnected
- **Severity:** major
- **Component:** fingerprint/vocabularyMastery
- **Evidence:** VocabularyClusterMastery type exists. createEmptyFingerprint initializes it as {}. No function in the engine touches it.
- **Fix:** Remove the field or implement vocabulary tracking. Dead schema creates false expectations.

### F-004: ErrorPattern.rootCauseConceptId is never populated
- **Category:** disconnected
- **Severity:** minor
- **Component:** fingerprint/errorPatterns
- **Evidence:** aggregateErrorPatterns generates patterns but never sets rootCauseConceptId or rootCauseConfidence. Diagnosis engine runs separately but does not write back to patterns.
- **Fix:** Either wire diagnosis output into error patterns or remove the fields.

### F-005: Three exercise types (dictation, reading-comprehension, free-writing) are declared but can never be scheduled
- **Category:** fake
- **Severity:** major
- **Component:** session/exerciseTypes
- **Evidence:** ExerciseType union includes them. No scheduler pool (PRODUCTION_EXERCISES, RECOGNITION_EXERCISES, etc.) contains them. They are dead variants.
- **Fix:** Remove from ExerciseType or add to appropriate scheduler pool.

### F-006: SessionRecipe.minNewVocabItems is declared (default 3) but never enforced
- **Category:** disconnected
- **Severity:** minor
- **Component:** session/minNewVocabItems
- **Evidence:** DEFAULT_SESSION_RECIPE sets minNewVocabItems: 3. generateSession never reads this field.
- **Fix:** Enforce in scheduler or remove to avoid false documentation.

### F-007: Three different graduation/mastery criteria exist — inconsistent gates
- **Category:** broken
- **Severity:** major
- **Component:** weekly-sprint/graduation
- **Evidence:** isMastered: rawScore+confidence+attempts+days. isGraduated: rawScore+attempts (no confidence). buildWeeklyCheckItems grad filter: endScore only (no attempts). A concept can graduate weekly sprint without meeting isMastered.
- **Fix:** Unify to a single mastery gate, or explicitly document why each gate differs.

### F-008: Level progression only implemented for A1→A2 — no A2→B1 or B1→B2
- **Category:** disconnected
- **Severity:** minor
- **Component:** useFingerprint/levelProgression
- **Evidence:** checkA1Complete in useFingerprint.ts triggers A2 promotion. No equivalent for A2→B1 exists.
- **Fix:** Implement checkA2Complete and checkB1Complete, or document that level-up is manual only after A2.

## Fix Plan (priority order)

### Phase 1 — Critical (same day)
- [ ] F-001: Add explicit B2 case that either returns a B2 graph or throws. Make parameter type CEFRLevel, not string. Add exhaustive switch check.

### Phase 2 — Major (this week)
- [ ] F-002: Call computeProductionGap in recordResult after error logging, or remove the field and scheduler references to avoid false advertising.
- [ ] F-003: Remove the field or implement vocabulary tracking. Dead schema creates false expectations.
- [ ] F-005: Remove from ExerciseType or add to appropriate scheduler pool.
- [ ] F-007: Unify to a single mastery gate, or explicitly document why each gate differs.

### Phase 3 — Minor (backlog)
- [ ] F-004: Either wire diagnosis output into error patterns or remove the fields.
- [ ] F-006: Enforce in scheduler or remove to avoid false documentation.
- [ ] F-008: Implement checkA2Complete and checkB1Complete, or document that level-up is manual only after A2.
