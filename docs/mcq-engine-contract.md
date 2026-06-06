# Objective MCQ Engine — Contract & Plan (architecture pass, no code)

**Status:** proposal / contract only. 2026-06-05. Produced by the main session
(the `architect` agent returned empty twice — OMC handoff swallows its body and the
task was outside its judgment-only role; see memory `project_qa_gate_agents`).

Grounded in live code, not docs. Every claim cites a file.

---

## 0. DIRECTION / SCOPE FLAGS (blocking — user decides before any build)

1. **MCQ is recognition; NorskCoach is production-first.** The raw request ("an MCQ
   engine used across diagnostic, daily økter, uke-sjekk, reading/journal") would, if
   applied to the økt and uke-sjekk, **convert production surfaces into recognition** —
   a direct North-Star violation (CLAUDE.md: "A pure-recognition feature fails this test
   unless wrapped with an output requirement"). **Recommendation: scope the MCQ engine to
   ASSESSMENT surfaces only (diagnostic, recalibration) + the planned B2
   nuance-discrimination + any recognition step that is explicitly WRAPPED by a required
   production step. Do NOT MCQ-ify the økt or uke-sjekk.** ⛔ Confirm this scope before building.

2. **There is essentially ONE real MCQ surface today.** `DiagnosticQuestion`
   (`src/lib/diagnostic/questions.ts`) is the only true multiple-choice format in the
   codebase; recalibration reuses it (`src/lib/diagnostic/recalibration.ts`). uke-sjekk
   does **not** use MCQ — it builds `SessionItem`s and renders production exercises via
   `ExerciseCard` (`src/lib/weekly-check.ts`, `src/components/weekly/WeeklyCheckScreen.tsx:192`).
   So this is **less "unify many MCQ engines" and more "upgrade the one we have + give it a
   contract so the planned B2 set can reuse it."** Right-sizing the work matters (Rule 1: depth not breadth).

3. **The highest-value upgrade is the moat hook, not the engine.** The diagnostic records a
   wrong answer as "incorrect for `conceptId`" — it has **no error-tag-per-distractor**, so a
   wrong pick cannot feed root-cause diagnosis (the moat). Adding `errorTag` per distractor is
   the single change that makes MCQ serve the moat rather than just place the learner. This is
   **content work (linguist-gated)**, not engine work.

4. **Don't duplicate the just-cleaned grading/fingerprint pipeline.** The diagnostic writes
   via a bespoke `conceptSeeds` path (`engine.ts: computeResult`), separate from the session's
   `updateConceptMastery` + error-log write (`src/hooks/useFingerprint.ts`, `src/engine`). The
   contract should route MCQ answers through the **same** mastery+error-log write the session
   uses, so MCQ outcomes and exercise outcomes are one pipeline.

---

## 1. MCQ scope per surface

| Surface | Is MCQ the right tool? | "Objective" means here | Marking | Negative marking | Partial credit |
|---|---|---|---|---|---|
| **Diagnostic** | ✅ yes (placement assessment) | 4 options, single correct, EN stem + NO options OK by design | binary correct/incorrect, IRT-weighted | **No** (phantom errors corrupt the fingerprint) | No |
| **Recalibration** | ✅ yes (re-placement) | same as diagnostic (reuses the bank) | binary, IRT | No | No |
| **B2 nuance-discrimination** (planned, memory `project_phase3_b2_vocab` 3.6) | ✅ yes — **only if wrapped** by a production step | pick the right word/register in context; 3–4 options, single correct | binary | No | No |
| **Reading follow-up** | ⚠️ optional comprehension check, post-read | 3–4 options, single correct, comprehension not grammar | binary | No | No |
| **Daily økt drills** | ❌ no — production-first | n/a (translation/word-order/cloze/fill — output, not choice) | — | — | — |
| **uke-sjekk** | ❌ no — already production via `ExerciseCard` | n/a | — | — | — |
| **Journal follow-up** | ❌ no — journal is free production | n/a | — | — | — |

**Negative marking: never.** A wrong guess must not subtract mastery beyond the normal EMA
step; and an *abstention* must log nothing (precedent: roleplay-skip false-error fix, memory
`project_engine_moat_gaps` 2026-06-03). **Partial credit: defer** — single-correct only in v1;
multi-correct is allowed by the schema but not graded with partial credit until a surface needs it.

---

## 2. Existing vs missing map

| Pipeline piece | State | Evidence |
|---|---|---|
| MCQ question schema | **EXISTS — HAND-ROLLED (diagnostic only)** | `DiagnosticQuestion {prompt, options[], correctIndex, explanation}` `src/lib/diagnostic/questions.ts` |
| MCQ item bank | **EXISTS — static, diagnostic only** | `DIAGNOSTIC_QUESTIONS` array; reused by recalibration |
| MCQ grading | **EXISTS — HAND-ROLLED** | IRT update `engine.ts: updateEstimate/recordAnswer` — separate from session grading |
| Error-tag-per-distractor (moat hook) | **MISSING** | no field on `DiagnosticQuestion`; wrong pick = generic "incorrect for concept" |
| Explanation/feedback template | **EXISTS — single string** | `DiagnosticQuestion.explanation` (one blob; no per-distractor, no immediate/post split) |
| Difficulty tagging | **EXISTS — TWO incompatible scales** | diagnostic `difficulty: 0–1` (IRT) vs content `DifficultyTier = 1\|2\|3` (`src/types/content.ts:5`) |
| Concept IDs | **EXISTS — UNIFIED** | `conceptId` references the same concept graph the session uses |
| Canonical error taxonomy | **EXISTS — UNIFIED** | `src/types/taxonomy.ts` (canonical-17 + `unspecified`) — ready to key distractors |
| Fingerprint write | **EXISTS — HAND-ROLLED (split)** | diagnostic → `conceptSeeds` (`engine.ts: computeResult`); session → `updateConceptMastery`+errorlog (`useFingerprint.ts`) |
| Accepted-alternative precedent | **EXISTS (production side)** | cloze `gap.acceptedAnswers` `src/lib/cloze.ts`; `checkAnswerWithAlternatives` `src/lib/answer.ts` — pattern to mirror for MCQ option ids |
| Reusable MCQ UI component | **MISSING** | diagnostic UI is bespoke in `DiagnosticQuiz.tsx`; nothing reusable for B2 set |
| AI generation of MCQ | **MISSING** | `generate` action exists for sentences (`src/app/api/ai/route.ts`) but no MCQ recipe/validator |

**Unified:** concept IDs, error taxonomy. **Hand-rolled per surface:** schema, bank, grading,
fingerprint write (diagnostic vs session are two pipelines). **Missing:** the moat hook,
a reusable component, AI generation, a single difficulty scale.

---

## 3. The single versioned MCQ contract

```ts
// src/types/mcq.ts  (proposed)
import type { CEFRLevel } from '@/types/fingerprint'
import type { DifficultyTier } from '@/types/content'
import type { ErrorTag } from '@/types/taxonomy'

export type MCQVersion = 1

export type MCQPurpose =
  | 'diagnostic'             // placement; IRT-scored
  | 'recalibration'          // periodic re-placement; IRT-scored
  | 'nuance-discrimination'  // B2 lexical/register choice — MUST be wrapped by production
  | 'wrapped-recognition'    // any recognition step that a required production step follows

export interface MCQOption {
  id: string                 // stable within item: 'a' | 'b' | 'c' | 'd'
  text: string               // Norwegian on learning/assessment options (EN only for meta)
  isCorrect: boolean         // supports single OR multi-correct
  /** MOAT HOOK: the canonical-17 error this DISTRACTOR represents. Omit on correct
   *  option(s). On a wrong pick the engine logs THIS tag, not a generic "wrong". */
  errorTag?: ErrorTag
  /** optional micro-feedback shown when THIS option is picked */
  feedback?: string
}

export interface MCQItem {
  mcqVersion: MCQVersion
  id: string
  purpose: MCQPurpose
  conceptIds: string[]       // ≥1, references the concept graph (unify with session)
  cefrLevel: CEFRLevel
  difficultyTier: DifficultyTier        // 1|2|3 — the unified content scale
  /** assessment-only continuous difficulty for IRT (0 easy → 1 hard). Diagnostic/
   *  recalibration keep this; learning surfaces ignore it. */
  irtDifficulty?: number
  stem: string                          // the prompt/question
  stemLang: 'no' | 'en'                 // EN allowed on assessment surfaces by design
  options: MCQOption[]                  // 3–4 typical
  multiCorrect: boolean                 // default false; partial credit NOT graded in v1
  explanation: {
    correct: string                     // post-answer: why the key is right
    perDistractor?: Record<string, string>  // optional, keyed by option id
  }
  source: 'authored' | 'generated'
  validatedBy: 'linguist' | 'mechanical' | 'none'
}
```

**Marking:** binary per item (`every isCorrect-picked && no incorrect-picked`). No negative
marking. Multi-correct stored but graded all-or-nothing in v1.

**Migration of `DiagnosticQuestion` → `MCQItem`:** pure adapter, no data loss —
`prompt→stem`, `options:string[]`+`correctIndex` → `options:MCQOption[]` (set `isCorrect` on the
keyed index), `difficulty(0–1)→irtDifficulty` AND derive `difficultyTier` (`<0.34→1, <0.67→2,
else 3`), `explanation→explanation.correct`, `conceptId→conceptIds:[id]`, `purpose:'diagnostic'`,
`stemLang:'en'|'no'` as authored, `source:'authored'`, `validatedBy:'linguist'`. The **one new
content field** — `errorTag` per distractor — is added by a linguist-gated pass, not the adapter.

---

## 4. Generation + validation + fingerprint pipeline

**Authoring:** assessment MCQ is **authored-first**. A diagnostic with a wrong answer key is
worse than no diagnostic, and the bank is finite (~static), so AI generation here is *low
priority*. AI may *draft candidate* `MCQItem`s for the B2 nuance set, but:

- **Validation gates (every generated MCQ, before live):**
  1. `validateNorwegianOutput` on Norwegian options (`src/ai/validate.ts`).
  2. **Key integrity** — exactly one `isCorrect` unless `multiCorrect`; the keyed option is
     actually correct; no two options identical.
  3. **Distractor quality** — every distractor carries a plausible canonical-17 `errorTag`
     (forces the author/model to justify why it's a tempting wrong answer; rejects filler distractors).
  4. **`norwegian-linguist` gate** (now confirmed working — return-inline) before seeding.
     Mechanical gate alone passes ~34% of content a linguist rejects (memory
     `project_gen_gate_insufficient`).

- **AI paths (mirror the existing hybrid `generate`):** desktop **WebLLM**
  (`src/ai/webllm.ts`) and server **Groq** (`src/app/api/ai/route.ts` `handleGenerate`, JSON
  mode) share one recipe; both run gates 1–4. **No-AI fallback:** the **authored static bank**
  (always present — diagnostic already ships static). MCQ never hard-depends on AI.

**Fingerprint connection (unify, don't fork):** on answer, for each `conceptId`:
- call the session's `updateConceptMastery(conceptId, correct, …)` (`src/engine`) — same EMA the
  økt uses, so MCQ and exercises move one score;
- on **wrong**, log one error to `recentErrors`/error-log with the **chosen distractor's
  `errorTag`** (`'unspecified'` if absent) — this is what feeds root-cause diagnosis;
- on **abstention/skip**, log **nothing** (no phantom error);
- diagnostic/recalibration additionally keep the IRT estimate for the placement band.
  (Today the diagnostic only seeds `conceptSeeds` and never logs a per-distractor error — that
  gap is why placement doesn't feed diagnosis.)

---

## 5. UI integration + engine→UI expression gaps

| Surface | User sees | Explanation timing | "Objective" feedback |
|---|---|---|---|
| Diagnostic / recalibration | EN stem, 4 NO options, progress | **immediate** per question | correct ✓ / wrong ✗ + the keyed answer; **(new)** "Dette tester: «concept»" and on wrong "Du valgte X → «error label»" |
| B2 nuance-discrimination | NO stem in context, 3–4 NO options | immediate, then **required production follow-up** | correct / "nesten" (almost — close distractor) / wrong + label |
| Reading follow-up | short NO comprehension Q | post-passage | correct / wrong + which idea was missed |

**Engine→UI gaps (engine knows, UI hides):**
- **Concept** — engine knows `conceptId`; diagnostic UI never names it. Surface "Dette tester: …".
- **Error label on a wrong pick** — once `errorTag`-per-distractor exists, show the human label
  (e.g. "ordstilling") so feedback is diagnostic, not just "feil".
- **"Almost" state** — schema's per-distractor `feedback` enables a "nesten" tier for
  near-miss distractors; no surface shows it today.
- **Difficulty/selectionReason** — minor; optional coach-context, not learner-facing.

---

## 6. Prioritized implementation tasks (hand to Solve / Feature-to-Frontend)

1. **Define `MCQItem` v1 type + runtime validator** (`src/types/mcq.ts` + zod/guard). Foundation; everything depends on it. → Solve. *(no dependency)*
2. **Adapter: `DiagnosticQuestion` → `MCQItem`** preserving IRT (`irtDifficulty`) and deriving `difficultyTier`. Diagnostic + recalibration read the new shape. → Solve. *(dep: 1)*
3. **Moat hook — add `errorTag` per distractor to the diagnostic bank.** Content pass, **`content-author` draft → `norwegian-linguist` gate**. The change that makes placement feed diagnosis. → content pipeline. *(dep: 1)*
4. **Unify the MCQ fingerprint write** — route MCQ answers through `updateConceptMastery` + per-distractor error-log (replace/augment `conceptSeeds`-only); abstention logs nothing. → Solve. *(dep: 1, 3)*
5. **Single `<MCQCard>` presentational component** — stem, options, immediate correct/almost/wrong+label feedback, post-answer explanation; reused by diagnostic, recalibration, future B2. → Feature-to-Frontend. *(dep: 1)*
6. **Engine→UI expression** — surface concept name + error label on MCQ feedback. → Feature-to-Frontend. *(dep: 3, 5)*
7. **(Gated behind Flag 1 approval) B2 nuance-discrimination MCQ set + required production wrapper** — authored set, linguist-gated, with the mandatory output step so it stays north-star-compliant. → Solve + content. *(dep: 1–6)*

**Suggested sequence:** 1 → 3 (parallel: 2, 5) → 4 → 6 → 7. Tasks 1–6 *upgrade what exists* (depth);
task 7 is new surface and stays gated until Flag 1 is resolved.
