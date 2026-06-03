# Phase 3 — Per-Level Progression: Implementation Analysis

**Status:** ANALYSIS ONLY (Operating Rule 2) — no code. Awaiting approval of the path + the open decisions below.
**Date:** 2026-06-02
**Inputs:** `docs/per-level-progression-proposal.md` (APPROVED — the *what*), the shipped ProductionWall + brick engine, `~/Downloads/norsk_b2_hverdagsord.md` (B2 source), `src/types/fingerprint.ts` (`VocabularyClusterMastery` exists, unused), `src/types/session.ts` (`ExerciseType` union + `NOT_YET_AVAILABLE_TYPES` phantom guard).

---

## 1. What Phase 3 still needs (current-state delta)

The approved proposal's *what* is partly already shipped. Honest delta:

| Proposal element | State | Remaining |
|---|---|---|
| Differentiated daily/weekly **tracker UI** | ✅ DONE (ProductionWall, all-levels lenses) | — |
| B1 **production-weighting** (via `productionGap`) | ✅ wired (Move 1) | optional: make the weekly rollup metric level-true (A1 "graduated", A2 "connector error-rate↓") vs the current generic rollup |
| A1 foundations / A2 combinations lens | ✅ render exists | metric precision (low priority) |
| **B2 lexical track** — vocab clusters + irregular-verb sets corpus | ❌ not started | **the core of Phase 3** |
| `vocabularyMastery` wired (read + write) | ❌ exists, unused | data model + write/read paths |
| **conjugation-drill** exercise type | ❌ phantom-free (not in union) | renderer + grader + scoring + scheduler |
| **nuance-discrimination** exercise type | ❌ not in union | renderer + distractors (linguist-gated) |
| B2 wall lens → real "words you no longer miss" meter | ❌ (currently production + interim note) | lens swap once `vocabularyMastery` populated |
| B2 scheduler weighting (vocab/morphology pool) | ❌ | scheduler extension |

**Conclusion:** Phase 3 ≈ **the B2 lexical track** (content + `vocabularyMastery` + 2 exercise types + lens swap + scheduler). A1/A2/B1 are essentially served by what shipped. This is multi-slice, content+engine+UI — **not a single build**, and the content half is linguist-gated.

---

## 2. Open architectural decisions (each: options → recommendation)

### D1 — `vocabularyMastery` granularity
- **A. Cluster-only (existing shape):** `{clusterId, score, knownWordCount, totalWordCount}`. Simplest, fits the type as-is. A correct vocab answer bumps the cluster's `knownWordCount`/`score`. *Con:* a count, not a set — can't say *which* words you still miss, so no per-word repair/SRS.
- **B. Per-word mastery (new field):** track each target word like `conceptMastery` (EMA, SRS, error log). Richest — enables the diagnosis moat at word level + per-word spaced review. *Con:* a real new data model + storage; biggest build.
- **C. (RECOMMENDED) Cluster + activated-word set:** `{clusterId, score, activatedWordIds: string[], totalWordCount}`. The meter shows a real count AND knows which words; repair targets the cluster (or the word's carrier sentence). Honest "N of M words activated" without full per-word SRS. Upgrade to B later if the moat needs per-word scheduling.
- **Recommend C** — honest lexical meter now, leaves the per-word-SRS door open. (Note: this changes the existing `VocabularyClusterMastery` type — a schema bump, back-compat default.)

### D2 — The 2 new exercise types: scope + order
Hard rule: **one type at a time, shipped WITH a renderer** (never added to the union as a phantom).
- **conjugation-drill (FIRST):** show `infinitiv` (+ optional context sentence) → learner types `presens / preteritum / perfektum`. **Production** type. Grader = deterministic (compare to the source's conjugation table — zero AI). Error-tag = a morphology tag (`verb-conjugation`/`irregular-verb`). Brick weight = `production`. North-star aligned, AI-down-proof. The source's full conjugation tables make this nearly free to author.
- **nuance-discrimination (SECOND):** context sentence with a gap → pick the right shade among near-synonyms (antyde/påpeke/benekte). **Recognition** type → brick weight `recognition`. *Tension:* recognition contradicts the production north-star, and distractors need linguist design. Mitigation: wrap with a short "now use it" production follow-up, or accept it as a review-only lexical type. **Flag for decision when we reach it.**
- **Recommend:** ship conjugation-drill first (production, deterministic, clean); treat nuance-discrimination as a separate later slice with its north-star tension resolved before build.

### D3 — Content ingestion + the linguist gate
The source is **hand-authored, B2-quality, and richly structured** (themes→clusters, bold target words, conjugation tables, irregular markers, glosses) — the *lowest-AI-risk* content path in the project.
- Pipeline: parse `norsk_b2_hverdagsord.md` → structured JSON (`clusters[]`, `words[]` with conjugations+irregular flag, `sentences[]` with carrier+gloss+targetWord) → **mechanical validation** (schema, conjugation completeness) → **`norwegian-linguist` agent pass** (the hard rule — even on hand-authored content: verify extraction fidelity + any DERIVED content like nuance distractors or cloze gaps) → seed.
- The carrier sentences are pre-authored so the linguist pass is mostly *extraction verification* + *derived-content review*, not full authoring. Modest size (~58 sentences, ~5–6 clusters in the sample — confirm full file count).
- **Non-negotiable:** nothing seeds live without the linguist pass (memory: mechanical gate alone passes only ~11–34% real-quality Norwegian).

### D4 — B2 wall lens swap
Once `vocabularyMastery` is populated, `LENS_CONFIG.B2` shifts from *production-reuse + interim note* → a real **"ord du ikke lenger bommer på"** meter: hero = activated words across clusters (`Σ activatedWordIds`), wall bricks = cluster coverage, weekly = lexical-coverage growth. Removes the interim note. Contained UI change — but **only after** the data exists (until then, today's honest interim note stays — do not swap early, Rule 6).

### D5 — Scheduler integration (the hardest engine piece)
Vocab clusters are **not graph concepts**; the scheduler is concept-driven. Options:
- **A. Parallel vocab pool:** a new selection path that picks vocab/conjugation items by cluster and interleaves them into the B2 session (e.g. a "Ord" block). Cleaner B2 identity; more scheduler surgery.
- **B. Fold into the `lær` block:** treat each cluster as a pseudo-concept the existing recipe can select. Less surgery; muddies the concept model.
- **Recommend A** but **defer the decision** — it's only needed once conjugation-drill + content exist (Slices 1–2 don't need it). Analysis-first again at that point.

---

## 3. Recommended sequencing (smallest-first, each independently shippable + gated)

| Slice | Scope | Gate before ship |
|---|---|---|
| **3.1 Content ingestion** | Parser → structured B2 vocab JSON (clusters/words/sentences); mechanical validation. No engine/UI. | `norwegian-linguist` agent pass (extraction fidelity) |
| **3.2 `vocabularyMastery` (Decision C)** | Schema bump + pure write/read helpers + unit tests. No UI. | code-review (engine-honesty) |
| **3.3 conjugation-drill** | Union (+renderer, not phantom) + deterministic grader + error-tag + `vocabularyMastery` write + scheduler hook. | code-review + Rule-8 trace (a correct drill writes a real mastery brick) |
| **3.4 B2 lexical wall lens** | `LENS_CONFIG.B2` → "words you no longer miss" meter (reads `vocabularyMastery`); retire the interim note. | frontend gate + render |
| **3.5 scheduler vocab pool (D5)** | Analysis-first → vocab items enter B2 sessions honestly. | code-review |
| **3.6 nuance-discrimination** | Only after its north-star tension (D2) is resolved; distractors linguist-gated. | linguist + code-review |

Honesty rails throughout: no live content without the linguist pass; every vocab "brick" = a real `vocabularyMastery` write (Rule 8); the B2 interim note stays until 3.4 lands (no premature lexical-meter claim).

---

## 4. Risk / scope flags

- **Multi-session arc**, not one autopilot. Each slice is analysis→build→verify with its own gate.
- **Linguist gate is mandatory and runnable** via the `norwegian-linguist` agent — but it's a real review step, not a rubber stamp (could flag/rewrite).
- **nuance-discrimination is recognition-leaning** — resolve the north-star tension before building it (D2), or it weakens the moat at exactly the level (B2) that most needs production.
- **`VocabularyClusterMastery` schema change** (Decision C) touches a persisted fingerprint field — back-compat default + no-throw on legacy, same discipline as the `bricks` tally.
- **Confirm the full source size** (sample showed ~14 entries across 2 themes; the proposal cited 58 sentences) before estimating ingestion effort.

---

## 5. The decisions I need from you before any build
1. **D1 granularity:** C (cluster + activated-word set) — agree, or want full per-word (B)?
2. **D2 order:** conjugation-drill first, nuance-discrimination deferred — agree?
3. **Start point:** begin at **Slice 3.1 (content ingestion + linguist gate)** — agree, or a different entry?
4. Confirm I should run the `norwegian-linguist` agent as the content gate (vs you reviewing manually).

No code until these are settled.
