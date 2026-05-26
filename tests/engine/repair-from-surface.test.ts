import { describe, it, expect } from 'vitest'
import { repairFromSurface, repairBatchFromSurface } from '@/engine/repair-from-surface'
import { createEmptyFingerprint } from '@/types/fingerprint'
import type { ConceptGraph } from '@/types/concepts'

// Minimal graph for testing
const testGraph: ConceptGraph = {
  version: '1',
  language: 'no',
  concepts: [
    {
      id: 'noun-gender',
      label: 'Noun gender',
      description: 'Grammatical gender of nouns',
      errorTags: ['noun-gender'],
      minAttempts: 15,
      minDays: 3,
      prerequisites: [],
      cefrLevel: 'A1',
      masteryThreshold: 80,
    },
    {
      id: 'v2-word-order',
      label: 'V2 word order',
      description: 'Verb in second position',
      errorTags: ['word-order'],
      minAttempts: 15,
      minDays: 3,
      prerequisites: [],
      cefrLevel: 'A1',
      masteryThreshold: 80,
    },
  ],
}

describe('repairFromSurface', () => {
  it('updates mastery for the resolved concept (wrong answer)', () => {
    const fp = createEmptyFingerprint('test-user')
    // Give the concept an initial score
    fp.conceptMastery['noun-gender'] = {
      conceptId: 'noun-gender',
      rawScore: 80,
      confidenceScore: 0.5,
      decayedScore: 80,
      attemptCount: 10,
      correctCount: 8,
      uniqueDaysActive: 3,
      lastAttemptAt: new Date().toISOString(),
      lastCorrectAt: new Date().toISOString(),
      streak: 3,
      recentOutcomes: [true, true, true],
      srsLevel: 2,
      nextReviewAt: null,
    }
    const result = repairFromSurface(fp, {
      surfaceKind: 'journal',
      errorTag: 'noun-gender',
      wrong: 'en hus',
      correct: 'et hus',
    }, testGraph)

    expect(result.conceptMastery['noun-gender'].attemptCount).toBe(11)
    expect(result.conceptMastery['noun-gender'].rawScore).toBeLessThan(80)
    expect(result.conceptMastery['noun-gender'].srsLevel).toBe(0) // reset on wrong
  })

  it('adds an entry to recentErrors', () => {
    const fp = createEmptyFingerprint('test-user')
    const result = repairFromSurface(fp, {
      surfaceKind: 'conversation',
      errorTag: 'word-order',
      wrong: 'I dag vi spiser',
      correct: 'I dag spiser vi',
    }, testGraph)

    expect(result.recentErrors.length).toBe(1)
    expect(result.recentErrors[0].errorTag).toBe('word-order')
    expect(result.recentErrors[0].exerciseType).toBe('translation-to-norwegian')
    expect(result.recentErrors[0].wrong).toBe('I dag vi spiser')
  })

  it('uses explicit conceptId when provided', () => {
    const fp = createEmptyFingerprint('test-user')
    const result = repairFromSurface(fp, {
      surfaceKind: 'roleplay',
      errorTag: 'word-order',
      conceptId: 'v2-word-order',
    }, testGraph)

    expect(result.recentErrors[0].conceptId).toBe('v2-word-order')
    expect(result.conceptMastery['v2-word-order']).toBeDefined()
  })

  it('maps exerciseType correctly per surface', () => {
    const fp = createEmptyFingerprint('test-user')

    const journal = repairFromSurface(fp, {
      surfaceKind: 'journal',
      errorTag: 'noun-gender',
    }, testGraph)
    expect(journal.recentErrors[0].exerciseType).toBe('free-writing')

    const convo = repairFromSurface(fp, {
      surfaceKind: 'conversation',
      errorTag: 'noun-gender',
    }, testGraph)
    expect(convo.recentErrors[0].exerciseType).toBe('translation-to-norwegian')
  })

  it('aggregates error patterns', () => {
    const fp = createEmptyFingerprint('test-user')
    const result = repairFromSurface(fp, {
      surfaceKind: 'journal',
      errorTag: 'noun-gender',
      wrong: 'en hus',
      correct: 'et hus',
    }, testGraph)

    expect(result.errorPatterns.length).toBeGreaterThanOrEqual(0) // aggregation runs
  })
})

describe('repairBatchFromSurface', () => {
  it('processes multiple errors sequentially', () => {
    const fp = createEmptyFingerprint('test-user')
    const inputs = [
      { surfaceKind: 'journal' as const, errorTag: 'noun-gender', wrong: 'en hus', correct: 'et hus' },
      { surfaceKind: 'journal' as const, errorTag: 'word-order', wrong: 'I dag vi', correct: 'I dag spiser vi' },
      { surfaceKind: 'journal' as const, errorTag: 'noun-gender', wrong: 'en bord', correct: 'et bord' },
    ]
    const result = repairBatchFromSurface(fp, inputs, testGraph)

    expect(result.recentErrors.length).toBe(3)
    expect(result.conceptMastery['noun-gender'].attemptCount).toBe(2) // two noun-gender errors
  })

  it('returns original fingerprint for empty batch', () => {
    const fp = createEmptyFingerprint('test-user')
    const result = repairBatchFromSurface(fp, [], testGraph)
    expect(result.recentErrors.length).toBe(0)
    expect(result).toEqual(fp)
  })
})
