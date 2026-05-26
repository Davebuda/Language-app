import { describe, it, expect } from 'vitest'
import { suggestFocusTopic, buildFocusHint } from '@/lib/kari-opener'

describe('suggestFocusTopic', () => {
  it('returns fallback when weeklyFocus is empty', () => {
    const result = suggestFocusTopic([], {})
    expect(result.topicId).toBe('daily-routine')
    expect(result.focusConceptId).toBeNull()
    expect(result.focusLabel).toBeNull()
  })

  it('returns the topic that covers the most focus concepts', () => {
    // daily-routine covers: to-be-verb, present-tense-regular, svo-word-order, v2-word-order, etc.
    const result = suggestFocusTopic(
      ['to-be-verb', 'present-tense-regular', 'common-modal-verbs'],
      {},
    )
    // to-be-verb -> daily-routine, present-tense-regular -> daily-routine, common-modal-verbs -> work
    // daily-routine wins with 2 hits
    expect(result.topicId).toBe('daily-routine')
  })

  it('picks the weakest concept as focusConceptId', () => {
    const result = suggestFocusTopic(
      ['to-be-verb', 'present-tense-regular'],
      {
        'to-be-verb': { decayedScore: 80 },
        'present-tense-regular': { decayedScore: 40 },
      },
    )
    expect(result.focusConceptId).toBe('present-tense-regular')
  })

  it('returns fallback when focus concepts have no topic mapping', () => {
    const result = suggestFocusTopic(['unknown-concept-xyz'], {})
    expect(result.topicId).toBe('daily-routine')
    expect(result.focusConceptId).toBeNull()
  })

  it('breaks ties by weakest concept score', () => {
    // 1 concept each for two topics — pick the one with lower score
    const result = suggestFocusTopic(
      ['common-modal-verbs', 'common-prepositions'],
      {
        'common-modal-verbs': { decayedScore: 60 },  // -> work
        'common-prepositions': { decayedScore: 30 },  // -> norway
      },
    )
    expect(result.topicId).toBe('norway') // lower score wins the tie
  })

  it('returns a Norwegian label', () => {
    const result = suggestFocusTopic(['noun-gender'], {})
    expect(result.focusLabel).toBe('substantivgenus (en/ei/et)')
  })
})

describe('buildFocusHint', () => {
  it('returns a Norwegian instruction string', () => {
    const hint = buildFocusHint('modalverb (kan, vil, skal, må)')
    expect(hint).toContain('modalverb')
    expect(hint).toContain('eksponerer')
  })
})
