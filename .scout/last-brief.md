# Scout Brief: NorskCoach Phase-3 — B2 lexical track decisions

**Date:** 2026-06-02 · **Run mode:** focused (3 decision lanes) · **Keys:** perplexity/Exa fell back to WebSearch/WebFetch (confidence tagged).
**Purpose:** settle three Phase-3 architecture decisions (vocab data model, exercise design, lexical metrics) with evidence before building. Supersedes the recommendation section of `output/phase-3-per-level-analysis.md`.

---

## TL;DR — decisions resolved by evidence
- **D1 vocab data model → Option C**, with a strict activation gate. Change `VocabularyClusterMastery.knownWordCount: number` → `activatedWordIds: string[]`; keep `score` on the existing cluster EMA; **no FSRS** (premature). An honest coverage meter *requires* a reference lemma list (denominator) + an id set (numerator) — a raw count is a Rule-6 fake. [Confirmed]
- **D2 exercise types → conjugation-drill FIRST, nuance-discrimination second** — and nuance CAN be production-weighted (forced sentence-write wrap), resolving its north-star tension. [Confirmed]
- **D3 start → Slice 3.1 (content ingestion) gated by the `norwegian-linguist` agent.** Source is hand-authored, so the gate is mostly extraction-verification + derived-distractor review. [Confirmed]
- **Bonus:** the "ord du ikke lenger bommer på" meter has an evidence-backed honest formula that maps onto the existing engine (decayedScore + srsLevel + production-flag + prior-miss). [Confirmed]

---

## D1 — Vocabulary mastery data model (Lane: vocab-models)
All five reference apps use **per-word state**: Anki/FSRS (Difficulty+Stability+Retrievability), LingQ (status 1–4→Known), Clozemaster (per-sentence proxying per-word), Duolingo HLR (per-word half-life), Memrise (8-rung ladder). [Confirmed]

An honest coverage meter needs **two** things: a **reference lemma list** (denominator) and an **activated-word-id set** (numerator). LingQ's merged "Known" counter is the cautionary tale — untraceable, non-exportable. [Confirmed]

| Option | Honest meter? | New algo? | Storage Δ | Verdict |
|---|---|---|---|---|
| A cluster-count-only (`knownWordCount`) | no backing set | no | 0 | **ruled out (Rule 6)** |
| B full per-word FSRS/EMA | yes | yes (new dimension) | ~0.6–1.2MB | premature — secondary track, no users |
| **C cluster EMA + `activatedWordIds[]`** | yes | no (reuses EMA) | ~30KB | **CHOSEN — additive, upgrades to B later** |

`score` (EMA) drives scheduling; `activatedWordIds` drives the meter — independent concerns. `ts-fsrs` is the tool *if/when* a dedicated per-word vocab review surface + real users justify it. [Inferred]

## Lexical-coverage metric — honest "words you no longer miss" (Lane: lexical-metrics)
Vanity-metric pitfalls to avoid: never-decreases, increments on passive exposure, counts word *forms* not lemmas, self-declared, no difficulty floor, receptive-counter-as-production-proxy. (Duolingo XP / LingQ self-declare = the failure cases; Clozemaster can-go-down + Anki downward-trending retention = the trust models.) [Confirmed]

**Activation gate (maps onto existing engine fields):** a word/lemma counts only when —
| Gate | Value |
|---|---|
| prior miss | ≥1 logged error (you must have *missed* it — "no longer" needs a "was") |
| production | ≥1 production-flagged correct (not recognition) |
| spaced survival | `srsLevel ≥ 2` |
| mastery | `decayedScore ≥ 70` (auto-exits on decay — the count can go DOWN) |
| unit | **lemma level, not forms** (Norwegian inflection inflates forms 40–60%); show denominator "X av ~Y lemmaer" |

v1 may relax to the cheapest honest subset (miss + production-correct + cluster-level decay); full per-word `srsLevel/decayedScore` gating is the Option-B upgrade. Nation's coverage thresholds (95%/98%) are the conceptual frame. [Confirmed]

## D2 — Exercise design + build order (Lane: exercise-design)
- **Type-the-form > pick-the-form** for retention (short-answer beats MCQ, g≈0.77). Group Norwegian strong verbs by **ablaut/pattern class** (e.g. trekke→trakk→trukket), drill within-class, then mix in review. Unit shape: **INTRO (forms shown) → GUIDED MCQ within-class → PRODUCTION type-the-form → CLOSE carrier-sentence**. Carrier sentence on the success screen, not as the cue. [Confirmed]
- **Nuance-discrimination is documented whitespace** (no mainstream app does it). Make it honest + productive: contrastive-pair presentation → gap-fill with *plausible* distractors → **forced production wrap** (write a sentence using the word, graded by presence+length like `gradeReadRespond`) → one-line contrast rule on wrong ("påpeke = state directly; antyde = imply"). Converts recognition into controlled→free production. [Confirmed]
- **Production wins at B2** (Swain output hypothesis; productive retrieval builds both productive+receptive, receptive builds only receptive). Recognition items belong in the **30% review slot, not the 40% remediation slot** — both new types must honour the existing `PRODUCTION_EXERCISES` boundary. [Confirmed]
- **Build order: conjugation-drill FIRST** — deterministic grading (`checkAnswer`), near-zero renderer work (fill-in-blank variant), mechanical extraction from the source's conjugation tables, no AI. **nuance-discrimination second** — linguist-gated distractors, new MCQ+context renderer, production-wrap grading; verb-form mastery is a prerequisite for synonym choice. [Confirmed]

---

## Resulting build sequence (refined from the analysis doc)
1. **3.1 Content ingestion** — parse `norsk_b2_hverdagsord.md` → clusters/words(+conjugation tables, irregular flag, ablaut class)/carrier-sentences → mechanical validation → **`norwegian-linguist` gate** → seed.
2. **3.2 `vocabularyMastery` = Option C** + the activation gate (pure helpers + tests; reference lemma list from corpus).
3. **3.3 conjugation-drill** — fill-in-blank-variant renderer, `checkAnswer` grader, ablaut-class grouping, production brick + `vocabularyMastery` write, Rule-8 trace.
4. **3.4 B2 lexical wall lens** — `LENS_CONFIG.B2` → "ord du ikke lenger bommer på" meter (reads `activatedWordIds` ∩ reference list); retire the interim note.
5. **3.5 scheduler vocab pool** — analysis-first; vocab items honour PRODUCTION_EXERCISES + the 40/30 boundary.
6. **3.6 nuance-discrimination** — contrastive + forced-production wrap; distractors linguist-gated.

## Conflicts
None material. Lane 1 (Option C, cluster EMA) and Lane 3 (per-word gate) reconcile: the *data model* is cluster-level + id-set (C); the *activation gate* uses per-word signals where cheaply available, full per-word state is the B upgrade.

## Sources
~30+ across three lanes (Anki/FSRS docs, LingQ forums, Clozemaster, Duolingo HLR/ACL2016, Conjuguemos, Nation lexical-coverage research, Swain output hypothesis, Teng & Xu 2025, desirable-difficulty literature). Key claims tagged inline.
