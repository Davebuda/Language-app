import { describe, it, expect } from 'vitest';
import { generateSession } from '@/engine/scheduler';
import { createEmptyFingerprint } from '@/types/fingerprint';
import type { MistakeFingerprint, ConceptMastery } from '@/types/fingerprint';
import type { ConceptGraph } from '@/types/concepts';
import type { Sentence } from '@/types/content';

const USER_ID = 'test-user';

function makeConcept(id: string, prereqs: string[] = []) {
  return {
    id,
    label: id,
    description: `Test concept ${id}`,
    cefrLevel: 'A1' as const,
    prerequisites: prereqs,
    masteryThreshold: 80,
    minAttempts: 15,
    minDays: 3,
    errorTags: [],
  };
}

function makeSentence(id: string, conceptId: string): Sentence {
  return {
    id,
    norwegian: `Norsk ${id}`,
    english: `English ${id}`,
    conceptIds: [conceptId],
    vocabularyClusters: [],
    errorTagsDetectable: [],
    cefrLevel: 'A1',
    difficulty: 1,
    exerciseTypes: ['translation-to-norwegian', 'fill-in-blank', 'word-order', 'translation-to-english'],
  };
}

function makeMastery(overrides: Partial<ConceptMastery> = {}): ConceptMastery {
  return {
    conceptId: 'c1',
    rawScore: 50,
    confidenceScore: 0.5,
    decayedScore: 45,
    attemptCount: 10,
    correctCount: 5,
    uniqueDaysActive: 2,
    lastAttemptAt: new Date().toISOString(),
    lastCorrectAt: new Date().toISOString(),
    streak: 1,
    recentOutcomes: [true, false, true, false, true],
    srsLevel: 0,
    nextReviewAt: null,
    ...overrides,
  };
}

function buildTestGraph(conceptIds: string[]): ConceptGraph {
  return {
    version: '1.0',
    language: 'nb-NO',
    concepts: conceptIds.map((id) => makeConcept(id)),
  };
}

function buildTestSentences(conceptIds: string[], perConcept = 3) {
  const sentences: Record<string, Sentence> = {};
  const availableSentenceIds: Record<string, string[]> = {};
  for (const cid of conceptIds) {
    availableSentenceIds[cid] = [];
    for (let i = 0; i < perConcept; i++) {
      const sid = `${cid}-s${i}`;
      sentences[sid] = makeSentence(sid, cid);
      availableSentenceIds[cid].push(sid);
    }
  }
  return { sentences, availableSentenceIds };
}

describe('scheduler: passed-sentence filtering', () => {
  const concepts = ['c1', 'c2', 'c3', 'c4', 'c5'];
  const graph = buildTestGraph(concepts);

  it('excludes concepts with all sentences passed from remediation', () => {
    const { sentences, availableSentenceIds } = buildTestSentences(concepts, 3);
    const fp: MistakeFingerprint = {
      ...createEmptyFingerprint(USER_ID),
      conceptMastery: {
        c1: makeMastery({ conceptId: 'c1', rawScore: 30, decayedScore: 25 }),
        c2: makeMastery({ conceptId: 'c2', rawScore: 40, decayedScore: 35 }),
      },
      passedSentenceIds: {
        'c1-s0': new Date().toISOString(),
        'c1-s1': new Date().toISOString(),
        'c1-s2': new Date().toISOString(),
      },
    };

    const result = generateSession({ fingerprint: fp, graph, availableSentenceIds, sentences });
    const remediationItems = result.session.items.filter((i) => i.purpose === 'remediation');
    const c1Items = remediationItems.filter((i) => i.conceptIds.includes('c1'));
    expect(c1Items).toHaveLength(0);
  });

  it('includes concepts with unpassed sentences in remediation', () => {
    const { sentences, availableSentenceIds } = buildTestSentences(concepts, 3);
    const fp: MistakeFingerprint = {
      ...createEmptyFingerprint(USER_ID),
      conceptMastery: {
        c1: makeMastery({ conceptId: 'c1', rawScore: 30, decayedScore: 25 }),
        c2: makeMastery({ conceptId: 'c2', rawScore: 40, decayedScore: 35 }),
      },
      passedSentenceIds: {
        'c1-s0': new Date().toISOString(),
      },
    };

    const result = generateSession({ fingerprint: fp, graph, availableSentenceIds, sentences });
    const c1Items = result.session.items.filter((i) => i.conceptIds.includes('c1'));
    expect(c1Items.length).toBeGreaterThan(0);
  });

  it('allows passed sentences for review-due concepts', () => {
    const { sentences, availableSentenceIds } = buildTestSentences(concepts, 3);
    const fp: MistakeFingerprint = {
      ...createEmptyFingerprint(USER_ID),
      conceptMastery: {
        c1: makeMastery({
          conceptId: 'c1',
          rawScore: 75,
          decayedScore: 65,
          nextReviewAt: new Date(Date.now() - 86400000).toISOString(),
        }),
        c2: makeMastery({ conceptId: 'c2', rawScore: 50, decayedScore: 45 }),
      },
      passedSentenceIds: {
        'c1-s0': new Date().toISOString(),
        'c1-s1': new Date().toISOString(),
        'c1-s2': new Date().toISOString(),
      },
    };

    const result = generateSession({ fingerprint: fp, graph, availableSentenceIds, sentences });
    const reviewItems = result.session.items.filter((i) => i.purpose === 'review');
    const c1Reviews = reviewItems.filter((i) => i.conceptIds.includes('c1'));
    expect(c1Reviews.length).toBeGreaterThan(0);
  });

  it('does not include mastered concepts in new-material or interleaving', () => {
    const { sentences, availableSentenceIds } = buildTestSentences(concepts, 5);
    const fp: MistakeFingerprint = {
      ...createEmptyFingerprint(USER_ID),
      conceptMastery: {
        c1: makeMastery({
          conceptId: 'c1',
          rawScore: 90,
          confidenceScore: 0.9,
          decayedScore: 88,
          attemptCount: 20,
          uniqueDaysActive: 5,
        }),
      },
      passedSentenceIds: {},
    };

    const result = generateSession({ fingerprint: fp, graph, availableSentenceIds, sentences });
    const newItems = result.session.items.filter((i) => i.purpose === 'new-material');
    const interleavingItems = result.session.items.filter((i) => i.purpose === 'interleaving');
    const c1New = newItems.filter((i) => i.conceptIds.includes('c1'));
    const c1Interleaving = interleavingItems.filter((i) => i.conceptIds.includes('c1'));
    expect(c1New).toHaveLength(0);
    expect(c1Interleaving).toHaveLength(0);
  });

  it('session does not collapse to zero items even with heavy passing', () => {
    const { sentences, availableSentenceIds } = buildTestSentences(concepts, 5);
    const fp: MistakeFingerprint = {
      ...createEmptyFingerprint(USER_ID),
      conceptMastery: {
        c1: makeMastery({ conceptId: 'c1', rawScore: 40, decayedScore: 35 }),
      },
      passedSentenceIds: {
        'c1-s0': new Date().toISOString(),
        'c1-s1': new Date().toISOString(),
        'c1-s2': new Date().toISOString(),
        'c1-s3': new Date().toISOString(),
        'c1-s4': new Date().toISOString(),
      },
    };

    const result = generateSession({ fingerprint: fp, graph, availableSentenceIds, sentences });
    expect(result.session.items.length).toBeGreaterThan(0);
  });
});

describe('scheduler: all-concepts-passed edge case', () => {
  const concepts = ['c1', 'c2', 'c3'];
  const graph = buildTestGraph(concepts);

  it('produces a review-only session when every concept has all sentences passed', () => {
    const { sentences, availableSentenceIds } = buildTestSentences(concepts, 3);
    const passedSentenceIds: Record<string, string> = {};
    for (const ids of Object.values(availableSentenceIds)) {
      for (const id of ids) {
        passedSentenceIds[id] = new Date().toISOString();
      }
    }

    const fp: MistakeFingerprint = {
      ...createEmptyFingerprint(USER_ID),
      conceptMastery: {
        c1: makeMastery({ conceptId: 'c1', rawScore: 50, decayedScore: 45 }),
        c2: makeMastery({ conceptId: 'c2', rawScore: 40, decayedScore: 35 }),
        c3: makeMastery({ conceptId: 'c3', rawScore: 60, decayedScore: 55 }),
      },
      passedSentenceIds,
    };

    const result = generateSession({ fingerprint: fp, graph, availableSentenceIds, sentences });
    expect(result.session.items.length).toBeGreaterThan(0);
    for (const item of result.session.items) {
      expect(item.purpose).toBe('review');
    }
  });
});

describe('scheduler: selectionReason tracking', () => {
  const concepts = ['c1', 'c2', 'c3', 'c4', 'c5'];
  const graph = buildTestGraph(concepts);

  it('every session item has a selectionReason', () => {
    const { sentences, availableSentenceIds } = buildTestSentences(concepts, 5);
    const fp: MistakeFingerprint = {
      ...createEmptyFingerprint(USER_ID),
      conceptMastery: {
        c1: makeMastery({ conceptId: 'c1', rawScore: 40, decayedScore: 35 }),
        c2: makeMastery({ conceptId: 'c2', rawScore: 50, decayedScore: 45 }),
      },
      passedSentenceIds: {},
    };

    const result = generateSession({ fingerprint: fp, graph, availableSentenceIds, sentences });
    for (const item of result.session.items) {
      expect(item.selectionReason).toBeDefined();
      expect(item.selectionReason).not.toBe('');
    }
  });

  it('review items have review_due or decaying reason', () => {
    const { sentences, availableSentenceIds } = buildTestSentences(concepts, 5);
    const fp: MistakeFingerprint = {
      ...createEmptyFingerprint(USER_ID),
      conceptMastery: {
        c1: makeMastery({
          conceptId: 'c1',
          rawScore: 75,
          decayedScore: 68,
          nextReviewAt: new Date(Date.now() - 86400000).toISOString(),
        }),
        c2: makeMastery({ conceptId: 'c2', rawScore: 50, decayedScore: 45 }),
      },
      passedSentenceIds: {},
    };

    const result = generateSession({ fingerprint: fp, graph, availableSentenceIds, sentences });
    const reviewItems = result.session.items.filter((i) => i.purpose === 'review');
    const validReasons = ['review_due', 'decaying', 'weak_concept'];
    for (const item of reviewItems) {
      expect(validReasons).toContain(item.selectionReason);
    }
  });

  it('weekly focus items get weekly_focus reason', () => {
    const { sentences, availableSentenceIds } = buildTestSentences(concepts, 5);
    const fp: MistakeFingerprint = {
      ...createEmptyFingerprint(USER_ID),
      conceptMastery: {
        c1: makeMastery({ conceptId: 'c1', rawScore: 30, decayedScore: 25 }),
        c2: makeMastery({ conceptId: 'c2', rawScore: 40, decayedScore: 35 }),
      },
      weeklyFocus: ['c1'],
      weekStartedAt: new Date().toISOString(),
      passedSentenceIds: {},
    };

    const result = generateSession({ fingerprint: fp, graph, availableSentenceIds, sentences });
    const focusItems = result.session.items.filter(
      (i) => i.conceptIds.includes('c1') && i.purpose === 'remediation',
    );
    const hasWeeklyFocusReason = focusItems.some((i) => i.selectionReason === 'weekly_focus');
    expect(hasWeeklyFocusReason).toBe(true);
  });

  it('cold-start items get cold_start reason', () => {
    const { sentences, availableSentenceIds } = buildTestSentences(concepts, 5);
    const fp: MistakeFingerprint = {
      ...createEmptyFingerprint(USER_ID),
      conceptMastery: {},
      passedSentenceIds: {},
    };

    const result = generateSession({ fingerprint: fp, graph, availableSentenceIds, sentences });
    const newItems = result.session.items.filter((i) => i.purpose === 'new-material');
    const hasColdStart = newItems.some((i) => i.selectionReason === 'cold_start');
    expect(hasColdStart).toBe(true);
  });
});
