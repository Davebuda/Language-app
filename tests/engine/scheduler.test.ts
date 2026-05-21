import { describe, it, expect } from 'vitest';
import { generateSession } from '@/engine/scheduler';
import type { SchedulerInput } from '@/engine/scheduler';
import type { MistakeFingerprint } from '@/types/fingerprint';
import type { ConceptGraph } from '@/types/concepts';
import type { Sentence } from '@/types/content';
import { DEFAULT_SESSION_RECIPE } from '@/types/session';

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
    weeklyFocus: [],
    weekStartedAt: null,
    weeklySprintHistory: [],
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

// ── Weekly focus bias ─────────────────────────────────────────────────────────

// Helper: build a mastery entry with a specific decayedScore so we can control
// which concepts land in weakConcepts (lowest decayedScore → weakest).
function makeMastery(conceptId: string, decayedScore: number, nextReviewAt: string | null = null) {
  return {
    conceptId,
    rawScore: decayedScore,
    confidenceScore: 0.4,
    decayedScore,
    attemptCount: 2,
    correctCount: 1,
    uniqueDaysActive: 1,
    lastAttemptAt: new Date().toISOString(),
    lastCorrectAt: null,
    streak: 0,
    recentOutcomes: [false] as boolean[],
    nextReviewAt,
    srsLevel: 0,
  };
}

describe('weekly focus bias', () => {
  // Test 1: empty weeklyFocus → unchanged behaviour
  it('empty weeklyFocus produces the same remediation concepts as pre-bias behaviour', () => {
    // c1-c5 are weak (score 20); c6-c8 are not attempted (excluded from weakConcepts).
    // getPrimaryWeakConcepts(fp, 5) returns c1-c5 — the bottom 5 by decayedScore.
    // With weeklyFocus: [] the remediation pool must be exactly those weak concepts;
    // c6, c7, c8 must NOT appear in remediation slots.
    const weakIds = ['c1', 'c2', 'c3', 'c4', 'c5'];
    const notWeakIds = ['c6', 'c7', 'c8'];
    const conceptIds = [...weakIds, ...notWeakIds];

    const sentences: Record<string, ReturnType<typeof makeSentence>> = {};
    const availableSentenceIds: Record<string, string[]> = {};
    for (const id of conceptIds) {
      const sid = `s-${id}`;
      sentences[sid] = makeSentence(sid, [id], ['translation-to-norwegian', 'fill-in-blank']);
      availableSentenceIds[id] = [sid];
    }

    const conceptMastery: Record<string, ReturnType<typeof makeMastery>> = {};
    for (const id of weakIds) {
      conceptMastery[id] = makeMastery(id, 20);
    }
    // c6-c8 have attemptCount=0 so they are excluded from getPrimaryWeakConcepts
    for (const id of notWeakIds) {
      conceptMastery[id] = { ...makeMastery(id, 50), attemptCount: 0 };
    }

    const { session } = generateSession({
      fingerprint: makeFingerprint({ weeklyFocus: [], conceptMastery }),
      graph: makeGraph(conceptIds),
      sentences,
      availableSentenceIds,
    });

    const remediationItems = session.items.filter((i) => i.purpose === 'remediation');
    // No remediation item should come from the non-attempted high-score concepts
    for (const item of remediationItems) {
      expect(notWeakIds).not.toContain(item.conceptIds[0]);
    }
    // Remediation items should be non-empty — weak concepts are available
    expect(remediationItems.length).toBeGreaterThan(0);
  });

  // Test 2: focus concepts dominate remediation pool
  it('focus concepts outnumber non-focus weak concepts in remediation slots', () => {
    // c1, c2, c3 are in weeklyFocus AND are weak (low score).
    // c4, c5 are weak but not in focus.
    const conceptIds = ['c1', 'c2', 'c3', 'c4', 'c5'];
    const sentences: Record<string, ReturnType<typeof makeSentence>> = {};
    const availableSentenceIds: Record<string, string[]> = {};
    for (const id of conceptIds) {
      const sid = `s-${id}`;
      sentences[sid] = makeSentence(sid, [id], ['translation-to-norwegian', 'fill-in-blank']);
      availableSentenceIds[id] = [sid];
    }

    const fingerprintOverrides = {
      weeklyFocus: ['c1', 'c2', 'c3'],
      conceptMastery: {
        c1: makeMastery('c1', 25),
        c2: makeMastery('c2', 25),
        c3: makeMastery('c3', 25),
        c4: makeMastery('c4', 30),
        c5: makeMastery('c5', 30),
      },
    };

    const { session } = generateSession({
      fingerprint: makeFingerprint(fingerprintOverrides),
      graph: makeGraph(conceptIds),
      sentences,
      availableSentenceIds,
    });

    const remediationItems = session.items.filter((i) => i.purpose === 'remediation');
    const focusCount = remediationItems.filter((i) =>
      ['c1', 'c2', 'c3'].includes(i.conceptIds[0] ?? '')
    ).length;

    // At least half of remediation slots should be focus concepts
    expect(focusCount).toBeGreaterThanOrEqual(Math.ceil(remediationItems.length * 0.5));
  });

  // Test 3: focus concept not in weakConcepts still appears in pool
  it('a focus concept not in weakConcepts still appears in remediation items', () => {
    // srs-due-concept has high mastery (score 75) so it won't be in top-5 weak,
    // but it IS in weeklyFocus, so the bias should pull it into the remediation pool.
    // weak-c1..3 are the actual weak concepts (low score).
    const conceptIds = ['weak-c1', 'weak-c2', 'weak-c3', 'srs-due-concept'];
    const sentences: Record<string, ReturnType<typeof makeSentence>> = {};
    const availableSentenceIds: Record<string, string[]> = {};
    for (const id of conceptIds) {
      const sid = `s-${id}`;
      sentences[sid] = makeSentence(sid, [id], ['translation-to-norwegian', 'fill-in-blank']);
      availableSentenceIds[id] = [sid];
    }

    const fingerprintOverrides = {
      weeklyFocus: ['srs-due-concept'],
      conceptMastery: {
        'weak-c1': makeMastery('weak-c1', 20),
        'weak-c2': makeMastery('weak-c2', 20),
        'weak-c3': makeMastery('weak-c3', 20),
        'srs-due-concept': makeMastery('srs-due-concept', 75),
      },
    };

    const { session } = generateSession({
      fingerprint: makeFingerprint(fingerprintOverrides),
      graph: makeGraph(conceptIds),
      sentences,
      availableSentenceIds,
    });

    const remediationItems = session.items.filter((i) => i.purpose === 'remediation');
    const hasFocusConcept = remediationItems.some(
      (i) => i.conceptIds[0] === 'srs-due-concept'
    );
    expect(hasFocusConcept).toBe(true);
  });

  // Test 4: concept-repeat cap is still respected
  it('focus concept appears at most MAX_CONCEPT_REPEATS (2) times across all session items', () => {
    // Single focus concept c1 with exactly 6 remediation slots.
    // The pool has 6 distinct concepts (c1-c6): cap of 2 each = 12 available slots.
    // c1 should fill at most 2 slots even though it is the top-priority focus concept.
    const conceptIds = ['c1', 'c2', 'c3', 'c4', 'c5', 'c6'];
    const sentences: Record<string, ReturnType<typeof makeSentence>> = {};
    const availableSentenceIds: Record<string, string[]> = {};
    for (const id of conceptIds) {
      const sid = `s-${id}`;
      sentences[sid] = makeSentence(sid, [id], ['translation-to-norwegian', 'fill-in-blank']);
      availableSentenceIds[id] = [sid];
    }

    const fingerprintOverrides = {
      weeklyFocus: ['c1'],
      conceptMastery: Object.fromEntries(
        conceptIds.map((id) => [id, makeMastery(id, 20)])
      ),
    };

    // targetDurationSeconds = 6 × 45 = 270 → exactly 6 total items, all remediation.
    const { session } = generateSession({
      fingerprint: makeFingerprint(fingerprintOverrides),
      graph: makeGraph(conceptIds),
      sentences,
      availableSentenceIds,
      recipe: {
        targetDurationSeconds: 270,
        remediationRatio: 1,
        reviewRatio: 0,
        newMaterialRatio: 0,
        interleavingRatio: 0,
      },
    });

    const c1Count = session.items.filter((i) => i.conceptIds[0] === 'c1').length;
    expect(c1Count).toBeLessThanOrEqual(2); // MAX_CONCEPT_REPEATS = 2
  });

  // Test 5: recipe distribution is preserved
  it('40/30/20/10 recipe distribution is preserved when weeklyFocus is set', () => {
    const conceptIds = ['c1', 'c2', 'c3', 'c4', 'c5', 'c6', 'c7'];
    const sentences: Record<string, ReturnType<typeof makeSentence>> = {};
    const availableSentenceIds: Record<string, string[]> = {};
    for (const id of conceptIds) {
      const sid = `s-${id}`;
      sentences[sid] = makeSentence(sid, [id], ['translation-to-norwegian', 'fill-in-blank', 'translation-to-english']);
      availableSentenceIds[id] = [sid];
    }

    const fingerprintOverrides = {
      weeklyFocus: ['c1', 'c2'],
      conceptMastery: Object.fromEntries(
        conceptIds.map((id) => [id, makeMastery(id, 30)])
      ),
    };

    // Use the default recipe
    const { session } = generateSession({
      fingerprint: makeFingerprint(fingerprintOverrides),
      graph: makeGraph(conceptIds),
      sentences,
      availableSentenceIds,
    });

    const totalItems = session.items.length;
    const remCount = session.items.filter((i) => i.purpose === 'remediation').length;
    const revCount = session.items.filter((i) => i.purpose === 'review').length;
    const newCount = session.items.filter((i) => i.purpose === 'new-material').length;
    const intCount = session.items.filter((i) => i.purpose === 'interleaving').length;

    // Derive expected counts from the default recipe (same formula as scheduler)
    const AVG_SECONDS = 45;
    const expectedTotal = Math.round(DEFAULT_SESSION_RECIPE.targetDurationSeconds / AVG_SECONDS);
    const expectedRem = Math.round(expectedTotal * DEFAULT_SESSION_RECIPE.remediationRatio);
    const expectedRev = Math.round(expectedTotal * DEFAULT_SESSION_RECIPE.reviewRatio);
    const expectedNew = Math.round(expectedTotal * DEFAULT_SESSION_RECIPE.newMaterialRatio);
    const expectedInt = Math.round(expectedTotal * DEFAULT_SESSION_RECIPE.interleavingRatio);

    expect(remCount).toBeGreaterThanOrEqual(Math.max(0, expectedRem - 1));
    expect(remCount).toBeLessThanOrEqual(expectedRem + 1);
    expect(revCount).toBeGreaterThanOrEqual(Math.max(0, expectedRev - 1));
    expect(revCount).toBeLessThanOrEqual(expectedRev + 1);
    expect(newCount).toBeGreaterThanOrEqual(Math.max(0, expectedNew - 1));
    expect(newCount).toBeLessThanOrEqual(expectedNew + 1);
    expect(intCount).toBeGreaterThanOrEqual(Math.max(0, expectedInt - 1));
    expect(intCount).toBeLessThanOrEqual(expectedInt + 1);

    // Total items should also be within ±1 of expected
    expect(totalItems).toBeGreaterThanOrEqual(Math.max(0, expectedTotal - 1));
    expect(totalItems).toBeLessThanOrEqual(expectedTotal + 1);
  });
});
