# Promote modal/pronoun/negation closed-class swaps to HIGH_CONFIDENCE

**Date:** 2026-06-21
**Status:** active

## Decision
In `src/lib/classify-error.ts`, `modal-verb`, `pronoun-choice`, and `negation-placement` were added to the `HIGH_CONFIDENCE` set — so a clean single-token swap between two words of the same closed class is trusted as that error tag even when it contradicts the sentence's authored `error_tags_detectable`.

## Context
Across 577 B2 sentences, the authored tags contained **0 `pronoun-choice` and 0 `modal-verb`**. The classifier's `observe()` already *detected* a clean pronoun/modal swap, but `classifyError` then discarded it (it deferred to the authored tag for anything not in `HIGH_CONFIDENCE`) — so B2 pronoun and modal errors were relabelled (usually `word-order`) and were invisible to diagnosis. This was p6 "W4", flagged as a Rule-8 diagnosis-feeding decision needing sign-off.

## Why
The detection logic for these three is **identical** to the long-trusted `article-use`: a same-length single substitution where both tokens are in the same closed-class set (`MODALS`, `PRONOUNS`, `NEGATIONS` — mirroring `ARTICLES`). Same shape ⇒ same precision. So promoting them is a *consistency* fix, not a new risk. It is fully deterministic (string-set membership, no AI), so it upholds the project rule that no unverified output may move mastery — the same justification as the Lever-3 gender verifier.

Negation was **tightened first**: its single-substitution check was an OR (`u OR c is a negation`), which mislabels a negation-for-non-negation swap as placement. Changed to AND (both tokens negations, e.g. `ikke`↔`aldri`), symmetric with the other closed classes; a negation-for-non-negation swap now falls through to `wrong-word-same-category`. True `ikke`-misplacement remains in the word-order / extra-token branches.

## Rejected alternatives
- **Author the tags into B2 content instead** (add `pronoun-choice`/`modal-verb` to `error_tags_detectable` across sentences) — correct but a large linguist-gated tagging task, and it leaves the classifier blind on any sentence that doesn't declare them. The classifier already detects them precisely; the gap was trust, not detection.
- **Defer to NB-Llama** — unnecessary; these are deterministic string-diff classes, not a model-judgement problem.
- **Leave as-is / treat as a non-gap** — rejected: the gap is real (B2 pronoun/modal errors were genuinely undiagnosed).

## Consequences
- B2 (and any level) pronoun/modal/negation closed-class errors now feed diagnosis under their own tag instead of being absorbed into `word-order`.
- The coverage gate's `CLASSIFIER_COVERED` (in `scripts/audit-corpus.ts`) must stay in sync with `HIGH_CONFIDENCE` — it was updated in the same session (`4f52c3a`). Keep them in sync on any future change.
- Locked by 4 tests in `tests/lib/classify-error.test.ts` (trust-over-authored for each class + the negation-tightening regression).
