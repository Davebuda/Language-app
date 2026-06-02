import { describe, it, expect } from 'vitest'
import { generateSession } from '@/engine/scheduler'
import { createEmptyFingerprint } from '@/types/fingerprint'
import type { MistakeFingerprint, ConceptMastery } from '@/types/fingerprint'
import type { ConceptGraph } from '@/types/concepts'
import type { Sentence } from '@/types/content'

// Move A (A4): the scheduler must emit a cloze item at a level with NO authored
// passages (B1/B2) by falling back to auto-cloze built from an eligible sentence.

const USER_ID = 'autocloze-user'

function makeConcept(id: string) {
  return {
    id, label: id, description: `c ${id}`, cefrLevel: 'B1' as const,
    prerequisites: [], masteryThreshold: 80, minAttempts: 15, minDays: 3, errorTags: [],
  }
}

function makeSentence(id: string, conceptId: string, opts: Partial<Sentence> = {}): Sentence {
  return {
    id,
    norwegian: 'Mange nordmenn snakker veldig tydelig',
    english: `English ${id}`,
    conceptIds: [conceptId],
    vocabularyClusters: [],
    errorTagsDetectable: ['word-order'],
    cefrLevel: 'B1',
    difficulty: 2,
    exerciseTypes: ['translation-to-norwegian', 'fill-in-blank'],
    ...opts,
  }
}

function makeMastery(conceptId: string): ConceptMastery {
  return {
    conceptId, rawScore: 30, confidenceScore: 0.4, decayedScore: 25,
    attemptCount: 5, correctCount: 1, uniqueDaysActive: 1,
    lastAttemptAt: new Date().toISOString(), lastCorrectAt: null,
    streak: 0, recentOutcomes: [false], srsLevel: 0, nextReviewAt: null,
  }
}

function buildGraph(ids: string[]): ConceptGraph {
  return { version: '1.0', language: 'nb-NO', concepts: ids.map(makeConcept) }
}

function b1Fingerprint(conceptIds: string[]): MistakeFingerprint {
  return {
    ...createEmptyFingerprint(USER_ID),
    currentLevel: 'B1',
    conceptMastery: Object.fromEntries(conceptIds.map((id) => [id, makeMastery(id)])),
    passedSentenceIds: {},
  }
}

describe('scheduler: auto-cloze fallback (Move A / A4)', () => {
  it('emits a cloze-passage item at B1 with NO authored passages', () => {
    const concepts = ['complex-subordination', 'discourse-markers']
    const sentences: Record<string, Sentence> = {}
    const availableSentenceIds: Record<string, string[]> = {}
    for (const cid of concepts) {
      const sid = `${cid}-s0`
      sentences[sid] = makeSentence(sid, cid)
      availableSentenceIds[cid] = [sid]
    }

    // No availablePassageIds / passages passed at all (B1 reality today).
    const result = generateSession({
      fingerprint: b1Fingerprint(concepts),
      graph: buildGraph(concepts),
      availableSentenceIds,
      sentences,
    })

    const clozeItems = result.session.items.filter((i) => i.exerciseType === 'cloze-passage')
    expect(clozeItems.length).toBe(1) // at most one cloze per session, and it IS present
  })

  it('does NOT emit auto-cloze when the only sentence is unbuildable (no error tag)', () => {
    const concepts = ['complex-subordination']
    const sid = 'cs-s0'
    const sentences: Record<string, Sentence> = {
      [sid]: makeSentence(sid, 'complex-subordination', { errorTagsDetectable: [] }),
    }
    const availableSentenceIds = { 'complex-subordination': [sid] }

    const result = generateSession({
      fingerprint: b1Fingerprint(concepts),
      graph: buildGraph(concepts),
      availableSentenceIds,
      sentences,
    })

    const clozeItems = result.session.items.filter((i) => i.exerciseType === 'cloze-passage')
    expect(clozeItems).toHaveLength(0) // honest absence — no buildable gap, no cloze
  })
})
