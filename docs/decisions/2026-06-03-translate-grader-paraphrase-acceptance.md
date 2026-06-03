# Accept alternative answers via per-sentence acceptedAnswers + contraction transform, never fuzzy/AI matching

**Date:** 2026-06-03
**Status:** active

## Decision
Translation/word-order graders accept valid alternatives through two deterministic
mechanisms only: an optional per-sentence `acceptedAnswers` / `acceptedOrders` list
(linguist-authored) plus a universal, meaning-preserving English contraction transform
(`don't` ⇔ `do not`). No fuzzy/token-overlap matching and no AI semantic re-grade.

## Context
`translation-to-english` and `word-order` graders used exact normalized-string equality,
so valid paraphrases ("I do not know" vs "I don't know"), synonyms, and legal V2
re-orderings were marked wrong (residual "3a"/"3c"). NorskCoach is a grammar coach: a
false-positive (marking a genuinely wrong answer correct) corrupts the diagnostic and is
worse than a false-negative.

## Why
- **Zero false-positive risk.** Explicit per-sentence lists + provably-equivalent
  contraction pairs can never make a wrong answer match. Formatting normalization
  (whitespace, curly↔straight quotes) is likewise meaning-preserving.
- **Option C alignment.** The core engine must not depend on AI; every path has a
  deterministic fallback. These graders stay fully deterministic.
- **Pattern consistency.** Mirrors the already-shipped `cloze gap.acceptedAnswers` and
  `word-order acceptedOrders` fields — one grading idiom, not three.

## Rejected alternatives
- **Fuzzy / token-overlap / Levenshtein-threshold matching** — would mark grammatically
  wrong answers correct (false-positives); unacceptable for a diagnostic coach.
- **AI semantic re-grade for English** (a prior Council suggestion) — superseded by
  Option C: adds an AI dependency, cost, and non-determinism to a core path.
- **Normalization-only leniency** — can't safely capture semantic paraphrases
  (synonyms, structure changes) without over-accepting.

## Consequences
- Semantic alternatives require linguist-authored `acceptedAnswers` per sentence
  (content burden; gated by a `norwegian-linguist` pass — never blind-authored).
- Contraction pairs are handled universally; ambiguous clitics (`'s` = is/has/possessive,
  `'d` = had/would) are deliberately left unhandled to avoid false matches.
- Norwegian grading is unaffected by the contraction transform (no English contractions
  appear in Norwegian text).
- Engine: `checkAnswer` (contraction-tolerant) + `checkAnswerWithAlternatives` in
  `src/lib/answer.ts`; wired in `src/app/session/actions.ts#gradeAnswer`; field on
  `Sentence` in `src/types/content.ts`; passthrough in `src/lib/content-loader.ts`.
  Locked by `tests/exercises/translation.test.ts` + `tests/content/accepted-alternatives.test.ts`.
