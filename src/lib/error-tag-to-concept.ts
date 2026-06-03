// Shared mapping: ErrorTag (taxonomy.ts, 17 + unspecified) → canonical concept-id.
//
// Before P0.5-04 this map was duplicated and incomplete across
// `src/app/conversation/page.tsx:62-73` (10 tags) and
// `src/components/journal/WritingEditor.tsx:22-34` (11 tags). Any tag outside
// either short list was silently dropped at lookup, so journal corrections
// and conversation grammar-checks could write zero entries to the fingerprint
// even when the AI surfaced real errors (F030, F034).
//
// This module covers every taxonomy entry. Grammar tags map to their canonical
// concept. Vocabulary, comprehension, and meta tags fall back to `noun-gender`
// — a deliberate "least-bad concept to attribute generic sentence-level
// mistakes to" choice (also the heuristic the journal map already used for
// `spelling`). The alternative — dropping unmapped errors — was the silent
// failure that defeated the engine in the third walkthrough.
//
// Concept-id values must match the graph (per P0.5-02 canonicalisation).

import type { ErrorTag } from '@/types/taxonomy'

const FALLBACK_CONCEPT_ID = 'noun-gender'

export const ERROR_TAG_TO_CONCEPT_ID: Record<ErrorTag, string> = {
  // Grammar — each maps to its primary concept
  'word-order': 'v2-word-order',
  'verb-tense': 'preterite-regular',
  'verb-conjugation': 'present-tense-regular',
  'noun-gender': 'noun-gender',
  'article-use': 'indefinite-articles',
  'adjective-agreement': 'adjective-agreement',
  'pronoun-choice': 'personal-pronouns',
  'preposition': 'common-prepositions',
  'modal-verb': 'common-modal-verbs',
  'negation-placement': 'negation',
  'compound-word': 'word-formation',
  // Vocabulary — no perfect concept; route to noun-gender so the error still
  // contributes to mastery rather than silently disappearing.
  'wrong-word-same-category': FALLBACK_CONCEPT_ID,
  'wrong-word-different-category': FALLBACK_CONCEPT_ID,
  'spelling': FALLBACK_CONCEPT_ID,
  // Comprehension — channel-level errors; same fallback rationale.
  'listening-recognition': FALLBACK_CONCEPT_ID,
  'reading-parsing': FALLBACK_CONCEPT_ID,
  'meaning-misunderstood': FALLBACK_CONCEPT_ID,
  // Meta — explicit unknown
  'unspecified': FALLBACK_CONCEPT_ID,
}

// Resolve an arbitrary string (which may come from an AI that invented a
// non-taxonomy tag) to a concept-id. Returns FALLBACK_CONCEPT_ID rather than
// undefined so callers never silently skip a fingerprint write.
export function errorTagToConceptId(tag: string | undefined | null): string {
  if (!tag) return FALLBACK_CONCEPT_ID
  return ERROR_TAG_TO_CONCEPT_ID[tag as ErrorTag] ?? FALLBACK_CONCEPT_ID
}

// Like errorTagToConceptId, but returns null when the tag only resolves via the
// catch-all fallback (vocabulary, comprehension, meta tags). Use on USER-FACING
// surfaces that render a concept's grammar rule: attributing a fallback tag to
// `noun-gender` is fine for mastery bookkeeping, but surfacing the noun-gender
// rule under e.g. "Lytteforståelse" would be a wrong-explanation claim (Rule 6).
export function errorTagToGrammarConceptId(tag: string | undefined | null): string | null {
  if (!tag) return null
  const mapped = ERROR_TAG_TO_CONCEPT_ID[tag as ErrorTag]
  if (mapped === undefined) return null
  if (mapped === FALLBACK_CONCEPT_ID && tag !== 'noun-gender') return null
  return mapped
}
