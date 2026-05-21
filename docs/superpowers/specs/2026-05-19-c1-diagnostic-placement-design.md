# C1 Diagnostic Placement — Full Stack Design

**Date:** 2026-05-19
**Approach:** Single coordinated vertical pass (all layers, all levels, one pass through each file)
**Ceiling:** C1 (system designed for easy C2 extension later)

---

## 1. Type System

`CEFRLevel` in `src/types/fingerprint.ts` gains `'C1'`:

```ts
export type CEFRLevel = 'A1' | 'A2' | 'B1' | 'B2' | 'C1';
```

No other type changes required — all downstream types already use `CEFRLevel`.

---

## 2. IRT Engine

**File:** `src/lib/diagnostic/engine.ts`

The scale is uniform: each CEFR level occupies a 0.2-wide band on the 0–1 axis.

```ts
const levelBaseline = { A1: 0.0, A2: 0.2, B1: 0.4, B2: 0.6, C1: 0.8 }
```

Each level's questions span `baseline + difficulty * 0.2`, giving a clean non-overlapping scale.

**Band thresholds in `computeResult`:**
- `< 0.22` → A1
- `< 0.42` → A2
- `< 0.62` → B1
- `< 0.82` → B2
- `≥ 0.82` → C1

**Starting estimate:** `0.4` (low-B1) — converges faster for the majority of users who land in A2–B1.

`isDiagnosticComplete` max questions: raise from 12 to **15** to give C1-range questions room to fire.

**Recalibration (`src/lib/diagnostic/recalibration.ts`):**
`levelOrder` gains `'C1'`. All level-comparison logic already uses index arithmetic, so no other changes needed there.

---

## 3. Concept Graphs

Three new files. All follow the exact schema of `a1-graph.json` / `a2-graph.json`.

### `content/concepts/b1-graph.json` (~10 concepts)

Builds on A2. Key topics:
- `pluperfect` — hadde + past participle; sequence of past events
- `complex-v2` — V2 after adverbial / temporal clauses (Selv om det regner, går jeg)
- `counterfactual-conditionals` — Hadde jeg visst det, ville jeg ha kommet
- `cleft-sentences` — Det er han som gjør det (focus / emphasis)
- `aspectual-verbs` — begynne å, slutte å, fortsette å, holde på å
- `extended-modals` — modal + ha + participle (må ha gjort, kan ha glemt)
- `participle-adjectives` — past/present participle used attributively (en skrevet tekst)
- `preposition-stranding` — mannen jeg snakket med (vs. whom-construction)
- `nominalization-basic` — -ing/-else/-het/-ning suffixes; noun from verb/adjective
- `discourse-connectives` — imidlertid, dessuten, derimot, likevel, dermed

### `content/concepts/b2-graph.json` (~8 concepts)

Builds on B1:
- `complex-passive` — passive with modal auxiliaries; bli vs -s choice in context
- `subjunctive-fixed` — fixed expressions: leve kongen, Gud velsigne deg, om så skulle være
- `complex-cleft` — pseudoclefts: Det som er viktig er…; Det jeg vil si er…
- `register-formal` — formal written style: passive preference, nominalization, long NPs
- `complex-word-formation` — productive compounding rules; prefix/suffix combinations
- `discourse-cohesion` — anaphora, ellipsis, reference chains across sentences
- `modal-particles` — jo, da, vel, nok, altså, nemlig as discourse markers with nuanced meaning
- `complex-subordination` — stacked subordinate clauses; extraposition; heavy NP shift

### `content/concepts/c1-graph.json` (~8 concepts)

Builds on B2:
- `stylistic-inversion` — fronting for style/emphasis beyond V2 obligation
- `complex-nominalization` — extended nominalization for formal/academic register
- `embedded-questions` — indirect questions with whether/if; complex embedded clauses
- `aspectual-nuance` — å ha + infinitive (completion focus); progressive constructions
- `formal-passive-choice` — pragmatic constraints on passive selection in written Norwegian
- `rhetorical-structure` — concession, contrast, hedging patterns in formal text
- `idiomatic-collocations` — verb-noun collocations that resist literal translation
- `intertextual-register` — shifting register within a single text; code-switching signals

---

## 4. Sentence Corpus

Three new files in `content/sentences/`: `b1.json`, `b2.json`, `c1.json`.

Each follows the existing schema from `a1.json` / `a2.json`. Minimum viable corpus:
- **B1:** 30 sentences covering all 10 B1 concepts (3 per concept)
- **B2:** 24 sentences (3 per concept)
- **C1:** 24 sentences (3 per concept)

Each sentence object: `{ id, norwegian, english, conceptIds, exerciseTypes, cefrLevel, scenarioId? }`.

Exercise types at B1/B2/C1 skew toward production: `translation-to-norwegian`, `fill-in-blank`, `word-order`, with some `translation-to-english` and `listening-comprehension`.

---

## 5. Diagnostic Questions — C1 Bank

Six new questions added to `src/lib/diagnostic/questions.ts`, following the same `DiagnosticQuestion` shape. Difficulty range 0.6–1.0 within C1. Topics: stylistic inversion, complex nominalization, modal particles (jo/da/vel nuance), formal passive choice, cleft/pseudocleft, register selection.

---

## 6. Session Routing

**`src/hooks/useSession.ts`:** The `activeGraph` selection currently only handles A1/A2. Expand to a map lookup:

```ts
const graphByLevel: Record<CEFRLevel, ConceptGraph> = {
  A1: a1Graph, A2: a2Graph, B1: b1Graph, B2: b2Graph, C1: c1Graph,
};
const activeGraph = graphByLevel[fingerprint.currentLevel] ?? a1Graph;
```

**`src/lib/content-loader.ts`:** Extend to import and expose B1/B2/C1 sentence files alongside A1/A2. The loader's existing shape (Record<string, Sentence[]> keyed by level or a merged object) is preserved.

**Session page (`src/app/session/page.tsx`):** Verify it passes the correct `sentences` prop for the active level — may need to merge all unlocked-level sentences so repair items can draw from earlier levels too.

---

## 7. Merged Placement Flow

**Replace** the current two-component split (`PlacementQuiz` conversational + `DiagnosticQuiz` IRT) with a **single adaptive quiz**.

**New component:** `AdaptivePlacementQuiz` (replaces both).

Flow:
1. Starts with a single self-report question (Norwegian or English, their choice): "How much Norwegian do you know?" with 4 options that seed the IRT estimate directly:
   - None → estimate = 0.05 (will get A1 questions)
   - Some words / phrases → estimate = 0.2 (low A2)
   - Sentences / basic conversation → estimate = 0.4 (B1 start)
   - Comfortable conversations / advanced → estimate = 0.65 (B2 start)
2. Then runs the IRT adaptive diagnostic (max 15 questions, convergence at 5-question window std-dev < 0.05).
3. On completion: fingerprints the user at the determined level, seeds concept mastery from answers, and routes to `/dashboard`.

**Result screen** shows the determined CEFR band with a plain-language description (not "B1" alone — "Intermediate — you can handle everyday topics but complex grammar still trips you up").

**`OnboardingFlow`** removes the branch between PlacementQuiz and DiagnosticQuiz and renders AdaptivePlacementQuiz exclusively.

---

## 8. DiagnosticQuiz / RecalibrationQuiz — C1 cosmetic updates

- `CEFR_LABELS` in `DiagnosticQuiz.tsx` gains `C1: 'Advanced'`
- Recalibration quiz: no structural changes; it uses `fingerprint.currentLevel` and the updated `levelOrder` to pick questions, so it automatically works for C1 users once the engine is updated

---

## Sequence

1. `src/types/fingerprint.ts` — add C1 to CEFRLevel
2. `src/lib/diagnostic/engine.ts` — IRT scale, band thresholds, max questions
3. `src/lib/diagnostic/recalibration.ts` — levelOrder
4. `content/concepts/b1-graph.json` — new file
5. `content/concepts/b2-graph.json` — new file
6. `content/concepts/c1-graph.json` — new file
7. `content/sentences/b1.json` — new file
8. `content/sentences/b2.json` — new file
9. `content/sentences/c1.json` — new file
10. `src/lib/diagnostic/questions.ts` — add 6 C1 questions
11. `src/lib/content-loader.ts` — load B1/B2/C1 sentences
12. `src/hooks/useSession.ts` — level→graph routing
13. `src/app/session/page.tsx` — sentence prop for correct level
14. `src/components/onboarding/AdaptivePlacementQuiz.tsx` — new merged component
15. `src/components/onboarding/OnboardingFlow.tsx` — use AdaptivePlacementQuiz, remove old branch
16. `src/components/onboarding/DiagnosticQuiz.tsx` — add C1 label
17. `src/components/onboarding/OnboardingFlow.tsx` (OnboardingFlow already merged in step 15)
