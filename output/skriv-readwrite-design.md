# Skriv (Read → Write) Module — Decision-Grade Design Spec

**Date:** 2026-06-02
**Status:** Design — analysis only, no implementation started. Pending user review + architect sign-off.
**Type:** Restructure of the "skriv" surface into a two-page **read a level-scaled Norwegian text → write your opinion** exercise.
**Authoritative direction (user):** one exercise = read a Norwegian text whose length scales by CEFR (A1 a few lines → A2 ~2 paragraphs → B1 ~4–5 paragraphs → B2 ~9 paragraphs), then on a next page write an opinion. Exact mechanics decided below.

---

## 0. TL;DR — the recommendation (rank-ordered)

1. **Build it as a NEW exercise type `read-respond`, NOT a replacement for the journal.** The journal stays as free, prompt-only daily writing; `read-respond` is the *scaffolded, comprehension-anchored* sibling. They feed the same pipeline but solve different jobs. (§5)
2. **The exercise is two pages: READ (passage) → WRITE (opinion).** Both Norwegian-dominant. The write task scales: **A1 = 1 guided sentence** (sentence frame), A2 = 2–3 sentences, B1 = a short paragraph (4–6 sentences), B2 = a developed paragraph (8–10 sentences / ~9-paragraph source). (§1)
3. **Grading is the load-bearing honesty problem.** Use a **three-tier honest pipeline**: (a) **deterministic gate** always runs (length floor + target-structure presence + on-topic token check) — this is the non-AI fallback and the *only* thing that writes a guaranteed brick; (b) **AI rubric feedback** via `reviewWriting` when available, reusing `repairFromSurface` for error bricks; (c) **explicit self-report** ("I used the focus structure" / "this was hard"). **Never invent a "correct answer"** — opinion writing has none. (§2)
4. **Reading source = author new passages in `content/passages/{level}.json`, reusing the cloze `ClozePassage`-adjacent shape (a non-gapped `ReadingPassage`).** Do NOT stitch sentences (incoherent) and do NOT AI-generate in v1 (server-generate is deferred, item 6.4). Reconcile the empty B1/B2 `passages/` by authoring level-scaled passages there, linguist-gated. (§3)
5. **It does NOT belong equally at all four levels.** Reading-heavy is the *weakest* fit at A1 (foundations = form acquisition, not discourse). **Ship v1 at B1 first** (the production level — strongest fit), then B2, then A2. **A1 gets a deliberately minimal variant or is deferred** (a few lines + 1 guided sentence) — reading-heavy at A1 fails the north star unless the write requirement is tiny. (§5)
6. **Minimal shippable v1 = B1 read-respond, deterministic-graded, AI-rubric-when-available, ~6 authored passages.** Build checklist in §6.

This passes the **earned-place test** (vision-and-plan.md:218): it adds a diagnosis signal existing types can't (free-production error tags grounded in a comprehension anchor) AND pushes genuine production (north star) AND traces a real fingerprint write (§2.4). It is exactly **Wave-6 rows #2 + #4** in `docs/vision-and-plan.md:228-241` ("Guided one-sentence production from a paragraph" + "Single-paragraph reading + Nor→Nor comprehension, BUILD reading+production as ONE unit"). The "Structured short writing" DEFER (vision-and-plan.md:241) is resolved by **not** duplicating the journal — see §5.

---

## 1. Exact per-level shape

Text-length scaling follows the user's spec and is corroborated by CEFR norms (A1–A2 sentences <10 words; B1–B2 10–16+ words — [Text Inspector lexical profiles](https://textinspector.com/lexical-profiles-according-to-the-cefr/), [CEFR Text Level Checker](https://lingoharvest.com/calculators/713-cefr-text-level-checker.html)) and the project's own development-area model (`docs/per-level-progression-proposal.md:20-25`: A1 foundations / A2 combination / B1 production / B2 lexical-nuance).

| Level | READ passage | Sentence length | WRITE task (post-read) | Prompt style |
|---|---|---|---|---|
| **A1** | 3–5 short lines (~40–60 words) | <8 words/sentence (matches `validate.ts` `LEVEL_MAX_WORDS.A1 = 8`) | **1 guided sentence** into a frame: `"Jeg liker ___ fordi ___."` | Simple preference: *"Hva liker du?"* (like / not like) — NOT agree/disagree |
| **A2** | ~2 short paragraphs (~90–130 words) | ≤12 words/sentence (`LEVEL_MAX_WORDS.A2 = 12`) | **2–3 sentences**, one frame optional | Preference + reason: *"Er du enig? Hvorfor / hvorfor ikke?"* |
| **B1** | ~4–5 paragraphs (~200–320 words) | ≤18 words (`LEVEL_MAX_WORDS.B1 = 18`) | **short paragraph (4–6 sentences)**, free, must use ≥1 connector | Opinion + justification: *"Hva mener du om dette? Begrunn svaret ditt."* |
| **B2** | ~8–9 paragraphs (~450–650 words) | 16+ words, complex syntax | **developed paragraph (8–10 sentences)**, free, argue a position | Agree/disagree + counter-point: *"Diskuter. Hva ville du sagt til noen som er uenig?"* |

**Design rationale per level (north-star alignment):**
- **A1 — guided sentence frame.** Pure free writing at A1 produces L1-transfer soup and no gradeable signal. A *frame* (`Jeg liker X fordi Y`) is the minimum viable production: it forces present-tense + a connector (`fordi` → triggers subordinate-clause word order even at A1 as exposure), and the blanks are gradeable. This is the read-respond analogue of cloze's "typed gap = production."
- **A2 — combination.** Two sentences let the learner *combine* (the A2 development area): an opinion sentence + a reason sentence with a connector. Frame optional.
- **B1 — production paragraph.** The strongest fit. B1's development area *is* production (per-level-progression-proposal.md:24). Free paragraph, light constraint (≥1 connector / ≥1 subordinate clause), comprehension-anchored.
- **B2 — argument.** B2 = lexical range & nuance + production in long real context. The 9-paragraph source + argue-a-position task is the natural capstone. The agree/disagree+counterpoint prompt pushes the `wrong-word-same-category` nuance signal and connective range.

**Prompt-style ladder (why it scales):** integrated reading-into-writing research ranks **argumentative / present-your-viewpoint** as the *most complex* integration task ([ERIC EJ1454321](https://files.eric.ed.gov/fulltext/EJ1454321.pdf), [Liverpool UP IJEAP 2025](https://www.liverpooluniversitypress.co.uk/doi/10.3828/ijeap.2025.9)). So we ladder: **A1 preference → A2 preference+reason → B1 opinion+justify → B2 argue+counter.** Never give A1 an agree/disagree prompt — it exceeds the level's task norm.

---

## 2. Grading — HONEST (Operating Rules 6 & 8)

This is the part that determines whether the surface is honest. Opinion writing has **no correct answer**, so any UI claiming a score is making a claim about the engine that must trace to a real write.

### 2.1 The three tiers (in priority order)

```
SUBMIT opinion text
  │
  ├─ TIER 1 — DETERMINISTIC GATE (always runs, no AI) ──────────────┐
  │   • length floor met? (level-scaled min words: A1≥4, A2≥12,     │  ← the ONLY guaranteed
  │     B1≥30, B2≥60)                                                │     fingerprint write.
  │   • target-structure present? (connector / frame token /        │     Never fakes a "correct".
  │     verb form — level-specific deterministic check)             │
  │   • on-topic? (≥2 content tokens shared with passage,           │
  │     stopword-filtered — cheap overlap, not semantic grading)    │
  │   → writes a PRODUCTION brick (see §2.2). Pass/fail is about     │
  │     EFFORT + STRUCTURE, never about opinion correctness.        │
  │                                                                  │
  ├─ TIER 2 — AI RUBRIC FEEDBACK (when aiService.isReady()) ────────┤
  │   • aiService.reviewWriting({userText, prompt, level})          │
  │   • returns TaggedError[] → repairBatchFromSurface(...) writes  │
  │     per-error bricks (mastery EMA down + error log) EXACTLY as  │
  │     the journal already does (WritingEditor.tsx:147-160)        │
  │   • praise + suggestion shown; NO numeric "score"               │
  │                                                                  │
  └─ TIER 3 — SELF-REPORT (always offered, optional) ───────────────┘
      • one tap: "Jeg brukte [fokusstruktur]" / "Dette var vanskelig"
      • feeds production-preference / speaking-confidence signals,
        not mastery (self-report is not a mastery brick — honesty)
```

### 2.2 What brick gets written (the Rule 8 trace)

The honesty trap in the **current** journal: when AI is unavailable, `StubAIService.reviewWriting` returns `errors: []` + generic praise (`stub.ts:89-96`). So **the journal writes NOTHING to the fingerprint when AI is down** — `pushErrorsToFingerprint` early-returns on empty errors (`WritingEditor.tsx:148`). That is a silent no-op the new module must NOT inherit.

**Fix in read-respond:** Tier 1 always writes a **production brick** independent of AI:

- **On a deterministic PASS** (length + structure + on-topic): record a *correct* production attempt on the passage's `primaryConceptId` via a new `recordProductionFromSurface(fp, { conceptId, correct: true, surfaceKind: 'read-respond' })`. This nudges mastery EMA *up* and increments `productionGap` toward production — a real, defensible brick: "the learner produced a structurally-valid on-topic response using concept X."
- **On a deterministic FAIL of the target structure** (e.g. B1 paragraph with zero connectors when a connector was required): record a *wrong* attempt tagged with a deterministic tag (`word-order` for a missing-V2 frame, `unspecified`/a connector tag for missing connector) through `repairFromSurface` — the existing path. This is honest: the failure is *observed deterministically*, not guessed.
- **AI errors (Tier 2)** add *additional* bricks per tagged error via `repairBatchFromSurface` — the journal's exact mechanism, reused unchanged.

**Net:** every submission writes ≥1 real brick even with AI fully down. The deterministic tier is the floor; AI enriches. This is the cloze pattern (deterministic per-gap grade is the floor, AI is an upgrade) generalized to free production.

> **New engine helper required:** `recordProductionFromSurface` (a thin sibling of `repairFromSurface` in `src/engine/repair-from-surface.ts`) that can record a **correct** production attempt — today `repairFromSurface` only models wrong answers. This is a small, analysis-first engine extension; flag for architect. `SurfaceKind` gains `'read-respond'` and `SURFACE_EXERCISE_TYPE['read-respond'] = 'free-writing'` (or a new `read-respond` ExerciseType — see §6).

### 2.3 Why no numeric score (honesty)

Integrated reading-into-writing assessment uses **analytic rubrics** for *formative feedback*, not a single right answer ([ScienceDirect S1075293524000874](https://www.sciencedirect.com/science/article/pii/S1075293524000874), [Liverpool UP IJEAP 2025](https://www.liverpooluniversitypress.co.uk/doi/10.3828/ijeap.2025.9)). We mirror that: the learner sees **(a) a deterministic checklist** ("✓ lang nok · ✓ brukte *fordi* · ✓ på tema"), **(b) AI rettelser** when available, **(c) a praise line**. No "7/10". A score implies a correct answer; there isn't one. The *brick* is the engine truth; the *checklist* is the honest UI surface of it.

### 2.4 Earned-place trace (Rule 8, must verify live before ship)

```
Type B1 opinion paragraph missing all connectors
 → Tier-1 deterministic gate: target-structure FAIL (connector absent)
 → recordProductionFromSurface / repairFromSurface writes wrong attempt on focus concept
 → error-log entry lands (concept X, tag) + mastery EMA for X changes
 → (Tier 2, if AI up) reviewWriting tags a tense error
 → repairBatchFromSurface writes a 2nd brick + queues repair
 → verified in a REAL session: error log grew, mastery moved, repair scheduled.
```
Confirmed in a real session, not in theory (mirrors cloze spec §5, vision-and-plan.md Rule 8).

### 2.5 Non-AI fallback summary

| AI state | Reading | Grading | Brick written? |
|---|---|---|---|
| AI ready | authored passage | Tier 1 + Tier 2 (errors) + Tier 3 | yes (deterministic + per-error) |
| AI down / stub | authored passage | Tier 1 + Tier 3 only | **yes (deterministic)** — the fix vs. today's journal |

---

## 3. Reading source — author new passages, reconcile empty B1/B2

**Decision: author new `ReadingPassage` content in `content/passages/{a1,a2,b1,b2}.json`. Do NOT stitch sentences. Do NOT AI-generate in v1.**

**Three options weighed:**

| Option | Verdict | Why |
|---|---|---|
| **A. Stitch existing concept-tagged sentences** into a passage | ✗ Reject | The corpus sentences are independent drill items (`a1.json`: "Hun er fra Norge", "De spiser middag nå"…). Concatenating them yields incoherent, referent-less text — the opposite of a *coherent passage to react to*. Fails the comprehension anchor. |
| **B. Author new coherent passages, linguist-gated** | ✓ **Recommended** | Same discipline that built A1/A2 corpus + the cloze passages (`cloze-passage-design.md:120`: hand-author → norwegian-linguist before seed). Coherent, level-scaled, real. The `/reading` page *already* proves this works — it has 4 hand-authored coherent A1/A2 texts inline (`src/app/reading/page.tsx:24-65`) with `conceptIds` + `contentEn`. **Lift those into `content/passages/` and author B1/B2 to fill the gap.** |
| **C. AI-generate-then-validate** | ✗ Defer | Server-side generation is explicitly deferred (vision-and-plan.md:213 item 6.4 — `ServerAIService.generateContent` returns null, no `generate` action in `/api/ai`). Cannot ship v1 on a non-existent path. Revisit as a multiplier once 6.4 lands. |

**Reconciling empty `passages/` at B1/B2:** `content/passages/` today holds only `a1.json` + `a2.json` (cloze passages). The new module needs a **distinct content kind** — a `ReadingPassage` (coherent prose, NO gaps) vs the existing `ClozePassage` (prose WITH gaps). Two clean options:

- **Recommended:** new files `content/reading/{a1,a2,b1,b2}.json` for `ReadingPassage`, loaded by a `reading-loader.ts` analogous to the cloze loader. Keeps cloze (`passages/`) and reading (`reading/`) content kinds separate and honest.
- Alternative: a `kind: 'reading' | 'cloze'` discriminator inside `passages/`. Rejected — overloads one file with two render contracts.

**`ReadingPassage` shape (camelCase runtime, snake_case JSON, mirroring `ClozePassage` and the existing inline `SeedText`):**
```ts
interface ReadingPassage {
  id: string;
  cefrLevel: CEFRLevel;
  primaryConceptId: string;      // drives scheduling + the brick's concept
  conceptIds: string[];          // concepts the passage exposes (like SeedText.conceptIds)
  title: string;                 // short Norwegian label
  paragraphs: string[];          // ordered Norwegian paragraphs (length scales by level)
  englishGloss: string[];        // parallel English per paragraph (muted, opt-in — Norwegian-dominant)
  writePrompt: string;           // Norwegian opinion prompt for the WRITE page
  writeFrame?: string;           // A1/A2: sentence frame e.g. "Jeg liker ___ fordi ___."
  targetStructure: {             // what Tier-1 deterministic gate checks for
    minWords: number;
    requiredTokens?: string[];   // e.g. ["fordi","som","men"] — ≥1 must appear (connector check)
    kind: 'frame' | 'connector' | 'free';
  };
  difficulty: DifficultyTier;
}
```
The existing `/reading` `SeedText` is a near-superset already — migration is mostly renaming + adding `writePrompt`/`targetStructure`. **`paragraphs` count is the length lever** (A1: 1–2, A2: 2, B1: 4–5, B2: 8–9), satisfying the user's spec directly.

---

## 4. Reading page vs. this module (avoid a third reading surface)

There is **already** a `/reading` "Lesestudio" surface (`src/app/reading/page.tsx`) with hand-authored A1/A2 texts, concept tagging, parallel-English toggle, word-tap lookup, and `recordExposure` + `markLaneDone('reading')`. It is **pure recognition** — read, tap "Ferdig lesing", no production. By the north star, that is the *weak* surface (recognition without output).

**Recommendation:** `read-respond` is the **production-attached evolution of `/reading`**, exactly the Wave-6 #4 verdict ("Supersedes the earlier reading-comprehension DEFER… bundling production changes the verdict… BUILD reading+production as ONE unit", vision-and-plan.md:239). Two honest paths:
- **v1:** ship `read-respond` as a new flow (its own route, e.g. `/skriv` or a session-embedded card), leaving `/reading` as the low-stakes extensive-reading library. They coexist: `/reading` = extensive (volume, exposure brick); `read-respond` = intensive (one text, production brick). This matches the **intensive vs extensive reading → production** distinction the research frames.
- **later:** fold `/reading`'s passages into `content/reading/` so both surfaces draw one corpus; `/reading` shows them gloss-only, `read-respond` adds the write page. Avoids two passage stores.

Do **not** silently bolt a write box onto `/reading` and call it done — that would under-scale the text by level and skip the grading honesty. The write page is a deliberate second step.

---

## 5. Replace the journal? — NO. New type alongside it.

**Decision: new exercise type alongside the journal. Do not replace it.** Resolves the #5 "Structured short writing — DEFER, overlaps the journal" tension (vision-and-plan.md:241) — they don't actually overlap once the jobs are named:

| | **Journal (`/journal`)** | **Read-respond (new)** |
|---|---|---|
| Stimulus | a focus-biased *prompt* only | a *level-scaled passage* (comprehension anchor) |
| Job | daily free expression, learner's own topic | react to given content; comprehension → production |
| Length | open-ended | level-scaled, bounded |
| Reading load | none | the defining feature |
| Grading | AI errors only (no-op when AI down) | **deterministic floor + AI** |
| Research frame | free production | *integrated reading-into-writing* (a distinct, validated construct) |

The `free-writing` type was CUT precisely because a *second free-writing surface* adds no new signal (vision-and-plan.md:224). `read-respond` is **not** a second free-writing surface — the **reading anchor + deterministic grading** are the new signal (comprehension-grounded production + a brick that survives AI-down). That is why it earns its place where "structured short writing" was deferred: it is structurally different from the journal, not a duplicate.

**Per-level fit — does it belong at all four levels?**

| Level | Fit | Verdict |
|---|---|---|
| **A1** | **Weakest.** A1 = foundations / form acquisition (per-level-progression-proposal.md:22). Reading-heavy steals time from form drills; free production yields no clean signal. | **Defer or minimal-only.** If built: a few lines + **1 guided frame sentence**. Otherwise A1's writing stays in session frames + journal. |
| **A2** | Moderate. Combination level — a 2-sentence reaction fits "combine an opinion + a reason." | Build **after B1**. |
| **B1** | **Strongest.** B1's development area *is* production (per-level-progression-proposal.md:24). Read→write paragraph is the textbook B1 task. | **Build FIRST.** |
| **B2** | Strong. Lexical-nuance + long-context production; the 9-paragraph argue task is the capstone. | Build **second**, after B1 proves the frame. Note: also the natural home for the deferred "B2 weekly-sprint capstone" (vision-and-plan.md:241). |

**So: B1 → B2 → A2 → (A1 minimal or deferred).** This inverts naive "start at A1" because reading-heavy production is a B1+ task by CEFR norm and by the project's own development-area model. Building A1 first would be the weakest-fit, highest-risk-of-dishonest-grading start.

---

## 6. Minimal shippable v1 + build checklist

### v1 scope (depth-not-breadth honest)
**B1 read-respond only.** ~6 hand-authored B1 passages (4–5 paragraphs each) on high-interest, opinion-friendly topics (friluftsliv, kollektivtransport, matvaner…), each with a `writePrompt` + `targetStructure`. Deterministic grading (Tier 1) + Tier-3 self-report always; Tier-2 AI rubric when `aiService.isReady()`. One route/flow, Norwegian-dominant. Linguist-gated content. **No A1/A2/B2 at launch** (follow once the frame proves out).

### Build checklist (ranked — what to build first)

1. **Content kind + type union** (`src/types/`):
   - Add `ReadingPassage` type (§3). Decide `ExerciseType`: **recommend a new `'read-respond'`** member (cleaner than overloading `free-writing`, which is CUT/bannered). Add to the union in `src/types/session.ts:5-16`; it is renderable so it must **not** go in `NOT_YET_AVAILABLE_TYPES` (session.ts:23-28).
2. **Engine: `recordProductionFromSurface`** (`src/engine/repair-from-surface.ts`) — the *correct-attempt* sibling so a deterministic PASS writes a real up-brick; extend `SurfaceKind` with `'read-respond'`. **Analysis-first; architect flag** (new engine write path). (§2.2)
3. **Deterministic grader** (`src/engine/grade-read-respond.ts` or `src/lib/`) — pure function: `(userText, passage.targetStructure, passage) → { lengthOk, structureOk, onTopicOk, tag? }`. No AI. Unit-tested ("test anything that touches data"). This is the honesty floor.
4. **Content loader** (`src/lib/reading-loader.ts`) + **seed file** `content/reading/b1.json` (≥6 passages, linguist-reviewed). Optionally migrate the 4 inline `/reading` `SeedText`s into `content/reading/{a1,a2}.json` as a side-quest (not required for v1).
5. **Component** `ReadRespondExercise` (two-step):
   - **Page 1 READ:** passage on the cream "paper" surface (reuse `/reading`'s reader styling, `nc-surface`), per-paragraph render, opt-in muted English gloss, "Les ferdig →" CTA. Records `recordExposure(conceptIds)`.
   - **Page 2 WRITE:** prompt panel + frame (A1/A2) or free textarea (B1/B2), live word count + deterministic checklist preview, reuse `WritingEditor`'s textarea + voice-input affordance, "Sjekk svar" CTA → grade.
   - **Result:** deterministic checklist (✓/✗ with Norwegian labels) + AI `rettelser` (reuse `WritingEditor`'s error-card rendering, `WritingEditor.tsx:323-343`) + self-report tap. No numeric score.
6. **Wiring:** `ExerciseCard` routes `read-respond` → `ReadRespondExercise` (mirrors cloze's `ClozePassageExercise` routing, cloze-design §4). `submitReadRespond(...)` in `useSession.ts` (sibling to `submitClozeResults`) folds deterministic + AI bricks, emits events, queues repairs on observed failures. `markLaneDone(...)`.
7. **Scheduler:** schedulable when `primaryConceptId` is a B1 focus/weak/new concept and level matches (`filterSentencesByLevel` analogue for passages, as cloze does). Gate to a **modest share** of the production/`snakk`-adjacent block so it complements, not floods. Conservative launch constant.
8. **Persistence:** reuse `writing_submissions` table (already exists, `WritingEditor.tsx:134`) with a `surface: 'read-respond'` + `passage_id` column, or a sibling table. Auth-only, fire-and-forget. (Supabase migration — verify RLS.)
9. **Quality gates (frontend completion checklist):** render 375/768/1280/1920; `/baseline-ui` → `/fixing-accessibility` → `/fixing-motion-performance` → `/polish`. Norwegian-dominant, no emoji, Schibsted Grotesk, varied radii.
10. **Rule 8 live verification** (§2.4) before any "done" claim.

### Effort estimate
Code ≈ 2–3 days (the two-page component + deterministic grader + engine helper + wiring). **Content + linguist review is the real cost** (≈1–2 days for 6 B1 passages, as cloze warned). B2/A2/A1 are follow-on increments.

---

## 7. Open decisions for the human

1. **A1 — minimal variant or deferred?** Recommendation: **defer A1**; reading-heavy is the weakest A1 fit. If you want it, accept the "few lines + 1 guided frame" minimal form (no free paragraph at A1). Pick one.
2. **`ExerciseType` value** — new `'read-respond'` (recommended, cleaner diagnosis tagging) vs. reuse `'free-writing'` (currently CUT/bannered). Recommend new.
3. **Route vs. session-embedded** — standalone `/skriv` route (discoverable, journal-adjacent) vs. only as a scheduled session card vs. both. Recommend standalone route in v1, scheduler integration as fast-follow.
4. **Content store** — new `content/reading/` (recommended) vs. overload `content/passages/` with a `kind` discriminator. Recommend new dir.
5. **`recordProductionFromSurface` engine extension** — confirm the architect signs off on a new *correct-attempt-from-surface* write path (today only wrong attempts flow from surfaces). This is the one genuine engine change; everything else reuses existing machinery.
6. **Does `/reading` get folded in now or later?** Recommend later (keep extensive-reading library separate in v1; unify corpora in a follow-up).
7. **Self-report scope** — does Tier-3 self-report feed `speakingConfidence`/production-preference only (recommended, honest) or anything mastery-bearing (rejected — self-report is not a mastery brick)?

---

## 8. How this maps to existing project decisions (traceability)

- **Earned-place test** (vision-and-plan.md:218): ✓ new signal (comprehension-anchored production + AI-down-proof brick), ✓ pushes production (north star), ✓ traces a real write (§2.4).
- **Wave-6 roadmap rows #2 + #4** (vision-and-plan.md:236-239): this IS those rows, built as one unit ("reading+production as ONE unit").
- **#5 "Structured short writing" DEFER** (vision-and-plan.md:241): resolved by **not** duplicating the journal (§5) — the reading anchor + deterministic grading make it non-duplicative.
- **Per-level progression** (per-level-progression-proposal.md): grading per level matches the development-area model; B1-first matches "B1 = production."
- **Cloze precedent** (cloze-passage-design.md): reuses the passage-content pattern, the "one item → N results / deterministic floor + AI upgrade" engine pattern, and the linguist-gated authoring discipline.
- **Operating Rule 1 (depth not breadth):** this is *finishing* the writing/reading surfaces honestly (recognition `/reading` + no-op-when-AI-down journal), not net-new breadth — but it IS a new exercise type, so it needs the same explicit Rule-1 override + architect sign-off the cloze type got. **Flag as blocking.**
- **Operating Rule 6/8 (no silent substitution / pipeline honesty):** the deterministic Tier-1 floor exists *specifically* to avoid inheriting the journal's AI-down no-op write (§2.2). This is the spec's central honesty move.

---

## Sources
- [Text Inspector — Lexical Profiles According to the CEFR](https://textinspector.com/lexical-profiles-according-to-the-cefr/)
- [CEFR Text Level Checker (A1–C2)](https://lingoharvest.com/calculators/713-cefr-text-level-checker.html)
- [ERIC EJ1454321 — Integrated reading-into-writing: Developing a task blueprint](https://files.eric.ed.gov/fulltext/EJ1454321.pdf)
- [Liverpool UP IJEAP 2025 — Validating an integrated reading-into-writing task](https://www.liverpooluniversitypress.co.uk/doi/10.3828/ijeap.2025.9)
- [ScienceDirect S1075293524000874 — Validating an integrated reading-into-writing scale](https://www.sciencedirect.com/science/article/pii/S1075293524000874)
- [Influence of Reading Texts on L2 Reading-to-Write Argumentative Writing (PMC8017206)](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC8017206/)
