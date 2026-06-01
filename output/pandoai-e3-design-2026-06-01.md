# E3 Design — Concept-Aware Diagnosis + Tag-Mismatch Fix (2026-06-01)

Analysis-first design (architect lane) for E3 = **Both**. Implementation is gated on the 4 user decisions at the bottom. No code written yet.

## ⚠️ Premise correction (grep-verified this session)
The E3 architect claimed `computeProductionGap` is dead (zero runtime callers). **That is wrong** — `grep` confirms it IS called at runtime in `recordResult` (`src/hooks/useFingerprint.ts:318`; line 310 comment: "Previously computeProductionGap was never called…" = recently wired). Part 4's sim correction was right.
**What this changes:** the live diagnosis is NOT silent. Diagnosis **rule 2 (production-gap) fires in production**, but on a LOW-SIGNAL `productionGap` (computed from a tag-polluted error log), so it names the WRONG concept — matching the sim. So the real defect is "rule 2 fires with weak/biased input," not "no diagnosis." This makes **E4 (gate/strengthen the production-gap rule) more relevant**, and the new fallback rule (B1 below) sits *below* rule 2.

## Two separable defects
- **Defect A — tag mismatch:** wrong answers attributed to `errorTagsDetectable[0]` in Translation + SpeedRound (FillInBlank + WordOrder already use the observed-diff `classifyError`), plus some authored tags are themselves wrong. Corrupts error log → error patterns → productionGap → rule-2 attribution + repair-explanation targeting.
- **Defect B — diagnosis quality:** rules 1/3/4 rarely fire; rule 2 fires on weak signal → wrong root cause. The concept-mastery layer (`item.conceptIds[0]` attribution, decayedScore) is CORRECT (sim-proven) but nothing surfaces it as a root cause.

## Verified load-bearing facts
- **Concept→valid-tags map already exists:** `ConceptNode.errorTags` in every graph JSON (`concepts.ts:13`, `a1-graph.json:14,26…`). Serves as BOTH the validator (Defect A) and an attribution source (Defect B). No new authoring.
- **`classify-error.ts` exists** and is wired into FillInBlank (`:49,135`) + WordOrder (`:68`); NOT into Translation (`TranslationExercise.tsx:90`) or SpeedRound (`SpeedRound.tsx:64`).
- **Diagnosis does NOT drive scheduling** (scheduler uses `getPrimaryWeakConcepts`/decayedScore, `scheduler.ts:140`). Blast radius of changing diagnosis = the dashboard card + repair explanation copy ONLY. Low risk.
- **Sim harness uses `authoredErrorTag`** (`fp-sim.ts:326`), not `classifyError` → current sim can't show A1's fix and over-represents rule 2. Harness fidelity fix is acceptance-critical.

## Engine side (Defect B) — per-rule verdict
| Rule (`diagnosis.ts`) | Verdict |
|---|---|
| 1 article+adj→noun-gender (`:16-39`) | **Stays tag-based** — genuine cross-concept inference; no mastery proxy. |
| 2 production-gap (`:40-57`) | **Stays** — it's LIVE (correction above); its weak signal is an E4 concern (gate it). |
| 3 listening (`:58-79`) | **Stays tag-based** — needs `listening-recognition` channel; no mastery proxy. |
| 4 word-order-in-context (`:80-107`) | **Stays tag+exerciseType-based** — context-vs-drill distinction. |
| **5 NEW concept-mastery-fallback** | **Add, additive, low confidence (~0.45)** — when no targeted rule fires strongly, name the weakest evidenced concept (`getPrimaryWeakConcepts`, attempts≥5, decayed<50). Honest copy ("din svakeste flate nå", NOT a fabricated "root cause" — Rule 6). Coexists via existing confidence sort (`:119`); never outranks a real rule. ~30 lines, one file. `runDiagnosis(fingerprint)` signature unchanged.|
No existing rule converts. Reject blending diagnosis into scheduling (Rule 1 breadth + risk).

## Content side (Defect A)
- **A1 (mechanical, high-leverage):** wire `classifyError(userAnswer, correct, exerciseType, candidateTags)` into Translation + SpeedRound (mirror existing wired call sites). Makes RUNTIME tags correct wherever a diff is observable, regardless of authored tag. Caveat: for translation-to-english/SpeedRound (English output), classifier must defer to candidate tags / `unspecified`, not invent grammar tags on English (it already defers on murky diffs — verify in trace).
- **A2 (script + linguist):** detection script flags sentences whose `errorTagsDetectable` (esp. `[0]`) isn't in the union of their concepts' `ConceptNode.errorTags`. Read-only report first → quantify scope (sample suggests systematic per-concept mis-tags: superlative-adjectives→adjective-agreement, complex-argumentation→word-order, discourse-markers→wrong-word; est. 10–30% of multi-concept/higher-CEFR sentences — RUN the script to get the real number). Fix workflow: corrections to **staging** (never edit live JSON directly) → **norwegian-linguist review (blocking)** → finalize-deepen gate → seed.

## Acceptance
1. **Harness fidelity (prerequisite):** update `fp-sim.ts` to use real `classifyError` (not `authoredErrorTag`); handle rule 2 to match prod.
2. **Engine:** re-run sim → 4/4 users get a `rootCauseConceptId` inside their TRUE weak set (A1 svo/v2-word-order; A2 superlative-adjectives; B1 discourse-markers; B2 text-cohesion/complex-argumentation), confidence ordering preserved (targeted rule > fallback).
3. **Tags:** detection script mismatch count → ~0 for re-tagged levels; linguist sign-off recorded.
4. **No-regression:** zero scheduler-output drift; journal `repairFromSurface` coherence checks still pass; full suite green.

## Sequencing (within E3)
A1 (wire classifier) → B1 (fallback rule) → harness fidelity fix → re-run sim (ENGINE GATE: 4/4) → A2 (detection report → linguist-gate → seed). **E4 separate, after E3** (gate the production-gap rule; touches recordResult + scheduler switch — higher blast radius; once live, rule 2 may outrank the fallback for production-gap users — intended).
**Do NOT touch:** scheduler recipe, `getPrimaryWeakConcepts`/decay, rules 1/3/4, live corpus JSON (staging only), and don't merge E4 into E3.

## Risk flags
- `classifyError` defers to `candidateTags[0]` on murky diffs → on mis-tagged sentences it can still emit a wrong tag → A2 is still needed after A1 (A1 ≠ full fix).
- Fallback copy must not overclaim "root cause" (Rule 6).
- Without the harness fix, a green sim is a false pass.

## BLOCKING decisions (user)
1. **B1 additive fallback** (recommended) vs converting an existing rule — confirm rules 1/3/4 stay unchanged.
2. **A-min** (wire classifier + detection-report first, then linguist-gated re-tag — recommended) vs **A-max** (full corpus re-tag first).
3. **Harness fidelity fix** OK (change `fp-sim.ts` to real `classifyError`; handle rule 2)?
4. **Re-tag scope:** all 4 levels vs B1/B2 only (where mismatches are worst + corpus thinnest)?
