# Scout Brief: expression/chunk "pickup" surface + bøyningsdrill SRS fix

**Date:** 2026-06-16
**Idea:** Broaden the bøyningsdrill (`/ord`) from "verbs to conjugate" into a focused everyday-language pickup surface (expressions / collocations / chunks), and fix the drill repeating words within days. Research what units fit + how they plug into the moat (fingerprint / diagnosis / engine) — **research, not a build mandate** (depth-not-breadth).
**Run mode:** deep (adapted — perplexity 401 / Exa absent; WebSearch + GitHub MCP + codebase) | **Lanes:** 3 (engine-fit · SLA-theory+sourcing · competitor-UX)

---

## TL;DR
- **The bug is real and in-scope.** The drill repeats words because selection is a date-seed index walk (`ConjugationDrillScreen.tsx:21` seed = `getDate()+getHours()`; `conjugation-drill.ts:23` picks `ordered[(i+seed)%len]`) that **never reads the fingerprint**, and there is **no per-word SRS** anywhere to space against. `recordVocabResult` writes cluster EMA but **no `nextReviewAt`/`srsLevel`** — the write is a dead-end for spacing.
- **Minimal correct fix (Option B):** add per-word SRS (`vocabWordSrs` keyed by `wordId`), reuse the existing `SRS_LADDER_DAYS = [1,3,7,14,30]`, write it in `recordVocabResult`, read it in `buildConjugationDrill` to exclude not-yet-due words + order due-first. Delivers **≥2-day spacing + return ladder** directly. Bounded returning-user migration.
- **English gloss is a one-liner.** Per-word `gloss` exists in the type but is `null` for all 66 words; the carrier sentence's English (`carrier.en`) is **already loaded in the drill and unused** (`ConjugationDrillScreen.tsx:136`) → surface it on grade.
- **The vision is well-founded but must be a CONTENT layer, not a new engine.** SLA strongly supports chunks→fluency (~50% of native speech is formulaic; chunks reduce processing load, predict fluency). But the "Lexical Approach as a whole syllabus" is empirically thin (Thornbury: "a journey without maps"). So: chunks = production-practice content feeding the existing diagnosis/scheduling/repair moat.
- **Recommended unit taxonomy (4 tiers):** collocation · fixed-expression · sentence-frame · functional-exponent. **Sentence-frame + functional-exponent give the most SPEAKING leverage** — and *sentence-frame literally IS the user's "learn the expression, fit the word in" insight*.
- **Cleanest engine fit = "Shape 1":** a chunk is content tagged to an EXISTING concept → rides `updateConceptMastery` + `repairFromSurface` + scheduler pools + diagnosis with **no new SRS unit and no schema migration.** A separate `chunkMastery` unit (Shape 2) is feasible but is net-new surface to approve.
- **Your opportunity:** force PRODUCTION of the chunk (cloze-in-context / type / speak) + attach WHERE/WHEN (register/situation) metadata — that pairing is exactly the gap competitors leave open, and it's deterministically gradeable (no unverified-AI-grades-mastery violation).

---

## Lane Health
| Lane | Items | Confidence | Notes |
|------|-------|-----------|-------|
| Engine-fit (codebase) | 5 questions answered w/ file:line | 9/10 | Direct source reads; highest signal |
| SLA theory + sourcing | taxonomy + 8 content sources | 8/10 | WebSearch + project memory; criticism kept honest |
| Competitor UX | 9 products + sentiment | 8/10 | WebSearch; review-sourced |

---

## 1. The bug (in-scope hardening) — root cause + fix

**Root cause (confirmed):** no SRS on this surface at all. Selection = deterministic date-seed window → two visits same day overlap heavily (seed 14 vs 16 share 8/10 words); zero recent-exclusion; `recordVocabResult` (`src/engine/vocab.ts:44`) sets no per-word due date.

**Two SRS units exist today; neither is per-word:** concept (`conceptMastery`, full SRS) and vocab cluster (`vocabularyMastery`, EMA only — no `nextReviewAt`/`srsLevel`).

**Fix = Option B (per-word SRS), the minimal change that gives the asked-for behaviour:**
1. `src/types/fingerprint.ts` — add `vocabWordSrs: Record<string, {srsLevel; nextReviewAt; lastSeenAt}>`; extend `createEmptyFingerprint` + `normalizeFingerprint` backfill (`:163`) + `tests/types/returning-user-fixture.ts` (Operating Rule 3).
2. `src/engine/fingerprint.ts` — lift `srsNextReviewAt` (`:21`); reuse `SRS_LADDER_DAYS` (`:19`). (2-day floor if you want strictly ≥2 days vs the ladder's rung-0 = 1 day.)
3. `src/engine/vocab.ts:44` `recordVocabResult` — also fold word SRS (correct→bump rung+set `nextReviewAt`; wrong→rung 0; always `lastSeenAt`).
4. `src/lib/conjugation-drill.ts:17` — `buildConjugationDrill(size, seedOffset, fp?)`: exclude words with `nextReviewAt > now` (unless pool starves), order due-first then weak-cluster, seed = tiebreak only. Pass `fp` from `ConjugationDrillScreen.tsx:22`.
5. **English gloss:** render `carrier.en` next to `carrier.no` at `ConjugationDrillScreen.tsx:136` (reveal-on-grade — keeps Norwegian-dominates; English appears only after the attempt).

This also closes a **Pipeline-Honesty (Rule 8)** gap: the drill currently *writes* to the fingerprint but never *reads* it.

---

## 2. Recommended unit taxonomy (the "pickup" content)

| Tier | Definition | Norwegian example | CEFR | Speaking leverage |
|---|---|---|---|---|
| **Collocation** | habitually co-occurring words | *ta en avgjørelse*, *gjøre lekser* | A2–B2 | Medium (accuracy/naturalness) |
| **Fixed expression** | frozen block, produced whole | *Det går bra*, *Takk for maten* | A1–A2 | Med-high at A1 (instant speech) |
| **Sentence frame** | pattern + open slot to fill | *Jeg vil gjerne ha ___*, *Kan du ___?* | A1–B1 | **HIGH** — generative; = the user's insight |
| **Functional exponent** | one way to do a job (disagree, suggest) | *Jeg er ikke helt enig* / *Det stemmer ikke helt* | B1–B2 | **HIGH** — real interaction + register |

Level map: A1 fixed+simple frames → A2 frames widen+first collocations → B1 functional exponents (the existing "production" lens) → B2 exponent register/nuance (maps onto the existing B2 lexical-nuance track).

---

## 3. Engine fit — two shapes (prefer Shape 1)

- **Shape 1 (recommended): chunk = content row tagged to an EXISTING `conceptId`.** Right/wrong calls existing `updateConceptMastery` / `repairFromSurface`. **No fingerprint type change**; inherits SRS, decay, diagnosis (rules 1–4 see it), repair, scheduler pools (`weak_concept`/`review_due`/`interleaving` — no new `selectionReason`). A chunk is just another `contentId` on a `SessionItem`.
- **Shape 2 (gated, net-new): chunk = own masterable unit** — add `chunkMastery: Record<string, ChunkMastery>` cloning the `ConceptMastery` SRS shape + a `ChunkContent` type + returning-user migration. Only if product wants a separate "expressions mastered" coverage meter (like the B2 vocab cluster meter). **Approval-gated surface.**
- **Repair:** "chunk wrong" → `repairFromSurface({surfaceKind, errorTag, conceptId, wrong, correct})` — but **only deterministically-verifiable errors grade** (slot-fill exact/accepted-answer match, or Ordbank morphology). AI-detected, non-confirmed errors stay *show-don't-grade* (mirrors the Lever-3 gender-gate decision).

---

## 4. Competitor lessons (what to copy / avoid)

- **Dominant pattern that works:** the sentence *with the chunk embedded*, tested by **cloze/fill-the-gap with type-in (production)**. Loved: Clozemaster type-in, Glossika repeat-aloud, Anki active recall.
- **Hated / failure modes to avoid:**
  - Rote chunks with **no why/grammar** (Glossika's #1 complaint).
  - **Recognition-only** (Babbel "repeat after me", Drops MCQ) → "complete a level and still freeze." Force production.
  - **No WHERE/WHEN signal** — the recurring unmet need. Attach register/situation metadata + a one-line *"brukes når…"*.
  - **SRS queue-spiral** (LingQ) → **throttle** new chunks per session (reuse scheduler caps).
- **Tag faste uttrykk (literal, drillable as collocations) vs idiomer (figurative, meaning-first)** — different teaching + different grading confidence.

---

## 5. Content sourcing (Norwegian)

No drop-in open Norwegian collocation dictionary exists. Recommended pipeline:
- **Seed:** Tatoeba (CC-BY) sentence frames + `ordbøkene.no`/NAOB *faste uttrykk* lists; frequency-prioritise with NoWaC/Kelly (**NoWaC is CC-BY-NC — use for prioritisation only, do not redistribute**).
- **Gate:** norwegian-linguist pass (memory `project_content_gen_gate_insufficient`: mechanical gate alone ~34% pass — never seed without it).
- **Grade deterministically:** accepted-answers list (like fill-in-blank `notes` today) + **Norsk Ordbank morphology** (already wired in `gender-map.ts`, CC-BY). AI may **draft** chunks (exposure) but grading rests on the deterministic check, per the hard rule.

---

## Phased sequence (depth-respecting — what's in-scope vs approval-gated)

- **Phase 0 — IN SCOPE NOW (bug + one-liner, no new surface):** Option-B per-word SRS so the drill stops repeating within days and *reads* the fingerprint; + surface `carrier.en` on grade. This is "fix that to be something better" + the English ask.
- **Phase 1 — SMALL, ON-MOAT (needs a nod, no schema change):** generalise the drill to **Shape 1** chunks tagged to existing concepts — start with deterministically-gradeable fixed-expressions/collocations, force production, add WHERE/WHEN metadata, throttle intake. Reuses the whole existing pipeline.
- **Phase 2 — BREADTH (explicit approval + content authoring):** the broader sentence-frame + functional-exponent "marketplace" across levels; optional `chunkMastery` coverage meter (Shape 2). Gated by Operating Rules 1 & 7.

---

## Brainstorming Fuel
1. **"Read the fingerprint" drill** — Phase 0 per-word SRS makes the bøyningsdrill mistake-aware + spaced; smallest change, closes a real bug + a Pipeline-Honesty gap.
2. **Frame-slot production card** — sentence-frame with a slot, type-in graded against accepted answers; deterministic, production-forcing, generative (the user's core insight), Ordbank-verifiable.
3. **"Brukes når…" register tag** — every chunk carries situation/register metadata; the one explanation layer every competitor omits; cheap to author, high differentiation.

---

## Scoring Appendix
Lanes: 3 (adapted from 9 — research is internal-engine + SLA-theory heavy, not product/OSS/cost). Tools: WebSearch + GitHub MCP + direct codebase reads (perplexity 401, Exa absent). Sources: see `.scout/lane-theory-content.md` references (17) + competitor reviews. Confidence: engine-fit 9/10 (source-grounded), theory/competitor 8/10.
