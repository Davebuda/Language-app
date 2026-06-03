import { describe, it, expect } from 'vitest'
import { errorTagToGrammarConceptId, errorTagToConceptId } from '@/lib/error-tag-to-concept'

// Locks the honesty guard: a user-facing grammar rule must only render for tags
// that genuinely map to a grammar concept. Vocabulary/comprehension/meta tags
// resolve to the noun-gender fallback for mastery bookkeeping (errorTagToConceptId),
// but errorTagToGrammarConceptId returns null for them so no mismatched rule shows.
describe('errorTagToGrammarConceptId', () => {
  it('returns the real concept for genuine grammar tags', () => {
    expect(errorTagToGrammarConceptId('word-order')).toBe('v2-word-order')
    expect(errorTagToGrammarConceptId('negation-placement')).toBe('negation')
    expect(errorTagToGrammarConceptId('noun-gender')).toBe('noun-gender')
  })

  it('returns null for fallback (vocab/comprehension/meta) tags', () => {
    for (const tag of ['spelling', 'wrong-word-same-category', 'listening-recognition', 'reading-parsing', 'meaning-misunderstood', 'unspecified']) {
      expect(errorTagToGrammarConceptId(tag)).toBeNull()
      // but the bookkeeping mapper still attributes them (no silent drop)
      expect(errorTagToConceptId(tag)).toBe('noun-gender')
    }
  })

  it('returns null for empty/unknown tags', () => {
    expect(errorTagToGrammarConceptId(null)).toBeNull()
    expect(errorTagToGrammarConceptId('')).toBeNull()
    expect(errorTagToGrammarConceptId('not-a-real-tag')).toBeNull()
  })
})
