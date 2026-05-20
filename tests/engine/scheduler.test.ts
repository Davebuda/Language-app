import { describe, it, expect } from 'vitest';
import { generateSession } from '@/engine/scheduler';
import type { SchedulerInput } from '@/engine/scheduler';
import type { MistakeFingerprint } from '@/types/fingerprint';
import type { ConceptGraph } from '@/types/concepts';
import type { Sentence } from '@/types/content';

// ── Minimal fixture builders ──────────────────────────────────────────────────

function makeFingerprint(overrides: Partial<MistakeFingerprint> = {}): MistakeFingerprint {
  return {
    userId: 'test-user',
    currentLevel: 'A1',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    diagnosticCompleted: true,
    sessionsCompleted: 1,
    conceptMastery: {},
    recentErrors: [],
    errorPatterns: {},
    productionGap: {},
    speakingMinutes: 0,
    inputProductionPreference: 'balanced',
    ...overrides,
  };
}

function makeGraph(conceptIds: string[]): ConceptGraph {
  return {
    concepts: conceptIds.map((id) => ({
      id,
      label: id,
      cefrLevel: 'A1',
      prerequisites: [],
      masteryThreshold: 70,
      minAttempts: 3,
      minDays: 1,
      primaryErrorTag: 'noun-gender' as const,
    })),
    edges: [],
  };
}

function makeSentence(id: string, conceptIds: string[], exerciseTypes: string[]): Sentence {
  return {
    id,
    norwegian: `Norsk setning ${id}.`,
    english: `English sentence ${id}.`,
    conceptIds,
    vocabularyClusters: [],
    errorTagsDetectable: ['noun-gender'],
    cefrLevel: 'A1',
    difficulty: 1,
    exerciseTypes: exerciseTypes as Sentence['exerciseTypes'],
  };
}

function makeInput(overrides: {
  conceptIds?: string[];
  sentences?: Record<string, Sentence>;
  availableSentenceIds?: Record<string, string[]>;
  fingerprintOverrides?: Partial<MistakeFingerprint>;
} = {}): SchedulerInput {
  const conceptIds = overrides.conceptIds ?? ['noun-gender', 'v2-word-order', 'personal-pronouns'];
  const sentences = overrides.sentences ?? {};
  const availableSentenceIds = overrides.availableSentenceIds ?? {};
  return {
    fingerprint: makeFingerprint({
      conceptMastery: Object.fromEntries(
        conceptIds.map((id) => [id, {
          conceptId: id, rawScore: 40, confidenceScore: 0.4, decayedScore: 40,
          attemptCount: 2, uniqueDaysActive: 1, streak: 0, recentOutcomes: [false],
          nextReviewAt: null, srsLevel: 0, lastAttemptAt: new Date().toISOString(),
        }])
      ),
      ...overrides.fingerprintOverrides,
    }),
    graph: makeGraph(conceptIds),
    sentences,
    availableSentenceIds,
  };
}

// ── firstEligibleType behaviour (tested via generateSession output) ───────────

describe('generateSession — exercise-type guard', () => {
  it('excludes a concept that has no sentences in the corpus', () => {
    // noun-gender has no sentences; v2-word-order does
    const s1 = makeSentence('s1', ['v2-word-order'], ['translation-to-norwegian', 'word-order']);
    const input = makeInput({
      conceptIds: ['noun-gender', 'v2-word-order'],
      sentences: { s1 },
      availableSentenceIds: { 'v2-word-order': ['s1'] },
      // noun-gender intentionally absent from availableSentenceIds
    });

    const { session } = generateSession(input);
    const conceptsInSession = new Set(session.items.flatMap((i) => i.conceptIds));
    expect(conceptsInSession.has('noun-gender')).toBe(false);
    expect(conceptsInSession.has('v2-word-order')).toBe(true);
  });

  it('never assigns an exercise type the sentence does not support', () => {
    // noun-gender sentence only supports 'translation-to-english' (recognition).
    // v2-word-order sentence supports production types.
    // No matter which slot noun-gender ends up in, it must use 'translation-to-english'.
    const s1 = makeSentence('s1', ['noun-gender'], ['translation-to-english']);
    const s2 = makeSentence('s2', ['v2-word-order'], ['translation-to-norwegian', 'fill-in-blank']);
    const input = makeInput({
      conceptIds: ['noun-gender', 'v2-word-order'],
      sentences: { s1, s2 },
      availableSentenceIds: { 'noun-gender': ['s1'], 'v2-word-order': ['s2'] },
    });

    const { session } = generateSession(input);
    for (const item of session.items) {
      if (item.conceptIds.includes('noun-gender')) {
        // noun-gender can only appear with translation-to-english — never a production type
        expect(item.exerciseType).toBe('translation-to-english');
      }
    }
  });

  it('assigns only an exercise type that the sentence actually declares', () => {
    const s1 = makeSentence('s1', ['v2-word-order'], ['translation-to-norwegian', 'fill-in-blank']);
    const input = makeInput({
      conceptIds: ['v2-word-order'],
      sentences: { s1 },
      availableSentenceIds: { 'v2-word-order': ['s1'] },
    });

    const { session } = generateSession(input);
    for (const item of session.items.filter((i) => i.conceptIds.includes('v2-word-order'))) {
      expect(['translation-to-norwegian', 'fill-in-blank']).toContain(item.exerciseType);
    }
  });

  it('produces a valid (possibly short) session when all remediation concepts lack seeds', () => {
    // No sentences at all — session should produce 0 items but not throw.
    const input = makeInput({
      conceptIds: ['noun-gender', 'v2-word-order'],
      sentences: {},
      availableSentenceIds: {},
    });

    expect(() => generateSession(input)).not.toThrow();
    const { session } = generateSession(input);
    expect(session.items.length).toBeGreaterThanOrEqual(0);
    expect(session.id).toBeTruthy();
  });

  it('preserves the production guarantee even after guard filtering', () => {
    // Two concepts: one supports only recognition types, one supports production.
    const s1 = makeSentence('s1', ['noun-gender'], ['translation-to-english']);
    const s2 = makeSentence('s2', ['v2-word-order'], ['translation-to-norwegian', 'word-order']);
    const input = makeInput({
      conceptIds: ['noun-gender', 'v2-word-order'],
      sentences: { s1, s2 },
      availableSentenceIds: {
        'noun-gender': ['s1'],
        'v2-word-order': ['s2'],
      },
    });

    const { session } = generateSession(input);
    if (session.items.length > 0) {
      const hasProduction = session.items.some((i) =>
        ['sentence-transformation', 'translation-to-norwegian', 'fill-in-blank', 'word-order'].includes(i.exerciseType)
      );
      expect(hasProduction).toBe(true);
    }
  });

  it('skipped concept does not block the seeded concept from appearing', () => {
    // noun-gender has no seeds — it is always skipped.
    // v2-word-order has seeds — it should appear in the session.
    // The repeat-cap (MAX_CONCEPT_REPEATS=2) applies per addItemCapped call pool.
    // New-material and interleaving slots use plain addItem, so v2 can exceed 2 total.
    // The invariant is: v2-word-order appears at least once, and noun-gender never appears.
    const s1 = makeSentence('s1', ['v2-word-order'], ['translation-to-norwegian']);
    const s2 = makeSentence('s2', ['v2-word-order'], ['fill-in-blank']);
    const input = makeInput({
      conceptIds: ['noun-gender', 'v2-word-order'],
      sentences: { s1, s2 },
      availableSentenceIds: { 'v2-word-order': ['s1', 's2'] },
    });

    const { session } = generateSession(input);
    const v2Count = session.items.filter((i) => i.conceptIds.includes('v2-word-order')).length;
    const nounCount = session.items.filter((i) => i.conceptIds.includes('noun-gender')).length;

    expect(nounCount).toBe(0);       // skipped concept never appears
    expect(v2Count).toBeGreaterThan(0); // seeded concept appears at least once
  });

  it('returns a session with valid structure fields', () => {
    const s1 = makeSentence('s1', ['noun-gender'], ['translation-to-norwegian']);
    const input = makeInput({
      conceptIds: ['noun-gender'],
      sentences: { s1 },
      availableSentenceIds: { 'noun-gender': ['s1'] },
    });

    const { session } = generateSession(input);
    expect(session.id).toBeTruthy();
    expect(session.status).toBe('active');
    expect(session.level).toBe('A1');
    expect(Array.isArray(session.items)).toBe(true);
    expect(Array.isArray(session.completedItemIds)).toBe(true);
  });

  it('assigns contentId as pending:<conceptId> for every queued item', () => {
    const s1 = makeSentence('s1', ['noun-gender'], ['translation-to-norwegian', 'fill-in-blank']);
    const input = makeInput({
      conceptIds: ['noun-gender'],
      sentences: { s1 },
      availableSentenceIds: { 'noun-gender': ['s1'] },
    });

    const { session } = generateSession(input);
    for (const item of session.items) {
      expect(item.contentId).toBe(`pending:${item.conceptIds[0]}`);
    }
  });
});
