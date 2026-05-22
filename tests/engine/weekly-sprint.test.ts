import { describe, it, expect } from 'vitest';
import { selectWeeklyFocus, shouldResetWeek, closeWeek, migrateWeeklySprintFields, openWeek, ensureWeekOpen } from '@/engine/weekly-sprint';
import type { MistakeFingerprint, ConceptMastery, WeeklySprintRecord } from '@/types/fingerprint';
import type { ConceptGraph } from '@/types/concepts';

// ── Fixture builders ──────────────────────────────────────────────────────────

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
    lastSessionAt: new Date().toISOString(),
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

function makeGraph(conceptIds: string[], options: { lockedIds?: string[] } = {}): ConceptGraph {
  const lockedIds = new Set(options.lockedIds ?? []);
  return {
    version: '1.0',
    language: 'no',
    concepts: conceptIds.map((id) => ({
      id,
      label: id,
      description: `Concept ${id}`,
      cefrLevel: 'A1' as const,
      // Locked concepts have a prerequisite that is never mastered.
      prerequisites: lockedIds.has(id) ? ['__never-mastered-prereq__'] : [],
      masteryThreshold: 80,
      minAttempts: 15,
      minDays: 3,
      errorTags: [],
    })),
  };
}

/** Minimal graph with no concepts — closeWeek gracefully returns graduated: false for all. */
const minimalGraph: ConceptGraph = { version: '1.0', language: 'no', concepts: [] };

function daysAgo(n: number): string {
  const d = new Date();
  d.setTime(d.getTime() - n * 24 * 60 * 60 * 1000);
  return d.toISOString();
}

function daysFromNow(n: number): string {
  const d = new Date();
  d.setTime(d.getTime() + n * 24 * 60 * 60 * 1000);
  return d.toISOString();
}

// ── selectWeeklyFocus ─────────────────────────────────────────────────────────

describe('selectWeeklyFocus', () => {
  it('returns an empty array when fingerprint has no concept mastery', () => {
    const fp = makeFingerprint({ conceptMastery: {} });
    const graph = makeGraph([]);
    expect(selectWeeklyFocus(fp, graph)).toEqual([]);
  });

  it('returns at most 5 concept IDs', () => {
    const ids = ['c1', 'c2', 'c3', 'c4', 'c5', 'c6', 'c7', 'c8'];
    const conceptMastery = Object.fromEntries(
      ids.map((id, i) => [id, makeMastery({ conceptId: id, decayedScore: (i + 1) * 10 })]),
    );
    const fp = makeFingerprint({ conceptMastery });
    const graph = makeGraph(ids);
    const result = selectWeeklyFocus(fp, graph);
    expect(result.length).toBeLessThanOrEqual(5);
  });

  it('excludes locked concepts (unmet prerequisites)', () => {
    const ids = ['unlocked-1', 'unlocked-2', 'unlocked-3', 'locked-1'];
    const conceptMastery = Object.fromEntries(
      ids.map((id, i) => [id, makeMastery({ conceptId: id, decayedScore: (i + 1) * 10 })]),
    );
    const fp = makeFingerprint({ conceptMastery });
    const graph = makeGraph(ids, { lockedIds: ['locked-1'] });
    const result = selectWeeklyFocus(fp, graph);
    expect(result).not.toContain('locked-1');
  });

  it('prefers the weakest 3 by decayedScore', () => {
    const ids = ['c1', 'c2', 'c3', 'c4', 'c5'];
    // Scores: c1=10, c2=20, c3=30, c4=40, c5=50
    const conceptMastery = Object.fromEntries(
      ids.map((id, i) => [id, makeMastery({ conceptId: id, decayedScore: (i + 1) * 10, nextReviewAt: null })]),
    );
    const fp = makeFingerprint({ conceptMastery });
    const graph = makeGraph(ids);
    const result = selectWeeklyFocus(fp, graph);
    // Weakest 3 are c1, c2, c3
    expect(result).toContain('c1');
    expect(result).toContain('c2');
    expect(result).toContain('c3');
  });

  it('includes SRS-due concepts when nextReviewAt is within the week', () => {
    const ids = ['weak-1', 'weak-2', 'weak-3', 'srs-due'];
    const now = new Date();
    const conceptMastery: Record<string, ConceptMastery> = {
      'weak-1': makeMastery({ conceptId: 'weak-1', decayedScore: 10, nextReviewAt: null }),
      'weak-2': makeMastery({ conceptId: 'weak-2', decayedScore: 20, nextReviewAt: null }),
      'weak-3': makeMastery({ conceptId: 'weak-3', decayedScore: 30, nextReviewAt: null }),
      // srs-due has high score but is due within the week
      'srs-due': makeMastery({ conceptId: 'srs-due', decayedScore: 80, nextReviewAt: daysFromNow(3) }),
    };
    const fp = makeFingerprint({ conceptMastery });
    const graph = makeGraph(ids);
    const result = selectWeeklyFocus(fp, graph, now);
    expect(result).toContain('srs-due');
  });

  it('dedupes when a concept appears in both weakest and SRS pools, keeping it once', () => {
    const ids = ['c1', 'c2', 'c3', 'c4'];
    const now = new Date();
    const conceptMastery: Record<string, ConceptMastery> = {
      // c1 is the weakest AND has an SRS review due within the week
      'c1': makeMastery({ conceptId: 'c1', decayedScore: 5, nextReviewAt: daysFromNow(2) }),
      'c2': makeMastery({ conceptId: 'c2', decayedScore: 20, nextReviewAt: null }),
      'c3': makeMastery({ conceptId: 'c3', decayedScore: 30, nextReviewAt: null }),
      'c4': makeMastery({ conceptId: 'c4', decayedScore: 40, nextReviewAt: null }),
    };
    const fp = makeFingerprint({ conceptMastery });
    const graph = makeGraph(ids);
    const result = selectWeeklyFocus(fp, graph, now);
    // c1 appears exactly once
    expect(result.filter((id) => id === 'c1').length).toBe(1);
  });

  it('does not include SRS-due concepts whose nextReviewAt is beyond the week', () => {
    const ids = ['weak-1', 'weak-2', 'weak-3', 'srs-far'];
    const now = new Date();
    const conceptMastery: Record<string, ConceptMastery> = {
      'weak-1': makeMastery({ conceptId: 'weak-1', decayedScore: 10, nextReviewAt: null }),
      'weak-2': makeMastery({ conceptId: 'weak-2', decayedScore: 20, nextReviewAt: null }),
      'weak-3': makeMastery({ conceptId: 'weak-3', decayedScore: 30, nextReviewAt: null }),
      // srs-far review is 14 days out — beyond the 7-day week window
      'srs-far': makeMastery({ conceptId: 'srs-far', decayedScore: 80, nextReviewAt: daysFromNow(14) }),
    };
    const fp = makeFingerprint({ conceptMastery });
    const graph = makeGraph(ids);
    const result = selectWeeklyFocus(fp, graph, now);
    expect(result).not.toContain('srs-far');
  });
});

// ── shouldResetWeek ───────────────────────────────────────────────────────────

describe('shouldResetWeek', () => {
  it('returns false when weekStartedAt is null', () => {
    const fp = makeFingerprint({ weekStartedAt: null });
    expect(shouldResetWeek(fp)).toBe(false);
  });

  it('returns false when elapsed is exactly 7 days (not strictly greater)', () => {
    const now = new Date();
    const exactlySevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const fp = makeFingerprint({ weekStartedAt: exactlySevenDaysAgo });
    // elapsed === WEEK_DURATION_MS, not strictly greater, so false
    expect(shouldResetWeek(fp, now)).toBe(false);
  });

  it('returns false when elapsed is less than 7 days', () => {
    const fp = makeFingerprint({ weekStartedAt: daysAgo(3) });
    expect(shouldResetWeek(fp)).toBe(false);
  });

  it('returns true when elapsed is more than 7 days (7.5 days)', () => {
    const now = new Date();
    const sevenAndHalfDaysAgo = new Date(
      now.getTime() - 7.5 * 24 * 60 * 60 * 1000,
    ).toISOString();
    const fp = makeFingerprint({ weekStartedAt: sevenAndHalfDaysAgo });
    expect(shouldResetWeek(fp, now)).toBe(true);
  });
});

// ── closeWeek ─────────────────────────────────────────────────────────────────

describe('closeWeek', () => {
  it('returns fp unchanged when weekStartedAt is null', () => {
    const fp = makeFingerprint({ weekStartedAt: null });
    const result = closeWeek(fp, minimalGraph, { status: 'completed', checkResult: null });
    expect(result).toBe(fp);
  });

  it('produces a record with status completed', () => {
    const fp = makeFingerprint({
      weekStartedAt: daysAgo(7),
      weeklyFocus: ['c1'],
      conceptMastery: { c1: makeMastery({ conceptId: 'c1', decayedScore: 60, attemptCount: 8 }) },
    });
    const now = new Date();
    const result = closeWeek(fp, minimalGraph, { status: 'completed', checkResult: null, now });
    expect(result.weeklySprintHistory[0]?.status).toBe('completed');
  });

  it('produces a record with status abandoned', () => {
    const fp = makeFingerprint({
      weekStartedAt: daysAgo(10),
      weeklyFocus: ['c1'],
      conceptMastery: { c1: makeMastery({ conceptId: 'c1', decayedScore: 55, attemptCount: 5 }) },
    });
    const now = new Date();
    const result = closeWeek(fp, minimalGraph, { status: 'abandoned', checkResult: null, now });
    expect(result.weeklySprintHistory[0]?.status).toBe('abandoned');
  });

  it('caps history at 26 entries (oldest dropped when 27 inserted)', () => {
    const existingHistory: WeeklySprintRecord[] = Array.from({ length: 26 }, (_, i) => ({
      weekStartedAt: daysAgo(14 + i * 7),
      weekEndedAt: daysAgo(7 + i * 7),
      focus: ['c1'],
      status: 'completed' as const,
      focusOutcomes: {},
      checkResult: null,
    }));
    const fp = makeFingerprint({
      weekStartedAt: daysAgo(7),
      weeklyFocus: ['c1'],
      weeklySprintHistory: existingHistory,
      conceptMastery: { c1: makeMastery({ conceptId: 'c1' }) },
    });
    const result = closeWeek(fp, minimalGraph, { status: 'completed', checkResult: null });
    expect(result.weeklySprintHistory.length).toBe(26);
    // The newest record is at index 0
    expect(result.weeklySprintHistory[0]?.weekStartedAt).toBe(fp.weekStartedAt);
  });

  it('clears weeklyFocus and weekStartedAt after closing', () => {
    const fp = makeFingerprint({
      weekStartedAt: daysAgo(7),
      weeklyFocus: ['c1'],
      conceptMastery: { c1: makeMastery({ conceptId: 'c1' }) },
    });
    const result = closeWeek(fp, minimalGraph, { status: 'completed', checkResult: null });
    expect(result.weeklyFocus).toEqual([]);
    expect(result.weekStartedAt).toBeNull();
  });

  it('sets updatedAt to options.now', () => {
    const now = new Date('2026-01-15T10:00:00.000Z');
    const fp = makeFingerprint({
      weekStartedAt: '2026-01-08T10:00:00.000Z',
      weeklyFocus: [],
    });
    const result = closeWeek(fp, minimalGraph, { status: 'completed', checkResult: null, now });
    expect(result.updatedAt).toBe(now.toISOString());
  });

  it('accepts checkResult: null (learner skipped the check)', () => {
    const fp = makeFingerprint({
      weekStartedAt: daysAgo(7),
      weeklyFocus: ['c1'],
      conceptMastery: { c1: makeMastery({ conceptId: 'c1' }) },
    });
    const result = closeWeek(fp, minimalGraph, { status: 'abandoned', checkResult: null });
    expect(result.weeklySprintHistory[0]?.checkResult).toBeNull();
  });

  it('stores checkResult when provided', () => {
    const fp = makeFingerprint({
      weekStartedAt: daysAgo(7),
      weeklyFocus: ['c1'],
      conceptMastery: { c1: makeMastery({ conceptId: 'c1' }) },
    });
    const checkResult = { takenAt: new Date().toISOString(), score: 80, items: 10 };
    const result = closeWeek(fp, minimalGraph, { status: 'completed', checkResult });
    expect(result.weeklySprintHistory[0]?.checkResult).toEqual(checkResult);
  });

  it('records focusOutcomes with endScore, per-week attempts, and startScore from snapshot', () => {
    const fp = makeFingerprint({
      weekStartedAt: daysAgo(7),
      weeklyFocus: ['c1'],
      conceptMastery: {
        c1: makeMastery({ conceptId: 'c1', decayedScore: 72, attemptCount: 12 }),
      },
      weekStartSnapshots: {
        c1: { rawScore: 40, decayedScore: 42, attemptCount: 4 },
      },
    });
    const result = closeWeek(fp, minimalGraph, { status: 'completed', checkResult: null });
    const outcome = result.weeklySprintHistory[0]?.focusOutcomes['c1'];
    expect(outcome?.endScore).toBe(72);
    expect(outcome?.attempts).toBe(8); // 12 lifetime - 4 snapshot = 8 this week
    expect(outcome?.startScore).toBe(42); // from snapshot.decayedScore
    expect(outcome?.graduated).toBe(false); // minimalGraph has no nodes, so no graduation
  });

  it('closeWeek clears weekStartSnapshots after writing focusOutcomes', () => {
    const fp = makeFingerprint({
      weekStartedAt: daysAgo(7),
      weeklyFocus: ['c1', 'c2'],
      conceptMastery: {
        c1: makeMastery({ conceptId: 'c1' }),
        c2: makeMastery({ conceptId: 'c2' }),
      },
      weekStartSnapshots: {
        c1: { rawScore: 50, decayedScore: 50, attemptCount: 5 },
        c2: { rawScore: 60, decayedScore: 60, attemptCount: 6 },
      },
    });
    const result = closeWeek(fp, minimalGraph, { status: 'completed', checkResult: null });
    expect(result.weekStartSnapshots).toEqual({});
  });

  it('closeWeek falls back to startScore: 0 when snapshot is missing (legacy week)', () => {
    const fp = makeFingerprint({
      weekStartedAt: daysAgo(7),
      weeklyFocus: ['c1'],
      conceptMastery: {
        c1: makeMastery({ conceptId: 'c1', decayedScore: 55, attemptCount: 10 }),
      },
      weekStartSnapshots: {}, // legacy: week open before snapshots existed
    });
    const result = closeWeek(fp, minimalGraph, { status: 'completed', checkResult: null });
    const outcome = result.weeklySprintHistory[0]?.focusOutcomes['c1'];
    expect(outcome?.startScore).toBe(0);
    expect(outcome?.attempts).toBe(10); // no snapshot → falls back to lifetime
  });
});

// ── migrateWeeklySprintFields ─────────────────────────────────────────────────

describe('migrateWeeklySprintFields', () => {
  it('seeds all four weekly-sprint fields on a legacy fingerprint missing them', () => {
    // Cast to bypass TypeScript — simulates a real legacy fingerprint from storage
    const legacy = {
      userId: 'test-user',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      currentLevel: 'A1',
      levelSetByUser: false,
      conceptMastery: { c1: makeMastery({ conceptId: 'c1' }) },
      recentErrors: [],
      errorPatterns: [],
      vocabularyMastery: {},
      productionGap: {},
      totalSessionsCompleted: 2,
      calibrationSessionsRemaining: 3,
      lastSessionAt: new Date().toISOString(),
      speakingMinutesTotal: 10,
      inputProductionPreference: 'balanced',
      lastRecalibrationAt: null,
      askedDiagnosticQuestionIds: [],
      // weeklyFocus, weekStartedAt, weeklySprintHistory intentionally absent
    } as unknown as MistakeFingerprint;

    const { migrated, changed } = migrateWeeklySprintFields(legacy);
    expect(changed).toBe(true);
    expect(migrated.weeklyFocus).toEqual([]);
    expect(migrated.weekStartedAt).toBeNull();
    expect(migrated.weeklySprintHistory).toEqual([]);
    expect(migrated.weekStartSnapshots).toEqual({});
  });

  it('seeds weekStartSnapshots on a fingerprint that has the three older fields but not snapshots', () => {
    // Simulates a fingerprint that went through the original Stream 5 migration but
    // predates Stream 5.5 Phase 2 (when weekStartSnapshots was added).
    const stream5Era = {
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
      calibrationSessionsRemaining: 4,
      lastSessionAt: null,
      speakingMinutesTotal: 0,
      inputProductionPreference: 'balanced',
      lastRecalibrationAt: null,
      askedDiagnosticQuestionIds: [],
      weeklyFocus: ['c1'],
      weekStartedAt: new Date().toISOString(),
      weeklySprintHistory: [],
      // weekStartSnapshots intentionally absent
    } as unknown as MistakeFingerprint;

    const { migrated, changed } = migrateWeeklySprintFields(stream5Era);
    expect(changed).toBe(true);
    expect(migrated.weekStartSnapshots).toEqual({});
    // Other fields preserved
    expect(migrated.weeklyFocus).toEqual(['c1']);
    expect(migrated.weekStartedAt).toBe(stream5Era.weekStartedAt);
  });

  it('is idempotent — second call returns changed: false', () => {
    const legacy = {
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
      totalSessionsCompleted: 0,
      calibrationSessionsRemaining: 5,
      lastSessionAt: null,
      speakingMinutesTotal: 0,
      inputProductionPreference: 'balanced',
      lastRecalibrationAt: null,
      askedDiagnosticQuestionIds: [],
    } as unknown as MistakeFingerprint;

    const { migrated: first, changed: firstChanged } = migrateWeeklySprintFields(legacy);
    expect(firstChanged).toBe(true);

    const { changed: secondChanged } = migrateWeeklySprintFields(first);
    expect(secondChanged).toBe(false);
  });

  it('leaves existing conceptMastery and recentErrors untouched', () => {
    const mastery = makeMastery({ conceptId: 'c1', rawScore: 77 });
    const error = {
      id: 'err-1',
      conceptId: 'c1',
      errorTag: 'noun-gender' as const,
      exerciseType: 'translation-to-norwegian' as const,
      wrong: 'bad',
      correct: 'good',
      timestamp: new Date().toISOString(),
    };
    const legacy = {
      userId: 'test-user',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      currentLevel: 'A1',
      levelSetByUser: false,
      conceptMastery: { c1: mastery },
      recentErrors: [error],
      errorPatterns: [],
      vocabularyMastery: {},
      productionGap: {},
      totalSessionsCompleted: 1,
      calibrationSessionsRemaining: 4,
      lastSessionAt: null,
      speakingMinutesTotal: 0,
      inputProductionPreference: 'balanced',
      lastRecalibrationAt: null,
      askedDiagnosticQuestionIds: [],
    } as unknown as MistakeFingerprint;

    const { migrated } = migrateWeeklySprintFields(legacy);
    expect(migrated.conceptMastery['c1']).toEqual(mastery);
    expect(migrated.recentErrors[0]).toEqual(error);
  });
});

// ── openWeek + ensureWeekOpen ─────────────────────────────────────────────────

describe('openWeek + ensureWeekOpen', () => {
  it('openWeek on weekStartedAt: null populates weeklyFocus and sets weekStartedAt', () => {
    const ids = ['c1', 'c2', 'c3'];
    const conceptMastery = Object.fromEntries(
      ids.map((id, i) => [id, makeMastery({ conceptId: id, decayedScore: (i + 1) * 10 })]),
    );
    const fp = makeFingerprint({ weekStartedAt: null, conceptMastery });
    const graph = makeGraph(ids);
    const now = new Date('2026-01-15T10:00:00.000Z');
    const result = openWeek(fp, graph, now);

    expect(result.weeklyFocus.length).toBeGreaterThan(0);
    expect(result.weekStartedAt).toBe(now.toISOString());
    expect(result.updatedAt).toBe(now.toISOString());
  });

  it('openWeek is idempotent when week already open', () => {
    const alreadyStarted = '2026-01-10T10:00:00.000Z';
    const fp = makeFingerprint({
      weekStartedAt: alreadyStarted,
      weeklyFocus: ['c1'],
    });
    const graph = makeGraph(['c1', 'c2']);
    const result = openWeek(fp, graph, new Date());

    expect(result).toBe(fp); // same reference — unchanged
  });

  it('openWeek with empty conceptMastery returns fp with weeklyFocus: [] and non-null weekStartedAt', () => {
    const fp = makeFingerprint({ weekStartedAt: null, conceptMastery: {} });
    const graph = makeGraph([]);
    const now = new Date('2026-01-15T10:00:00.000Z');
    const result = openWeek(fp, graph, now);

    expect(result.weeklyFocus).toEqual([]);
    expect(result.weekStartedAt).toBe(now.toISOString());
    expect(result.weekStartSnapshots).toEqual({});
  });

  it('openWeek snapshots {rawScore, decayedScore, attemptCount} for each focus concept', () => {
    const ids = ['c1', 'c2', 'c3'];
    const conceptMastery = {
      c1: makeMastery({ conceptId: 'c1', rawScore: 30, decayedScore: 35, attemptCount: 4 }),
      c2: makeMastery({ conceptId: 'c2', rawScore: 50, decayedScore: 48, attemptCount: 8 }),
      c3: makeMastery({ conceptId: 'c3', rawScore: 70, decayedScore: 65, attemptCount: 12 }),
    };
    const fp = makeFingerprint({ weekStartedAt: null, conceptMastery });
    const graph = makeGraph(ids);
    const now = new Date('2026-01-15T10:00:00.000Z');
    const result = openWeek(fp, graph, now);

    // Snapshot keys mirror the freshly-selected weeklyFocus exactly.
    expect(Object.keys(result.weekStartSnapshots).sort()).toEqual([...result.weeklyFocus].sort());
    // Each snapshot captures the current mastery values verbatim.
    for (const conceptId of result.weeklyFocus) {
      const snap = result.weekStartSnapshots[conceptId];
      const mastery = conceptMastery[conceptId as keyof typeof conceptMastery];
      expect(snap).toEqual({
        rawScore: mastery.rawScore,
        decayedScore: mastery.decayedScore,
        attemptCount: mastery.attemptCount,
      });
    }
  });

  it('openWeek snapshots zero values for focus concepts that have no existing mastery', () => {
    // Edge case: selectWeeklyFocus pulls from existing mastery, so a never-practised
    // concept would only appear in weeklyFocus if injected manually. This test guards
    // the zero-snapshot fallback so the snapshot map is always well-formed.
    const fp = makeFingerprint({
      weekStartedAt: null,
      conceptMastery: { c1: makeMastery({ conceptId: 'c1', decayedScore: 30 }) },
    });
    const graph = makeGraph(['c1']);
    const now = new Date('2026-01-15T10:00:00.000Z');
    const result = openWeek(fp, graph, now);

    // weeklyFocus from selectWeeklyFocus picks c1 (only mastered concept).
    expect(result.weeklyFocus).toContain('c1');
    expect(result.weekStartSnapshots['c1']).toBeDefined();
  });

  it('ensureWeekOpen with weekStartedAt: null behaves as openWeek', () => {
    const ids = ['c1', 'c2'];
    const conceptMastery = Object.fromEntries(
      ids.map((id, i) => [id, makeMastery({ conceptId: id, decayedScore: (i + 1) * 20 })]),
    );
    const fp = makeFingerprint({ weekStartedAt: null, conceptMastery });
    const graph = makeGraph(ids);
    const now = new Date('2026-01-15T10:00:00.000Z');
    const result = ensureWeekOpen(fp, graph, now);

    expect(result.weekStartedAt).toBe(now.toISOString());
    expect(result.weeklyFocus.length).toBeGreaterThan(0);
  });

  it('ensureWeekOpen with stale week (>7d) closes as abandoned and opens a fresh week', () => {
    const staleStart = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString();
    const fp = makeFingerprint({
      weekStartedAt: staleStart,
      weeklyFocus: ['c1'],
      conceptMastery: { c1: makeMastery({ conceptId: 'c1', decayedScore: 40 }) },
    });
    const graph = makeGraph(['c1']);
    const now = new Date();
    const result = ensureWeekOpen(fp, graph, now);

    // History gains one record with 'abandoned' status
    expect(result.weeklySprintHistory.length).toBe(1);
    expect(result.weeklySprintHistory[0]?.status).toBe('abandoned');
    // A new week is open
    expect(result.weekStartedAt).not.toBeNull();
    expect(result.weekStartedAt).not.toBe(staleStart);
  });

  it('ensureWeekOpen with fresh week (≤7d) returns fp unchanged', () => {
    const recentStart = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
    const fp = makeFingerprint({
      weekStartedAt: recentStart,
      weeklyFocus: ['c1'],
    });
    const graph = makeGraph(['c1']);
    const result = ensureWeekOpen(fp, graph);

    expect(result).toBe(fp); // same reference — no change
  });

  it('ensureWeekOpen close→open atomicity: history[0] is abandoned AND new weekStartedAt > old', () => {
    const staleStart = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString();
    const fp = makeFingerprint({
      weekStartedAt: staleStart,
      weeklyFocus: ['c1'],
      conceptMastery: { c1: makeMastery({ conceptId: 'c1' }) },
    });
    const graph = makeGraph(['c1']);
    const now = new Date();
    const result = ensureWeekOpen(fp, graph, now);

    const record = result.weeklySprintHistory[0];
    expect(record?.status).toBe('abandoned');
    expect(result.weekStartedAt).not.toBeNull();
    // New weekStartedAt must be strictly later than the old one
    expect(new Date(result.weekStartedAt!).getTime()).toBeGreaterThan(new Date(staleStart).getTime());
  });
});

// ── graduation rule ───────────────────────────────────────────────────────────

describe('graduation rule', () => {
  function makeGradGraph(conceptId: string, masteryThreshold: number, minAttempts: number): ConceptGraph {
    return {
      version: '1.0',
      language: 'no',
      concepts: [
        {
          id: conceptId,
          label: conceptId,
          description: `Concept ${conceptId}`,
          cefrLevel: 'A1',
          prerequisites: [],
          masteryThreshold,
          minAttempts,
          minDays: 3,
          errorTags: [],
        },
      ],
    };
  }

  it('concept that meets threshold AND minAttempts → graduated: true', () => {
    const graph = makeGradGraph('c1', 70, 5);
    const fp = makeFingerprint({
      weekStartedAt: daysAgo(7),
      weeklyFocus: ['c1'],
      conceptMastery: {
        c1: makeMastery({ conceptId: 'c1', rawScore: 80, attemptCount: 10 }),
      },
    });
    const result = closeWeek(fp, graph, { status: 'completed', checkResult: null });
    expect(result.weeklySprintHistory[0]?.focusOutcomes['c1']?.graduated).toBe(true);
  });

  it('concept below threshold → graduated: false', () => {
    const graph = makeGradGraph('c1', 70, 5);
    const fp = makeFingerprint({
      weekStartedAt: daysAgo(7),
      weeklyFocus: ['c1'],
      conceptMastery: {
        c1: makeMastery({ conceptId: 'c1', rawScore: 60, attemptCount: 10 }),
      },
    });
    const result = closeWeek(fp, graph, { status: 'completed', checkResult: null });
    expect(result.weeklySprintHistory[0]?.focusOutcomes['c1']?.graduated).toBe(false);
  });

  it('concept below minAttempts → graduated: false', () => {
    const graph = makeGradGraph('c1', 70, 5);
    const fp = makeFingerprint({
      weekStartedAt: daysAgo(7),
      weeklyFocus: ['c1'],
      conceptMastery: {
        c1: makeMastery({ conceptId: 'c1', rawScore: 80, attemptCount: 3 }),
      },
    });
    const result = closeWeek(fp, graph, { status: 'completed', checkResult: null });
    expect(result.weeklySprintHistory[0]?.focusOutcomes['c1']?.graduated).toBe(false);
  });

  it('low check score (<50) demotes graduation', () => {
    const graph = makeGradGraph('c1', 70, 5);
    const fp = makeFingerprint({
      weekStartedAt: daysAgo(7),
      weeklyFocus: ['c1'],
      conceptMastery: {
        c1: makeMastery({ conceptId: 'c1', rawScore: 80, attemptCount: 10 }),
      },
    });
    const checkResult = { takenAt: new Date().toISOString(), score: 40, items: 6 };
    const result = closeWeek(fp, graph, { status: 'completed', checkResult });
    expect(result.weeklySprintHistory[0]?.focusOutcomes['c1']?.graduated).toBe(false);
  });

  it('high check score keeps graduation', () => {
    const graph = makeGradGraph('c1', 70, 5);
    const fp = makeFingerprint({
      weekStartedAt: daysAgo(7),
      weeklyFocus: ['c1'],
      conceptMastery: {
        c1: makeMastery({ conceptId: 'c1', rawScore: 80, attemptCount: 10 }),
      },
    });
    const checkResult = { takenAt: new Date().toISOString(), score: 80, items: 6 };
    const result = closeWeek(fp, graph, { status: 'completed', checkResult });
    expect(result.weeklySprintHistory[0]?.focusOutcomes['c1']?.graduated).toBe(true);
  });

  it('skipped check (checkResult === null) does not punish graduation', () => {
    const graph = makeGradGraph('c1', 70, 5);
    const fp = makeFingerprint({
      weekStartedAt: daysAgo(7),
      weeklyFocus: ['c1'],
      conceptMastery: {
        c1: makeMastery({ conceptId: 'c1', rawScore: 80, attemptCount: 10 }),
      },
    });
    const result = closeWeek(fp, graph, { status: 'completed', checkResult: null });
    expect(result.weeklySprintHistory[0]?.focusOutcomes['c1']?.graduated).toBe(true);
  });

  it('concept missing from mastery → outcome not recorded (no crash)', () => {
    const graph = makeGradGraph('c1', 70, 5);
    const fp = makeFingerprint({
      weekStartedAt: daysAgo(7),
      weeklyFocus: ['c1'],
      conceptMastery: {}, // c1 not in mastery
    });
    const result = closeWeek(fp, graph, { status: 'completed', checkResult: null });
    expect(result.weeklySprintHistory[0]?.focusOutcomes['c1']).toBeUndefined();
  });
});
