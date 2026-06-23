import { describe, it, expect } from 'vitest'
import { getEligibleNotebookItems } from '@/lib/notebook-promotion'
import type { NotebookItem } from '@/types/notebook'
import type { ConceptMastery, MistakeFingerprint } from '@/types/fingerprint'

// ---------------------------------------------------------------------------
// Fixture helpers
// ---------------------------------------------------------------------------

function makeItem(overrides: Partial<NotebookItem>): NotebookItem {
  return {
    id: 'item-1',
    userId: 'user-1',
    type: 'word',
    norwegian: 'huset',
    source: 'okt',
    tags: [],
    reviewStatus: 'new',
    verified: false,
    promoted: false,
    srsLevel: 0,
    nextReviewAt: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

function makeMastery(overrides: Partial<ConceptMastery>): ConceptMastery {
  return {
    conceptId: 'noun-gender',
    rawScore: 40,
    confidenceScore: 0.5,
    decayedScore: 35,
    attemptCount: 6,
    correctCount: 3,
    uniqueDaysActive: 2,
    lastAttemptAt: '2026-01-01T00:00:00.000Z',
    lastCorrectAt: null,
    streak: 0,
    recentOutcomes: [],
    srsLevel: 0,
    nextReviewAt: null,
    ...overrides,
  }
}

// Minimal fingerprint slice with one weak concept (low decayedScore, >0 attempts)
const WEAK_CONCEPT_ID = 'noun-gender'
const weakFingerprint: Pick<MistakeFingerprint, 'conceptMastery'> = {
  conceptMastery: {
    [WEAK_CONCEPT_ID]: makeMastery({ conceptId: WEAK_CONCEPT_ID, decayedScore: 35, rawScore: 40 }),
  },
}

// Fingerprint with a decaying concept (rawScore≥70 but decayedScore<70)
const DECAYING_CONCEPT_ID = 'v2-word-order'
const decayingFingerprint: Pick<MistakeFingerprint, 'conceptMastery'> = {
  conceptMastery: {
    [DECAYING_CONCEPT_ID]: makeMastery({
      conceptId: DECAYING_CONCEPT_ID,
      rawScore: 80,
      decayedScore: 55,
      attemptCount: 10,
    }),
  },
}

const FUTURE_DATE = '2030-01-01T00:00:00.000Z'
const PAST_DATE = '2020-01-01T00:00:00.000Z'
const NOW = new Date('2026-06-23T12:00:00.000Z')

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('getEligibleNotebookItems', () => {
  it('promoted + due (null nextReviewAt) → eligible', () => {
    const item = makeItem({ promoted: true, nextReviewAt: null })
    const result = getEligibleNotebookItems([item], weakFingerprint, NOW)
    expect(result).toHaveLength(1)
    expect(result[0]).toBe(item)
  })

  it('promoted + due (nextReviewAt in the past) → eligible', () => {
    const item = makeItem({ promoted: true, nextReviewAt: PAST_DATE })
    const result = getEligibleNotebookItems([item], weakFingerprint, NOW)
    expect(result).toHaveLength(1)
  })

  it('not-promoted but conceptId is weak + due → eligible', () => {
    const item = makeItem({
      promoted: false,
      conceptId: WEAK_CONCEPT_ID,
      nextReviewAt: null,
    })
    const result = getEligibleNotebookItems([item], weakFingerprint, NOW)
    expect(result).toHaveLength(1)
  })

  it('not-promoted but conceptId is decaying + due → eligible', () => {
    const item = makeItem({
      promoted: false,
      conceptId: DECAYING_CONCEPT_ID,
      nextReviewAt: null,
    })
    const result = getEligibleNotebookItems([item], decayingFingerprint, NOW)
    expect(result).toHaveLength(1)
  })

  it('not-promoted, weak conceptId, NOT due → excluded', () => {
    const item = makeItem({
      promoted: false,
      conceptId: WEAK_CONCEPT_ID,
      nextReviewAt: FUTURE_DATE,
    })
    const result = getEligibleNotebookItems([item], weakFingerprint, NOW)
    expect(result).toHaveLength(0)
  })

  it('not-promoted, conceptId not in fingerprint at all → excluded', () => {
    // Path (b) requires the concept to appear in the weak or decaying sets.
    // A concept with zero attempts is absent from conceptMastery entirely, so
    // getPrimaryWeakConcepts (which filters attemptCount > 0) never returns it.
    const emptyFingerprint: Pick<MistakeFingerprint, 'conceptMastery'> = { conceptMastery: {} }
    const item = makeItem({
      promoted: false,
      conceptId: 'some-unknown-concept',
      nextReviewAt: null,
    })
    const result = getEligibleNotebookItems([item], emptyFingerprint, NOW)
    expect(result).toHaveLength(0)
  })

  it('not-promoted, no conceptId set, fingerprint has weak concepts → excluded', () => {
    // No conceptId means path (b) cannot fire; no promoted means path (a) cannot fire
    const item = makeItem({ promoted: false, nextReviewAt: null })
    const result = getEligibleNotebookItems([item], weakFingerprint, NOW)
    expect(result).toHaveLength(0)
  })

  it('archived → excluded even when promoted + due', () => {
    const item = makeItem({ promoted: true, nextReviewAt: null, reviewStatus: 'archived' })
    const result = getEligibleNotebookItems([item], weakFingerprint, NOW)
    expect(result).toHaveLength(0)
  })

  it('archived + weak conceptId + due → excluded (archived wins)', () => {
    const item = makeItem({
      promoted: false,
      conceptId: WEAK_CONCEPT_ID,
      nextReviewAt: null,
      reviewStatus: 'archived',
    })
    const result = getEligibleNotebookItems([item], weakFingerprint, NOW)
    expect(result).toHaveLength(0)
  })

  it('never-practiced (nextReviewAt null) + promoted → eligible', () => {
    // Explicit coverage of the never-practiced case from the task spec
    const item = makeItem({ promoted: true, nextReviewAt: null, srsLevel: 0 })
    const result = getEligibleNotebookItems([item], weakFingerprint, NOW)
    expect(result).toHaveLength(1)
  })

  it('promoted but not yet due → excluded', () => {
    const item = makeItem({ promoted: true, nextReviewAt: FUTURE_DATE })
    const result = getEligibleNotebookItems([item], weakFingerprint, NOW)
    expect(result).toHaveLength(0)
  })

  it('mixed bag: returns only eligible items', () => {
    const eligible1 = makeItem({ id: 'e1', promoted: true, nextReviewAt: null })
    const eligible2 = makeItem({
      id: 'e2',
      promoted: false,
      conceptId: WEAK_CONCEPT_ID,
      nextReviewAt: PAST_DATE,
    })
    const excluded1 = makeItem({ id: 'x1', promoted: false, nextReviewAt: null }) // no conceptId
    const excluded2 = makeItem({ id: 'x2', promoted: true, nextReviewAt: FUTURE_DATE }) // not due
    const excluded3 = makeItem({ id: 'x3', promoted: true, nextReviewAt: null, reviewStatus: 'archived' })

    const result = getEligibleNotebookItems(
      [eligible1, eligible2, excluded1, excluded2, excluded3],
      weakFingerprint,
      NOW,
    )

    expect(result).toHaveLength(2)
    expect(result.map((i) => i.id).sort()).toEqual(['e1', 'e2'])
  })

  it('empty items list → returns empty array', () => {
    const result = getEligibleNotebookItems([], weakFingerprint, NOW)
    expect(result).toEqual([])
  })

  it('empty conceptMastery fingerprint (cold start) → only promoted+due items eligible', () => {
    const empty: Pick<MistakeFingerprint, 'conceptMastery'> = { conceptMastery: {} }
    const promoted = makeItem({ id: 'p1', promoted: true, nextReviewAt: null })
    const weakPath = makeItem({ id: 'w1', promoted: false, conceptId: WEAK_CONCEPT_ID, nextReviewAt: null })
    const result = getEligibleNotebookItems([promoted, weakPath], empty, NOW)
    // With no mastery data, no concept is weak → only promoted fires
    expect(result).toHaveLength(1)
    expect(result[0]).toBe(promoted)
  })

  it('does not mutate the input array', () => {
    const items = [makeItem({ promoted: true, nextReviewAt: null })]
    const copy = [...items]
    getEligibleNotebookItems(items, weakFingerprint, NOW)
    expect(items).toEqual(copy)
  })

  it('defaults now to new Date() when omitted (smoke test)', () => {
    // promoted + null nextReviewAt is always due regardless of clock
    const item = makeItem({ promoted: true, nextReviewAt: null })
    // Should not throw and should return the item
    expect(() => getEligibleNotebookItems([item], weakFingerprint)).not.toThrow()
    const result = getEligibleNotebookItems([item], weakFingerprint)
    expect(result).toHaveLength(1)
  })
})
