---
name: error-taxonomy
description: The canonical 17-tag error taxonomy for NorskCoach. Use when writing exercise scoring, handling wrong answers, logging errors to the mistake fingerprint, or building any feature that classifies mistakes. Every mistake in the system gets exactly one tag from this list.
---

# Error Taxonomy

Every mistake the learner makes is tagged with exactly one of these 17 tags. Consistent tagging is what makes the engine's diagnosis meaningful.

## Grammar Errors (11 tags)

| Tag | What it catches | Example wrong | Example correct |
|---|---|---|---|
| `word-order` | V2 violations, SVO violations in main/subordinate clauses | "I dag jeg spiser" | "I dag spiser jeg" |
| `verb-tense` | Wrong tense used | "I går spiser jeg" | "I går spiste jeg" |
| `verb-conjugation` | Wrong verb form (not a tense error) | "Han spiser ikke" when verb form itself is wrong | Correct conjugation |
| `noun-gender` | Wrong gender assigned to noun | "et hund" | "en hund" |
| `article-use` | Wrong definite/indefinite article or suffix | "en hunden" | "hunden" |
| `adjective-agreement` | Adjective not matching noun gender/definiteness | "et stor hus" | "et stort hus" |
| `pronoun-choice` | Wrong pronoun for context | "Han er min mor" | "Hun er min mor" |
| `preposition` | Wrong preposition for context | "Jeg bor på huset" | "Jeg bor i huset" |
| `modal-verb` | Modal misuse (å after modal, wrong modal) | "Jeg kan å snakke" | "Jeg kan snakke" |
| `negation-placement` | "ikke" in wrong position | "Ikke jeg spiser" | "Jeg spiser ikke" |
| `compound-word` | Compound written as separate words | "kjøkken benk" | "kjøkkenbenk" |

## Vocabulary Errors (3 tags)

| Tag | What it catches |
|---|---|
| `wrong-word-same-category` | False friends, near-synonyms (knew a word, chose wrong one) |
| `wrong-word-different-category` | No word knowledge — wrong semantic category entirely |
| `spelling` | Correct word, wrong spelling (missing æøå, doubled consonant, etc.) |

## Comprehension Errors (3 tags)

| Tag | What it catches |
|---|---|
| `listening-recognition` | Couldn't parse the spoken audio |
| `reading-parsing` | Couldn't decode the written sentence structure |
| `meaning-misunderstood` | Recognized words but missed the meaning |

## Tagging Rules

1. **One tag per mistake.** If a sentence has two errors, log two separate error entries.
2. **Tense vs conjugation:** Use `verb-tense` when the wrong tense is used (past instead of present). Use `verb-conjugation` when the tense is right but the form is wrong.
3. **Article vs gender:** Use `noun-gender` when the learner uses the wrong gender (et hund). Use `article-use` when the gender is right but the article form is wrong (en hunden instead of hunden).
4. **Don't tag what can't be detected.** If an exercise type can't surface a particular error type, don't force a tag.

## Which exercises detect which tags

| Exercise type | Can detect |
|---|---|
| `translation-to-norwegian` | word-order, verb-tense, verb-conjugation, noun-gender, article-use, adjective-agreement, pronoun-choice, preposition, modal-verb, negation-placement, compound-word, wrong-word-same-category, spelling |
| `sentence-transformation` | word-order, verb-tense, verb-conjugation, adjective-agreement, negation-placement |
| `fill-in-blank` | verb-tense, verb-conjugation, noun-gender, article-use, adjective-agreement, pronoun-choice, preposition, modal-verb |
| `word-order` | word-order, negation-placement |
| `listening-comprehension` | listening-recognition, meaning-misunderstood |
| `dictation` | spelling, listening-recognition, compound-word |
| `free-writing` | all grammar tags, all vocabulary tags |
