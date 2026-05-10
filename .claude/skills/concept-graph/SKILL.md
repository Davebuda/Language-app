---
name: concept-graph
description: How the concept graph is structured, how concepts depend on each other, and how to add or modify nodes. Use when modifying scheduler logic, working with concept dependencies, adding new concepts, or building progression features.
---

# Concept Graph

## Structure

The concept graph is stored in `content/concepts/a1-graph.json` (A1) and `content/concepts/a2-graph.json` (A2 — Phase 3).

Each `ConceptNode` has:
- `id` — kebab-case unique identifier (e.g. `v2-word-order`)
- `label` — Human-readable name
- `description` — One sentence
- `cefrLevel` — 'A1' | 'A2' | 'B1' | 'B2'
- `prerequisites` — Array of concept IDs that must be mastered first
- `masteryThreshold` — Score (0–100) required for mastery (typically 75–85)
- `minAttempts` — Minimum attempts before mastery can be awarded (typically 15–20)
- `minDays` — Practice must span at least this many calendar days (typically 3–5)
- `errorTags` — Which error taxonomy tags this concept relates to
- `vocabularyClusters` — Optional related vocab clusters

## Dependency Rules

- A concept is **locked** until all its prerequisites are mastered.
- A concept is **in-progress** if it's unlocked and the learner has attempted it but not mastered it.
- A concept is **mastered** when: rawScore >= masteryThreshold AND confidenceScore >= 0.7 AND attemptCount >= minAttempts AND uniqueDaysActive >= minDays.

**Hard rules:**
- No circular dependencies — validate with `getUnlockedConcepts()` utility in `src/types/concepts.ts`
- Every concept must have at least one sentence in the content corpus before it can be taught

## A1 Concept Dependency Map (22 concepts)

```
noun-gender ──────────────────────────────────────┐
├── indefinite-articles                            │
│   └── definite-articles-singular ───────────────┤
│       └── definite-articles-plural               │
├── plural-formation                               │
│   └── definite-articles-plural                  │
├── basic-adjectives                               │
│   └── adjective-agreement ←── definite-articles-singular
└── possessive-pronouns ←── personal-pronouns

personal-pronouns ────────────────────────────────┐
├── to-be-verb                                     │
├── to-have-verb                                   │
├── present-tense-regular                          │
│   ├── svo-word-order ←── personal-pronouns      │
│   │   ├── v2-word-order                         │
│   │   │   └── question-formation               │
│   │   ├── negation                              │
│   │   ├── question-formation                    │
│   │   └── common-prepositions                  │
│   ├── preterite-regular                         │
│   └── common-modal-verbs ←── infinitive-form   │
└── possessive-pronouns ←── noun-gender           │

infinitive-form (no prereqs)
numbers-basic (no prereqs)
```

## Adding a New Concept

1. Add the node to the relevant JSON file with all required fields
2. Ensure all `prerequisites` IDs exist in the graph
3. Add at least 20 sentences tagged to this concept in `content/sentences/`
4. Run `content-validator` subagent to check completeness
5. Update `docs/architecture.md` if it changes progression structure

## Concept IDs (A1)
`noun-gender`, `indefinite-articles`, `definite-articles-singular`, `plural-formation`, `definite-articles-plural`, `personal-pronouns`, `to-be-verb`, `to-have-verb`, `present-tense-regular`, `infinitive-form`, `svo-word-order`, `v2-word-order`, `negation`, `question-formation`, `basic-adjectives`, `adjective-agreement`, `common-modal-verbs`, `preterite-regular`, `preterite-irregular-core`, `possessive-pronouns`, `numbers-basic`, `common-prepositions`
