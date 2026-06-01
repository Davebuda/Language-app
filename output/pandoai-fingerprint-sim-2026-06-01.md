# NorskCoach — Engine Simulation: 4 Learners × 7 Days

**Date:** 2026-06-01  
**Harness:** `output/fp-sim.ts` (run via `npx tsx`)  
**Method:** REAL engine pure functions (fingerprint.ts, scheduler.ts, weekly-sprint.ts, diagnosis.ts, repair-from-surface.ts) + REAL corpus loader + REAL concept graphs. Mock clock + seeded RNG + replicated `recordResult` glue.

**Weak-concept accuracy:** 35% correct (~65% wrong). **Other concepts:** 85% correct.

## Harness approximations (honesty — what is NOT pure engine)

- **[A1] `recordResult` glue** replicated from `src/hooks/useFingerprint.ts:272-367` (mastery → logError → aggregateErrorPatterns → computeProductionGap → passedSentenceIds). Level-progression branches (A1→A2…) omitted (no full-level mastery in 7 days).
- **[A2] errorTag = `classifyError(userAnswer, correctAnswer, exerciseType, errorTagsDetectable)`** — production-faithful (post-E3 A1). All four wired components (FillInBlank, WordOrder, Translation, SpeedRound) now use the observed-diff classifier instead of the old authored-positional `errorTagsDetectable[0]`. The classifier defers to authored candidate tags on murky diffs and emits `unspecified`/candidate (never an invented grammar tag) on English-output types. conceptId = `item.conceptIds[0]` (scheduler-assigned, correct).
- **[A3] Mock clock** overrides global `Date` so engine-internal `new Date()`/`Date.now()` (decay, srsNextReviewAt, getReviewDueConcepts) see simulated time.
- **[A4] Learner correctness** is a seeded Bernoulli draw per concept (weak vs base accuracy). The learner model, not the engine.
- **[A5] Item→sentence resolution** mirrors `useSession.resolveItem` (concept pool, level filter, exclude-passed for non-review). We run the **lær block** (recipe-driven, corpus-consuming core); lytt/snakk blocks are not run.
- **[A6] Seeded `Math.random`** for reproducible scheduler shuffle/interleaving.
- **Force-unlock:** prereq-gated weak concepts (e.g. `svo-word-order` needs `personal-pronouns`+`present-tense-regular`) had their prerequisites seeded to mastered so the weak concept is not `locked` from day 0. Per-user forced unlocks listed below.

---

## USER: A1-wordorder (A1) — weak on svo-word-order, v2-word-order

Sessions/day: 2. Forced-unlock prereqs (harness): present-tense-regular, to-be-verb, personal-pronouns, svo-word-order.

### Scheduler focus on the weak concept (lær block)

| Day | lær items | weak-concept scheduled | weak share of lær | focus-concept share | weeklyFocus |
|---|---|---|---|---|---|
| 1 | 34 | 5 | 15% | 47% | v2-word-order, noun-gender, numbers-basic |
| 2 | 34 | 2 | 6% | 32% | v2-word-order, noun-gender, numbers-basic |
| 3 | 33 | 3 | 9% | 36% | v2-word-order, noun-gender, numbers-basic |
| 4 | 32 | 4 | 13% | 25% | v2-word-order, noun-gender, numbers-basic |
| 5 | 29 | 6 | 21% | 28% | v2-word-order, noun-gender, numbers-basic |
| 6 | 27 | 9 | 33% | 33% | v2-word-order, noun-gender, numbers-basic |
| 7 | 30 | 8 | 27% | 30% | v2-word-order, noun-gender, numbers-basic |

### Timeline — `svo-word-order` (WEAK)

| Day | rawScore | decayedScore | phase | SRS lvl | nextReview | attempts | classification |
|---|---|---|---|---|---|---|---|
| 0 | 90 | 90 | maintenance | 3 | 06-15 | 35.0 | mastered |
| 1 | 90 | 90 | maintenance | 3 | 06-15 | 35.0 | mastered |
| 2 | 90 | 89 | maintenance | 3 | 06-15 | 35.0 | mastered |
| 3 | 90 | 87 | maintenance | 3 | 06-15 | 35.0 | mastered |
| 4 | 90 | 86 | maintenance | 3 | 06-15 | 35.0 | mastered |
| 5 | 81 | 81 | consolidation | 0 | 06-06 | 37.0 | mastered |
| 6 | 29 | 29 | practice | 0 | 06-07 | 41.0 | weak |
| 7 | 59 | 59 | practice | 1 | 06-10 | 45.0 | weak |

### Timeline — `v2-word-order` (WEAK)

| Day | rawScore | decayedScore | phase | SRS lvl | nextReview | attempts | classification |
|---|---|---|---|---|---|---|---|
| 0 | 45 | 45 | intro | 0 | 06-02 | 1.0 | weak |
| 1 | 60 | 60 | practice | 0 | 06-02 | 6.0 | learning |
| 2 | 75 | 75 | consolidation | 2 | 06-09 | 8.0 | learning |
| 3 | 38 | 38 | practice | 0 | 06-04 | 11.0 | weak |
| 4 | 45 | 45 | practice | 0 | 06-05 | 15.0 | weak |
| 5 | 59 | 59 | practice | 2 | 06-12 | 19.0 | weak |
| 6 | 47 | 47 | locked | 1 | 06-09 | 24.0 | weak |
| 7 | 26 | 26 | locked | 0 | 06-08 | 28.0 | weak |

### Timeline — `noun-gender`

| Day | rawScore | decayedScore | phase | SRS lvl | nextReview | attempts | classification |
|---|---|---|---|---|---|---|---|
| 0 | 55 | 55 | intro | 0 | 06-02 | 1.0 | weak |
| 1 | 89 | 89 | maintenance | 0 | 06-02 | 7.0 | passed-score |
| 2 | 87 | 87 | maintenance | 0 | 06-03 | 11.0 | passed-score |
| 3 | 92 | 92 | maintenance | 4 | 07-03 | 16.0 | mastered |
| 4 | 88 | 88 | maintenance | 0 | 06-05 | 18.0 | mastered |
| 5 | 90 | 90 | maintenance | 2 | 06-12 | 20.0 | mastered |
| 6 | 92 | 92 | maintenance | 4 | 07-06 | 22.0 | mastered |
| 7 | 94 | 94 | maintenance | 4 | 07-07 | 24.0 | mastered |

### Timeline — `personal-pronouns`

| Day | rawScore | decayedScore | phase | SRS lvl | nextReview | attempts | classification |
|---|---|---|---|---|---|---|---|
| 0 | 90 | 90 | maintenance | 3 | 06-15 | 35.0 | mastered |
| 1 | 90 | 90 | maintenance | 3 | 06-15 | 35.0 | mastered |
| 2 | 90 | 89 | maintenance | 3 | 06-15 | 35.0 | mastered |
| 3 | 90 | 87 | maintenance | 3 | 06-15 | 35.0 | mastered |
| 4 | 90 | 86 | maintenance | 3 | 06-15 | 35.0 | mastered |
| 5 | 92 | 92 | maintenance | 4 | 07-05 | 37.0 | mastered |
| 6 | 92 | 90 | maintenance | 4 | 07-05 | 37.0 | mastered |
| 7 | 92 | 89 | maintenance | 4 | 07-05 | 37.0 | mastered |

### Timeline — `to-be-verb`

| Day | rawScore | decayedScore | phase | SRS lvl | nextReview | attempts | classification |
|---|---|---|---|---|---|---|---|
| 0 | 90 | 90 | maintenance | 3 | 06-15 | 35.0 | mastered |
| 1 | 90 | 90 | maintenance | 3 | 06-15 | 35.0 | mastered |
| 2 | 90 | 89 | maintenance | 3 | 06-15 | 35.0 | mastered |
| 3 | 90 | 87 | maintenance | 3 | 06-15 | 35.0 | mastered |
| 4 | 90 | 86 | maintenance | 3 | 06-15 | 35.0 | mastered |
| 5 | 92 | 92 | maintenance | 4 | 07-05 | 37.0 | mastered |
| 6 | 92 | 90 | maintenance | 4 | 07-05 | 37.0 | mastered |
| 7 | 92 | 89 | maintenance | 4 | 07-05 | 37.0 | mastered |

### Cross-surface coherence (journal error via `repairFromSurface`) on `svo-word-order`

- Concept rawScore: 59 → 44 (attempts 45.0 → 46.0)
- Error logged under concept: `svo-word-order`, errorTag: `word-order`
- Same concept as session? **YES**

### Concept-mastery vs error-TAG on weak-concept failures (Q5)

Wrong answers on weak concepts: 23. Concept attribution (from `item.conceptIds[0]`) vs logged tag (from `errorTagsDetectable[0]`):

| concept (correctly attributed) → logged errorTag | count |
|---|---|
| v2-word-order → tag:word-order | 16 |
| svo-word-order → tag:word-order | 7 |

### `runDiagnosis` output (final fingerprint)

| root cause | confidence | focus |
|---|---|---|
| v2-word-order | 0.45 | mechanics |

`getPrimaryWeakConcepts` top-10 (weakest first): v2-word-order, svo-word-order, adjective-agreement, to-have-verb, preterite-regular, preterite-irregular-core, common-prepositions, plural-formation, present-tense-regular, personal-pronouns

---

## USER: A2-articles (A2) — weak on superlative-adjectives

Sessions/day: 2. Forced-unlock prereqs (harness): personal-pronouns, noun-gender, to-be-verb, numbers-basic, common-prepositions, indefinite-articles, plural-formation, definite-articles-singular, definite-articles-plural, present-tense-regular, infinitive-form, to-have-verb, svo-word-order, v2-word-order, negation, question-formation, basic-adjectives, adjective-agreement, common-modal-verbs, preterite-regular, preterite-irregular-core, possessive-pronouns, comparative-adjectives.

### Scheduler focus on the weak concept (lær block)

| Day | lær items | weak-concept scheduled | weak share of lær | focus-concept share | weeklyFocus |
|---|---|---|---|---|---|
| 1 | 26 | 6 | 23% | 65% | superlative-adjectives, perfect-tense, future-constructions |
| 2 | 26 | 6 | 23% | 58% | superlative-adjectives, perfect-tense, future-constructions |
| 3 | 26 | 4 | 15% | 46% | superlative-adjectives, perfect-tense, future-constructions |
| 4 | 26 | 6 | 23% | 54% | superlative-adjectives, perfect-tense, future-constructions |
| 5 | 26 | 4 | 15% | 46% | superlative-adjectives, perfect-tense, future-constructions |
| 6 | 26 | 4 | 15% | 31% | superlative-adjectives, perfect-tense, future-constructions |
| 7 | 25 | 7 | 28% | 44% | superlative-adjectives, perfect-tense, future-constructions |

### Timeline — `superlative-adjectives` (WEAK)

| Day | rawScore | decayedScore | phase | SRS lvl | nextReview | attempts | classification |
|---|---|---|---|---|---|---|---|
| 0 | 45 | 45 | intro | 0 | 06-02 | 1.0 | weak |
| 1 | 29 | 29 | practice | 1 | 06-04 | 7.0 | weak |
| 2 | 20 | 20 | practice | 0 | 06-03 | 13.0 | weak |
| 3 | 20 | 20 | practice | 0 | 06-04 | 17.0 | weak |
| 4 | 17 | 17 | practice | 0 | 06-05 | 23.0 | weak |
| 5 | 25 | 25 | practice | 0 | 06-06 | 27.0 | weak |
| 6 | 27 | 27 | practice | 0 | 06-07 | 31.0 | weak |
| 7 | 52 | 52 | practice | 2 | 06-14 | 38.0 | weak |

### Timeline — `indefinite-articles`

| Day | rawScore | decayedScore | phase | SRS lvl | nextReview | attempts | classification |
|---|---|---|---|---|---|---|---|
| 0 | 90 | 90 | maintenance | 3 | 06-15 | 35.0 | mastered |
| 1 | 90 | 90 | maintenance | 3 | 06-15 | 35.0 | mastered |
| 2 | 90 | 89 | maintenance | 3 | 06-15 | 35.0 | mastered |
| 3 | 90 | 87 | maintenance | 3 | 06-15 | 35.0 | mastered |
| 4 | 90 | 86 | maintenance | 3 | 06-15 | 35.0 | mastered |
| 5 | 90 | 84 | maintenance | 3 | 06-15 | 35.0 | mastered |
| 6 | 90 | 83 | maintenance | 3 | 06-15 | 35.0 | mastered |
| 7 | 90 | 82 | maintenance | 3 | 06-15 | 35.0 | mastered |

### Timeline — `definite-articles-singular`

| Day | rawScore | decayedScore | phase | SRS lvl | nextReview | attempts | classification |
|---|---|---|---|---|---|---|---|
| 0 | 90 | 90 | maintenance | 3 | 06-15 | 35.0 | mastered |
| 1 | 90 | 90 | maintenance | 3 | 06-15 | 35.0 | mastered |
| 2 | 90 | 89 | maintenance | 3 | 06-15 | 35.0 | mastered |
| 3 | 90 | 87 | maintenance | 3 | 06-15 | 35.0 | mastered |
| 4 | 90 | 86 | maintenance | 3 | 06-15 | 35.0 | mastered |
| 5 | 90 | 84 | maintenance | 3 | 06-15 | 35.0 | mastered |
| 6 | 90 | 83 | maintenance | 3 | 06-15 | 35.0 | mastered |
| 7 | 90 | 82 | maintenance | 3 | 06-15 | 35.0 | mastered |

### Timeline — `perfect-tense`

| Day | rawScore | decayedScore | phase | SRS lvl | nextReview | attempts | classification |
|---|---|---|---|---|---|---|---|
| 0 | 55 | 55 | intro | 0 | 06-02 | 1.0 | weak |
| 1 | 86 | 86 | maintenance | 4 | 07-01 | 7.0 | passed-score |
| 2 | 87 | 87 | maintenance | 2 | 06-09 | 12.0 | passed-score |
| 3 | 85 | 85 | maintenance | 0 | 06-04 | 16.0 | passed-score |
| 4 | 86 | 86 | maintenance | 2 | 06-11 | 20.0 | passed-score |
| 5 | 87 | 87 | maintenance | 3 | 06-19 | 25.0 | mastered |
| 6 | 83 | 83 | consolidation | 0 | 06-07 | 27.0 | mastered |
| 7 | 87 | 87 | maintenance | 2 | 06-14 | 29.0 | mastered |

### Timeline — `conjunctions`

| Day | rawScore | decayedScore | phase | SRS lvl | nextReview | attempts | classification |
|---|---|---|---|---|---|---|---|
| 0 | 55 | 55 | intro | 0 | 06-02 | 1.0 | weak |
| 1 | 55 | 55 | intro | 0 | 06-02 | 1.0 | weak |
| 2 | 84 | 84 | intro | 2 | 06-09 | 3.0 | passed-score |
| 3 | 84 | 83 | intro | 2 | 06-09 | 3.0 | passed-score |
| 4 | 84 | 81 | intro | 2 | 06-09 | 3.0 | passed-score |
| 5 | 84 | 80 | intro | 2 | 06-09 | 3.0 | passed-score |
| 6 | 84 | 79 | intro | 2 | 06-09 | 3.0 | passed-score |
| 7 | 84 | 78 | intro | 2 | 06-09 | 3.0 | passed-score |

### Cross-surface coherence (journal error via `repairFromSurface`) on `superlative-adjectives`

- Concept rawScore: 52 → 39 (attempts 38.0 → 39.0)
- Error logged under concept: `superlative-adjectives`, errorTag: `adjective-agreement`
- Same concept as session? **YES**

### Concept-mastery vs error-TAG on weak-concept failures (Q5)

Wrong answers on weak concepts: 27. Concept attribution (from `item.conceptIds[0]`) vs logged tag (from `errorTagsDetectable[0]`):

| concept (correctly attributed) → logged errorTag | count |
|---|---|
| superlative-adjectives → tag:adjective-agreement | 27 |

### `runDiagnosis` output (final fingerprint)

| root cause | confidence | focus |
|---|---|---|
| superlative-adjectives | 0.45 | mechanics |

`getPrimaryWeakConcepts` top-10 (weakest first): superlative-adjectives, conditional-clauses, numerals-advanced, conjunctions, imperative, personal-pronouns, noun-gender, to-be-verb, numbers-basic, common-prepositions

---

## USER: B1-listening (B1) — weak on discourse-markers

Sessions/day: 1. Forced-unlock prereqs (harness): personal-pronouns, noun-gender, to-be-verb, numbers-basic, common-prepositions, indefinite-articles, plural-formation, definite-articles-singular, definite-articles-plural, present-tense-regular, infinitive-form, to-have-verb, svo-word-order, v2-word-order, negation, question-formation, basic-adjectives, adjective-agreement, common-modal-verbs, preterite-regular, preterite-irregular-core, possessive-pronouns, perfect-tense, future-constructions, passive-voice, comparative-adjectives, superlative-adjectives, reflexive-verbs, object-pronouns, subordinate-clauses, relative-clauses, conjunctions, advanced-prepositions, time-expressions, modal-verbs-advanced, preterite-irregular-advanced, indirect-speech, conditional-clauses, sentence-adverbials, genitive, infinitive-clauses, word-formation, numerals-advanced, imperative.

### Scheduler focus on the weak concept (lær block)

| Day | lær items | weak-concept scheduled | weak share of lær | focus-concept share | weeklyFocus |
|---|---|---|---|---|---|
| 1 | 10 | 2 | 20% | 90% | discourse-markers, past-perfect, present-participle |
| 2 | 10 | 1 | 10% | 50% | discourse-markers, past-perfect, present-participle |
| 3 | 10 | 2 | 20% | 60% | discourse-markers, past-perfect, present-participle |
| 4 | 10 | 1 | 10% | 50% | discourse-markers, past-perfect, present-participle |
| 5 | 10 | 4 | 40% | 80% | discourse-markers, past-perfect, present-participle |
| 6 | 10 | 1 | 10% | 50% | discourse-markers, past-perfect, present-participle |
| 7 | 10 | 4 | 40% | 80% | discourse-markers, past-perfect, present-participle |

### Timeline — `discourse-markers` (WEAK)

| Day | rawScore | decayedScore | phase | SRS lvl | nextReview | attempts | classification |
|---|---|---|---|---|---|---|---|
| 0 | 45 | 45 | intro | 0 | 06-02 | 1.0 | weak |
| 1 | 56 | 56 | intro | 1 | 06-04 | 3.0 | weak |
| 2 | 34 | 34 | intro | 0 | 06-03 | 4.0 | weak |
| 3 | 15 | 15 | practice | 0 | 06-04 | 6.0 | weak |
| 4 | 11 | 11 | practice | 0 | 06-05 | 7.0 | weak |
| 5 | 39 | 39 | practice | 1 | 06-08 | 11.0 | weak |
| 6 | 29 | 29 | practice | 0 | 06-07 | 12.0 | weak |
| 7 | 54 | 54 | practice | 2 | 06-14 | 16.0 | weak |

### Timeline — `past-perfect`

| Day | rawScore | decayedScore | phase | SRS lvl | nextReview | attempts | classification |
|---|---|---|---|---|---|---|---|
| 0 | 55 | 55 | intro | 0 | 06-02 | 1.0 | weak |
| 1 | 80 | 80 | consolidation | 2 | 06-08 | 5.0 | passed-score |
| 2 | 86 | 86 | maintenance | 4 | 07-02 | 7.0 | passed-score |
| 3 | 82 | 82 | consolidation | 0 | 06-04 | 9.0 | passed-score |
| 4 | 78 | 78 | consolidation | 1 | 06-07 | 11.0 | learning |
| 5 | 84 | 84 | consolidation | 3 | 06-19 | 13.0 | passed-score |
| 6 | 87 | 87 | maintenance | 4 | 07-06 | 15.0 | passed-score |
| 7 | 89 | 89 | maintenance | 4 | 07-07 | 17.0 | passed-score |

### Timeline — `phrasal-verbs`

| Day | rawScore | decayedScore | phase | SRS lvl | nextReview | attempts | classification |
|---|---|---|---|---|---|---|---|
| 0 | 55 | 55 | intro | 0 | 06-02 | 1.0 | weak |
| 1 | 55 | 55 | intro | 0 | 06-02 | 1.0 | weak |
| 2 | 73 | 73 | intro | 1 | 06-05 | 2.0 | learning |
| 3 | 73 | 72 | intro | 1 | 06-05 | 2.0 | learning |
| 4 | 73 | 71 | intro | 1 | 06-05 | 2.0 | learning |
| 5 | 73 | 70 | intro | 1 | 06-05 | 2.0 | learning |
| 6 | 90 | 90 | intro | 3 | 06-20 | 4.0 | passed-score |
| 7 | 66 | 66 | practice | 0 | 06-08 | 5.0 | learning |

### Timeline — `cleft-sentences`

| Day | rawScore | decayedScore | phase | SRS lvl | nextReview | attempts | classification |
|---|---|---|---|---|---|---|---|
| 0 | 55 | 55 | intro | 0 | 06-02 | 1.0 | weak |
| 1 | 73 | 73 | intro | 1 | 06-04 | 2.0 | learning |
| 2 | 84 | 84 | intro | 2 | 06-09 | 3.0 | passed-score |
| 3 | 90 | 90 | intro | 3 | 06-17 | 4.0 | passed-score |
| 4 | 66 | 66 | practice | 0 | 06-05 | 5.0 | learning |
| 5 | 75 | 75 | consolidation | 1 | 06-08 | 6.0 | learning |
| 6 | 75 | 74 | consolidation | 1 | 06-08 | 6.0 | learning |
| 7 | 75 | 73 | consolidation | 1 | 06-08 | 6.0 | learning |

### Cross-surface coherence (journal error via `repairFromSurface`) on `discourse-markers`

- Concept rawScore: 54 → 41 (attempts 16.0 → 17.0)
- Error logged under concept: `discourse-markers`, errorTag: `wrong-word-same-category`
- Same concept as session? **YES**

### Concept-mastery vs error-TAG on weak-concept failures (Q5)

Wrong answers on weak concepts: 10. Concept attribution (from `item.conceptIds[0]`) vs logged tag (from `errorTagsDetectable[0]`):

| concept (correctly attributed) → logged errorTag | count |
|---|---|
| discourse-markers → tag:wrong-word-same-category | 9 |
| discourse-markers → tag:word-order | 1 |

### `runDiagnosis` output (final fingerprint)

| root cause | confidence | focus |
|---|---|---|
| discourse-markers | 0.45 | mechanics |

`getPrimaryWeakConcepts` top-10 (weakest first): discourse-markers, formal-informal-register, present-participle, phrasal-verbs, idiomatic-expressions, indirect-questions, cleft-sentences, double-definite, complex-subordination, personal-pronouns

---

## USER: B2-cohesion (B2) — weak on text-cohesion, complex-argumentation

Sessions/day: 1. Forced-unlock prereqs (harness): personal-pronouns, noun-gender, to-be-verb, numbers-basic, common-prepositions, indefinite-articles, plural-formation, definite-articles-singular, definite-articles-plural, present-tense-regular, infinitive-form, to-have-verb, svo-word-order, v2-word-order, negation, question-formation, basic-adjectives, adjective-agreement, common-modal-verbs, preterite-regular, preterite-irregular-core, possessive-pronouns, perfect-tense, future-constructions, passive-voice, comparative-adjectives, superlative-adjectives, reflexive-verbs, object-pronouns, subordinate-clauses, relative-clauses, conjunctions, advanced-prepositions, time-expressions, modal-verbs-advanced, preterite-irregular-advanced, indirect-speech, conditional-clauses, sentence-adverbials, genitive, infinitive-clauses, word-formation, numerals-advanced, imperative, past-perfect, present-participle, cleft-sentences, s-passive-vs-bli-passive, subjunctive-equivalents, discourse-markers, phrasal-verbs, double-definite, complex-subordination, formal-informal-register, idiomatic-expressions, indirect-questions, complex-argumentation.

### Scheduler focus on the weak concept (lær block)

| Day | lær items | weak-concept scheduled | weak share of lær | focus-concept share | weeklyFocus |
|---|---|---|---|---|---|
| 1 | 10 | 3 | 30% | 80% | complex-argumentation, academic-writing, nuanced-register |
| 2 | 10 | 2 | 20% | 70% | complex-argumentation, academic-writing, nuanced-register |
| 3 | 10 | 1 | 10% | 50% | complex-argumentation, academic-writing, nuanced-register |
| 4 | 10 | 1 | 10% | 50% | complex-argumentation, academic-writing, nuanced-register |
| 5 | 10 | 3 | 30% | 60% | complex-argumentation, academic-writing, nuanced-register |
| 6 | 10 | 1 | 10% | 50% | complex-argumentation, academic-writing, nuanced-register |
| 7 | 10 | 1 | 10% | 50% | complex-argumentation, academic-writing, nuanced-register |

### Timeline — `text-cohesion` (WEAK)

| Day | rawScore | decayedScore | phase | SRS lvl | nextReview | attempts | classification |
|---|---|---|---|---|---|---|---|
| 0 | 45 | 45 | locked | 0 | 06-02 | 1.0 | weak |
| 1 | 67 | 67 | locked | 1 | 06-04 | 2.0 | learning |
| 2 | 67 | 66 | locked | 1 | 06-04 | 2.0 | learning |
| 3 | 67 | 65 | locked | 1 | 06-04 | 2.0 | learning |
| 4 | 67 | 65 | locked | 1 | 06-04 | 2.0 | learning |
| 5 | 80 | 80 | locked | 2 | 06-12 | 3.0 | passed-score |
| 6 | 80 | 79 | locked | 2 | 06-12 | 3.0 | passed-score |
| 7 | 80 | 78 | locked | 2 | 06-12 | 3.0 | passed-score |

### Timeline — `complex-argumentation` (WEAK)

| Day | rawScore | decayedScore | phase | SRS lvl | nextReview | attempts | classification |
|---|---|---|---|---|---|---|---|
| 0 | 45 | 45 | intro | 0 | 06-02 | 1.0 | weak |
| 1 | 40 | 40 | intro | 0 | 06-02 | 3.0 | weak |
| 2 | 38 | 38 | practice | 0 | 06-03 | 5.0 | weak |
| 3 | 54 | 54 | practice | 1 | 06-06 | 6.0 | weak |
| 4 | 41 | 41 | practice | 0 | 06-05 | 7.0 | weak |
| 5 | 42 | 42 | practice | 0 | 06-06 | 9.0 | weak |
| 6 | 57 | 57 | practice | 1 | 06-09 | 10.0 | weak |
| 7 | 43 | 43 | practice | 0 | 06-08 | 11.0 | weak |

### Timeline — `discourse-markers`

| Day | rawScore | decayedScore | phase | SRS lvl | nextReview | attempts | classification |
|---|---|---|---|---|---|---|---|
| 0 | 90 | 90 | maintenance | 3 | 06-15 | 35.0 | mastered |
| 1 | 90 | 90 | maintenance | 3 | 06-15 | 35.0 | mastered |
| 2 | 90 | 89 | maintenance | 3 | 06-15 | 35.0 | mastered |
| 3 | 90 | 87 | maintenance | 3 | 06-15 | 35.0 | mastered |
| 4 | 90 | 86 | maintenance | 3 | 06-15 | 35.0 | mastered |
| 5 | 90 | 84 | maintenance | 3 | 06-15 | 35.0 | mastered |
| 6 | 90 | 83 | maintenance | 3 | 06-15 | 35.0 | mastered |
| 7 | 90 | 82 | maintenance | 3 | 06-15 | 35.0 | mastered |

### Timeline — `academic-writing`

| Day | rawScore | decayedScore | phase | SRS lvl | nextReview | attempts | classification |
|---|---|---|---|---|---|---|---|
| 0 | 55 | 55 | intro | 0 | 06-02 | 1.0 | weak |
| 1 | 56 | 56 | practice | 1 | 06-04 | 5.0 | weak |
| 2 | 50 | 50 | practice | 0 | 06-03 | 7.0 | weak |
| 3 | 72 | 72 | consolidation | 2 | 06-10 | 9.0 | learning |
| 4 | 80 | 80 | consolidation | 4 | 07-04 | 11.0 | passed-score |
| 5 | 86 | 86 | maintenance | 4 | 07-05 | 13.0 | passed-score |
| 6 | 82 | 82 | consolidation | 0 | 06-07 | 15.0 | passed-score |
| 7 | 78 | 78 | consolidation | 1 | 06-10 | 17.0 | learning |

### Cross-surface coherence (journal error via `repairFromSurface`) on `text-cohesion`

- Concept rawScore: 80 → 48 (attempts 3.0 → 4.0)
- Error logged under concept: `text-cohesion`, errorTag: `reading-parsing`
- Same concept as session? **YES**

### Concept-mastery vs error-TAG on weak-concept failures (Q5)

Wrong answers on weak concepts: 5. Concept attribution (from `item.conceptIds[0]`) vs logged tag (from `errorTagsDetectable[0]`):

| concept (correctly attributed) → logged errorTag | count |
|---|---|
| complex-argumentation → tag:word-order | 5 |

### `runDiagnosis` output (final fingerprint)

| root cause | confidence | focus |
|---|---|---|
| reported-speech-advanced | 0.45 | mechanics |

`getPrimaryWeakConcepts` top-10 (weakest first): reported-speech-advanced, complex-argumentation, text-cohesion, advanced-verb-forms, professional-norwegian, norwegian-idioms, academic-writing, advanced-word-order, personal-pronouns, noun-gender

