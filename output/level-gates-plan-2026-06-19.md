# Plan: Level-Appropriateness Gates (p6) — per-level contract + remediate-at-level

> make-plan-pro · 2026-06-19 · HEAD `f3d9056` · rail phase **p6** (active)
> Grounded in: audit (`output/level-gates-strategy-2026-06-19.md`) + scout (`.scout/last-brief.md`).
> Decisions locked: **remediate-at-level (CD-CAT-backed)** · **generate-at-level on empty pools** · **hybrid multi-skill tagging (TS auto-derive + linguist spot-gate)**.

## Context
- **Intent:** Stop serving sub-level exercises (a B2 learner getting A1 listen-and-translate). Diagnose foundational weaknesses but practice them *inside level-appropriate content*; gate AI generation to at-level; expose content debt.
- **Stack:** next 15.3.2 / react 19.1 / TS strict / vitest 4.1.5 / tsx 4.21 (build scripts). **No Python/spaCy** — auto-derivation is TS.
- **Patterns leveraged:** offline build script (`scripts/build-gender-map.ts` → committed `src/lib/*`); Norsk ordbank lexicon already in repo (gitignored `.tmp/ordbank/` source → `gender-map.ts`); standing `audit:gate`/`audit:corpus`; deterministic-verifier discipline (gender verifier).
- **Key discovery:** `Sentence.conceptIds: string[]` already exists → the Q-matrix is **content enrichment, not a schema change**. No `MistakeFingerprint` field added → **no Rule-3 migration** for the tagging itself.

## Phase 0 — Discovery Summary
- `filterSentencesByLevel` (`scheduler.ts:16`) = ceiling only. `firstEligibleType` (`scheduler.ts:177`) applies it, no difficulty floor.
- `getPrimaryWeakConcepts` (`diagnosis.ts:180`) ranks by `decayedScore`, no level floor — weak A1 roots enter a B2 learner's focus.
- `availableSentenceIds: conceptId → sentenceIds` built from each sentence's `conceptIds`. **If B1/B2 sentences aren't tagged with the foundational concepts they exercise, the weak-concept pool holds only low-level sentences → the leak.**
- `Sentence`: `{conceptIds[], errorTagsDetectable[], cefrLevel, difficulty:1|2|3, exerciseTypes[]}` (`content.ts:7`). `difficulty` is **never read** in selection.
- Generation: `validateGenerated` (`validate.ts:204`) checks length, **not** level-fit. Corpus listening: 99 A1 / 114 A2 / 1 B1 / **0 B2**.
- Live corpus: `content/sentences/{a1,a2,b1,b2}.json`.

## Phases & Tasks (one-sentence-one-diff)

### PHASE B — Per-level Content Contract (the data spine; do first, no behavior change)
**B1 — define the contract module.** Create `src/lib/level-contract.ts` exporting `LEVEL_CONTRACT: Record<CEFRLevel, {difficultyFloor, difficultyCeiling, allowedExerciseTypes, remediationFloorRelax}>` as pure data + a `getLevelContract(level)` accessor. *(files: level-contract.ts new)* — **Verify:** unit test shape + every CEFRLevel present.
**B2 — unit-test the contract invariants.** Add `tests/lib/level-contract.test.ts` asserting floor≤ceiling, allowed types ⊆ real ExerciseTypes, monotonic floors across levels. *(files: level-contract.test.ts new)* — **Verify:** tests green.

### PHASE A — At-level validator + self-calibration (independent; gates generation)
**A1 — corpus signal extractor.** Add `scripts/calibrate-level-signals.ts` (tsx) computing, per live sentence, three signals — lexical-band coverage (Norsk ordbank lemma → Kelly-list level band), LIX, subordinate-clause count — and emit per-level distributions. *(files: calibrate-level-signals.ts new)* — **Verify:** runs over `content/sentences/*.json`, prints per-level signal percentiles.
**A2 — commit calibrated thresholds.** Generate `src/lib/level-signal-thresholds.ts` (committed data, like `gender-map.ts`) holding per-level signal bands derived from A1. *(files: level-signal-thresholds.ts new)* — **Verify:** thresholds monotonic across levels; spot-check A1<B2.
**A3 — deterministic at-level validator.** Add `src/lib/level-validator.ts` `validateAtLevel(text, targetLevel) → {atLevel, signalsExceeded}` rejecting only when ≥2 of 3 signals exceed the target band. *(files: level-validator.ts new)* — **Verify:** unit test — known A1 sentence passes at A1, known B2 sentence flagged above-level at A1, "Jeg vil ha kaffe" flagged above-level at... (it's at/below B2 → passes B2 but is below B2 floor — see A4).
**A4 — wire into generation validation.** In `validateGenerated` (`validate.ts:204`) add an `validateAtLevel` call against the requested level; on fail → `{valid:false}` (→ existing null/Repetisjon path). *(files: validate.ts)* — **Verify:** integration test — a generated under/over-level string is rejected; existing valid path unchanged; `validateNorwegianOutput` untouched.
**A5 — license gate (BLOCKING sub-task).** Verify the UiO Kelly-list file header license (CC BY-SA 4.0 vs older NC) before committing any derived list; if NC, fall back to corpus-self-calibration only (no redistributed list). *(files: docs note)* — **Verify:** license recorded in the data file header.

### PHASE C — Multi-skill tagging (the Q-matrix; the big lift, hybrid)
**C1 — per-concept detectors.** Add `src/lib/concept-detectors.ts` — one deterministic predicate per grammar concept (e.g. personal-pronouns: sentence contains a personal pronoun via ordbank POS; subordinate-clause: contains a subjunction) returning the concepts a sentence *exercises*. *(files: concept-detectors.ts new)* — **Verify:** unit test on 10 hand-labeled sentences (precision-focused; under-tag rather than over-tag).
**C2 — auto-derive enrichment script.** Add `scripts/derive-multiskill-tags.ts` (tsx) that reads live corpus, runs detectors, and writes a *proposed* enriched `conceptIds` per sentence to a staging file (never the live corpus directly). *(files: derive-multiskill-tags.ts new)* — **Verify:** dry-run emits a staging diff; counts of added tags per level reported.
**C3 — linguist spot-gate.** Run `norwegian-linguist` over a sampled slice of the staging diff (per memory `project_content_gen_gate_insufficient`: never seed without a linguist pass); record pass-rate; correct detectors if precision <90%. *(files: staging review)* — **Verify:** linguist report attached; detectors tuned to ≥90% precision before merge.
**C4 — merge enriched tags into the live corpus.** Apply the gated staging enrichment to `content/sentences/{b1,b2}.json` (higher-level sentences gain the foundational concepts they exercise); A1/A2 unchanged. *(files: content/sentences/b1.json, b2.json)* — **Verify:** `npm run audit:corpus` still 0 ERRORS; `availableSentenceIds['personal-pronouns']` now includes B2 sentence ids (asserted in a test).

### PHASE D — Scheduler remediation floor-relaxation (the payoff; needs B + C)
**D1 — at-level remediation selection.** In `firstEligibleType` (`scheduler.ts:177`), for remediation/weak-concept selection, prefer sentences whose `difficulty`/`cefrLevel` sit in the learner's level band (from `getLevelContract`) over lower-level ones — ceiling unchanged, floor added. *(files: scheduler.ts)* — **Verify:** unit test — B2 learner weak on personal-pronouns gets a B2-tagged pronoun sentence, not an A1 one, when one exists.
**D2 — comprehensibility escape hatch.** When the learner repeatedly fails the simplest at-level item loading the weak skill (track via recentOutcomes on that concept), relax the floor one level for that concept's next remediation (ALEKS "ready-to-learn fringe"). *(files: scheduler.ts)* — **Verify:** unit test — repeated-fail state relaxes the floor; single fail does not. (Confirm no new fingerprint field; derive from existing `recentOutcomes`. If a field is needed → Rule-3 fixture + `normalizeFingerprint`.)
**D3 — diagnosis weak-concept level note (optional).** Confirm `getPrimaryWeakConcepts` still surfaces low-level weak concepts (we do NOT drop them — remediate-at-level keeps them); add only a comment clarifying the floor lives in selection, not in concept eligibility. *(files: diagnosis.ts)* — **Verify:** no behavior change; comment only.

### PHASE E — Corpus-audit extension + empty-pool policy (needs B + A)
**E1 — coverage map audit.** Extend `scripts/audit-corpus.ts` to report coverage per (level × exerciseType × concept) and flag empty cells (e.g. B2 × listening-comprehension = 0) as tracked debt WARNs. *(files: audit-corpus.ts)* — **Verify:** `audit:corpus` lists the B2-listening gap as a WARN with a count.
**E2 — empty-pool generate-then-disable.** Where a gated pool is empty, route to at-level generation (validated by A3/A4); on generation failure, honest-disable that type at that level (Rule 6) — never silent A1 fallback. *(files: useSession.ts and/or scheduler block-drop logic)* — **Verify:** integration test — empty B2 listening → generation attempt → on fail, the LYTT block is dropped honestly (existing empty-block-drop path), no A1 substitution.

## Dependency Graph
| Phase | Depends on | Parallel-safe with | Shared-file note |
|---|---|---|---|
| B (contract) | none | A, C | isolated new files |
| A (validator) | A2←A1; A4←A3 | B, C | A4 edits `validate.ts` (isolated) |
| C (tagging) | C2←C1; C3←C2; C4←C3 | A, B | C4 edits corpus json (isolated) |
| D (scheduler) | **B, C** | — | D1/D2 share `scheduler.ts` → serialize |
| E (audit+pool) | **B, A** | — (after B,A) | E1 `audit-corpus.ts`; E2 `useSession.ts` |

**Build order:** **B → A → C → D → E.** B is the spine; A is independently valuable + needed by E; C is the big content lift + unblocks D; D is the payoff; E closes the loop + exposes debt. Each phase ships + verifies independently (HARD RAIL #1: one move at a time).

## Subagent Handoffs (5-field, per phase)
```yaml
phase_B: {intent: "Per-level contract data module (difficulty bands + allowed types + remediation floor-relax), pure data + accessor, no behavior change", slug: p6-b-contract, status: READY_FOR_BUILD, artifacts: [src/lib/level-contract.ts (create), tests/lib/level-contract.test.ts (create)], constraints: {forbidden: ["no fingerprint field","no scheduler edits yet"], time_budget: 25}}
phase_A: {intent: "Deterministic at-level validator self-calibrated on our corpus; gate AI generation to at-level. License-verify Kelly list first.", slug: p6-a-validator, status: READY_FOR_BUILD, artifacts: [scripts/calibrate-level-signals.ts, src/lib/level-signal-thresholds.ts, src/lib/level-validator.ts, src/ai/validate.ts], constraints: {forbidden: ["no LLM-trust validation","do not loosen validateNorwegianOutput","verify Kelly license before redistributing"], time_budget: 60}}
phase_C: {intent: "Hybrid multi-skill tagging: TS detectors auto-derive contributing concepts, linguist spot-gate ≥90% precision, merge into b1/b2 corpus conceptIds.", slug: p6-c-tagging, status: READY_FOR_BUILD, artifacts: [src/lib/concept-detectors.ts, scripts/derive-multiskill-tags.ts, content/sentences/b1.json, content/sentences/b2.json], constraints: {forbidden: ["never write live corpus before linguist gate","under-tag over over-tag","audit:corpus must stay 0 ERRORS"], time_budget: 90}}
phase_D: {intent: "Scheduler remediation prefers at-level sentences exercising the weak concept (floor-relaxation), with a comprehensibility escape hatch. Ceiling unchanged.", slug: p6-d-scheduler, status: READY_FOR_BUILD, artifacts: [src/engine/scheduler.ts, src/engine/diagnosis.ts], constraints: {forbidden: ["do not drop low-level weak concepts (keep the diagnosis)","no new fingerprint field unless Rule-3 fixture extended","serialize D1/D2 on scheduler.ts"], time_budget: 50}}
phase_E: {intent: "Audit coverage per level×type×concept as debt; empty gated pool → generate-at-level then honest-disable (never silent A1 fallback).", slug: p6-e-audit-pool, status: READY_FOR_BUILD, artifacts: [scripts/audit-corpus.ts, src/hooks/useSession.ts], constraints: {forbidden: ["no silent substitution (Rule 6)","reuse existing empty-block-drop path"], time_budget: 45}}
```

## Verification Strategy
- Every phase: `npm run audit:gate` AUDIT-CLEAN before claiming done.
- Phases A/B/C/D: new unit tests (pure functions: contract, validator, detectors, selection).
- Phase C: linguist spot-gate report (≥90% detector precision) before corpus merge.
- Phase D: **live returning-user Playwright trace** (Rule 3) — seed a B2 learner weak on a foundational concept, confirm the session now serves a B2-tagged sentence exercising it (the exact case audited today), 4-width screenshots.
- Phase E: confirm the B2-listening empty cell is reported as debt and that an empty pool honest-disables (no A1 leak).

## Open Risks
- **R1 (license, blocking A):** Kelly-list NC clause would block redistribution → fall back to corpus-self-calibration only.
- **R2 (detector precision, C):** heuristic detectors may over-tag, polluting the Q-matrix → linguist gate + under-tag bias + ≥90% precision threshold before merge.
- **R3 (pool starvation, D):** at-level floor may empty a weak-concept pool if no at-level sentence exercises it yet → escape hatch (D2) + generate-at-level (E2) + the audit (E1) surfaces the gap for authoring.
- **R4 (Python temptation):** scout suggested spaCy (Python) — rejected for this Node repo; detectors are TS reusing Norsk ordbank. Revisit only if heuristic precision is unreachable.
- **R5 (Rule 3):** D2's escape hatch should derive from existing `recentOutcomes`; if any new fingerprint field is required, extend `normalizeFingerprint` + the returning-user fixture.
- **R6 (scope):** C is the largest lift (corpus-wide); if linguist throughput is the bottleneck, ship B+A+D-with-existing-tags first and let C land incrementally per-concept.

## Estimated Scope
- New files: ~7 (contract, validator, thresholds, detectors, 2 scripts, tests). Modified: scheduler.ts, validate.ts, diagnosis.ts, audit-corpus.ts, useSession.ts, b1/b2 corpus.
- Phases: 5 · Tasks: ~16 · Build order B→A→C→D→E, each independently shippable.
