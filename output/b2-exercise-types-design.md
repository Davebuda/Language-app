# B2 Exercise Types — Design Proposal (analysis-first, no code)

> Status: **PROPOSAL — awaiting approval.** Read-only design. Nothing built. Grounded in the approved
> `docs/per-level-progression-proposal.md` (B2 = lexical range & nuance) and the B2 source
> `Downloads/norsk_b2_hverdagsord.md`.
>
> Two types are designed below: **conjugation-drill** and **nuance-discrimination**. Build order, conflicts,
> and open decisions are at the end. Per Operating Rule 1 (depth, not breadth) and the approved proposal's
> "one exercise type at a time" constraint, only **one** ships first; the other follows after verification.

---

## 0. What the code actually constrains (grounding)

Cited so the design is decision-grade, not aspirational:

- **`ExerciseType` is a closed union** (`src/types/session.ts:5-16`) and the scheduler refuses to schedule any type
  it cannot render (`NOT_YET_AVAILABLE_TYPES`, `isNotYetAvailableType`, `src/types/session.ts:23-32`;
  `src/engine/scheduler.ts:181-187`). A new type must be added to the union AND given a real renderer, or it must
  sit in `NOT_YET_AVAILABLE_TYPES` and show the honest "kommer snart" banner (`ExerciseCard.tsx:39-79`). There is
  no third state. (Rule 6: no silent substitution.)
- **Every graded answer becomes one `ExerciseResult`** (`src/types/session.ts:115-125`) carrying `correct`,
  `errorTag?`, `conceptId`, `sentenceId?`. That single object is the only thing the fingerprint write path consumes.
- **The fingerprint write path is `recordResult`** (`src/hooks/useFingerprint.ts:272-367`). It does four real writes:
  `updateConceptMastery` (EMA/SRS on `conceptMastery[conceptId]`), `logError` + `aggregateErrorPatterns` (on wrong),
  `computeProductionGap`, and `passedSentenceIds[sentenceId]` when `correct && sentenceId`. **A brick lands only if
  the result carries a real `conceptId` and (for "passed") a real `sentenceId`.** This is the Rule 8 trace.
- **Cloze is the precedent for a multi-gap, multi-result, parallel-collection type.** It has: its own content
  collection (`ClozePassage`, `src/types/content.ts:78-86`), its own client loader mirroring `seed-pool`
  (`src/lib/passage-pool.ts`), its own grader producing **one `ExerciseResult` per gap**
  (`buildClozeResults`, `src/lib/cloze.ts:23-54`), its own `ExerciseCard` branch that bypasses the single-sentence
  path (`ExerciseCard.tsx:103-117`), its own scheduler block (`scheduler.ts:318-337`, "at most one per session"),
  and its own submit path `submitClozeResults` that loops `recordResult` per gap (`useSession.ts:370-376`).
  **Both new types should follow the cloze precedent, not the single-sentence FillInBlank precedent**, because both
  produce multiple sub-answers per card (one verb has 3 forms; nuance has a stem + a justification).
- **Error tagging is observed-diff** (`src/lib/classify-error.ts`). It already has `verb-tense` and
  `verb-conjugation` tags (`src/types/taxonomy.ts:5-14`) and a `wrong-word-same-category` tag for near-synonyms
  (`taxonomy.ts:16-19`). **Both new types can be tagged with the existing 17 tags — no taxonomy extension is needed.**
  (Detail in each section.)
- **`vocabularyMastery` already exists and is unused** (`fingerprint.ts:62-67,96`; confirmed by the proposal at
  line 56). It is keyed by `clusterId`, holds `score 0-100` + `knownWordCount`/`totalWordCount`. This is the natural
  home for B2 "word activated" bricks — but writing it is a **real engine extension** (`recordResult` does not touch
  it today), flagged below.

---

## 1. conjugation-drill

The learner produces/selects the correct verb forms across the tense ladder
**infinitiv → presens → preteritum → presens perfektum**, with explicit handling of the irregular a→u pattern
(trakk → trukket). The B2 source gives this to us directly: every entry already lists
`å nyse – nyser – nøs – har nyst (uregelrett)` (`norsk_b2_hverdagsord.md:9-11` and throughout).

### (a) Content data shape — NEW collection `content/verbs/b2.json`

A sentence row cannot represent a verb paradigm (it has one `norwegian`/`notes` pair). Model a verb as a
first-class content item, paralleling `ClozePassage`. New TypeScript interface in `src/types/content.ts`:

```ts
export interface VerbConjugation {
  id: string;                 // e.g. "verb-trekke"
  infinitiv: string;          // "trekke"            (no "å"; UI adds it)
  presens: string;            // "trekker"
  preteritum: string;         // "trakk"
  perfektum: string;          // "trukket"           (the bare participle; UI prepends "har")
  irregular: boolean;         // (uregelrett) marker from the source
  pattern?: 'a-u' | 'group-1-et' | 'group-2-te' | 'group-3-dde' | 'other';
                              // the "Mønstre du kan stole på" buckets (source lines 272-277)
  englishGloss: string;       // "to pull"
  exampleSentence?: string;   // a carrier sentence from the source for context on the card
  cefrLevel: CEFRLevel;       // "B2"
  conceptId: string;          // see (c) — the brick this verb maps to
  clusterId: string;          // themed cluster: "body-reactions" | "push-pull-lean" | ...
}

export interface ResolvedVerbConjugation extends VerbConjugation {
  source: 'seed' | 'generated';
}
```

JSON row (snake_case, matching the existing corpus convention — `a1.json:1-19`):

```json
{
  "id": "verb-trekke",
  "infinitiv": "trekke",
  "presens": "trekker",
  "preteritum": "trakk",
  "perfektum": "trukket",
  "irregular": true,
  "pattern": "a-u",
  "english_gloss": "to pull",
  "example_sentence": "Han trakk i håndtaket flere ganger før han skjønte at han måtte dytte i stedet.",
  "cefr_level": "B2",
  "concept_id": "irregular-verbs-a-u",
  "cluster_id": "push-pull-lean"
}
```

Loader: a new `src/lib/verb-pool.ts` that statically imports `content/verbs/b2.json` and builds
`SEED_VERBS: Record<string,VerbConjugation>` + `SEED_VERB_IDS_BY_CONCEPT: Record<string,string[]>`, an exact mirror
of `passage-pool.ts:56-69`. (Optionally also index by `clusterId` for the B2 "words you no longer miss" wall.)

The card presents the infinitiv (given) and asks the learner to produce the other three forms. So **one card =
three sub-answers** (presens, preteritum, perfektum). The infinitiv is the prompt, never blanked.

### (b) Grading — one `ExerciseResult` PER FORM (cloze-per-gap precedent)

A new pure grader `src/lib/conjugation.ts` `buildConjugationResults(...)`, modeled on `buildClozeResults`
(`cloze.ts:23-54`). For each of the three target forms it emits one `ExerciseResult`:

- `correct`: `checkAnswer(userForm, expectedForm)` (reuse `src/lib/answer.ts`, same as cloze does). Perfektum is
  graded on the participle; the UI shows the fixed "har" so the learner isn't tested on the auxiliary.
- `errorTag` on a wrong form: **`verb-conjugation`** (`taxonomy.ts:6`). This tag already exists and is exactly the
  right meaning ("wrong verb form for person/number" — extended naturally to wrong paradigm form). Optionally, when
  the wrong form is a *correctly-formed-but-wrong-tense* answer (learner wrote `trekker` for the preteritum slot),
  classify as **`verb-tense`** (`taxonomy.ts:5`) instead — both are existing tags. Recommendation: keep it simple
  for v1 — **always `verb-conjugation`** for any wrong form; defer the tense/conjugation split to a later refinement.
  **No taxonomy extension needed.**
- `conceptId`: the verb's `conceptId` (e.g. `irregular-verbs-a-u`) on every per-form result, so all three forms feed
  the same brick.
- `sentenceId`: leave `undefined` per-form; set it to the **verb id** on the first result **only when all three
  forms are correct** — identical to the cloze "mark passed exactly once" trick (`cloze.ts:50-53`). This makes
  `passedSentenceIds["verb-trekke"]` the "this verb is fully nailed" record and prevents a fully-mastered verb from
  reappearing as new material (it stays available for review, like passed sentences — `scheduler.ts:278,292`).

A "card-level correct" for UI/SRS purposes = all three forms correct. But the fingerprint sees three independent
results, so a learner who nails presens+preteritum but misses perfektum gets two mastery-up signals and one
mastery-down + one logged `verb-conjugation` error. That is *more* diagnostic than a single pass/fail — it tells the
engine the learner's gap is specifically the participle (the a→u → trukket leap), which is exactly the moat.

### (c) Fingerprint write — real bricks via existing `recordResult`, plus ONE engine extension

Two new B2 concept nodes carry the bricks (added to the B2 concept graph — see `concept-graph` skill / loader at
`src/lib/concept-graph-loader.ts`, already imported in `useFingerprint.ts:25`):

- `irregular-verbs-a-u` — the strong a→u pattern (trakk→trukket, rakk→rukket, strakk→strukket; source line 277).
- `everyday-verb-conjugation` — the regular -et/-te/-dde paradigms (source groups 1–3, lines 274-276).

Each per-form `ExerciseResult` flows through the **unchanged** `recordResult` path (`useFingerprint.ts:272-367`):
`updateConceptMastery` moves the concept's EMA + SRS rung; wrong forms call `logError` (real row in `recentErrors`,
capped 200) + `aggregateErrorPatterns`; a fully-correct verb writes `passedSentenceIds[verbId]`. **All four engine
writes already exist and require zero change** — this is the Rule 8 trace: the brick lands because the result
carries a real graph `conceptId`.

The proposal's richer B2 brick — "a new everyday word/verb **activated**" counted on the lexical wall — maps to
`vocabularyMastery[clusterId]` (`fingerprint.ts:62-67`), which is **currently never written**. Two options:

- **v1 (no engine change):** the brick = concept mastery on the two verb-paradigm concepts above. Honest, real,
  ships without touching the engine. The "words you no longer miss" wall counts verbs whose id is in
  `passedSentenceIds`. **Recommended for first ship.**
- **v2 (engine extension, analysis-first later):** teach `recordResult` to also bump
  `vocabularyMastery[verb.clusterId]` (increment `knownWordCount` when a verb first reaches all-three-correct). This
  is the proposal's "real engine extension" (proposal line 56) and must be its own approved move — **out of scope
  for the first exercise-type ship.**

### (d) Render / interaction — model on ClozePassageExercise, NOT FillInBlank

`ClozePassageExercise.tsx` is the right template: it manages an **array** of inputs, a single submit, per-input
correct/wrong colouring after submit, an `aria-live` summary, and calls a single `on...Results` callback with an
array. New component `src/components/session/exercises/ConjugationDrillExercise.tsx`:

- Header label: `Bøy verbet` (Norwegian-dominates — learning surface).
- Show the infinitiv prominently (`å trekke`) + small muted `englishGloss` + optional `exampleSentence`.
- A 3-row ladder: `Presens [____]`, `Preteritum [____]`, `Perfektum  har [____]` (the "har" is fixed text, like
  cloze static segments). For irregular verbs show a small `(uregelrett)` chip — honest signalling, matches the
  source's explicit marker.
- One `Sjekk svar` button, disabled until all three filled (mirror `ClozePassageExercise.tsx:83-91`).
- After submit: colour each row green/red using the same token classes as cloze
  (`--nc-signal-*` / `--nc-red-*`, `ClozePassageExercise.tsx:68-75`); reuse the card shake on any wrong form
  (`ExerciseCard.tsx:90-99`).
- Props: `{ verb: ResolvedVerbConjugation; sessionId; itemId; onConjugationResults: (r: ExerciseResult[]) => void }`
  — parallel to the cloze prop contract (`ExerciseCard.tsx:104-112`).

A **multiple-choice variant** (pick the right preteritum among 4) is the lower-effort fallback if free-text proves
too punishing on spelling; FillInBlank already shows the MC↔free-text dual pattern (`FillInBlankExercise.tsx:27-205`).
Recommendation: free-text production (the north star is *production*), with MC reserved as a repair/micro-drill step.

### (e) Minimal wiring checklist (plan, not code)

1. `src/types/content.ts` — add `VerbConjugation` + `ResolvedVerbConjugation`.
2. `src/types/session.ts` — add `'conjugation-drill'` to the `ExerciseType` union (line 5-16). Do **not** add to
   `NOT_YET_AVAILABLE_TYPES` (it will have a real renderer).
3. `content/verbs/b2.json` — corpus from `norsk_b2_hverdagsord.md`, **linguist-gated** (MEMORY: never seed staging
   without a norwegian-linguist pass). ~50 verbs available in the source.
4. `src/lib/verb-pool.ts` — client loader mirroring `passage-pool.ts`.
5. `src/lib/conjugation.ts` — `buildConjugationResults` (per-form results), mirroring `cloze.ts`.
6. B2 concept graph — add `irregular-verbs-a-u` + `everyday-verb-conjugation` nodes (concept-graph loader).
7. `src/engine/scheduler.ts` — a B2-gated block, "at most one (or a small N) conjugation-drill per session", modeled
   on the cloze block (`scheduler.ts:318-337`). Inputs: `availableVerbIds`/`verbs` added to `SchedulerInput`
   (parallel to `availablePassageIds`/`passages`, `scheduler.ts:94-95`). Respect `passedSentenceIds` (skip verbs the
   learner has nailed, except for review).
8. `src/components/session/ExerciseCard.tsx` — a new branch before the single-sentence guard (mirror the cloze
   branch at lines 103-117): if `exerciseType === 'conjugation-drill'` and a resolved verb + callback exist, render
   `ConjugationDrillExercise`; otherwise the honest `NotYetAvailable` banner.
9. `src/hooks/useSession.ts` — resolve `pending:<concept>` → a `ResolvedVerbConjugation` (parallel to cloze
   resolution) and add `submitConjugationResults` looping `recordResult` per form (mirror `submitClozeResults`,
   `useSession.ts:370-376`).
10. `src/components/session/SessionScreen.tsx` — pass the verb + `onConjugationResults` down (mirror cloze wiring).
11. Tests — `buildConjugationResults` per-form grading + "passed only when all three correct"; scheduler B2 gating;
    a `recordResult` trace test proving the brick lands (mirror `tests/lib/cloze*` / `tests/hooks/useSession`).

---

## 2. nuance-discrimination

The learner picks the right shade among near-synonyms **in context**. The B2 source's section 4 ("Kommunikasjon med
nyanse", lines 151-194) is purpose-built for this: `antyde` (hint) vs `påpeke` (point out) vs `benekte` (deny) vs
`innrømme` (admit) vs `nikke`/`mumle`/`hviske`/`nøle`/`tvile`. The contrast is meaning, not form.

### (a) Content data shape — NEW collection `content/nuance/b2.json`

This is a discrimination item: a carrier sentence with one blank, a target word, and a set of **near-synonym
distractors that are all real words but wrong in this context** (the whole point — distractors must be plausible,
not random). New interface in `src/types/content.ts`:

```ts
export interface NuanceItem {
  id: string;                 // "nuance-antyde-vs-paapeke-01"
  carrierNorwegian: string;   // sentence with a single "___" blank
  englishGloss: string;       // full-sentence English hint (muted)
  answer: string;             // the correct word, conjugated to fit the blank ("antydet")
  acceptedAnswers?: string[]; // spelling/inflection equivalents
  distractors: string[];      // 2-3 NEAR-SYNONYMS, contextually wrong ("påpekte","benektet")
  rationale: string;          // 1-line why-this-shade explanation (repair/explanation text)
  conceptId: string;          // see (c)
  clusterId: string;          // "communication-nuance"
  cefrLevel: CEFRLevel;       // "B2"
}

export interface ResolvedNuanceItem extends NuanceItem { source: 'seed' | 'generated'; }
```

JSON row (built from source lines 173-184):

```json
{
  "id": "nuance-antyde-01",
  "carrier_norwegian": "Han ___ flere ganger at han var misfornøyd, men sa det aldri rett ut.",
  "english_gloss": "He hinted several times that he was unhappy, but never said it outright.",
  "answer": "antydet",
  "accepted_answers": [],
  "distractors": ["påpekte", "benektet", "innrømmet"],
  "rationale": "Å antyde = to hint/imply indirectly; påpeke = to point out openly; the sentence's 'aldri rett ut' demands the indirect verb.",
  "concept_id": "communication-nuance-verbs",
  "cluster_id": "communication-nuance"
}
```

The `rationale` is load-bearing: it is the **explanation step** of the repair loop for this type (repair-loop skill;
explain → micro-drill → retry). Discrimination errors are useless without "why this shade," so the content must
carry it (no AI dependency — Rule: every AI path has a non-AI fallback).

Loader: `src/lib/nuance-pool.ts`, again mirroring `passage-pool.ts`.

### (b) Grading — single choice → one `ExerciseResult` (FillInBlank MC precedent)

Unlike conjugation, this is **one answer per card**, so it follows the simpler `FillInBlankExercise` MC path
(`FillInBlankExercise.tsx:27-109`), not the multi-result cloze path. Grader (inline in the component, like
FillInBlank's `choose`): correct = selected option equals `answer` (case-insensitive, reuse `checkAnswer`).

- `errorTag` on wrong: **`wrong-word-same-category`** (`taxonomy.ts:16-18`) — its definition is literally "false
  friend or near-synonym," which is exactly this exercise. **No taxonomy extension needed; this tag is the perfect
  fit and is currently under-used.** Because every distractor is a real near-synonym in the same category, this is
  unambiguous and can be hard-coded by the component (no need to run the observed-diff classifier).
- `conceptId`: the item's `conceptId` (`communication-nuance-verbs`).
- `sentenceId`: the item id, set when `correct` (so `passedSentenceIds` excludes nailed items from new material;
  same mechanism as sentences/cloze). Single result, so no "all gaps" gating needed.

### (c) Fingerprint write — real bricks via existing `recordResult`, no engine change

One new B2 concept node `communication-nuance-verbs` (the section-4 cluster). The single `ExerciseResult` flows
through the unchanged `recordResult` (`useFingerprint.ts:272-367`): `updateConceptMastery` moves the EMA/SRS; a wrong
choice writes a real `wrong-word-same-category` row to `recentErrors` + patterns; a correct choice writes
`passedSentenceIds[itemId]`. **Zero engine change.** Rule 8 trace holds because the result carries a real graph
`conceptId` and a real `sentenceId`.

The proposal's "nuance-accuracy band" on the B2 weekly wall (proposal line 49) is then a **read** over this concept's
mastery / error-rate — no new write needed for v1. (If a dedicated nuance-accuracy stat is wanted later, it reads
`recentErrors` filtered to `wrong-word-same-category` on `communication-nuance-verbs` — a derived metric, not a new
brick.)

### (d) Render / interaction — model on FillInBlank MultipleChoice

`FillInBlankExercise.tsx` `MultipleChoice` (lines 27-109) is the exact template: a sentence with a blank, an option
grid, lock-on-select, green/red reveal, `aria-live`. New component
`src/components/session/exercises/NuanceDiscriminationExercise.tsx`:

- Header: `Velg riktig nyanse`.
- Carrier sentence with the blank rendered as the dashed chip (reuse `FillInBlankExercise.tsx:64-68`).
- `englishGloss` muted beneath.
- Shuffled `[answer, ...distractors]` as an option grid (reuse the `shuffle` + grid at
  `FillInBlankExercise.tsx:18-25,73-99`).
- On select: lock, colour, emit the single `ExerciseResult` via `onResult` (standard single-result path — works with
  the existing `ExerciseCard` `handleResult` + shake, `ExerciseCard.tsx:93-99`).
- After a wrong answer, surface `rationale` as the repair explanation (the repair loop already triggers on a wrong
  `ExerciseResult`; this type just supplies richer explanation text).

Because it produces a single standard `ExerciseResult`, **nuance-discrimination needs no new submit path** — it can
reuse the existing `submitResult` flow (`useSession.ts:253-257`). This makes it materially cheaper to wire than
conjugation-drill.

### (e) Minimal wiring checklist (plan, not code)

1. `src/types/content.ts` — add `NuanceItem` + `ResolvedNuanceItem`.
2. `src/types/session.ts` — add `'nuance-discrimination'` to the `ExerciseType` union. Not in `NOT_YET_AVAILABLE_TYPES`.
3. `content/nuance/b2.json` — corpus from source section 4 (+ section 5 "tvile/slite/takle/mestre"), **linguist-gated**.
   Distractor quality is the make-or-break (they must be genuine near-synonyms) — linguist review is non-negotiable.
4. `src/lib/nuance-pool.ts` — client loader mirroring `passage-pool.ts`.
5. B2 concept graph — add `communication-nuance-verbs` node.
6. `src/engine/scheduler.ts` — B2-gated inclusion in the new-material / remediation pool. Simpler than conjugation:
   because it emits a standard single `ExerciseResult`, it can ride the normal item path if a resolved nuance item is
   provided — but it still needs its own resolution branch because content comes from a separate collection. Cap at a
   small N per session.
7. `src/components/session/ExerciseCard.tsx` — new branch (mirror the cloze guard): resolved nuance item → render
   `NuanceDiscriminationExercise`; else `NotYetAvailable`.
8. `src/hooks/useSession.ts` — resolve `pending:<concept>` → `ResolvedNuanceItem`. **Reuses `submitResult`** (single
   result) — no new submit loop.
9. `src/components/session/SessionScreen.tsx` — pass the resolved nuance item down.
10. Tests — component grades correct/incorrect; wrong → `wrong-word-same-category` logged; correct → passed written;
    scheduler B2 gating.

---

## 3. Conflicts with existing engine assumptions (Rule 5: surface drift)

1. **`SessionItem.contentId` and `pending:<concept>` resolution assume a `Sentence`.** `ResolvedContent extends
   Sentence` (`content.ts:59`) and `ExerciseCard` requires a `sentence` for every non-cloze type
   (`ExerciseCard.tsx:119-122`). Adding two more content collections repeats the cloze divergence — the resolver in
   `useSession.ts` must branch on `exerciseType` to know which collection (`verbs` / `nuance` / `passages` /
   `sentences`) to resolve from. This is a real but bounded structural cost; cloze already paid the same toll, so the
   pattern is proven. **Recommendation: accept; do not try to force verbs/nuance into the `Sentence` shape** (that
   would be silent substitution and would corrupt the corpus).

2. **`classify-error.ts` `verbFormVariant` (lines 76-87) could mis-tag conjugation answers.** If a conjugation form
   were ever routed through the observed-diff classifier, `trakk` vs `trukket` might be read as `verb-tense` or
   `spelling` (levenshtein ≤ 2 is unlikely here, but the heuristic is fuzzy). **Mitigation: conjugation-drill should
   NOT call `classifyError`** — it should hard-assign `verb-conjugation` per the design above, exactly as cloze
   hard-assigns each gap's authored `errorTag` (`cloze.ts:44`). Same for nuance (hard-assign `wrong-word-same-category`).
   This keeps the diagnostic signal clean and avoids the classifier inventing a tag.

3. **B2 level gating is assumed but the gate must be explicit.** Both types are B2-only. The scheduler already
   level-filters sentences (`filterSentencesByLevel`, `scheduler.ts:15-24`) and gates cloze by level
   (`scheduler.ts:321-330`). The new blocks must gate on `fingerprint.currentLevel === 'B2'` so an A1/B1 learner never
   sees them. Note `B1→B2` progression already exists (`useFingerprint.ts:357-360`) and B2 is selectable
   (CLAUDE.md Wave 4.5), so the level exists — only the gate wiring is new.

4. **`vocabularyMastery` write is a genuine engine extension — keep it out of v1.** The proposal (line 56) explicitly
   flags this as "analysis-first when we get there." Writing it from `recordResult` changes the engine's contract and
   deserves its own move. v1 of both types lands real bricks on **concept mastery** (which already works), not on
   `vocabularyMastery`. **Do not bundle the `vocabularyMastery` write into the first exercise-type ship** — that would
   violate Rule 4 (one move at a time) and Rule 1 (depth).

5. **Production guarantee interaction.** The scheduler forces ≥1 production exercise (`scheduler.ts:350-368`) by
   checking membership in `PRODUCTION_EXERCISES`. conjugation-drill **is** production (free-text form output) and
   should be added to `PRODUCTION_EXERCISES` (`scheduler.ts:27-32`) so it can satisfy the guarantee. nuance-discrimination
   is recognition-shaped (single choice) and should **not** count as production — leave it out of that pool, consistent
   with the north star (a pure-recognition feature must be wrapped with output; nuance is acceptable as recognition
   *because* it's a discrimination/diagnosis surface, not the session's production guarantee).

---

## 4. Recommended build order (one type at a time)

**Build nuance-discrimination FIRST, conjugation-drill SECOND.** Rationale:

- **Lower wiring cost / lower risk.** Nuance emits a single standard `ExerciseResult`, so it **reuses the existing
  `submitResult` path and the existing `recordResult` writes with zero new submit loop** and zero engine change. Its
  renderer is a near-clone of an existing, shipped component (`FillInBlank` MultipleChoice). Fewer moving parts =
  faster honest verification (Rule 3).
- **It proves the "new B2 content collection + scheduler gate + ExerciseCard branch" plumbing** on the cheapest
  possible payload. Once that path is verified end-to-end (corpus → scheduler → render → result → brick lands),
  conjugation-drill reuses the exact same plumbing and only adds the multi-result grader (the one genuinely new
  mechanic, and it has the cloze precedent).
- **Conjugation-drill carries the only novel grading mechanic** (per-form results + "passed only when all correct").
  Doing it second means the surrounding plumbing is already proven, so the verification can focus on the new grader
  alone.

Each ships behind its own verification trace (Rule 3/8): a real B2 session, a wrong answer, confirm the `errorTag`
row lands in `recentErrors`, the concept's `rawScore`/`srsLevel` moves, and a fully-correct item writes
`passedSentenceIds`. Only after that trace passes does the second type begin (Rule 4).

Both are blocked behind the proposal's stated prerequisites: **Move 2 honesty fixes + phantom cleanup**
(proposal lines 67, 70-71) and a **norwegian-linguist corpus pass** (MEMORY: mechanical gate ≈11–34% real-pass;
never seed staging without linguist review).

---

## 5. Open decisions for the human

1. **conjugation-drill input mode:** free-text production for all three forms (north-star aligned, harder), or
   multiple-choice (gentler, recognition-shaped)? Recommendation: **free-text**, with MC reserved as the repair
   micro-drill. Confirm.
2. **Which forms to test:** all three (presens/preteritum/perfektum) every card, or adaptively blank only the
   irregular/hard form once a verb's regular forms are mastered? Recommendation: **all three in v1** (simpler, and the
   per-form results already give the engine the granularity to know which form is weak). Confirm.
3. **`vocabularyMastery` write:** ship v1 with bricks on **concept mastery only** (no engine change), deferring the
   `vocabularyMastery[clusterId]` write to a separate approved move? Recommendation: **yes, defer.** Confirm — this is
   the line between "finish B2 honestly" and "new engine surface."
4. **Corpus scope for first ship:** the source has ~50 verbs across 6 themes and ~10 nuance contrasts. Seed the full
   set, or a linguist-vetted subset (e.g. section 4 only for nuance, the a→u irregulars + one regular group for
   conjugation) to ship faster? Recommendation: **vetted subset first**, expand after the type is verified.
5. **Build order confirmation:** agree to **nuance-discrimination first, conjugation-drill second**? (Section 4.)
6. **New B2 concept nodes:** confirm the three proposed graph nodes (`irregular-verbs-a-u`,
   `everyday-verb-conjugation`, `communication-nuance-verbs`) — names and whether conjugation should be one node or
   two. Adding graph nodes touches level-completion checks (`useFingerprint.ts:61-66` `checkB1Complete` pattern); a
   parallel `checkB2Complete` would be needed if B2 ever gates onward, but today B2 is terminal so new B2 nodes only
   affect scheduling, not progression.
