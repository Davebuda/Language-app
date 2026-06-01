# Cloze Passage — Design Spec

**Date:** 2026-06-01
**Status:** Design — pending user review (no implementation started)
**Type:** Net-new exercise type (first pushed-output / discourse-level exercise). P0 per `.scout/2026-05-28-norskcoach-content-overhaul.md`.
**Sequencing:** Approved after B1 (mobile silent-substitution fix) shipped. User overrode the architect's defer to build cloze now.

---

## 1. Goal & non-goals

**Goal:** Add a **cloze passage** exercise — a coherent 3–5 sentence Norwegian text with concept-targeted gaps the learner **types** into — as NorskCoach's first discourse-level, production-oriented exercise. It must feed the mistake fingerprint and repair loop **per gap**, traced end-to-end (Operating Rule 8).

**Non-goals (explicit scope fence):**
- No guided/parallel composition, dictogloss, or any other new type. Cloze only.
- No AI-generated passages in v1 (that depends on Gap B/B2 server-generate, which is deferred). v1 is **100% non-AI**.
- No algorithmic gap-selection (spaCy etc.) — gaps are author-marked in v1.
- No change to existing exercise types.

---

## 2. Locked design decisions

| Decision | Choice | Rationale |
|---|---|---|
| Input model (375px) | **A — typed inline gaps**, whole passage, single "Sjekk svar" | Most authentic discourse cloze; typing = production (north star). Recognition (word-bank) rejected. |
| Engine mapping | **Option 1 — one passage `SessionItem` emits N `ExerciseResult`s** | Preserves per-gap diagnosis (the moat); bounded engine change. |
| Content source | **Approach 1 — hand-authored coherent passages, author-marked gaps** | True discourse text; non-AI; works on every device; honest. |
| AI | **None in v1** | Deterministic per-gap grading + existing repair templates. AI passage-generation deferred until B2 lands. |

---

## 3. Data model

New content kind, stored separately from single sentences.

**Location:** `content/passages/{a1,a2,b1,b2}.json` (mirrors `content/sentences/`). Loaded by a new `content/passages` loader analogous to `content-loader.ts`.

**`ClozePassage` (camelCase runtime type; snake_case in JSON like sentences):**
```ts
interface ClozePassage {
  id: string;
  cefrLevel: CEFRLevel;
  primaryConceptId: string;        // the concept this passage chiefly targets (for scheduling/selectionReason)
  title?: string;                  // optional short Norwegian label (not shown mid-exercise)
  englishGloss: string;            // full-passage English hint (Norwegian-dominant: shown small/muted)
  segments: ClozeSegment[];        // ordered text + gaps that compose the passage
  difficulty: DifficultyTier;
}

type ClozeSegment =
  | { kind: 'text'; value: string }                 // literal Norwegian text between gaps
  | { kind: 'gap'; answer: string;                  // the correct word/phrase the learner types
      acceptedAnswers?: string[];                   // optional equivalents (checkAnswer-style)
      conceptId: string;                            // which concept THIS gap targets
      errorTag: ErrorTag }                          // tag logged on a wrong answer
```

A passage renders by walking `segments` in order: `text` → literal, `gap` → an inline input. `primaryConceptId` drives scheduling; each gap's own `conceptId`/`errorTag` drive the per-gap fingerprint write. Gaps may target the primary concept and (for interleaving) earlier-mastered concepts.

**Why a segment list, not a `___`-in-string + answers array:** explicit gap objects carry per-gap `conceptId`/`errorTag` (required for Rule 8 per-gap diagnosis) and avoid brittle string parsing. This is the cloze analogue of the single-sentence `notes`-answer pattern, generalized to N gaps.

---

## 4. Exercise type registration

- Add `'cloze-passage'` to the `ExerciseType` union (`src/types/session.ts`).
- `ExerciseCard` routes `cloze-passage` → new `ClozePassageExercise` component.
- **Content resolution:** the `contentCache` (`itemId → ResolvedContent`) is sentence-shaped. Cloze items resolve to a `ClozePassage`, not a `Sentence`. Resolution widens to `ResolvedContent | ResolvedClozePassage`; `ClozePassageExercise` consumes the passage. `resolveItem` gains a cloze branch that draws a passage by `primaryConceptId` + level + not-passed (reusing the existing `passedSentenceIds` filter keyed by passage id). Single-sentence resolution is unchanged.

---

## 5. Engine path (Rule 8 trace — the load-bearing part)

**One passage `SessionItem` → on submit, N results.**

New `submitClozeResults(results: ExerciseResult[])` in `useSession.ts` (sibling to `submitResult`):
1. For each gap result: `recordFingerprintResult(result)` → mastery EMA update + error-log write for that gap's `conceptId`/`errorTag` (identical to fill-in-blank's single write, ×N).
2. Emit one `exercise_result` event per gap (anonymized), plus one `cloze_submitted` summary event.
3. For each **wrong** gap: build a repair via `buildRepairPlan` + `makeRepairItems`, and **inject the repair items after the passage** (reusing the existing injection mechanism). Multiple wrong gaps → multiple repairs, processed sequentially after the passage — same machinery as a wrong single-sentence answer, just queued.
4. Advance past the passage once repairs (if any) are injected.

**End-to-end trace (must be verified live before ship):** type wrong answer in a gap → `ExerciseResult{conceptId, errorTag, correct:false}` → `recordFingerprintResult` (error log entry lands; mastery for that concept changes) → repair item injected → retry → SRS state updates for that concept. Confirmed in a real session, not in theory.

**Passed-passage tracking:** a passage counts as "passed" (added to `passedSentenceIds` by its passage id) only when **all gaps** are answered correctly on first attempt — consistent with the no-repeat-once-passed rule, while a partially-failed passage remains available.

---

## 6. Component — `ClozePassageExercise`

- Renders on the **cream exercise card** (matching `FillInBlankExercise`): `Fyll inn teksten` label, passage in display weight, English gloss small/muted, single primary "Sjekk svar".
- Walks `segments`: `text` → `<span>`; `gap` → inline text `<input>` (≥44px tap target, `min-w` ~96px), wrapping naturally so no horizontal scroll at 375px.
- **Grading:** on submit, each gap graded by the existing `checkAnswer(input, answer)` (+ `acceptedAnswers`). Inline per-gap correct/wrong styling (lime / red), mirroring fill-in-blank.
- **Keyboard/mobile:** inputs in normal flow above a non-sticky check button; the passage stays scrollable above the keyboard. (Sticky-CTA thumb-zone refinement is a Wave-3 representation item, not part of cloze v1.)
- **Norwegian-dominant:** all instructions/labels Norwegian; English only as the muted full-passage gloss.
- **No emoji**, Schibsted Grotesk, dark/cream tokens, varied radii — per design system.
- On submit → `onClozeResults(results[])` → `submitClozeResults`.

---

## 7. Repair UX

Reuse the existing `ExplanationCard` flow unchanged, once per wrong gap, after the passage. Each repair explains that gap's specific error (cause tag + correct answer + optional rule), micro-drill/retry, SRS schedule. Multiple wrong gaps = sequential repairs. The existing optional AI explanation upgrade applies (non-AI template is the floor).

---

## 8. Scheduler integration

- Cloze items are schedulable like other types: a passage is chosen when its `primaryConceptId` is a focus/weak/new concept and the learner's level matches (`filterSentencesByLevel` analogue for passages).
- `selectionReason` set normally (`weak_concept` | `new_material` | `weekly_focus` | etc.).
- v1 may gate cloze to a modest share of the `lær` block so it complements, not replaces, single-sentence work. Exact frequency = a tuning constant, set conservatively at launch.

---

## 9. Pilot scope (v1)

Bounded to keep depth-not-breadth honest and avoid a giant authoring effort up front:
- **Levels:** A1 + A2 first (the deepened levels), B1/B2 follow once validated.
- **Coverage:** a small seed of passages for the highest-value concepts (e.g. V2-regelen, present tense, noun-gender) — enough to validate the type, not full coverage.
- **Authoring:** hand-authored → **`norwegian-linguist` review pass** before seeding (same discipline that built A1/A2; never seed un-reviewed Bokmål).
- Expansion (more passages, B1/B2, AI-generated multiplier) is a later, separate increment.

---

## 10. Acceptance criteria

1. A cloze passage renders at 375px with typed inline gaps, no horizontal scroll, gaps ≥44px tap targets.
2. Submitting grades each gap deterministically (no AI); inline correct/wrong shown.
3. **Rule 8 trace, verified in a real session:** a wrong gap writes an error-log entry under that gap's concept, changes that concept's mastery, and triggers a repair whose retry updates SRS — independently per gap.
4. A passage targeting concept X with a wrong gap on concept Y logs the error against **Y**, not X (per-gap diagnosis preserved).
5. Works fully offline / with AI unavailable (non-AI path).
6. Norwegian-dominant; no emoji; Schibsted Grotesk; passes `/baseline-ui` → `/fixing-accessibility` → `/fixing-motion-performance` and renders at 375/768/1280/1920.
7. A fully-correct passage is added to passed tracking; a partially-failed one is not.

---

## 11. Risks / open items

- **Content authoring cost** is the real effort (coherent passages + linguist review), not the code. Pilot scope mitigates.
- **contentCache widening** (`ResolvedContent | ClozePassage`) touches a core path — must not regress single-sentence resolution; cover with the existing engine tests + new cloze tests.
- **Repair volume**: a 4-gap passage with 3 wrong gaps queues 3 repairs — acceptable (it's the moat working) but watch session length; the existing repair cap (F027) applies.
- **AI multiplier deferred**: when B2 (server-generate) lands, AI passage-generation can extend this — out of scope now.

---

## 12. Out of scope (restated)

AI-generated passages (gated on B2) · algorithmic gap selection · guided composition / dictogloss / other types · sticky-CTA thumb-zone refinement (Wave-3 representation work) · B1/B2 passage coverage at launch.
