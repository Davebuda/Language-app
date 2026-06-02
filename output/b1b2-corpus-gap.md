# B1/B2 Corpus Gap Analysis — deepen planning

**Generated:** 2026-06-02  
**Source files:** `content/sentences/b1.json`, `content/sentences/b2.json`, `content/concepts/b1-graph.json`, `content/concepts/b2-graph.json`  
**Target:** ≥ 50 sentences per concept per level  

---

## Executive summary

| Level | Sentences today | Concepts | All below target | Total gap |
|-------|----------------|----------|-----------------|-----------|
| B1    | 369            | 12       | 12 / 12         | **232**   |
| B2    | 360            | 12       | 12 / 12         | **240**   |
| **Combined** | **729** | **24** | **24 / 24**  | **472**   |

Every single concept at both levels is below the 50-sentence target. No concept has reached parity. The existing corpus was built to an earlier target of 30/concept; the deepen work needs to add a uniform top-up across the board, plus create an entirely new exercise type (cloze-passage) from scratch — **zero cloze-passage sentences exist at either level**.

---

## B1 deficit table

Sorted ascending by current count. All 12 concepts flagged BELOW.

| Concept | Current | Needed to hit 50 | Gap | Status |
|---------|---------|-----------------|-----|--------|
| `present-participle` | 29 | 21 | 21 | BELOW |
| `cleft-sentences` | 30 | 20 | 20 | BELOW |
| `s-passive-vs-bli-passive` | 30 | 20 | 20 | BELOW |
| `subjunctive-equivalents` | 30 | 20 | 20 | BELOW |
| `discourse-markers` | 30 | 20 | 20 | BELOW |
| `phrasal-verbs` | 30 | 20 | 20 | BELOW |
| `double-definite` | 30 | 20 | 20 | BELOW |
| `complex-subordination` | 30 | 20 | 20 | BELOW |
| `formal-informal-register` | 30 | 20 | 20 | BELOW |
| `idiomatic-expressions` | 30 | 20 | 20 | BELOW |
| `indirect-questions` | 30 | 20 | 20 | BELOW |
| `past-perfect` | 39 | 11 | 11 | BELOW |

**B1 total sentences needed: 232**

`past-perfect` is the least urgent (39 already, needs only 11 more). `present-participle` is the deepest deficit (29 sentences — 1 sentence below even the old 30-target; the orphan `to-be-verb` sentence discussed below is misfiled here and may account for the -1).

---

## B2 deficit table

Sorted ascending by current count. All 12 concepts identical at 30.

| Concept | Current | Needed to hit 50 | Gap | Status |
|---------|---------|-----------------|-----|--------|
| `academic-writing` | 30 | 20 | 20 | BELOW |
| `nuanced-register` | 30 | 20 | 20 | BELOW |
| `advanced-passive` | 30 | 20 | 20 | BELOW |
| `complex-argumentation` | 30 | 20 | 20 | BELOW |
| `norwegian-idioms` | 30 | 20 | 20 | BELOW |
| `advanced-word-order` | 30 | 20 | 20 | BELOW |
| `reported-speech-advanced` | 30 | 20 | 20 | BELOW |
| `subjunctive-mood` | 30 | 20 | 20 | BELOW |
| `text-cohesion` | 30 | 20 | 20 | BELOW |
| `advanced-verb-forms` | 30 | 20 | 20 | BELOW |
| `stylistic-variation` | 30 | 20 | 20 | BELOW |
| `professional-norwegian` | 30 | 20 | 20 | BELOW |

**B2 total sentences needed: 240**

B2 is a flat 30-across-the-board state — the initial corpus was seeded uniformly and no deepen work has touched it.

---

## Exercise type breakdown

### B1 (369 sentences, `exercise_types` is an array — counts are membership, not sentence count)

| Exercise type | Membership count | Notes |
|--------------|-----------------|-------|
| `fill-in-blank` | 149 | Primary type |
| `translation-to-norwegian` | 147 | Primary type |
| `word-order` | 41 | Minority |
| `translation-to-english` | 34 | Minority |
| `speed-round` | 1 | Near-absent |
| `listening-comprehension` | 1 | Near-absent |
| **`cloze-passage`** | **0** | **MISSING ENTIRELY** |

B1 difficulty distribution: difficulty-1 = 216 (59%), difficulty-2 = 130 (35%), difficulty-3 = 23 (6%).  
No sentence has 2+ concept_ids (all concept_ids arrays are singletons).

### B2 (360 sentences)

| Exercise type | Membership count | Notes |
|--------------|-----------------|-------|
| `fill-in-blank` | 126 | Primary type |
| `translation-to-english` | 116 | Elevated vs B1 (appropriate at B2) |
| `translation-to-norwegian` | 82 | Lower share than B1 |
| `word-order` | 36 | Minority |
| **`cloze-passage`** | **0** | **MISSING ENTIRELY** |

B2 difficulty distribution: difficulty-3 = 360 (100%) — uniformly hard, no difficulty-1 or -2 sentences at all.  
No sentence has 2+ concept_ids.

---

## Cloze-passage gap

**Zero cloze-passage sentences exist at B1 or B2.** The passages directory (`content/passages/`) contains only `a1.json` and `a2.json` — no B1 or B2 passage files exist.

This means the cloze-passage exercise type is entirely absent for intermediate/advanced learners. Per the execution plan, cloze-passages are a priority because:
1. They test contextual comprehension rather than isolated production.
2. They are a differentiating exercise type not covered by the current fill-in-blank/translation split.
3. B1/B2 learners specifically benefit from paragraph-level reading with gap-fill.

Every one of the 24 B1+B2 concepts needs at least one passage file created. Passages live in `content/passages/` (see `a1.json` / `a2.json` for the schema), not in the sentence arrays. Sentences tagged `cloze-passage` in the concept corpus would be the individual gap-fill items extracted from those passages.

---

## Data quality notes

### Orphan concept_id: `to-be-verb`
One B1 sentence (`id: 9be2f508-1e82-42e5-b03d-f60b69b9bffd`, `"Jeg har vært i Norge i tre år, men er fortsatt ikke flytende"`) has `concept_ids: ["to-be-verb"]`. This concept does not exist in the B1 graph — `to-be-verb` is an A1 concept. This sentence is misfiled at B1 and explains why `present-participle` appears to have only 29 sentences (it has 29 proper B1 sentences + this orphan that does not belong to any B1 concept).

**Fix needed:** refile this sentence to A1 or reassign its `concept_ids` to the correct B1 concept (likely `past-perfect` or `present-participle` given the content). This is a 1-sentence data repair, not a deepen task.

### No cross-concept sentences
Every sentence at both levels has exactly one entry in `concept_ids`. For deepen sentences, authoring 2-concept sentences (e.g. `discourse-markers` + `complex-subordination`) would be linguistically natural at B1/B2 and would let 20 new sentences count toward two deficits simultaneously. This is an authoring efficiency opportunity.

### B2 difficulty lock-in
All 360 B2 sentences are difficulty-3. When adding 20 sentences per concept, include a spread: ~8 at difficulty-3, ~8 at difficulty-2, ~4 at difficulty-1 (accessible entry points for learners just entering B2).

---

## Prioritized deepen order

### Priority 1 — Cloze-passage creation (both levels, all concepts)

Cloze-passages are structurally absent. Before topping up sentence counts, create at least one B1 passage file and one B2 passage file in `content/passages/`. Each passage should be 150–300 words, tagged to 2–3 related concepts, with 5–8 blanks. Start with concept clusters that share prerequisites:

**B1 passage clusters (suggested):**
1. `past-perfect` + `present-participle` (narrative text — past event + ongoing action)
2. `s-passive-vs-bli-passive` + `formal-informal-register` (register-switching text)
3. `discourse-markers` + `indirect-questions` (dialogue transcript)
4. `phrasal-verbs` + `idiomatic-expressions` (conversational text)
5. `cleft-sentences` + `complex-subordination` (argumentative paragraph)
6. `double-definite` + `subjunctive-equivalents` + `indirect-questions` (descriptive text)

**B2 passage clusters (suggested):**
1. `academic-writing` + `text-cohesion` (essay excerpt)
2. `complex-argumentation` + `advanced-word-order` (opinion piece)
3. `nuanced-register` + `professional-norwegian` (workplace email chain)
4. `advanced-passive` + `advanced-verb-forms` (news article)
5. `reported-speech-advanced` + `subjunctive-mood` (narrative with embedded speech)
6. `norwegian-idioms` + `stylistic-variation` (literary prose fragment)

### Priority 2 — B1 sentence top-up (sorted by deficit)

| Order | Concept | From → To | Add |
|-------|---------|-----------|-----|
| 1 | `present-participle` | 29 → 50 | 21 |
| 2 | `cleft-sentences` | 30 → 50 | 20 |
| 3 | `s-passive-vs-bli-passive` | 30 → 50 | 20 |
| 4 | `subjunctive-equivalents` | 30 → 50 | 20 |
| 5 | `discourse-markers` | 30 → 50 | 20 |
| 6 | `phrasal-verbs` | 30 → 50 | 20 |
| 7 | `double-definite` | 30 → 50 | 20 |
| 8 | `complex-subordination` | 30 → 50 | 20 |
| 9 | `formal-informal-register` | 30 → 50 | 20 |
| 10 | `idiomatic-expressions` | 30 → 50 | 20 |
| 11 | `indirect-questions` | 30 → 50 | 20 |
| 12 | `past-perfect` | 39 → 50 | 11 |

**B1 subtotal: 232 sentences**

Exercise type distribution to target per new batch of 20:
- 7 × `fill-in-blank`
- 6 × `translation-to-norwegian`
- 4 × `word-order`
- 3 × `translation-to-english`

This brings fill-in-blank and translation-to-norwegian to rough parity and grows word-order (currently thin). Do not add `speed-round` or `listening-comprehension` singles — those were data entry errors in the existing corpus and should be cleaned, not replicated.

### Priority 3 — B2 sentence top-up (all concepts equally at 30)

All 12 B2 concepts need exactly 20 more sentences. Suggested authoring order favours concepts that are prerequisites for other B2 concepts (so early mastery unlocks later scheduling):

| Order | Concept | Prerequisite for |
|-------|---------|-----------------|
| 1 | `academic-writing` | `stylistic-variation`, `professional-norwegian` |
| 2 | `nuanced-register` | `professional-norwegian` |
| 3 | `advanced-passive` | `advanced-verb-forms` |
| 4 | `complex-argumentation` | `text-cohesion` |
| 5 | `advanced-word-order` | (leaf) |
| 6 | `reported-speech-advanced` | (leaf) |
| 7 | `subjunctive-mood` | (leaf) |
| 8 | `norwegian-idioms` | (leaf) |
| 9 | `text-cohesion` | `stylistic-variation` |
| 10 | `advanced-verb-forms` | (leaf) |
| 11 | `stylistic-variation` | (leaf) |
| 12 | `professional-norwegian` | (leaf) |

**B2 subtotal: 240 sentences**

B2 difficulty spread per new batch of 20: 4 × difficulty-1, 8 × difficulty-2, 8 × difficulty-3. (Current B2 corpus is 100% difficulty-3 — no easier entry points exist.)

---

## Total work summary

| Work item | Count |
|-----------|-------|
| B1 passage files to create | 6 (one per cluster, ~6 gaps each) |
| B2 passage files to create | 6 (one per cluster) |
| B1 sentences to add | 232 |
| B2 sentences to add | 240 |
| Orphan sentence to refix | 1 (`to-be-verb` in b1.json) |
| **Total new sentences** | **472** |
| **Total new passage files** | **12** |

The 472 sentence figure assumes each new sentence carries exactly one `concept_ids` entry. If 2-concept sentences are authored (efficiency opportunity noted above), the actual count of new sentences to write could be reduced to ~330–350 while still hitting 50/concept everywhere.

---

## Staging pipeline reminder

Completed A1/A2 deepen batches live in `content/sentences/staging/deepen/_done/` (27 concept files). Six A2 concepts remain in staging (not yet merged to `a2.json`): `future-constructions`, `passive-voice`, `perfect-tense`, `reflexive-verbs`, `sentence-adverbials`, `superlative-adjectives`. These are prerequisites for several B1 concepts (`s-passive-vs-bli-passive` depends on `passive-voice`; `subjunctive-equivalents` depends on `perfect-tense`). Merge or confirm these A2 staging files before the B1 deepen begins.

B1/B2 deepen batches should follow the same `content/sentences/staging/deepen/<concept-id>.json` → linguist review → merge to `b1.json` / `b2.json` pipeline established for A1/A2.
