# C1 Diagnostic Placement — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extend NorskCoach from a B2 ceiling to full C1 support — types, IRT engine, concept graphs, sentence corpora, diagnostic questions, session routing, and onboarding.

**Architecture:** Single vertical pass in dependency order: types first, then engine, then content files, then wiring. Each task is independently committable. The IRT engine uses a uniform 5-level 0.2-band scale. Session routing uses a level→graph map. The onboarding level cap is removed once graphs exist.

**Tech Stack:** TypeScript, Next.js App Router, JSON content files, Zustand, Framer Motion, Tailwind CSS.

---

## File Map

| File | Action |
|---|---|
| `src/types/fingerprint.ts` | Modify — add `'C1'` to `CEFRLevel` |
| `src/lib/diagnostic/engine.ts` | Modify — 5-level IRT scale, band thresholds, max questions, seed type |
| `src/lib/diagnostic/recalibration.ts` | Modify — add `'C1'` to `levelOrder` |
| `content/concepts/b1-graph.json` | Create — 10 B1 concepts |
| `content/concepts/b2-graph.json` | Create — 8 B2 concepts |
| `content/concepts/c1-graph.json` | Create — 8 C1 concepts |
| `content/sentences/b1.json` | Create — 30 seed sentences |
| `content/sentences/b2.json` | Create — 24 seed sentences |
| `content/sentences/c1.json` | Create — 24 seed sentences |
| `src/lib/diagnostic/questions.ts` | Modify — add 6 C1 questions |
| `src/lib/content-loader.ts` | Modify — load b1/b2/c1 files |
| `src/hooks/useSession.ts` | Modify — level→graph routing map |
| `src/components/onboarding/OnboardingFlow.tsx` | Modify — remove B2 cap, add C1 concepts, fix seed types |
| `src/components/onboarding/DiagnosticQuiz.tsx` | Modify — add C1 label |

---

### Task 1: Extend CEFRLevel type

**Files:**
- Modify: `src/types/fingerprint.ts:4`

- [ ] **Step 1: Update the type**

```ts
// src/types/fingerprint.ts line 4 — change from:
export type CEFRLevel = 'A1' | 'A2' | 'B1' | 'B2';
// to:
export type CEFRLevel = 'A1' | 'A2' | 'B1' | 'B2' | 'C1';
```

- [ ] **Step 2: Type-check to find all cascading Record<CEFRLevel> gaps**

```bash
npx tsc --noEmit 2>&1 | grep -v "node_modules"
```

Expected: errors in `OnboardingFlow.tsx` (missing C1 key in `FIRST_CONCEPTS_BY_LEVEL`) and possibly `DiagnosticQuiz.tsx`. These are fixed in later tasks. No other files should break from this change alone.

- [ ] **Step 3: Commit**

```bash
git add src/types/fingerprint.ts
git commit -m "feat(types): add C1 to CEFRLevel"
```

---

### Task 2: Update IRT engine to 5-level scale

**Files:**
- Modify: `src/lib/diagnostic/engine.ts`

The current scale maps 4 levels to 0.25-wide bands. With C1 added, each level gets a 0.2-wide band. Both `updateEstimate` and `selectNextQuestion` contain a local `levelBaseline` constant — both must be updated.

- [ ] **Step 1: Update `updateEstimate`**

```ts
// In function updateEstimate — replace the levelBaseline + globalDifficulty lines:
const levelBaseline = { A1: 0.0, A2: 0.2, B1: 0.4, B2: 0.6, C1: 0.8 }
const globalDifficulty = levelBaseline[question.cefrLevel] + question.difficulty * 0.2
```

- [ ] **Step 2: Update `selectNextQuestion`**

```ts
// In function selectNextQuestion — replace levelBaseline:
const levelBaseline = { A1: 0.0, A2: 0.2, B1: 0.4, B2: 0.6, C1: 0.8 }
```

Also update the sort comparator — the `* 0.25` multiplier must become `* 0.2`:
```ts
const aDiff = Math.abs((levelBaseline[a.cefrLevel] + a.difficulty * 0.2) - state.estimate)
const bDiff = Math.abs((levelBaseline[b.cefrLevel] + b.difficulty * 0.2) - state.estimate)
```

- [ ] **Step 3: Update `computeResult` band thresholds and starting estimate**

```ts
// Replace the cefrLevel mapping block in computeResult:
let cefrLevel: CEFRLevel
if (raw < 0.22) cefrLevel = 'A1'
else if (raw < 0.42) cefrLevel = 'A2'
else if (raw < 0.62) cefrLevel = 'B1'
else if (raw < 0.82) cefrLevel = 'B2'
else cefrLevel = 'C1'
```

- [ ] **Step 4: Raise MAX_QUESTIONS and lower starting estimate**

```ts
const MAX_QUESTIONS = 15   // was 12 — extra headroom for C1-range questions to fire

// In createDiagnosticState:
export function createDiagnosticState(): DiagnosticState {
  return { estimate: 0.4, history: [], askedIds: new Set(), answers: [] }
  // 0.4 = low B1 — converges faster for the A2–B1 majority vs old 0.5
}
```

- [ ] **Step 5: Add `srsLevel` and `nextReviewAt` to `DiagnosticResult.conceptSeeds` type**

The `OnboardingFlow` spreads concept seeds directly into `ConceptMastery`. Currently the seeds are missing these two required fields, causing a pre-existing TS error.

```ts
// In the DiagnosticResult interface, update conceptSeeds type:
conceptSeeds: Record<string, Pick<ConceptMastery,
  | 'rawScore' | 'attemptCount' | 'correctCount' | 'uniqueDaysActive'
  | 'confidenceScore' | 'decayedScore' | 'streak'
  | 'lastAttemptAt' | 'lastCorrectAt' | 'recentOutcomes'
  | 'srsLevel' | 'nextReviewAt'
>>
```

Then in `computeResult`, add these fields to each seed entry:
```ts
conceptSeeds[question.conceptId] = {
  rawScore: Math.max(seedScore, rawScore),
  attemptCount: nextAttempts,
  correctCount: nextCorrect,
  uniqueDaysActive: 1,
  confidenceScore: 0.4,
  decayedScore: Math.max(seedScore, rawScore),
  streak: correct ? 1 : 0,
  lastAttemptAt: now,
  lastCorrectAt: correct ? now : null,
  recentOutcomes: [correct],
  srsLevel: 0,
  nextReviewAt: null,
}
```

- [ ] **Step 6: Type-check**

```bash
npx tsc --noEmit 2>&1 | grep -v "node_modules"
```

Expected: `OnboardingFlow.tsx` `FIRST_CONCEPTS_BY_LEVEL` missing C1 key, and possibly `DiagnosticQuiz.tsx` missing C1 in `CEFR_LABELS`. The pre-existing `srsLevel`/`nextReviewAt` error should now be gone.

- [ ] **Step 7: Commit**

```bash
git add src/lib/diagnostic/engine.ts
git commit -m "feat(engine): extend IRT to 5-level scale with C1 support"
```

---

### Task 3: Add C1 to recalibration level order

**Files:**
- Modify: `src/lib/diagnostic/recalibration.ts`

- [ ] **Step 1: Update `levelOrder`**

```ts
// In selectRecalibrationQuestion — replace levelOrder:
const levelOrder = ['A1', 'A2', 'B1', 'B2', 'C1']
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/diagnostic/recalibration.ts
git commit -m "feat(recalibration): include C1 in level order"
```

---

### Task 4: Create B1 concept graph

**Files:**
- Create: `content/concepts/b1-graph.json`

- [ ] **Step 1: Write the file**

```json
{
  "version": "1.0.0",
  "language": "Norwegian Bokmål",
  "concepts": [
    {
      "id": "pluperfect",
      "label": "Pluperfect tense (hadde + past participle)",
      "description": "The pluperfect expresses an action completed before another past action: 'Jeg hadde spist da hun ringte.' Formed with 'hadde' + past participle, following the same participle classes as the perfect tense.",
      "cefrLevel": "B1",
      "prerequisites": ["perfect-tense", "preterite-irregular-advanced"],
      "masteryThreshold": 80,
      "minAttempts": 20,
      "minDays": 5,
      "errorTags": ["verb-tense", "verb-conjugation"],
      "vocabularyClusters": ["everyday-actions", "time-expressions"]
    },
    {
      "id": "complex-v2",
      "label": "V2 after adverbial clauses",
      "description": "When a full adverbial clause (selv om, etter at, når, fordi) fronts the sentence, the main clause still requires verb-second order: 'Selv om det regner, går jeg ut.' A common source of errors for learners who have mastered simple V2.",
      "cefrLevel": "B1",
      "prerequisites": ["v2-word-order", "subordinate-clauses"],
      "masteryThreshold": 80,
      "minAttempts": 25,
      "minDays": 7,
      "errorTags": ["word-order", "reading-parsing"],
      "vocabularyClusters": ["time-expressions", "everyday-actions"]
    },
    {
      "id": "counterfactual-conditionals",
      "label": "Counterfactual conditionals",
      "description": "Unreal conditionals in the past: 'Hadde jeg visst det, ville jeg ha fortalt deg.' The condition can be inverted (Hadde jeg…) or introduced by 'hvis/om'. Both clauses require the appropriate modal + participle structure.",
      "cefrLevel": "B1",
      "prerequisites": ["conditional-clauses", "common-modal-verbs", "pluperfect"],
      "masteryThreshold": 80,
      "minAttempts": 25,
      "minDays": 7,
      "errorTags": ["verb-tense", "word-order", "reading-parsing"],
      "vocabularyClusters": ["everyday-actions"]
    },
    {
      "id": "cleft-sentences",
      "label": "Cleft sentences (det er … som)",
      "description": "Cleft sentences focus on a specific element: 'Det er han som gjorde det.' The focused element can be subject, object, time, or place. 'Som' introduces the relative clause. 'Det var' for past reference.",
      "cefrLevel": "B1",
      "prerequisites": ["relative-clauses", "svo-word-order"],
      "masteryThreshold": 80,
      "minAttempts": 20,
      "minDays": 5,
      "errorTags": ["word-order", "reading-parsing", "wrong-word-different-category"],
      "vocabularyClusters": ["everyday-actions", "descriptions"]
    },
    {
      "id": "aspectual-verbs",
      "label": "Aspectual verbs (begynne å, slutte å, fortsette å, holde på å)",
      "description": "Verbs expressing aspect: begynne å (start to), slutte å (stop), fortsette å (continue), holde på å (be in the process of). All take 'å' + infinitive. 'Holde på å' indicates an ongoing action at a specific moment.",
      "cefrLevel": "B1",
      "prerequisites": ["infinitive-form", "common-modal-verbs"],
      "masteryThreshold": 80,
      "minAttempts": 20,
      "minDays": 5,
      "errorTags": ["verb-tense", "modal-verb", "reading-parsing"],
      "vocabularyClusters": ["everyday-actions"]
    },
    {
      "id": "extended-modals",
      "label": "Modal + ha + participle (epistemic modals)",
      "description": "Logical deduction about past events: må ha gjort (must have done), kan ha glemt (may have forgotten), burde ha kommet (should have come), skulle ha visst (ought to have known). The auxiliary sequence is modal + ha + past participle.",
      "cefrLevel": "B1",
      "prerequisites": ["modal-verbs-advanced", "perfect-tense"],
      "masteryThreshold": 80,
      "minAttempts": 25,
      "minDays": 7,
      "errorTags": ["modal-verb", "verb-tense", "reading-parsing"],
      "vocabularyClusters": ["everyday-actions"]
    },
    {
      "id": "participle-adjectives",
      "label": "Participial adjectives",
      "description": "Past participles used attributively: en skrevet tekst, et ødelagt hus. Present participles in -ende: en overraskende nyhet. Agree with nouns in number and definiteness like regular adjectives.",
      "cefrLevel": "B1",
      "prerequisites": ["passive-voice", "adjective-agreement"],
      "masteryThreshold": 80,
      "minAttempts": 20,
      "minDays": 5,
      "errorTags": ["adjective-agreement", "verb-tense", "spelling"],
      "vocabularyClusters": ["descriptions", "everyday-objects"]
    },
    {
      "id": "preposition-stranding",
      "label": "Preposition stranding",
      "description": "In spoken and informal written Norwegian, prepositions are stranded at the end of relative clauses and questions: 'Hvem snakker du med?' 'Det er noe jeg ikke kan leve uten.' The formal fronted construction also exists but is less common.",
      "cefrLevel": "B1",
      "prerequisites": ["relative-clauses", "advanced-prepositions"],
      "masteryThreshold": 80,
      "minAttempts": 20,
      "minDays": 5,
      "errorTags": ["preposition", "word-order", "reading-parsing"],
      "vocabularyClusters": ["everyday-actions", "places"]
    },
    {
      "id": "nominalization-basic",
      "label": "Basic nominalization (-ing, -else, -het, -ning)",
      "description": "Forming nouns from verbs and adjectives: søke → søknad/søkning, handle → handling, fri → frihet, løse → løsning. Gender of derived nouns follows predictable patterns by suffix.",
      "cefrLevel": "B1",
      "prerequisites": ["word-formation", "noun-gender"],
      "masteryThreshold": 80,
      "minAttempts": 20,
      "minDays": 5,
      "errorTags": ["noun-gender", "spelling", "compound-word"],
      "vocabularyClusters": ["everyday-actions", "descriptions"]
    },
    {
      "id": "discourse-connectives",
      "label": "Discourse connectives (imidlertid, dessuten, derimot, likevel, dermed)",
      "description": "Sentence-level connectives signalling logical relations: imidlertid (however), dessuten (furthermore), derimot (on the other hand), likevel (nevertheless), dermed (consequently), riktignok (admittedly). These trigger V2 when fronted.",
      "cefrLevel": "B1",
      "prerequisites": ["conjunctions", "sentence-adverbials", "v2-word-order"],
      "masteryThreshold": 80,
      "minAttempts": 20,
      "minDays": 7,
      "errorTags": ["wrong-word-same-category", "word-order", "reading-parsing"],
      "vocabularyClusters": ["everyday-actions"]
    }
  ]
}
```

- [ ] **Step 2: Commit**

```bash
git add content/concepts/b1-graph.json
git commit -m "feat(content): add B1 concept graph (10 concepts)"
```

---

### Task 5: Create B2 concept graph

**Files:**
- Create: `content/concepts/b2-graph.json`

- [ ] **Step 1: Write the file**

```json
{
  "version": "1.0.0",
  "language": "Norwegian Bokmål",
  "concepts": [
    {
      "id": "complex-passive",
      "label": "Complex passive (modal + passive, -s vs bli choice)",
      "description": "Passive constructions with modal auxiliaries: 'boken burde ha blitt lest'. Pragmatic distinction between -s passive (habitual/general: 'Søknader behandles') and bli passive (specific event: 'Søknaden ble behandlet i går').",
      "cefrLevel": "B2",
      "prerequisites": ["passive-voice", "extended-modals"],
      "masteryThreshold": 80,
      "minAttempts": 25,
      "minDays": 7,
      "errorTags": ["verb-tense", "verb-conjugation", "reading-parsing"],
      "vocabularyClusters": ["everyday-actions"]
    },
    {
      "id": "subjunctive-fixed",
      "label": "Subjunctive in fixed expressions",
      "description": "Norwegian preserves the subjunctive only in fixed formal and religious expressions: leve kongen!, Gud velsigne deg, om så skulle skje, så være det. Recognising and producing these without overgeneralising.",
      "cefrLevel": "B2",
      "prerequisites": ["conditional-clauses", "common-modal-verbs"],
      "masteryThreshold": 75,
      "minAttempts": 20,
      "minDays": 7,
      "errorTags": ["verb-conjugation", "meaning-misunderstood"],
      "vocabularyClusters": ["everyday-actions"]
    },
    {
      "id": "complex-cleft",
      "label": "Complex cleft and pseudocleft sentences",
      "description": "Pseudoclefts use a free relative as subject: 'Det som overrasket meg var stillheten.' 'Det jeg vil si er…' Used for contrastive focus and information structure in formal and informal registers.",
      "cefrLevel": "B2",
      "prerequisites": ["cleft-sentences", "relative-clauses"],
      "masteryThreshold": 80,
      "minAttempts": 25,
      "minDays": 7,
      "errorTags": ["word-order", "reading-parsing", "wrong-word-different-category"],
      "vocabularyClusters": ["descriptions"]
    },
    {
      "id": "register-formal",
      "label": "Formal written register",
      "description": "Formal Norwegian prefers nominalization over verbs, passive over active, and dense noun phrases: 'Behandlingen av søknaden pågår' vs 'Vi behandler søknaden din'. Bureaucratic and academic texts rely heavily on these patterns.",
      "cefrLevel": "B2",
      "prerequisites": ["passive-voice", "nominalization-basic", "indirect-speech"],
      "masteryThreshold": 75,
      "minAttempts": 25,
      "minDays": 7,
      "errorTags": ["wrong-word-same-category", "meaning-misunderstood", "reading-parsing"],
      "vocabularyClusters": ["everyday-actions"]
    },
    {
      "id": "complex-word-formation",
      "label": "Complex word formation (productive compounding)",
      "description": "Norwegian compound noun chains: opplysningsplikt, samarbeidspartner, oppfølgingsmøte, rettssikkerhetstiltak. Recognition and production of complex compounds in formal and professional contexts.",
      "cefrLevel": "B2",
      "prerequisites": ["word-formation", "nominalization-basic"],
      "masteryThreshold": 75,
      "minAttempts": 20,
      "minDays": 7,
      "errorTags": ["compound-word", "spelling", "noun-gender"],
      "vocabularyClusters": ["everyday-actions"]
    },
    {
      "id": "discourse-cohesion",
      "label": "Discourse cohesion (anaphora, ellipsis, reference chains)",
      "description": "Maintaining reference across sentences using pronouns (dette, den/det, de), demonstratives, and ellipsis. Recognising what pronouns refer to across multiple sentences in extended formal text.",
      "cefrLevel": "B2",
      "prerequisites": ["discourse-connectives", "relative-clauses"],
      "masteryThreshold": 75,
      "minAttempts": 20,
      "minDays": 7,
      "errorTags": ["pronoun-choice", "reading-parsing", "meaning-misunderstood"],
      "vocabularyClusters": ["descriptions"]
    },
    {
      "id": "modal-particles",
      "label": "Modal particles as discourse markers (jo, da, vel, nok, altså, nemlig)",
      "description": "Norwegian modal particles add pragmatic meaning non-translatably: jo (shared knowledge), da (mild emphasis), vel (hedging), nok (probability), altså (so/in other words), nemlig (namely/that's why). Misuse sounds unnatural to native speakers.",
      "cefrLevel": "B2",
      "prerequisites": ["sentence-adverbials", "discourse-connectives"],
      "masteryThreshold": 75,
      "minAttempts": 25,
      "minDays": 7,
      "errorTags": ["meaning-misunderstood", "wrong-word-same-category"],
      "vocabularyClusters": ["everyday-actions"]
    },
    {
      "id": "complex-subordination",
      "label": "Complex subordination (stacked clauses, extraposition)",
      "description": "Sentences with multiple embedded subordinate clauses, extraposed subjects ('Det er viktig å huske at…'), and heavy NP shift. Maintaining correct word order and negation placement across multiple levels of subordination.",
      "cefrLevel": "B2",
      "prerequisites": ["subordinate-clauses", "relative-clauses", "complex-v2"],
      "masteryThreshold": 75,
      "minAttempts": 25,
      "minDays": 10,
      "errorTags": ["word-order", "negation-placement", "reading-parsing"],
      "vocabularyClusters": ["descriptions", "everyday-actions"]
    }
  ]
}
```

- [ ] **Step 2: Commit**

```bash
git add content/concepts/b2-graph.json
git commit -m "feat(content): add B2 concept graph (8 concepts)"
```

---

### Task 6: Create C1 concept graph

**Files:**
- Create: `content/concepts/c1-graph.json`

- [ ] **Step 1: Write the file**

```json
{
  "version": "1.0.0",
  "language": "Norwegian Bokmål",
  "concepts": [
    {
      "id": "stylistic-inversion",
      "label": "Stylistic inversion (fronting for emphasis)",
      "description": "Deliberate fronting of negative adverbials (aldri, knapt, sjelden) for rhetorical emphasis: 'Aldri har jeg sett maken.' 'Knapt hadde han talt ferdig, da applausen brøt løs.' Optional (unlike V2) and marks elevated register.",
      "cefrLevel": "C1",
      "prerequisites": ["complex-v2", "register-formal"],
      "masteryThreshold": 75,
      "minAttempts": 20,
      "minDays": 7,
      "errorTags": ["word-order", "reading-parsing"],
      "vocabularyClusters": ["descriptions"]
    },
    {
      "id": "complex-nominalization",
      "label": "Complex nominalization in formal prose",
      "description": "Dense noun phrases as the primary information vehicle: 'en ytterligere sentralisering av beslutningsmyndigheten'. Recognising and producing multi-word nominal groups with pre- and post-modifiers in academic and bureaucratic text.",
      "cefrLevel": "C1",
      "prerequisites": ["nominalization-basic", "register-formal", "complex-word-formation"],
      "masteryThreshold": 75,
      "minAttempts": 20,
      "minDays": 7,
      "errorTags": ["noun-gender", "spelling", "compound-word"],
      "vocabularyClusters": ["descriptions"]
    },
    {
      "id": "embedded-questions",
      "label": "Embedded questions (om / hvorvidt)",
      "description": "Indirect yes/no questions: 'Jeg lurer på om han forstår.' Formal alternative 'hvorvidt' (whether): 'Det er uklart hvorvidt tiltaket vil ha ønsket effekt.' Wh-questions in embedded position use straight word order.",
      "cefrLevel": "C1",
      "prerequisites": ["question-formation", "complex-subordination"],
      "masteryThreshold": 75,
      "minAttempts": 20,
      "minDays": 7,
      "errorTags": ["word-order", "reading-parsing", "wrong-word-different-category"],
      "vocabularyClusters": ["descriptions"]
    },
    {
      "id": "aspectual-nuance",
      "label": "Fine-grained aspect (være i ferd med å, på nippet til å)",
      "description": "Nuanced constructions beyond B1 basics: 'være i ferd med å' (be in the process of), 'på nippet til å' (on the verge of), 'nettopp ha' + participle (have just), 'komme til å' (will inevitably). Each expresses different temporal proximity and speaker attitude.",
      "cefrLevel": "C1",
      "prerequisites": ["aspectual-verbs", "extended-modals"],
      "masteryThreshold": 75,
      "minAttempts": 20,
      "minDays": 7,
      "errorTags": ["verb-tense", "modal-verb", "meaning-misunderstood"],
      "vocabularyClusters": ["everyday-actions"]
    },
    {
      "id": "formal-passive-choice",
      "label": "Pragmatic passive selection in formal Norwegian",
      "description": "-s passive is preferred in formal/bureaucratic Norwegian for general or habitual processes: 'Søknader behandles'. Bli passive for specific completed events: 'Søknaden ble behandlet i går'. Distinguishing these is a marker of C1 written competence.",
      "cefrLevel": "C1",
      "prerequisites": ["complex-passive", "register-formal"],
      "masteryThreshold": 75,
      "minAttempts": 20,
      "minDays": 7,
      "errorTags": ["verb-conjugation", "reading-parsing", "meaning-misunderstood"],
      "vocabularyClusters": ["everyday-actions"]
    },
    {
      "id": "rhetorical-structure",
      "label": "Rhetorical structure (concession, contrast, hedging)",
      "description": "Formal argumentation: concession-rebuttal (Riktignok … men …), contrast (Selv om … likevel), hedging (Det kan hevdes at …, Man kan ikke utelukke at …). Central to academic and journalistic Norwegian.",
      "cefrLevel": "C1",
      "prerequisites": ["discourse-cohesion", "complex-subordination"],
      "masteryThreshold": 75,
      "minAttempts": 20,
      "minDays": 7,
      "errorTags": ["wrong-word-same-category", "reading-parsing", "meaning-misunderstood"],
      "vocabularyClusters": ["descriptions"]
    },
    {
      "id": "idiomatic-collocations",
      "label": "High-frequency idiomatic collocations",
      "description": "Verb-noun collocations that are non-compositional or register-sensitive: legge vekt på (emphasize), ta hensyn til (take into account), sette fokus på (focus on), komme til enighet (reach agreement), stille spørsmål ved (question). Mismatch signals non-native use.",
      "cefrLevel": "C1",
      "prerequisites": ["modal-particles", "discourse-cohesion"],
      "masteryThreshold": 75,
      "minAttempts": 25,
      "minDays": 7,
      "errorTags": ["meaning-misunderstood", "wrong-word-different-category", "wrong-word-same-category"],
      "vocabularyClusters": ["everyday-actions", "descriptions"]
    },
    {
      "id": "intertextual-register",
      "label": "Register shifting within text",
      "description": "Recognising and producing deliberate register shifts within a single text — formal to informal, narration to argument, assertion to rhetorical question. A marker of C1+ written fluency in Norwegian.",
      "cefrLevel": "C1",
      "prerequisites": ["register-formal", "rhetorical-structure"],
      "masteryThreshold": 75,
      "minAttempts": 20,
      "minDays": 10,
      "errorTags": ["meaning-misunderstood", "reading-parsing"],
      "vocabularyClusters": ["descriptions"]
    }
  ]
}
```

- [ ] **Step 2: Commit**

```bash
git add content/concepts/c1-graph.json
git commit -m "feat(content): add C1 concept graph (8 concepts)"
```

---

### Task 7: Create B1 sentence corpus

**Files:**
- Create: `content/sentences/b1.json`

The content-loader expects either a bare array or `{ sentences: [...] }`. Use a bare array. Each object is a `RawSentence` (snake_case keys). 3 sentences per concept, 30 total.

- [ ] **Step 1: Write the file**

```json
[
  {"id":"b1-s001","norwegian":"Jeg hadde spist da hun ringte.","english":"I had eaten when she called.","concept_ids":["pluperfect"],"vocab_clusters":["time-expressions","everyday-actions"],"error_tags_detectable":["verb-tense","verb-conjugation"],"cefr_level":"B1","difficulty":1,"exercise_types":["translation-to-norwegian","fill-in-blank"]},
  {"id":"b1-s002","norwegian":"De hadde allerede forlatt huset da politiet kom.","english":"They had already left the house when the police arrived.","concept_ids":["pluperfect"],"vocab_clusters":["time-expressions","everyday-actions"],"error_tags_detectable":["verb-tense","verb-conjugation"],"cefr_level":"B1","difficulty":2,"exercise_types":["translation-to-english","translation-to-norwegian"]},
  {"id":"b1-s003","norwegian":"Han fortalte at han hadde bodd i Oslo i ti år.","english":"He said that he had lived in Oslo for ten years.","concept_ids":["pluperfect","indirect-speech"],"vocab_clusters":["time-expressions","places"],"error_tags_detectable":["verb-tense"],"cefr_level":"B1","difficulty":2,"exercise_types":["translation-to-english","fill-in-blank"]},
  {"id":"b1-s004","norwegian":"Selv om det regner, går jeg på jobb.","english":"Even though it is raining, I go to work.","concept_ids":["complex-v2"],"vocab_clusters":["everyday-actions"],"error_tags_detectable":["word-order"],"cefr_level":"B1","difficulty":1,"exercise_types":["translation-to-norwegian","word-order"]},
  {"id":"b1-s005","norwegian":"Etter at vi hadde spist, dro vi hjem.","english":"After we had eaten, we went home.","concept_ids":["complex-v2","pluperfect"],"vocab_clusters":["time-expressions","everyday-actions"],"error_tags_detectable":["word-order","verb-tense"],"cefr_level":"B1","difficulty":2,"exercise_types":["translation-to-norwegian","word-order"]},
  {"id":"b1-s006","norwegian":"Fordi han var syk, kom han ikke på møtet.","english":"Because he was sick, he did not come to the meeting.","concept_ids":["complex-v2"],"vocab_clusters":["everyday-actions"],"error_tags_detectable":["word-order","negation-placement"],"cefr_level":"B1","difficulty":2,"exercise_types":["translation-to-norwegian","fill-in-blank"]},
  {"id":"b1-s007","norwegian":"Hadde jeg hatt tid, ville jeg ha hjulpet deg.","english":"Had I had time, I would have helped you.","concept_ids":["counterfactual-conditionals"],"vocab_clusters":["everyday-actions"],"error_tags_detectable":["verb-tense","word-order"],"cefr_level":"B1","difficulty":2,"exercise_types":["translation-to-english","translation-to-norwegian"]},
  {"id":"b1-s008","norwegian":"Hvis jeg visste svaret, ville jeg fortelle deg.","english":"If I knew the answer, I would tell you.","concept_ids":["counterfactual-conditionals"],"vocab_clusters":["everyday-actions"],"error_tags_detectable":["verb-tense"],"cefr_level":"B1","difficulty":1,"exercise_types":["translation-to-norwegian","fill-in-blank"]},
  {"id":"b1-s009","norwegian":"Om hun hadde øvd mer, ville hun ha bestått eksamen.","english":"If she had practised more, she would have passed the exam.","concept_ids":["counterfactual-conditionals"],"vocab_clusters":["everyday-actions"],"error_tags_detectable":["verb-tense","word-order"],"cefr_level":"B1","difficulty":3,"exercise_types":["translation-to-english","translation-to-norwegian"]},
  {"id":"b1-s010","norwegian":"Det er han som bor her.","english":"It is he who lives here.","concept_ids":["cleft-sentences"],"vocab_clusters":["everyday-actions","places"],"error_tags_detectable":["word-order"],"cefr_level":"B1","difficulty":1,"exercise_types":["translation-to-norwegian","fill-in-blank"]},
  {"id":"b1-s011","norwegian":"Det var i Bergen vi møttes første gang.","english":"It was in Bergen that we met for the first time.","concept_ids":["cleft-sentences"],"vocab_clusters":["places","time-expressions"],"error_tags_detectable":["word-order"],"cefr_level":"B1","difficulty":2,"exercise_types":["translation-to-english","translation-to-norwegian"]},
  {"id":"b1-s012","norwegian":"Det er jobben som stresser meg mest.","english":"It is the job that stresses me the most.","concept_ids":["cleft-sentences"],"vocab_clusters":["everyday-actions","descriptions"],"error_tags_detectable":["word-order","reading-parsing"],"cefr_level":"B1","difficulty":2,"exercise_types":["translation-to-norwegian","word-order"]},
  {"id":"b1-s013","norwegian":"Jeg begynte å lære norsk for to år siden.","english":"I started learning Norwegian two years ago.","concept_ids":["aspectual-verbs"],"vocab_clusters":["time-expressions","everyday-actions"],"error_tags_detectable":["verb-tense","modal-verb"],"cefr_level":"B1","difficulty":1,"exercise_types":["translation-to-norwegian","fill-in-blank"]},
  {"id":"b1-s014","norwegian":"Hun sluttet å røyke da hun ble gravid.","english":"She stopped smoking when she got pregnant.","concept_ids":["aspectual-verbs"],"vocab_clusters":["everyday-actions"],"error_tags_detectable":["verb-tense"],"cefr_level":"B1","difficulty":1,"exercise_types":["translation-to-english","translation-to-norwegian"]},
  {"id":"b1-s015","norwegian":"Holder du fortsatt på å skrive rapporten?","english":"Are you still writing the report?","concept_ids":["aspectual-verbs"],"vocab_clusters":["everyday-actions"],"error_tags_detectable":["verb-tense","modal-verb"],"cefr_level":"B1","difficulty":2,"exercise_types":["translation-to-english","fill-in-blank"]},
  {"id":"b1-s016","norwegian":"Han må ha glemt møtet.","english":"He must have forgotten the meeting.","concept_ids":["extended-modals"],"vocab_clusters":["everyday-actions"],"error_tags_detectable":["modal-verb","verb-tense"],"cefr_level":"B1","difficulty":1,"exercise_types":["translation-to-norwegian","fill-in-blank"]},
  {"id":"b1-s017","norwegian":"Du kan ha misforstått det hun sa.","english":"You may have misunderstood what she said.","concept_ids":["extended-modals"],"vocab_clusters":["everyday-actions"],"error_tags_detectable":["modal-verb","verb-tense"],"cefr_level":"B1","difficulty":2,"exercise_types":["translation-to-norwegian","translation-to-english"]},
  {"id":"b1-s018","norwegian":"De burde ha kommet for en time siden.","english":"They should have come an hour ago.","concept_ids":["extended-modals"],"vocab_clusters":["time-expressions","everyday-actions"],"error_tags_detectable":["modal-verb","verb-tense"],"cefr_level":"B1","difficulty":2,"exercise_types":["translation-to-norwegian","fill-in-blank"]},
  {"id":"b1-s019","norwegian":"Den skrevne rapporten er klar.","english":"The written report is ready.","concept_ids":["participle-adjectives"],"vocab_clusters":["everyday-actions","descriptions"],"error_tags_detectable":["adjective-agreement","verb-tense"],"cefr_level":"B1","difficulty":1,"exercise_types":["translation-to-norwegian","fill-in-blank"]},
  {"id":"b1-s020","norwegian":"Jeg fant et knust glass på gulvet.","english":"I found a broken glass on the floor.","concept_ids":["participle-adjectives"],"vocab_clusters":["everyday-objects","places"],"error_tags_detectable":["adjective-agreement"],"cefr_level":"B1","difficulty":2,"exercise_types":["translation-to-norwegian","fill-in-blank"]},
  {"id":"b1-s021","norwegian":"Det var en overraskende nyhet for alle.","english":"It was a surprising piece of news for everyone.","concept_ids":["participle-adjectives"],"vocab_clusters":["descriptions"],"error_tags_detectable":["adjective-agreement","spelling"],"cefr_level":"B1","difficulty":2,"exercise_types":["translation-to-english","fill-in-blank"]},
  {"id":"b1-s022","norwegian":"Hvem snakker du med?","english":"Who are you talking with?","concept_ids":["preposition-stranding"],"vocab_clusters":["everyday-actions"],"error_tags_detectable":["preposition","word-order"],"cefr_level":"B1","difficulty":1,"exercise_types":["translation-to-norwegian","fill-in-blank"]},
  {"id":"b1-s023","norwegian":"Det er noe jeg ikke kan leve uten.","english":"It is something I cannot live without.","concept_ids":["preposition-stranding","cleft-sentences"],"vocab_clusters":["everyday-actions","descriptions"],"error_tags_detectable":["preposition"],"cefr_level":"B1","difficulty":2,"exercise_types":["translation-to-english","translation-to-norwegian"]},
  {"id":"b1-s024","norwegian":"Huset de bor i er veldig gammelt.","english":"The house they live in is very old.","concept_ids":["preposition-stranding"],"vocab_clusters":["places","descriptions"],"error_tags_detectable":["preposition","reading-parsing"],"cefr_level":"B1","difficulty":2,"exercise_types":["translation-to-english","fill-in-blank"]},
  {"id":"b1-s025","norwegian":"Søknaden tar vanligvis to uker å behandle.","english":"The application usually takes two weeks to process.","concept_ids":["nominalization-basic"],"vocab_clusters":["time-expressions","everyday-actions"],"error_tags_detectable":["noun-gender","spelling"],"cefr_level":"B1","difficulty":1,"exercise_types":["translation-to-norwegian","fill-in-blank"]},
  {"id":"b1-s026","norwegian":"Hans oppførsel var uakseptabel.","english":"His behaviour was unacceptable.","concept_ids":["nominalization-basic"],"vocab_clusters":["descriptions"],"error_tags_detectable":["noun-gender","spelling"],"cefr_level":"B1","difficulty":2,"exercise_types":["translation-to-english","fill-in-blank"]},
  {"id":"b1-s027","norwegian":"Løsningen på problemet var enklere enn vi trodde.","english":"The solution to the problem was simpler than we thought.","concept_ids":["nominalization-basic"],"vocab_clusters":["descriptions","everyday-actions"],"error_tags_detectable":["noun-gender"],"cefr_level":"B1","difficulty":2,"exercise_types":["translation-to-english","translation-to-norwegian"]},
  {"id":"b1-s028","norwegian":"Det regner i dag. Likevel skal jeg gå tur.","english":"It is raining today. Nevertheless, I will go for a walk.","concept_ids":["discourse-connectives"],"vocab_clusters":["everyday-actions"],"error_tags_detectable":["wrong-word-same-category","word-order"],"cefr_level":"B1","difficulty":1,"exercise_types":["translation-to-norwegian","fill-in-blank"]},
  {"id":"b1-s029","norwegian":"Han er flink. Dessuten er han veldig snill.","english":"He is talented. Furthermore, he is very kind.","concept_ids":["discourse-connectives"],"vocab_clusters":["descriptions"],"error_tags_detectable":["wrong-word-same-category"],"cefr_level":"B1","difficulty":1,"exercise_types":["translation-to-norwegian","fill-in-blank"]},
  {"id":"b1-s030","norwegian":"Jeg liker kaffe. Derimot drikker hun bare te.","english":"I like coffee. On the other hand, she only drinks tea.","concept_ids":["discourse-connectives"],"vocab_clusters":["food-drink","descriptions"],"error_tags_detectable":["wrong-word-same-category","word-order"],"cefr_level":"B1","difficulty":2,"exercise_types":["translation-to-english","fill-in-blank"]}
]
```

- [ ] **Step 2: Commit**

```bash
git add content/sentences/b1.json
git commit -m "feat(content): add B1 sentence corpus (30 sentences)"
```

---

### Task 8: Create B2 sentence corpus

**Files:**
- Create: `content/sentences/b2.json`

- [ ] **Step 1: Write the file**

```json
[
  {"id":"b2-s001","norwegian":"Boken burde ha blitt lest for lenge siden.","english":"The book should have been read a long time ago.","concept_ids":["complex-passive"],"vocab_clusters":["everyday-objects","time-expressions"],"error_tags_detectable":["verb-tense","verb-conjugation"],"cefr_level":"B2","difficulty":2,"exercise_types":["translation-to-english","translation-to-norwegian"]},
  {"id":"b2-s002","norwegian":"Søknader behandles fortløpende etter mottaksdato.","english":"Applications are processed continuously in order of receipt.","concept_ids":["complex-passive"],"vocab_clusters":["everyday-actions"],"error_tags_detectable":["verb-conjugation","reading-parsing"],"cefr_level":"B2","difficulty":2,"exercise_types":["translation-to-english","fill-in-blank"]},
  {"id":"b2-s003","norwegian":"Det sies at han er den beste i klassen.","english":"It is said that he is the best in the class.","concept_ids":["complex-passive"],"vocab_clusters":["descriptions","everyday-actions"],"error_tags_detectable":["verb-conjugation"],"cefr_level":"B2","difficulty":1,"exercise_types":["translation-to-norwegian","fill-in-blank"]},
  {"id":"b2-s004","norwegian":"Leve kongen!","english":"Long live the king!","concept_ids":["subjunctive-fixed"],"vocab_clusters":["everyday-actions"],"error_tags_detectable":["verb-conjugation"],"cefr_level":"B2","difficulty":1,"exercise_types":["translation-to-english","translation-to-norwegian"]},
  {"id":"b2-s005","norwegian":"Gud velsigne deg på din reise.","english":"God bless you on your journey.","concept_ids":["subjunctive-fixed"],"vocab_clusters":["everyday-actions","places"],"error_tags_detectable":["verb-conjugation","meaning-misunderstood"],"cefr_level":"B2","difficulty":2,"exercise_types":["translation-to-english","fill-in-blank"]},
  {"id":"b2-s006","norwegian":"Om så skulle skje, er vi forberedt.","english":"Should that happen, we are prepared.","concept_ids":["subjunctive-fixed","complex-v2"],"vocab_clusters":["everyday-actions"],"error_tags_detectable":["verb-conjugation","word-order"],"cefr_level":"B2","difficulty":3,"exercise_types":["translation-to-english","fill-in-blank"]},
  {"id":"b2-s007","norwegian":"Det som overrasket meg mest, var stillheten.","english":"What surprised me most was the silence.","concept_ids":["complex-cleft"],"vocab_clusters":["descriptions"],"error_tags_detectable":["word-order","reading-parsing"],"cefr_level":"B2","difficulty":2,"exercise_types":["translation-to-english","translation-to-norwegian"]},
  {"id":"b2-s008","norwegian":"Det jeg ønsker meg er mer tid til familien.","english":"What I wish for is more time with the family.","concept_ids":["complex-cleft"],"vocab_clusters":["people-family","descriptions"],"error_tags_detectable":["word-order"],"cefr_level":"B2","difficulty":2,"exercise_types":["translation-to-english","fill-in-blank"]},
  {"id":"b2-s009","norwegian":"Det er nettopp dette problemet vi trenger å løse.","english":"This is precisely the problem we need to solve.","concept_ids":["complex-cleft"],"vocab_clusters":["descriptions","everyday-actions"],"error_tags_detectable":["word-order","reading-parsing"],"cefr_level":"B2","difficulty":3,"exercise_types":["translation-to-english","word-order"]},
  {"id":"b2-s010","norwegian":"Det innsendte dokumentet vil bli behandlet innen to uker.","english":"The submitted document will be processed within two weeks.","concept_ids":["register-formal","complex-passive"],"vocab_clusters":["everyday-actions"],"error_tags_detectable":["reading-parsing","meaning-misunderstood"],"cefr_level":"B2","difficulty":2,"exercise_types":["translation-to-english","fill-in-blank"]},
  {"id":"b2-s011","norwegian":"Vi ber om at eventuelle spørsmål rettes til vår kundeservice.","english":"We request that any questions be directed to our customer service.","concept_ids":["register-formal"],"vocab_clusters":["everyday-actions"],"error_tags_detectable":["meaning-misunderstood","reading-parsing"],"cefr_level":"B2","difficulty":3,"exercise_types":["translation-to-english"]},
  {"id":"b2-s012","norwegian":"Behandlingen av søknaden pågår for øyeblikket.","english":"The processing of the application is currently ongoing.","concept_ids":["register-formal","nominalization-basic"],"vocab_clusters":["everyday-actions","time-expressions"],"error_tags_detectable":["meaning-misunderstood"],"cefr_level":"B2","difficulty":2,"exercise_types":["translation-to-english","fill-in-blank"]},
  {"id":"b2-s013","norwegian":"Opplysningsplikten gjelder for alle arbeidstakere.","english":"The duty to inform applies to all employees.","concept_ids":["complex-word-formation"],"vocab_clusters":["everyday-actions"],"error_tags_detectable":["compound-word","noun-gender"],"cefr_level":"B2","difficulty":2,"exercise_types":["translation-to-english","fill-in-blank"]},
  {"id":"b2-s014","norwegian":"Samarbeidspartnerne møttes til et oppfølgingsmøte.","english":"The partners met for a follow-up meeting.","concept_ids":["complex-word-formation"],"vocab_clusters":["everyday-actions"],"error_tags_detectable":["compound-word","spelling"],"cefr_level":"B2","difficulty":2,"exercise_types":["translation-to-english","fill-in-blank"]},
  {"id":"b2-s015","norwegian":"Rettssikkerhetstiltak ble vedtatt av parlamentet.","english":"Rule-of-law measures were adopted by parliament.","concept_ids":["complex-word-formation","complex-passive"],"vocab_clusters":["everyday-actions"],"error_tags_detectable":["compound-word","noun-gender","spelling"],"cefr_level":"B2","difficulty":3,"exercise_types":["translation-to-english"]},
  {"id":"b2-s016","norwegian":"Mange studenter sliter med akademisk skriving. Dette skyldes ofte mangel på praksis.","english":"Many students struggle with academic writing. This is often due to lack of practice.","concept_ids":["discourse-cohesion"],"vocab_clusters":["descriptions","everyday-actions"],"error_tags_detectable":["pronoun-choice","reading-parsing"],"cefr_level":"B2","difficulty":2,"exercise_types":["translation-to-english","fill-in-blank"]},
  {"id":"b2-s017","norwegian":"Regjeringen la fram forslaget. Det ble møtt med sterk kritikk.","english":"The government put forward the proposal. It was met with strong criticism.","concept_ids":["discourse-cohesion"],"vocab_clusters":["descriptions","everyday-actions"],"error_tags_detectable":["pronoun-choice"],"cefr_level":"B2","difficulty":2,"exercise_types":["translation-to-english","fill-in-blank"]},
  {"id":"b2-s018","norwegian":"Vi trenger bedre løsninger. Slike finnes allerede i andre land.","english":"We need better solutions. Such already exist in other countries.","concept_ids":["discourse-cohesion"],"vocab_clusters":["descriptions"],"error_tags_detectable":["pronoun-choice","reading-parsing"],"cefr_level":"B2","difficulty":3,"exercise_types":["translation-to-english"]},
  {"id":"b2-s019","norwegian":"Det er jo ikke så enkelt som det ser ut.","english":"It is not as simple as it looks, you know.","concept_ids":["modal-particles"],"vocab_clusters":["descriptions","everyday-actions"],"error_tags_detectable":["meaning-misunderstood","wrong-word-same-category"],"cefr_level":"B2","difficulty":2,"exercise_types":["translation-to-english","fill-in-blank"]},
  {"id":"b2-s020","norwegian":"Det er vel best å vente og se hva som skjer.","english":"It is probably best to wait and see what happens.","concept_ids":["modal-particles"],"vocab_clusters":["everyday-actions"],"error_tags_detectable":["meaning-misunderstood"],"cefr_level":"B2","difficulty":2,"exercise_types":["translation-to-english","fill-in-blank"]},
  {"id":"b2-s021","norwegian":"Han sa det nok ikke med vilje.","english":"He probably did not say it on purpose.","concept_ids":["modal-particles"],"vocab_clusters":["everyday-actions","descriptions"],"error_tags_detectable":["meaning-misunderstood","negation-placement"],"cefr_level":"B2","difficulty":2,"exercise_types":["translation-to-english","fill-in-blank"]},
  {"id":"b2-s022","norwegian":"Selv om rapporten inneholder interessante funn, er den ikke tilstrekkelig dokumentert.","english":"Even though the report contains interesting findings, it is not sufficiently documented.","concept_ids":["complex-subordination"],"vocab_clusters":["descriptions","everyday-actions"],"error_tags_detectable":["word-order","negation-placement"],"cefr_level":"B2","difficulty":2,"exercise_types":["translation-to-english","word-order"]},
  {"id":"b2-s023","norwegian":"Det er ikke slik at alle som prøver, lykkes.","english":"It is not the case that all who try succeed.","concept_ids":["complex-subordination","complex-cleft"],"vocab_clusters":["descriptions"],"error_tags_detectable":["word-order","reading-parsing"],"cefr_level":"B2","difficulty":3,"exercise_types":["translation-to-english"]},
  {"id":"b2-s024","norwegian":"Det er viktig å huske at resultatene kan variere.","english":"It is important to remember that the results may vary.","concept_ids":["complex-subordination"],"vocab_clusters":["descriptions","everyday-actions"],"error_tags_detectable":["word-order"],"cefr_level":"B2","difficulty":2,"exercise_types":["translation-to-english","fill-in-blank"]}
]
```

- [ ] **Step 2: Commit**

```bash
git add content/sentences/b2.json
git commit -m "feat(content): add B2 sentence corpus (24 sentences)"
```

---

### Task 9: Create C1 sentence corpus

**Files:**
- Create: `content/sentences/c1.json`

- [ ] **Step 1: Write the file**

```json
[
  {"id":"c1-s001","norwegian":"Aldri har jeg sett noe så vakkert.","english":"Never have I seen anything so beautiful.","concept_ids":["stylistic-inversion"],"vocab_clusters":["descriptions"],"error_tags_detectable":["word-order"],"cefr_level":"C1","difficulty":2,"exercise_types":["translation-to-english","word-order"]},
  {"id":"c1-s002","norwegian":"Knapt hadde han talt ferdig, da applausen brøt løs.","english":"He had barely finished speaking when the applause broke out.","concept_ids":["stylistic-inversion"],"vocab_clusters":["time-expressions","everyday-actions"],"error_tags_detectable":["word-order","reading-parsing"],"cefr_level":"C1","difficulty":3,"exercise_types":["translation-to-english"]},
  {"id":"c1-s003","norwegian":"Bare i unntakstilfeller kan loven fravikes.","english":"Only in exceptional cases can the law be waived.","concept_ids":["stylistic-inversion","complex-passive"],"vocab_clusters":["descriptions"],"error_tags_detectable":["word-order"],"cefr_level":"C1","difficulty":3,"exercise_types":["translation-to-english","word-order"]},
  {"id":"c1-s004","norwegian":"En ytterligere sentralisering av beslutningsmyndigheten vil svekke lokaldemokratiet.","english":"A further centralisation of decision-making authority will weaken local democracy.","concept_ids":["complex-nominalization"],"vocab_clusters":["descriptions"],"error_tags_detectable":["noun-gender","compound-word","spelling"],"cefr_level":"C1","difficulty":3,"exercise_types":["translation-to-english"]},
  {"id":"c1-s005","norwegian":"Gjennomføringen av strukturreformer krever politisk vilje.","english":"The implementation of structural reforms requires political will.","concept_ids":["complex-nominalization"],"vocab_clusters":["descriptions","everyday-actions"],"error_tags_detectable":["noun-gender","spelling"],"cefr_level":"C1","difficulty":2,"exercise_types":["translation-to-english","fill-in-blank"]},
  {"id":"c1-s006","norwegian":"En anerkjennelse av problemets kompleksitet er første steg mot en løsning.","english":"An acknowledgement of the problem's complexity is the first step toward a solution.","concept_ids":["complex-nominalization"],"vocab_clusters":["descriptions"],"error_tags_detectable":["noun-gender","compound-word"],"cefr_level":"C1","difficulty":3,"exercise_types":["translation-to-english"]},
  {"id":"c1-s007","norwegian":"Jeg lurer på om han virkelig forstår konsekvensene.","english":"I wonder whether he truly understands the consequences.","concept_ids":["embedded-questions"],"vocab_clusters":["descriptions","everyday-actions"],"error_tags_detectable":["word-order","reading-parsing"],"cefr_level":"C1","difficulty":2,"exercise_types":["translation-to-english","fill-in-blank"]},
  {"id":"c1-s008","norwegian":"Det er uklart hvorvidt tiltaket vil ha ønsket effekt.","english":"It is unclear whether the measure will have the desired effect.","concept_ids":["embedded-questions"],"vocab_clusters":["descriptions"],"error_tags_detectable":["word-order","wrong-word-different-category"],"cefr_level":"C1","difficulty":3,"exercise_types":["translation-to-english","fill-in-blank"]},
  {"id":"c1-s009","norwegian":"Spørsmålet er ikke hvem som har rett, men hva som er best.","english":"The question is not who is right, but what is best.","concept_ids":["embedded-questions"],"vocab_clusters":["descriptions"],"error_tags_detectable":["word-order","reading-parsing"],"cefr_level":"C1","difficulty":3,"exercise_types":["translation-to-english"]},
  {"id":"c1-s010","norwegian":"Han er i ferd med å fullføre doktorgraden sin.","english":"He is in the process of completing his doctorate.","concept_ids":["aspectual-nuance"],"vocab_clusters":["everyday-actions","time-expressions"],"error_tags_detectable":["verb-tense","meaning-misunderstood"],"cefr_level":"C1","difficulty":2,"exercise_types":["translation-to-english","fill-in-blank"]},
  {"id":"c1-s011","norwegian":"Vi er på nippet til å nå klimamålene.","english":"We are on the verge of reaching the climate goals.","concept_ids":["aspectual-nuance"],"vocab_clusters":["descriptions","everyday-actions"],"error_tags_detectable":["verb-tense","meaning-misunderstood"],"cefr_level":"C1","difficulty":3,"exercise_types":["translation-to-english","fill-in-blank"]},
  {"id":"c1-s012","norwegian":"Situasjonen var i ferd med å eskalere da meglerne grep inn.","english":"The situation was about to escalate when the mediators intervened.","concept_ids":["aspectual-nuance"],"vocab_clusters":["time-expressions","everyday-actions"],"error_tags_detectable":["verb-tense","modal-verb"],"cefr_level":"C1","difficulty":3,"exercise_types":["translation-to-english"]},
  {"id":"c1-s013","norwegian":"Søknaden behandles fortløpende etter mottaksdato.","english":"Applications are processed continuously in order of receipt.","concept_ids":["formal-passive-choice","complex-passive"],"vocab_clusters":["everyday-actions"],"error_tags_detectable":["verb-conjugation","reading-parsing"],"cefr_level":"C1","difficulty":2,"exercise_types":["translation-to-english","fill-in-blank"]},
  {"id":"c1-s014","norwegian":"Det henvises til vedlagte dokumentasjon for ytterligere informasjon.","english":"Reference is made to the attached documentation for further information.","concept_ids":["formal-passive-choice"],"vocab_clusters":["everyday-actions","descriptions"],"error_tags_detectable":["verb-conjugation","meaning-misunderstood"],"cefr_level":"C1","difficulty":3,"exercise_types":["translation-to-english"]},
  {"id":"c1-s015","norwegian":"Resultatene presenteres i tabellform nedenfor.","english":"The results are presented in tabular form below.","concept_ids":["formal-passive-choice"],"vocab_clusters":["descriptions","everyday-actions"],"error_tags_detectable":["verb-conjugation"],"cefr_level":"C1","difficulty":2,"exercise_types":["translation-to-english","fill-in-blank"]},
  {"id":"c1-s016","norwegian":"Riktignok er økonomi viktig, men menneskelige hensyn bør veie tyngre.","english":"Admittedly, economics is important, but human considerations should carry more weight.","concept_ids":["rhetorical-structure"],"vocab_clusters":["descriptions"],"error_tags_detectable":["word-order","wrong-word-same-category"],"cefr_level":"C1","difficulty":2,"exercise_types":["translation-to-english","word-order"]},
  {"id":"c1-s017","norwegian":"Selv om argumentet har en viss tyngde, er det likevel utilstrekkelig.","english":"Although the argument has some merit, it is nevertheless insufficient.","concept_ids":["rhetorical-structure"],"vocab_clusters":["descriptions"],"error_tags_detectable":["word-order","reading-parsing"],"cefr_level":"C1","difficulty":3,"exercise_types":["translation-to-english","fill-in-blank"]},
  {"id":"c1-s018","norwegian":"Man kan hevde at tiltaket er nødvendig, men det er tvilsomt om det vil virke.","english":"One may argue that the measure is necessary, but it is doubtful whether it will work.","concept_ids":["rhetorical-structure","embedded-questions"],"vocab_clusters":["descriptions"],"error_tags_detectable":["reading-parsing","meaning-misunderstood"],"cefr_level":"C1","difficulty":3,"exercise_types":["translation-to-english"]},
  {"id":"c1-s019","norwegian":"Han legger stor vekt på ærlighet i alle sammenhenger.","english":"He places great emphasis on honesty in all contexts.","concept_ids":["idiomatic-collocations"],"vocab_clusters":["descriptions","everyday-actions"],"error_tags_detectable":["meaning-misunderstood","wrong-word-different-category"],"cefr_level":"C1","difficulty":2,"exercise_types":["translation-to-english","fill-in-blank"]},
  {"id":"c1-s020","norwegian":"Partene kom til enighet etter lange forhandlinger.","english":"The parties reached agreement after lengthy negotiations.","concept_ids":["idiomatic-collocations"],"vocab_clusters":["everyday-actions"],"error_tags_detectable":["meaning-misunderstood","wrong-word-same-category"],"cefr_level":"C1","difficulty":2,"exercise_types":["translation-to-english","fill-in-blank"]},
  {"id":"c1-s021","norwegian":"Det er viktig å ta hensyn til alle berørte parter.","english":"It is important to take into account all affected parties.","concept_ids":["idiomatic-collocations"],"vocab_clusters":["descriptions","everyday-actions"],"error_tags_detectable":["meaning-misunderstood","wrong-word-different-category"],"cefr_level":"C1","difficulty":3,"exercise_types":["translation-to-english","fill-in-blank"]},
  {"id":"c1-s022","norwegian":"Formelt sett er saken avsluttet — men er den egentlig det?","english":"Formally speaking, the matter is closed — but is it really?","concept_ids":["intertextual-register"],"vocab_clusters":["descriptions","everyday-actions"],"error_tags_detectable":["meaning-misunderstood","reading-parsing"],"cefr_level":"C1","difficulty":3,"exercise_types":["translation-to-english"]},
  {"id":"c1-s023","norwegian":"Vi snakker mye om bærekraft. Hva mener vi egentlig med det?","english":"We talk a lot about sustainability. What do we actually mean by it?","concept_ids":["intertextual-register"],"vocab_clusters":["descriptions"],"error_tags_detectable":["meaning-misunderstood"],"cefr_level":"C1","difficulty":2,"exercise_types":["translation-to-english","fill-in-blank"]},
  {"id":"c1-s024","norwegian":"La oss se på tallene. De forteller en annen historie enn vi ventet.","english":"Let us look at the numbers. They tell a different story than we expected.","concept_ids":["intertextual-register","rhetorical-structure"],"vocab_clusters":["descriptions","everyday-actions"],"error_tags_detectable":["reading-parsing","meaning-misunderstood"],"cefr_level":"C1","difficulty":3,"exercise_types":["translation-to-english"]}
]
```

- [ ] **Step 2: Commit**

```bash
git add content/sentences/c1.json
git commit -m "feat(content): add C1 sentence corpus (24 sentences)"
```

---

### Task 10: Add C1 diagnostic questions

**Files:**
- Modify: `src/lib/diagnostic/questions.ts`

Append 6 C1 questions after the existing B2 block. Difficulty 0.6–1.0.

- [ ] **Step 1: Append to the DIAGNOSTIC_QUESTIONS array (before the closing `]`)**

```ts
  // ── C1 ─────────────────────────────────────────────────────────────────
  {
    id: 'c1-q1',
    cefrLevel: 'C1',
    conceptId: 'stylistic-inversion',
    difficulty: 0.6,
    prompt: 'Which sentence uses stylistic inversion correctly after a negative adverb?',
    options: [
      'Aldri jeg har sett maken.',
      'Aldri har jeg sett maken.',
      'Jeg aldri har sett maken.',
      'Har jeg aldri sett maken.',
    ],
    correctIndex: 1,
    explanation: 'Fronting a negative adverb (aldri) triggers subject–verb inversion in the main clause: "Aldri har jeg…"',
  },
  {
    id: 'c1-q2',
    cefrLevel: 'C1',
    conceptId: 'embedded-questions',
    difficulty: 0.7,
    prompt: 'Choose the correct formal register form: "It is unclear ___ the measure will have the desired effect."',
    options: [
      'om … vil ha',
      'hvorvidt … vil ha',
      'at … vil ha',
      'hvorvidt … ville ha',
    ],
    correctIndex: 1,
    explanation: '"Hvorvidt" (whether) is the formal register choice for embedded yes/no questions. "Om" is correct but informal. The verb stays in present tense because the embedding clause is in present tense.',
  },
  {
    id: 'c1-q3',
    cefrLevel: 'C1',
    conceptId: 'modal-particles',
    difficulty: 0.75,
    prompt: '"Det er ___ ikke så enkelt som det ser ut." — which particle signals shared knowledge / "as you know"?',
    options: ['vel', 'nok', 'jo', 'da'],
    correctIndex: 2,
    explanation: '"Jo" marks information as mutually known or self-evident: "as you know / obviously". "Vel" hedges, "nok" expresses probability, "da" gives mild emphasis.',
  },
  {
    id: 'c1-q4',
    cefrLevel: 'C1',
    conceptId: 'complex-nominalization',
    difficulty: 0.8,
    prompt: 'Which is the correct nominalized form of "å gjennomføre" (to implement) in a formal noun phrase?',
    options: [
      'gjennomførelsen',
      'gjennomføringen',
      'gjennomføret',
      'gjennomført',
    ],
    correctIndex: 1,
    explanation: 'Process verbs take -ing: gjennomføring (implementation). -else forms result/abstract nouns from a narrower verb set. -et is a neuter definite suffix, not a nominalizer.',
  },
  {
    id: 'c1-q5',
    cefrLevel: 'C1',
    conceptId: 'rhetorical-structure',
    difficulty: 0.85,
    prompt: 'Which sentence correctly expresses a concession followed by a counter-argument?',
    options: [
      'Riktignok er det dyrt, men det er verdt det.',
      'Selv det er dyrt, men det er verdt det.',
      'Riktignok er dyrt det, men verdt det er.',
      'Det er dyrt riktignok, men likevel verdt.',
    ],
    correctIndex: 0,
    explanation: '"Riktignok" (admittedly) fronts the concession clause and triggers V2. The main clause follows with "men" + counter-argument in normal order.',
  },
  {
    id: 'c1-q6',
    cefrLevel: 'C1',
    conceptId: 'formal-passive-choice',
    difficulty: 0.9,
    prompt: 'In formal written Norwegian, which passive form is preferred for habitual/general processes: "Søknaden ___ i løpet av to uker."',
    options: [
      'blir behandlet',
      'behandles',
      'er behandlet',
      'ble behandlet',
    ],
    correctIndex: 1,
    explanation: 'The -s passive (behandles) is preferred in formal/bureaucratic Norwegian for ongoing or habitual processes. Bli passive (blir behandlet) describes specific events; er behandlet is present perfect; ble behandlet is past.',
  },
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit 2>&1 | grep -v "node_modules"
```

Expected: no new errors from this task.

- [ ] **Step 3: Commit**

```bash
git add src/lib/diagnostic/questions.ts
git commit -m "feat(diagnostic): add 6 C1 questions to IRT bank"
```

---

### Task 11: Extend content loader

**Files:**
- Modify: `src/lib/content-loader.ts`

- [ ] **Step 1: Add b1/b2/c1 to the load list**

```ts
// Replace the two-file load block:
const a1 = readJson(path.join(contentDir, 'a1.json'))
const a2 = readJson(path.join(contentDir, 'a2.json'))
const b1 = readJson(path.join(contentDir, 'b1.json'))
const b2 = readJson(path.join(contentDir, 'b2.json'))
const c1 = readJson(path.join(contentDir, 'c1.json'))

// Replace the spread in the loop:
for (const raw of [...a1, ...a2, ...b1, ...b2, ...c1]) {
```

Also null-out the cache constant so the server picks up new files on next cold start (the existing `let cached` singleton already handles this — no change needed there).

- [ ] **Step 2: Verify build passes**

```bash
npx tsc --noEmit 2>&1 | grep -v "node_modules"
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/content-loader.ts
git commit -m "feat(content-loader): load B1, B2, C1 sentence files"
```

---

### Task 12: Update session graph routing

**Files:**
- Modify: `src/hooks/useSession.ts`

- [ ] **Step 1: Add B1/B2/C1 graph imports (after the existing a1/a2 imports)**

```ts
import b1GraphJson from '@content/concepts/b1-graph.json';
import b2GraphJson from '@content/concepts/b2-graph.json';
import c1GraphJson from '@content/concepts/c1-graph.json';

const b1Graph = b1GraphJson as ConceptGraph;
const b2Graph = b2GraphJson as ConceptGraph;
const c1Graph = c1GraphJson as ConceptGraph;
```

- [ ] **Step 2: Replace the hard-coded activeGraph selection in `startNewSession`**

```ts
// Remove:
const activeGraph = fingerprint.currentLevel === 'A2' ? a2Graph : a1Graph;

// Add (above the generateSession call):
const GRAPH_BY_LEVEL: Record<string, ConceptGraph> = {
  A1: a1Graph, A2: a2Graph, B1: b1Graph, B2: b2Graph, C1: c1Graph,
};
const activeGraph = GRAPH_BY_LEVEL[fingerprint.currentLevel] ?? a1Graph;
```

- [ ] **Step 3: Type-check**

```bash
npx tsc --noEmit 2>&1 | grep -v "node_modules"
```

- [ ] **Step 4: Commit**

```bash
git add src/hooks/useSession.ts
git commit -m "feat(session): route to correct concept graph by CEFR level"
```

---

### Task 13: Update OnboardingFlow

**Files:**
- Modify: `src/components/onboarding/OnboardingFlow.tsx`

Three changes: add C1 to the first-concepts map, remove the B2 cap, fix the mastery seed spread.

- [ ] **Step 1: Add C1 entry to `FIRST_CONCEPTS_BY_LEVEL`**

```ts
// Add after the B2 entry:
C1: [
  { label: 'Stilistisk inversjon', sub: '~9 min' },
  { label: 'Formell passiv', sub: '~8 min' },
],
```

- [ ] **Step 2: Remove the B2 cap in `seedFingerprintFromDiagnostic`**

```ts
// Remove this line:
fp.currentLevel = result.rawScore >= 0.55 ? 'A2' : result.cefrLevel

// Replace with:
fp.currentLevel = result.cefrLevel
```

- [ ] **Step 3: Fix the concept mastery seed — add `srsLevel` and `nextReviewAt`**

```ts
// In the for loop over result.conceptSeeds, update the assignment:
fp.conceptMastery[conceptId] = {
  conceptId,
  rawScore: seed.rawScore,
  confidenceScore: seed.confidenceScore,
  decayedScore: seed.decayedScore,
  attemptCount: seed.attemptCount,
  correctCount: seed.correctCount,
  uniqueDaysActive: seed.uniqueDaysActive,
  lastAttemptAt: seed.lastAttemptAt ?? now,
  lastCorrectAt: seed.lastCorrectAt,
  streak: seed.streak,
  recentOutcomes: seed.recentOutcomes,
  srsLevel: seed.srsLevel,
  nextReviewAt: seed.nextReviewAt,
}
```

- [ ] **Step 4: Type-check — expect zero errors from this file now**

```bash
npx tsc --noEmit 2>&1 | grep "OnboardingFlow"
```

Expected: no output (no errors).

- [ ] **Step 5: Commit**

```bash
git add src/components/onboarding/OnboardingFlow.tsx
git commit -m "feat(onboarding): enable C1 placement, remove B2 cap, fix mastery seed types"
```

---

### Task 14: Add C1 label to DiagnosticQuiz

**Files:**
- Modify: `src/components/onboarding/DiagnosticQuiz.tsx`

- [ ] **Step 1: Add C1 to `CEFR_LABELS`**

```ts
// Replace the existing CEFR_LABELS constant:
const CEFR_LABELS: Record<CEFRLevel, string> = {
  A1: 'Beginner',
  A2: 'Elementary',
  B1: 'Intermediate',
  B2: 'Upper Intermediate',
  C1: 'Advanced',
}
```

- [ ] **Step 2: Final type-check — should be clean**

```bash
npx tsc --noEmit 2>&1 | grep -v "node_modules"
```

Expected: only the pre-existing `repair-loop.ts` `unspecified` error remains (unrelated to this feature). Zero errors from any file touched in this plan.

- [ ] **Step 3: Commit**

```bash
git add src/components/onboarding/DiagnosticQuiz.tsx
git commit -m "feat(onboarding): add C1 label to diagnostic quiz UI"
```

---

### Task 15: Smoke-test end-to-end

- [ ] **Step 1: Start dev server**

```bash
npm run dev
```

- [ ] **Step 2: Run through placement as a new user**

Navigate to `/onboarding`. Answer all 15 diagnostic questions with correct answers to drive the estimate toward C1 (≥ 0.82). Confirm the ready screen shows "C1" and "Stilistisk inversjon" in the first session preview.

- [ ] **Step 3: Run through placement as a beginner**

Open a private window. Answer all questions incorrectly to drive estimate below 0.22. Confirm ready screen shows "A1".

- [ ] **Step 4: Verify session routing for a B1 user**

In browser devtools or IndexedDB, set `currentLevel` to `'B1'` on the fingerprint. Start a session. Open network tab and confirm no 404s on the B1 graph import.

- [ ] **Step 5: Final commit**

```bash
git add -A
git commit -m "feat: C1 diagnostic placement — full stack (types, engine, graphs, corpus, routing)"
```
