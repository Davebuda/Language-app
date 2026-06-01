import { describe, it, expect } from 'vitest';
import { generateSession } from '@/engine/scheduler';
import type { SchedulerInput } from '@/engine/scheduler';
import { createEmptyFingerprint } from '@/types/fingerprint';
import type { MistakeFingerprint, ConceptMastery } from '@/types/fingerprint';
import type { ConceptGraph } from '@/types/concepts';
import type { Sentence } from '@/types/content';
import { NOT_YET_AVAILABLE_TYPES } from '@/types/session';

// T5: the scheduler must never assign a phantom (not-yet-renderable) exercise
// type to a session item. Phantom types only render an honest "kommer snart"
// banner; scheduling one wastes a session slot with a dead skip-card.

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

function makeSentence(id: string, conceptId: string, exerciseTypes: string[]): Sentence {
  return {
    id,
    norwegian: `Norsk ${id}`,
    english: `English ${id}`,
    conceptIds: [conceptId],
    vocabularyClusters: [],
    errorTagsDetectable: [],
    cefrLevel: 'A1',
    difficulty: 1,
    exerciseTypes: exerciseTypes as Sentence['exerciseTypes'],
  };
}

function makeMastery(overrides: Partial<ConceptMastery> = {}): ConceptMastery {
  return {
    conceptId: 'c1',
    rawScore: 40,
    confidenceScore: 0.4,
    decayedScore: 35,
    attemptCount: 5,
    correctCount: 2,
    uniqueDaysActive: 1,
    lastAttemptAt: new Date().toISOString(),
    lastCorrectAt: null,
    streak: 0,
    recentOutcomes: [false],
    srsLevel: 0,
    nextReviewAt: null,
    ...overrides,
  };
}

function buildGraph(conceptIds: string[]): ConceptGraph {
  return {
    version: '1.0',
    language: 'nb-NO',
    concepts: conceptIds.map((id) => makeConcept(id)),
  };
}

describe('scheduler: phantom exercise-type guard (T5)', () => {
  it('never yields a session item whose exerciseType is a phantom type', () => {
    // Every sentence supports BOTH a phantom type and a real type. The scheduler
    // iterates the candidate pool in order; if it did not skip phantoms it could
    // pick one. The guard must ensure only the real type is ever assigned.
    const concepts = ['c1', 'c2', 'c3', 'c4', 'c5'];
    const sentences: Record<string, Sentence> = {};
    const availableSentenceIds: Record<string, string[]> = {};
    for (const cid of concepts) {
      const sid = `${cid}-s0`;
      // Phantom types listed FIRST so a naive first-match would pick them.
      sentences[sid] = makeSentence(sid, cid, [
        'sentence-transformation',
        'dictation',
        'reading-comprehension',
        'free-writing',
        'translation-to-norwegian',
        'fill-in-blank',
        'translation-to-english',
      ]);
      availableSentenceIds[cid] = [sid];
    }

    const fp: MistakeFingerprint = {
      ...createEmptyFingerprint(USER_ID),
      conceptMastery: Object.fromEntries(
        concepts.map((id) => [id, makeMastery({ conceptId: id, decayedScore: 30 })]),
      ),
      passedSentenceIds: {},
    };

    const result = generateSession({ fingerprint: fp, graph: buildGraph(concepts), availableSentenceIds, sentences });

    expect(result.session.items.length).toBeGreaterThan(0);
    for (const item of result.session.items) {
      expect(NOT_YET_AVAILABLE_TYPES).not.toContain(item.exerciseType);
    }
  });

  it('skips a concept whose only sentence supports nothing but phantom types', () => {
    // c1 sentence supports ONLY phantom types → no eligible real type → skipped.
    // c2 sentence supports a real type → it carries the session.
    const concepts = ['c1', 'c2'];
    const sentences: Record<string, Sentence> = {
      's1': makeSentence('s1', 'c1', ['sentence-transformation', 'dictation', 'reading-comprehension', 'free-writing']),
      's2': makeSentence('s2', 'c2', ['translation-to-norwegian', 'fill-in-blank']),
    };
    const availableSentenceIds: Record<string, string[]> = {
      c1: ['s1'],
      c2: ['s2'],
    };

    const fp: MistakeFingerprint = {
      ...createEmptyFingerprint(USER_ID),
      conceptMastery: {
        c1: makeMastery({ conceptId: 'c1', decayedScore: 20 }),
        c2: makeMastery({ conceptId: 'c2', decayedScore: 25 }),
      },
      passedSentenceIds: {},
    };

    const result = generateSession({ fingerprint: fp, graph: buildGraph(concepts), availableSentenceIds, sentences });

    // c1 (phantom-only) never appears; c2 (real) does.
    const c1Items = result.session.items.filter((i) => i.conceptIds.includes('c1'));
    const c2Items = result.session.items.filter((i) => i.conceptIds.includes('c2'));
    expect(c1Items).toHaveLength(0);
    expect(c2Items.length).toBeGreaterThan(0);
    // And no phantom types anywhere.
    for (const item of result.session.items) {
      expect(NOT_YET_AVAILABLE_TYPES).not.toContain(item.exerciseType);
    }
  });

  it('does not crash and emits no typeless item when ALL concepts are phantom-only', () => {
    // Every concept's only sentence supports phantom types exclusively.
    // The scheduler must skip every concept gracefully — no crash, no empty item.
    const concepts = ['c1', 'c2', 'c3'];
    const sentences: Record<string, Sentence> = {};
    const availableSentenceIds: Record<string, string[]> = {};
    for (const cid of concepts) {
      const sid = `${cid}-s0`;
      sentences[sid] = makeSentence(sid, cid, ['sentence-transformation', 'dictation']);
      availableSentenceIds[cid] = [sid];
    }

    const fp: MistakeFingerprint = {
      ...createEmptyFingerprint(USER_ID),
      conceptMastery: Object.fromEntries(
        concepts.map((id) => [id, makeMastery({ conceptId: id, decayedScore: 30 })]),
      ),
      passedSentenceIds: {},
    };

    expect(() =>
      generateSession({ fingerprint: fp, graph: buildGraph(concepts), availableSentenceIds, sentences }),
    ).not.toThrow();

    const result = generateSession({ fingerprint: fp, graph: buildGraph(concepts), availableSentenceIds, sentences });
    // No items should be emitted (all concepts skipped), and certainly none typeless/phantom.
    for (const item of result.session.items) {
      expect(NOT_YET_AVAILABLE_TYPES).not.toContain(item.exerciseType);
      expect(item.exerciseType).toBeTruthy();
    }
  });
});
