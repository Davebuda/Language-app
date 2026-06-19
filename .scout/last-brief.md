# Scout Brief: per-level content contract (level gates)

**Date:** 2026-06-19 · **Run mode:** fast (3 adapted lanes — internal-engine + applied-SLA, not product/market)
**Idea:** Gate exercises to CEFR level; remediate-at-level; generate-at-level on empty pools. Research to ground the per-level "content contract" before make-plan-pro.
**Tools:** WebSearch + WebFetch (perplexity MCP 401, Exa absent) — adapted.

---

## TL;DR
- **All three locked decisions are research-validated.** Remediate-at-level, per-level difficulty banding, and a deterministic at-level validator are all recognized practice, not invention.
- **Difficulty banding:** keep the corpus's 3 tiers as **ordinal** floor/ceiling bands per level (Pearson GSE precedent: each CEFR level = an explicit band; CEFR sanctions plus-levels). Don't promote 1–3 to interval IRT values without calibration. [Confirmed]
- **The theory for remediate-at-level is CD-CAT (Cognitive Diagnostic CAT), not unidimensional max-info.** Because NorskCoach's moat IS a per-concept mastery profile, the correct item-selection objective is "maximize info about the weak attribute" → select by the **weak concept's band, clamped to the learner's CEFR ceiling**. Unidimensional "stay near global ability" is the wrong model for us. [Confirmed→Inferred]
- **The load-bearing implementation change is MULTI-SKILL TAGGING (Q-matrix).** A sentence must be tagged with ALL skills it exercises, not just its primary concept — this is the canonical representation behind conjunctive knowledge tracing, and single-concept tagging is exactly what *mechanically blocks* remediate-at-level (the scheduler can't see that a B1 sentence also loads weak skill X). `error_tags_detectable` is the natural home for the contributing-skills list. [Confirmed]
- **Scaffolding is the difficulty knob, not level regression** — NorskCoach already has the lever (`learningRateScale` / guided frames = Vygotsky scaffolding). Keep ONE comprehensibility escape hatch (regress only when the learner repeatedly fails the simplest at-level item that loads the skill — ALEKS pattern). [Confirmed]
- **Dropping an advanced learner to trivial drills is a documented churn risk** (boredom from repetitiveness + absence of challenge → disengagement → dropout). Validates the user's instinct. [Confirmed]

---

## Lane A — Difficulty calibration & CEFR linking (conf 8.5/10)
- 2PL IRT is standard (Duolingo English Test); difficulty `b` and ability `theta` on one scale; CEFR linked via NLP-predicted linguistic features, not just piloting. [Confirmed]
- Per-level banding is canonical (GSE 10–90 continuous, ~2 sub-bands/level). Your **3 ordinal bands are reasonable/defensible**; finer without empirical `b` = false precision. [Confirmed/Inferred]
- A band can be **computed from item features** (lexical level + grammar/structure level + length) — DET's route and your realistic upgrade path. [Confirmed]
- **Advanced learner + weak foundational skill → CD-CAT** says select to maximize info about the weak attribute (content-balancing constraints always layered). Theory supports remediating at the weak concept's level. [Confirmed]
- **Contract takeaway:** remediation difficulty = f(concept mastery), **bounded above by learner CEFR level**. `filterSentencesByLevel` = upper guardrail; add a remediation *floor relaxation* so band-1 items of a weak concept are reachable even for an advanced learner.

## Lane B — Deterministic Norwegian at-level validator (conf 8/10)
- **No turnkey Norwegian CEFRLex or CEFR text classifier exists.** Assemble from 3 signals. [Confirmed]
- **Recommended validator (reject only if ≥2 of 3 exceed band — single-sentence signals are noisy):**
  1. **Lexical band coverage** (strongest): % content lemmas above target band — **UiO Norwegian Kelly list** (~9k CEFR-tagged lemmas; current UiO page CC BY-SA 4.0 — *verify file header*, older release was NC) + **Norsk ordbank** (CC-BY, already in repo via `gender-map.ts`) for lemmatization.
  2. **LIX readability** (`words/sentences + long_words(>6)×100/words`) — no deps; but **no published LIX→CEFR mapping for Norwegian** → calibrate, don't ship literature cutoffs.
  3. **Syntactic complexity** — sentence length + subordinate-clause count; `spaCy nb_core_news_md` (MIT) does parse+lemma+POS in one pass.
- **Calibrate thresholds against OUR OWN linguist-gated A1–B2 corpus** — its per-level signal distributions ARE the thresholds (sidesteps the missing-literature problem). [Inferred, strong]
- **Do NOT ship NoWaC** (CC BY-NC-SA) — offline calibration only. ASK learner corpus = validation only (research license).
- This is a **level gate complementary to** `validateNorwegianOutput` + the gender verifier — it catches too-hard lexis/syntax, not correctness.

## Lane C — Remediate-at-level prior art (conf 8.5/10)
- SLA convergence: **Bruner spiral** (revisit at increased complexity/new context), **Vygotsky ZPD** (scaffold the hard task, don't lower it), **Krashen i+1** (input at mastered level is acquisition-dead), **contextualized > decontextualized** drill for production transfer. [Confirmed]
- Real systems: Duolingo interleaves weak skills into harder schedules; ALEKS is the counter-case (regresses, but only to the "ready-to-learn fringe," in service of reaching grade-level). Cognitive Tutor/BKT map items to a SET of knowledge components (conjunctive KT). [Confirmed]
- **Multi-skill tagging is the answer to "how is a higher-level item that also exercises a lower-level skill represented?"** — Q-matrix; single-skill tagging causes "problem-selection thrashing." [Confirmed]
- **Escape hatch:** regress to the ready-to-learn fringe ONLY when the learner repeatedly fails the simplest at-level item loading the skill — the deciding test is comprehensibility, not difficulty. [Confirmed]

---

## Brainstorming Fuel (→ make-plan-pro)
1. **Multi-skill sentence tagging (Q-matrix)** — extend `error_tags_detectable` / add a `concepts-exercised` list so a B1/B2 sentence advertises the lower-level skills it also drills. The single change that unlocks remediate-at-level. Source it by: spaCy nb parse (auto-derive contributing skills) + linguist gate.
2. **Self-calibrated at-level validator** — run LIX + lexical-band + clause-count over the existing linguist-gated corpus to learn per-level thresholds, then gate AI generation against them (no LLM trust). Reuses Norsk ordbank already in repo.
3. **Remediation floor-relaxation in the scheduler** — `filterSentencesByLevel` stays the ceiling; add: remediation pool = at-level sentences ∩ weak-concept-exercised, with scaffolding (`learningRateScale`) as the difficulty knob and a comprehensibility escape hatch.

## Conflicts
⚡ UiO Kelly list license: current UiO page says CC BY-SA 4.0; an older KELLY release is cited CC BY-NC-SA 2.0 → **verify the actual file header before shipping** (NC would block redistribution).

## Sources
Lanes A/B/C detail + URLs in `.scout/lane-a-difficulty-calibration.md`, `.scout/lane-b-norwegian-level-signals.md`, `.scout/lane-c-remediate-at-level.md`.
