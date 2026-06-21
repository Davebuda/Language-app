# Detect wrong-word-different-category with a deterministic POS lexicon

**Date:** 2026-06-21
**Status:** active

## Decision
Build `src/lib/pos-map.ts` (a form → part-of-speech bitmask lookup, generated from Norsk-ordbank by `scripts/build-pos-map.ts`) and use it in `src/lib/classify-error.ts` to emit `wrong-word-different-category` — but only when a single-token swap is between two words that are **both in the lexicon** and whose **POS sets are disjoint** (bit-AND === 0). Added to `HIGH_CONFIDENCE`.

## Context
`classify-error` returned `wrong-word-same-category` for every "murky" single-token substitution because it had no part-of-speech knowledge — a noun typed where a verb belongs was indistinguishable from a noun-for-noun slip. `wrong-word-different-category` was therefore the last diagnostic tag in the content contract that was never produced (a coverage-gate WARN at B1 and B2). It had been deferred as "needs a POS classifier (infra)".

## Why
The project already had the exact pattern: `gender-map.ts` is a committed lexicon generated from Norsk-ordbank (CC-BY 4.0). POS is the **first token of the ordbank TAG column** (`subst`/`verb`/`adj`/`adv`/`prep`/`pron`/`det`/…), so a POS map is the same build with a different field. This keeps the feature **deterministic and offline** (the map ships as a committed artifact, ~150KB; no runtime dependency, no AI) — consistent with the rule that no unverified output moves mastery.

The **disjoint-POS** condition makes it conservative: it is biased toward false negatives (misses some real different-category errors) and structurally **cannot** produce a false `wrong-word-different-category` from an over-broad POS set — extra POS bits only make overlap *more* likely, suppressing the claim. OOV words (absent from the lexicon) never trigger it.

## Rejected alternatives
- **Morphological-ending heuristics** (infer POS from suffixes) — too ambiguous in Norwegian; would produce exactly the unreliable diagnosis data the project forbids.
- **An NLP/spaCy dependency or an LLM POS call** — adds a runtime dependency / unverified model output; violates the deterministic-and-offline discipline and the no-unverified-output rule.
- **Union ALL ordbank POS readings per form** — tried first; over-broadened sets (e.g. the marginal verb `katte` made the noun `katt` read as noun|verb), which suppressed the signal. Fixed by requiring each POS reading's **lemma base form** (`lemma.txt`) to be frequency-listed, so common readings survive and rare homographs drop.

## Consequences
- `wrong-word-different-category` now feeds diagnosis at every level; the B1+B2 coverage WARNs are closed and the gate credits it (`CLASSIFIER_COVERED`).
- `src/lib/pos-map.ts` is an AUTO-GENERATED artifact — never hand-edit; regenerate with `npx tsx scripts/build-pos-map.ts` (needs the gitignored `.tmp/ordbank/` source; the script auto-fetches it).
- Client bundle grows ~150KB raw (gzips small, like gender-map).
- Coverage is intentionally partial: open-class homographs (genuine noun/verb/adj overlaps like `rød`, `fort`) won't trigger different-category. That is the safe trade — precision over recall for diagnosis data.
- Locked by 3 tests in `tests/lib/classify-error.test.ts` (disjoint-swap trusted-over-authored, no over-fire on same-category overlap, OOV-safety).
