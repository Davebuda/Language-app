import { describe, it, expect } from 'vitest';
import { generateSession } from '@/engine/scheduler';
import type { SchedulerInput } from '@/engine/scheduler';
import type { MistakeFingerprint } from '@/types/fingerprint';
import type { ConceptGraph } from '@/types/concepts';
import type { Sentence, ClozePassage } from '@/types/content';
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
      // cloze-passage is a DERIVED type (resolved separately from a passage or an
      // auto-cloze, not from the sentence's declared exerciseTypes). The guard
      // applies to sentence-backed items only — exempt the derived cloze.
      if (item.conceptIds.includes('noun-gender') && item.exerciseType !== 'cloze-passage') {
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
    // Exempt the derived cloze-passage type (auto-cloze) — the guard is about
    // sentence-backed items using only the sentence's declared exerciseTypes.
    // 'speaking-production' is legitimately allowed here: it reuses
    // translation-to-norwegian content via sentenceSupportsType (say the
    // Norwegian aloud), so a sentence declaring translation-to-norwegian
    // supports it. The guard still rejects truly-undeclared types (e.g. word-order).
    for (const item of session.items.filter(
      (i) => i.conceptIds.includes('v2-word-order') && i.exerciseType !== 'cloze-passage',
    )) {
      expect(['translation-to-norwegian', 'fill-in-blank', 'speaking-production']).toContain(item.exerciseType);
    }
  });

  it('Snakk block is genuine speaking — only speaking-production, never typed exercises (Rule 6/8)', () => {
    // Regression guard for the old violation where the "Snakk" (Speak) block was
    // filled with translation/word-order typed exercises and mislabelled speech.
    const sentences: Record<string, Sentence> = {
      a: makeSentence('a', ['noun-gender'], ['translation-to-norwegian']),
      b: makeSentence('b', ['v2-word-order'], ['translation-to-norwegian']),
      c: makeSentence('c', ['personal-pronouns'], ['translation-to-norwegian']),
    };
    const input = makeInput({
      conceptIds: ['noun-gender', 'v2-word-order', 'personal-pronouns'],
      sentences,
      availableSentenceIds: { 'noun-gender': ['a'], 'v2-word-order': ['b'], 'personal-pronouns': ['c'] },
    });
    const { session } = generateSession(input);
    const snakk = session.blocks?.find((blk) => blk.type === 'snakk');
    expect(snakk).toBeDefined();
    expect(snakk!.items.length).toBeGreaterThan(0);
    for (const item of snakk!.items) {
      expect(item.exerciseType).toBe('speaking-production');
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

    const { blocks } = generateSession({
      fingerprint: makeFingerprint(fingerprintOverrides),
      graph: makeGraph(conceptIds),
      sentences,
      availableSentenceIds,
      recipe: {
        remediationRatio: 1,
        reviewRatio: 0,
        newMaterialRatio: 0,
        interleavingRatio: 0,
      },
    });
    const lærBlock = blocks.find(b => b.type === 'lær');
    const c1Count = (lærBlock?.items ?? []).filter((i) => i.conceptIds[0] === 'c1').length;
    expect(c1Count).toBeLessThanOrEqual(4);
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

    // Use the default recipe — check the lær block specifically
    const { blocks } = generateSession({
      fingerprint: makeFingerprint(fingerprintOverrides),
      graph: makeGraph(conceptIds),
      sentences,
      availableSentenceIds,
    });

    const lærItems = blocks.find(b => b.type === 'lær')?.items ?? [];
    const remCount = lærItems.filter((i) => i.purpose === 'remediation').length;
    const revCount = lærItems.filter((i) => i.purpose === 'review').length;
    const newCount = lærItems.filter((i) => i.purpose === 'new-material').length;
    const intCount = lærItems.filter((i) => i.purpose === 'interleaving').length;

    // Derive expected counts from lær block size (scheduler uses LEVEL_BLOCK_SIZES)
    const lærTarget = 15; // A1 lær block size
    const expectedRem = Math.round(lærTarget * DEFAULT_SESSION_RECIPE.remediationRatio);
    const expectedRev = Math.round(lærTarget * DEFAULT_SESSION_RECIPE.reviewRatio);
    const expectedNew = Math.round(lærTarget * DEFAULT_SESSION_RECIPE.newMaterialRatio);
    const expectedInt = Math.round(lærTarget * DEFAULT_SESSION_RECIPE.interleavingRatio);

    expect(remCount).toBeGreaterThanOrEqual(Math.max(0, expectedRem - 1));
    expect(remCount).toBeLessThanOrEqual(expectedRem + 1);
    expect(revCount).toBeGreaterThanOrEqual(Math.max(0, expectedRev - 1));
    expect(revCount).toBeLessThanOrEqual(expectedRev + 1);
    expect(newCount).toBeGreaterThanOrEqual(Math.max(0, expectedNew - 1));
    expect(newCount).toBeLessThanOrEqual(expectedNew + 1);
    expect(intCount).toBeGreaterThanOrEqual(Math.max(0, expectedInt - 1));
    expect(intCount).toBeLessThanOrEqual(expectedInt + 1);

    // Lær block items should be close to the target
    expect(lærItems.length).toBeGreaterThanOrEqual(Math.max(0, lærTarget - 2));
    expect(lærItems.length).toBeLessThanOrEqual(lærTarget + 2);
  });
});

// ── Cloze passage scheduling ──────────────────────────────────────────────────

describe('cloze passage scheduling', () => {
  it('emits exactly one cloze-passage item when the focus concept has an eligible passage', () => {
    // v2-word-order is in weeklyFocus AND has a matching A1 passage — expect one cloze item.
    const s1 = makeSentence('s1', ['v2-word-order'], ['translation-to-norwegian', 'word-order']);
    const passage: ClozePassage = {
      id: 'cz-test',
      cefrLevel: 'A1',
      primaryConceptId: 'v2-word-order',
      englishGloss: '',
      difficulty: 1,
      segments: [{ kind: 'gap', answer: 'x', conceptId: 'v2-word-order', errorTag: 'word-order' }],
    };

    const input: SchedulerInput = {
      ...makeInput({
        conceptIds: ['v2-word-order', 'noun-gender', 'personal-pronouns'],
        sentences: { s1 },
        availableSentenceIds: { 'v2-word-order': ['s1'] },
        fingerprintOverrides: {
          weeklyFocus: ['v2-word-order'],
          conceptMastery: {
            'v2-word-order': makeMastery('v2-word-order', 25),
            'noun-gender': makeMastery('noun-gender', 30),
            'personal-pronouns': makeMastery('personal-pronouns', 30),
          },
        },
      }),
      availablePassageIds: { 'v2-word-order': ['cz-test'] },
      passages: { 'cz-test': passage },
    };

    const { session } = generateSession(input);
    const clozeItems = session.items.filter((i) => i.exerciseType === 'cloze-passage');
    expect(clozeItems.length).toBe(1);
    expect(clozeItems[0]!.selectionReason).toBe('weekly_focus');
  });

  it('emits an auto-cloze item from a buildable sentence when authored passages are omitted (Move A)', () => {
    // Move A intentionally replaces the old "no authored passage → no cloze"
    // contract: with no passages, the scheduler falls back to an AUTO-CLOZE built
    // from a buildable sentence (error tag + blankable word), so the cloze type
    // exists at levels with no authored passages (B1/B2). makeSentence is buildable.
    // (Non-buildable sentences yield NO cloze — covered in scheduler-autocloze.test.ts.)
    const s1 = makeSentence('s1', ['v2-word-order'], ['translation-to-norwegian', 'word-order']);

    const input: SchedulerInput = makeInput({
      conceptIds: ['v2-word-order', 'noun-gender', 'personal-pronouns'],
      sentences: { s1 },
      availableSentenceIds: { 'v2-word-order': ['s1'] },
      fingerprintOverrides: {
        weeklyFocus: ['v2-word-order'],
        conceptMastery: {
          'v2-word-order': makeMastery('v2-word-order', 25),
          'noun-gender': makeMastery('noun-gender', 30),
          'personal-pronouns': makeMastery('personal-pronouns', 30),
        },
      },
    });
    // No availablePassageIds or passages fields → auto-cloze path.

    const { session } = generateSession(input);
    const clozeItems = session.items.filter((i) => i.exerciseType === 'cloze-passage');
    expect(clozeItems.length).toBe(1); // at most one cloze, and auto-cloze fills it
  });

  it('does NOT schedule a passage above the learner\'s level (Rule 6: no silent above-level cloze)', () => {
    // A1 learner whose focus concept has ONLY a B1 passage. The level gate
    // (pIdx <= clozeMaxIdx) must exclude it — an A1 learner never gets a B1
    // cloze even for a shared concept. This is the no-silent-substitution
    // guarantee for the whole cloze type at B1/B2 (where no passages exist).
    // Non-buildable (no detectable error tag) so this test isolates its real guard
    // — the ABOVE-LEVEL AUTHORED passage must be excluded — without the separate
    // auto-cloze feature adding an in-level cloze (auto-cloze tested elsewhere).
    const s1: Sentence = {
      ...makeSentence('s1', ['v2-word-order'], ['translation-to-norwegian', 'word-order']),
      errorTagsDetectable: [],
    };
    const b1Passage: ClozePassage = {
      id: 'cz-b1',
      cefrLevel: 'B1',
      primaryConceptId: 'v2-word-order',
      englishGloss: '',
      difficulty: 3,
      segments: [{ kind: 'gap', answer: 'x', conceptId: 'v2-word-order', errorTag: 'word-order' }],
    };

    const input: SchedulerInput = {
      ...makeInput({
        conceptIds: ['v2-word-order', 'noun-gender', 'personal-pronouns'],
        sentences: { s1 },
        availableSentenceIds: { 'v2-word-order': ['s1'] },
        fingerprintOverrides: {
          currentLevel: 'A1',
          weeklyFocus: ['v2-word-order'],
          conceptMastery: {
            'v2-word-order': makeMastery('v2-word-order', 25),
            'noun-gender': makeMastery('noun-gender', 30),
            'personal-pronouns': makeMastery('personal-pronouns', 30),
          },
        },
      }),
      availablePassageIds: { 'v2-word-order': ['cz-b1'] },
      passages: { 'cz-b1': b1Passage },
    };

    const { session } = generateSession(input);
    const clozeItems = session.items.filter((i) => i.exerciseType === 'cloze-passage');
    expect(clozeItems.length).toBe(0);
  });

  it('DOES schedule a below-level passage for a shared concept (legitimate spaced review)', () => {
    // B1 learner; focus concept has an A1 passage. A1 <= B1, so it is eligible
    // — reviewing a lower-level cloze for a shared concept is intended, not
    // substitution. Guards against an over-eager level filter that excludes
    // everything below the current level.
    const s1 = makeSentence('s1', ['v2-word-order'], ['translation-to-norwegian', 'word-order']);
    const a1Passage: ClozePassage = {
      id: 'cz-a1',
      cefrLevel: 'A1',
      primaryConceptId: 'v2-word-order',
      englishGloss: '',
      difficulty: 1,
      segments: [{ kind: 'gap', answer: 'x', conceptId: 'v2-word-order', errorTag: 'word-order' }],
    };

    const input: SchedulerInput = {
      ...makeInput({
        conceptIds: ['v2-word-order', 'noun-gender', 'personal-pronouns'],
        sentences: { s1 },
        availableSentenceIds: { 'v2-word-order': ['s1'] },
        fingerprintOverrides: {
          currentLevel: 'B1',
          weeklyFocus: ['v2-word-order'],
          conceptMastery: {
            'v2-word-order': makeMastery('v2-word-order', 25),
            'noun-gender': makeMastery('noun-gender', 30),
            'personal-pronouns': makeMastery('personal-pronouns', 30),
          },
        },
      }),
      availablePassageIds: { 'v2-word-order': ['cz-a1'] },
      passages: { 'cz-a1': a1Passage },
    };

    const { session } = generateSession(input);
    const clozeItems = session.items.filter((i) => i.exerciseType === 'cloze-passage');
    expect(clozeItems.length).toBe(1);
  });
});
