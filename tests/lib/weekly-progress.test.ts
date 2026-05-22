import { describe, it, expect } from 'vitest';
import { summarizeWeeklyProgress } from '@/lib/weekly-progress';
import type { MistakeFingerprint, ConceptMastery } from '@/types/fingerprint';
import type { ConceptGraph } from '@/types/concepts';

function makeMastery(overrides: Partial<ConceptMastery> & { conceptId: string }): ConceptMastery {
  return {
    conceptId: overrides.conceptId,
    rawScore: 50,
    confidenceScore: 0.5,
    decayedScore: 50,
    attemptCount: 10,
    correctCount: 7,
    uniqueDaysActive: 3,
    lastAttemptAt: new Date().toISOString(),
    lastCorrectAt: new Date().toISOString(),
    streak: 2,
    recentOutcomes: [true, true, false, true, true],
    srsLevel: 1,
    nextReviewAt: null,
    ...overrides,
  };
}

function makeFingerprint(overrides: Partial<MistakeFingerprint> = {}): MistakeFingerprint {
  return {
    userId: 'test-user',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    currentLevel: 'A1',
    levelSetByUser: false,
    conceptMastery: {},
    recentErrors: [],
    errorPatterns: [],
    vocabularyMastery: {},
    productionGap: {},
    totalSessionsCompleted: 1,
    calibrationSessionsRemaining: 0,
    lastSessionAt: null,
    speakingMinutesTotal: 0,
    inputProductionPreference: 'balanced',
    lastRecalibrationAt: null,
    askedDiagnosticQuestionIds: [],
    weeklyFocus: [],
    weekStartedAt: null,
    weeklySprintHistory: [],
    weekStartSnapshots: {},
    ...overrides,
  };
}

function makeGraph(concepts: Array<{ id: string; label: string }>): ConceptGraph {
  return {
    version: '1.0',
    language: 'no',
    concepts: concepts.map((c) => ({
      id: c.id,
      label: c.label,
      description: `Concept ${c.id}`,
      cefrLevel: 'A1' as const,
      prerequisites: [],
      masteryThreshold: 80,
      minAttempts: 15,
      minDays: 3,
      errorTags: [],
    })),
  };
}

describe('summarizeWeeklyProgress', () => {
  it('returns empty array when weeklyFocus is empty', () => {
    const fp = makeFingerprint({ weeklyFocus: [] });
    const graph = makeGraph([{ id: 'c1', label: 'Concept 1' }]);
    expect(summarizeWeeklyProgress(fp, graph)).toEqual([]);
  });

  it('computes positive deltaDecayed when mastery improved over the week', () => {
    const fp = makeFingerprint({
      weeklyFocus: ['c1'],
      conceptMastery: {
        c1: makeMastery({ conceptId: 'c1', decayedScore: 72, attemptCount: 18 }),
      },
      weekStartSnapshots: {
        c1: { rawScore: 40, decayedScore: 42, attemptCount: 4 },
      },
    });
    const graph = makeGraph([{ id: 'c1', label: 'Concept 1' }]);
    const result = summarizeWeeklyProgress(fp, graph);
    expect(result).toEqual([
      { conceptId: 'c1', label: 'Concept 1', deltaDecayed: 30, attemptsThisWeek: 14 },
    ]);
  });

  it('computes negative deltaDecayed when concept decayed during the week', () => {
    // Learner did not touch c1 this week → decayedScore drops below the open-week baseline.
    const fp = makeFingerprint({
      weeklyFocus: ['c1'],
      conceptMastery: {
        c1: makeMastery({ conceptId: 'c1', decayedScore: 48, attemptCount: 5 }),
      },
      weekStartSnapshots: {
        c1: { rawScore: 55, decayedScore: 55, attemptCount: 5 },
      },
    });
    const graph = makeGraph([{ id: 'c1', label: 'Concept 1' }]);
    const result = summarizeWeeklyProgress(fp, graph);
    expect(result[0].deltaDecayed).toBe(-7);
    expect(result[0].attemptsThisWeek).toBe(0);
  });

  it('rounds fractional attempt deltas to the nearest integer', () => {
    // recordExposure increments attemptCount by 0.3 per reading exposure (Stream 5.5 Phase 1).
    // The UI label is "attempts" — fractional values must be rounded.
    const fp = makeFingerprint({
      weeklyFocus: ['c1'],
      conceptMastery: {
        c1: makeMastery({ conceptId: 'c1', decayedScore: 50, attemptCount: 4.7 }),
      },
      weekStartSnapshots: {
        c1: { rawScore: 50, decayedScore: 50, attemptCount: 0 },
      },
    });
    const graph = makeGraph([{ id: 'c1', label: 'Concept 1' }]);
    expect(summarizeWeeklyProgress(fp, graph)[0].attemptsThisWeek).toBe(5);
  });

  it('falls back to zero baseline when a snapshot is missing (legacy week)', () => {
    const fp = makeFingerprint({
      weeklyFocus: ['c1'],
      conceptMastery: {
        c1: makeMastery({ conceptId: 'c1', decayedScore: 60, attemptCount: 8 }),
      },
      weekStartSnapshots: {}, // week opened before Stream 5.5 Phase 2
    });
    const graph = makeGraph([{ id: 'c1', label: 'Concept 1' }]);
    expect(summarizeWeeklyProgress(fp, graph)[0]).toEqual({
      conceptId: 'c1',
      label: 'Concept 1',
      deltaDecayed: 60,
      attemptsThisWeek: 8,
    });
  });

  it('skips focus concepts that are absent from the graph', () => {
    const fp = makeFingerprint({
      weeklyFocus: ['c1', 'unknown-concept'],
      conceptMastery: {
        c1: makeMastery({ conceptId: 'c1', decayedScore: 60, attemptCount: 8 }),
      },
      weekStartSnapshots: { c1: { rawScore: 50, decayedScore: 50, attemptCount: 4 } },
    });
    const graph = makeGraph([{ id: 'c1', label: 'Concept 1' }]);
    const result = summarizeWeeklyProgress(fp, graph);
    expect(result.length).toBe(1);
    expect(result[0].conceptId).toBe('c1');
  });

  it('skips focus concepts that have no conceptMastery entry yet', () => {
    const fp = makeFingerprint({
      weeklyFocus: ['c1'],
      conceptMastery: {}, // no practice recorded yet
      weekStartSnapshots: { c1: { rawScore: 0, decayedScore: 0, attemptCount: 0 } },
    });
    const graph = makeGraph([{ id: 'c1', label: 'Concept 1' }]);
    expect(summarizeWeeklyProgress(fp, graph)).toEqual([]);
  });

  it('preserves the order of fp.weeklyFocus in the output', () => {
    const fp = makeFingerprint({
      weeklyFocus: ['c3', 'c1', 'c2'],
      conceptMastery: {
        c1: makeMastery({ conceptId: 'c1' }),
        c2: makeMastery({ conceptId: 'c2' }),
        c3: makeMastery({ conceptId: 'c3' }),
      },
      weekStartSnapshots: {
        c1: { rawScore: 50, decayedScore: 50, attemptCount: 10 },
        c2: { rawScore: 50, decayedScore: 50, attemptCount: 10 },
        c3: { rawScore: 50, decayedScore: 50, attemptCount: 10 },
      },
    });
    const graph = makeGraph([
      { id: 'c1', label: 'Concept 1' },
      { id: 'c2', label: 'Concept 2' },
      { id: 'c3', label: 'Concept 3' },
    ]);
    const result = summarizeWeeklyProgress(fp, graph);
    expect(result.map((e) => e.conceptId)).toEqual(['c3', 'c1', 'c2']);
  });
});
