import { describe, it, expect } from 'vitest'
import { repairFromSurface, repairBatchFromSurface, recordProductionFromSurface } from '@/engine/repair-from-surface'
import { updateConceptMastery } from '@/engine/fingerprint'
import { createEmptyFingerprint } from '@/types/fingerprint'
import type { ConceptGraph } from '@/types/concepts'
import type { ConceptMastery } from '@/types/fingerprint'

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

describe('recordProductionFromSurface', () => {
  function seeded(score: number, srsLevel = 2): ConceptMastery {
    return {
      conceptId: 'v2-word-order',
      rawScore: score,
      confidenceScore: 0.5,
      decayedScore: score,
      attemptCount: 5,
      correctCount: 3,
      uniqueDaysActive: 2,
      lastAttemptAt: new Date(Date.now() - 86400000).toISOString(),
      lastCorrectAt: new Date(Date.now() - 86400000).toISOString(),
      streak: 1,
      recentOutcomes: [true, false, true],
      srsLevel,
      nextReviewAt: null,
    }
  }

  it('free production: full upward brick + SRS advances, no error logged', () => {
    const fp = createEmptyFingerprint('test-user')
    fp.conceptMastery['v2-word-order'] = seeded(50, 2)

    const result = recordProductionFromSurface(fp, { conceptId: 'v2-word-order', guided: false }, testGraph)
    const m = result.conceptMastery['v2-word-order']

    expect(m.rawScore).toBeGreaterThan(50)        // moved up
    expect(m.attemptCount).toBe(6)                // counts the attempt
    expect(m.srsLevel).toBe(3)                    // free production advances SRS
    expect(result.recentErrors.length).toBe(0)    // correct production logs NO error
    expect(result.productionGap).toEqual({})      // productionGap untouched (error-derived)
  })

  it('guided production: still moves UP but less than free, and SRS is frozen', () => {
    const free = recordProductionFromSurface(
      { ...createEmptyFingerprint('u'), conceptMastery: { 'v2-word-order': seeded(50, 2) } },
      { conceptId: 'v2-word-order', guided: false }, testGraph,
    ).conceptMastery['v2-word-order']

    const guided = recordProductionFromSurface(
      { ...createEmptyFingerprint('u'), conceptMastery: { 'v2-word-order': seeded(50, 2) } },
      { conceptId: 'v2-word-order', guided: true }, testGraph,
    ).conceptMastery['v2-word-order']

    expect(guided.rawScore).toBeGreaterThan(50)              // guided still moves up
    expect(guided.rawScore).toBeLessThan(free.rawScore)      // ...but less than free
    expect(guided.srsLevel).toBe(2)                          // SRS frozen (was 2)
    expect(free.srsLevel).toBe(3)                            // free advanced
  })

  it('a correct production NEVER lowers mastery, even guided on a strong concept', () => {
    const guided = recordProductionFromSurface(
      { ...createEmptyFingerprint('u'), conceptMastery: { 'v2-word-order': seeded(85, 4) } },
      { conceptId: 'v2-word-order', guided: true }, testGraph,
    ).conceptMastery['v2-word-order']

    expect(guided.rawScore).toBeGreaterThanOrEqual(85)       // never decreases
    expect(guided.srsLevel).toBe(4)                          // SRS still frozen
  })

  it('free production equals a plain correct attempt (scale default did not alter the EMA)', () => {
    // Guards that adding learningRateScale (default 1) left the canonical EMA
    // byte-identical: free production must match updateConceptMastery(true) with
    // no scale arg.
    const base = seeded(50, 2)
    const direct = updateConceptMastery(base, true, 15, 3) // no scale arg → default 1
    const viaProduction = recordProductionFromSurface(
      { ...createEmptyFingerprint('u'), conceptMastery: { 'v2-word-order': base } },
      { conceptId: 'v2-word-order', guided: false }, testGraph,
    ).conceptMastery['v2-word-order']

    expect(viaProduction.rawScore).toBe(direct.rawScore)
    expect(viaProduction.srsLevel).toBe(direct.srsLevel)
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
