# Per-Level Progression — Design (APPROVED 2026-06-02)

> Status: **APPROVED** — direction locked 2026-06-02. Still nothing implemented; build is gated behind the
> Move 2 honesty fixes (journal mastery write, B1/B2 silent-degradation banner) and proceeds one move at a time.
> Approved: the four development areas + level-specific daily/weekly walls, AND the B2 new track + 2 new
> exercise types (conjugation-drill, nuance-discrimination). Anchored on `Downloads/norsk_b2_hverdagsord.md`.

## Premise

Each CEFR level **develops a different area**. The mistake today is one structure for all levels — same exercise
loop, same "concept mastered" progress unit, same daily/weekly shape. That under-serves B1/B2, where progress is
*production* and *lexical range/nuance*, not grammar-concept unlocks.

**Governing rule (brick integrity):** every progress increment the learner sees must trace to a real engine write
(mastery / SRS / error log / production-gap). A bar that moves without a write is fraud (Rules 6 & 8). This holds
at every level; only *what* the brick represents changes.

## The model: one answer → a brick → daily → weekly, differentiated per level

| Level | Development area | Exercise emphasis | A *brick* is | Daily wall | Weekly wall |
|---|---|---|---|---|---|
| **A1** | Foundations / form acquisition | recognition→production scaffolds: noun gender, articles, present tense, basic V2 | a grammar atom moved toward mastery | **foundations touched** (breadth) | foundations **graduated** to mastery |
| **A2** | Combination | past tense, modals, comparatives, conditionals; longer sentences | a structure **combined** correctly | structures practiced in combination | combination concepts graduated + connector error-rate ↓ |
| **B1** | Production & complexity | output-first: subordinate clauses, indirect speech, connectives; cloze passages, roleplay, journal | a **produced** complex sentence / production-gap ↓ | production minutes + clauses produced | production-gap reduction on focus concepts |
| **B2** | **Lexical range & nuance** | themed vocab-cluster cloze, **irregular-conjugation drills**, nuance discrimination, production in long real context | a new everyday **word/verb activated**, or an irregular **conjugation nailed** — not a grammar unlock | **expressive range** (new words activated today) | lexical coverage growth + residual-error & nuance accuracy |

### Why B2 is structurally different (the `hverdagsord` evidence)
The B2 source file is 58 long (10+ word) sentences organized by **theme** (body reactions, push/pull/lean,
household actions, nuanced communication, coping), built around **everyday-but-elusive verbs** (nyse, gjespe,
snuble, antyde, påpeke, benekte, vegre seg) with full conjugations and an explicit **irregular-verb pattern**
thread (a→u: trakk→trukket, rakk→rukket). That is a vocabulary + nuance + morphology curriculum, not a grammar
curriculum. The current concept-tagged sentence model cannot represent it well.

## Structural consequences (per-level divergence)

### Content model
- **A1/A2** — keep the current concept-graph + concept-tagged sentence corpus. It fits form acquisition.
- **B1** — same corpus, but the **selection + scoring** shifts to production: prefer `translation-to-norwegian`,
  `cloze-passage`, and the output surfaces (journal/roleplay); score on production-gap, not recognition.
- **B2** — needs a **new track**: themed **vocabulary clusters** + an **irregular-verb pattern** set, with
  long-sentence carriers. Exercise types it implies: target-word cloze, conjugation drill (infinitiv→presens→
  preteritum→perfektum), nuance discrimination (pick the right shade among antyde/påpeke/benekte). The B2 file is
  the first ingestion source for this track.

### Daily/weekly tracker (renders differently per level)
- A1: a "foundations" wall — tiles for each foundation concept, filling as they graduate.
- A2: a "combinations" wall — structures shown as they're assembled.
- B1: a "production" meter — clauses/minutes produced, production-gap trend.
- B2: a "words you no longer miss" wall — activated everyday words + irregulars nailed, with a nuance-accuracy band.

The brick must *visibly land* on the day's wall as each answer is graded, and days must visibly stack into the week.

### Engine implications (future work — NOT in this proposal's scope to build)
- Scheduler: per-level recipe + pool selection (B1 production-weighted, B2 vocab/morphology-weighted). The
  production/recognition pool selection we just wired (`computeProductionGap`) is the lever for B1.
- New progress units: B2 needs vocabulary-cluster mastery + irregular-verb mastery as first-class fingerprint fields
  (today `vocabularyMastery` exists but is unused). This is a real engine extension — analysis-first when we get there.
- New exercise types: conjugation-drill + nuance-discrimination (both currently absent; would follow the
  "one exercise type at a time" rule, after the phantom cleanup).

## What this proposal does NOT do
- No code. No scheduler/engine changes. No new exercise types built. No corpus ingested.
- Does not reopen the depth-not-breadth rule: B1/B2 divergence is *finishing* the levels honestly (they currently
  collapse onto A2-shaped structure), not net-new surface.

## Sequencing
1. **Move 2 honesty fixes first** (journal mastery, B1/B2 silent degradation, phantom cleanup) — prerequisite.
2. Approve this per-level model.
3. B1 production-weighting (uses the now-live production-gap).
4. B2 track: ingest `norsk_b2_hverdagsord.md` (gate → norwegian-linguist → corpus) + design the vocab-cluster /
   conjugation-drill exercise types (analysis-first, one at a time).
5. Differentiated daily/weekly tracker UI (the design pipeline: layout directions → build → gates).

## Decisions (resolved 2026-06-02)
1. ✅ Four development areas confirmed (A1 foundations / A2 combination / B1 production / B2 lexical-nuance).
2. ✅ B2 gets a **new content track + 2 new exercise types** (conjugation-drill, nuance-discrimination) — the one
   sanctioned surface addition; built one at a time after Move 2 + phantom cleanup, linguist-gated.
3. ✅ Daily/weekly wall is **level-specific** (4 distinct renderings), not one themed component.
