import { describe, it, expect } from 'vitest';
import { buildWeeklyCheckItems } from '@/lib/weekly-check';
import type { MistakeFingerprint, WeeklySprintRecord } from '@/types/fingerprint';
import type { ConceptGraph } from '@/types/concepts';
import type { Sentence } from '@/types/content';

// ── Fixture builders ──────────────────────────────────────────────────────────

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
    ...overrides,
  };
}

function makeGraph(conceptIds: string[]): ConceptGraph {
  return {
    version: '1.0',
    language: 'no',
    concepts: conceptIds.map((id) => ({
      id,
      label: id,
      description: `Concept ${id}`,
      cefrLevel: 'A1' as const,
      prerequisites: [],
      masteryThreshold: 80,
      minAttempts: 15,
      minDays: 3,
      errorTags: [],
    })),
  };
}

function makeSentence(
  id: string,
  conceptIds: string[],
  exerciseTypes: Sentence['exerciseTypes'] = ['translation-to-norwegian'],
): Sentence {
  return {
    id,
    norwegian: `Norsk setning for ${id}`,
    english: `English sentence for ${id}`,
    conceptIds,
    vocabularyClusters: [],
    errorTagsDetectable: [],
    cefrLevel: 'A1',
    difficulty: 1,
    exerciseTypes,
  };
}

function makeAvailableIds(sentences: Sentence[]): Record<string, string[]> {
  const result: Record<string, string[]> = {};
  for (const s of sentences) {
    for (const cid of s.conceptIds) {
      result[cid] = [...(result[cid] ?? []), s.id];
    }
  }
  return result;
}

function makeSentenceMap(sentences: Sentence[]): Record<string, Sentence> {
  return Object.fromEntries(sentences.map((s) => [s.id, s]));
}

function makeSprintRecord(
  focusOutcomes: Record<string, { startScore: number; endScore: number; attempts: number }>,
): WeeklySprintRecord {
  return {
    weekStartedAt: new Date().toISOString(),
    weekEndedAt: new Date().toISOString(),
    focus: Object.keys(focusOutcomes),
    status: 'completed',
    focusOutcomes,
    checkResult: { takenAt: new Date().toISOString(), score: 80, items: 3 },
  };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('buildWeeklyCheckItems', () => {
  it('returns [] when weeklyFocus is empty and history is empty', () => {
    const fp = makeFingerprint({ weeklyFocus: [], weeklySprintHistory: [] });
    const graph = makeGraph([]);
    const items = buildWeeklyCheckItems(fp, graph, {}, {});
    expect(items).toHaveLength(0);
  });

  it('returns one item per focus concept when each has an eligible sentence', () => {
    const conceptIds = ['present-tense', 'negation', 'pronouns'];
    const sentences = conceptIds.map((cid) => makeSentence(`s-${cid}`, [cid]));
    const fp = makeFingerprint({ weeklyFocus: conceptIds });
    const graph = makeGraph(conceptIds);
    const sentenceMap = makeSentenceMap(sentences);
    const ids = makeAvailableIds(sentences);

    const items = buildWeeklyCheckItems(fp, graph, sentenceMap, ids);

    expect(items).toHaveLength(3);
    // One item per concept, deduped
    const usedConcepts = items.map((i) => i.conceptIds[0]);
    expect(new Set(usedConcepts).size).toBe(3);
  });

  it('all returned items have purpose "review"', () => {
    const conceptIds = ['present-tense', 'negation'];
    const sentences = conceptIds.map((cid) => makeSentence(`s-${cid}`, [cid]));
    const fp = makeFingerprint({ weeklyFocus: conceptIds });
    const graph = makeGraph(conceptIds);

    const items = buildWeeklyCheckItems(
      fp,
      graph,
      makeSentenceMap(sentences),
      makeAvailableIds(sentences),
    );

    for (const item of items) {
      expect(item.purpose).toBe('review');
    }
  });

  it('all exercise types come from PREFERRED_TYPES', () => {
    const PREFERRED_TYPES = ['translation-to-norwegian', 'fill-in-blank', 'translation-to-english'];
    const conceptIds = ['a', 'b', 'c'];
    const sentences = conceptIds.map((cid) =>
      makeSentence(`s-${cid}`, [cid], ['translation-to-norwegian', 'fill-in-blank']),
    );
    const fp = makeFingerprint({ weeklyFocus: conceptIds });
    const graph = makeGraph(conceptIds);

    const items = buildWeeklyCheckItems(
      fp,
      graph,
      makeSentenceMap(sentences),
      makeAvailableIds(sentences),
    );

    for (const item of items) {
      expect(PREFERRED_TYPES).toContain(item.exerciseType);
    }
  });

  it('skips concepts with no eligible sentence — no blank cards', () => {
    const allConcepts = ['has-sentence', 'no-sentence'];
    const sentences = [makeSentence('s-has', ['has-sentence'])];
    const fp = makeFingerprint({ weeklyFocus: allConcepts });
    const graph = makeGraph(allConcepts);

    const items = buildWeeklyCheckItems(
      fp,
      graph,
      makeSentenceMap(sentences),
      makeAvailableIds(sentences),
    );

    expect(items).toHaveLength(1);
    expect(items[0]?.conceptIds[0]).toBe('has-sentence');
  });

  it('deduplicates a concept that appears in both focus and last-week-graduates', () => {
    const sharedConcept = 'shared';
    const otherConcept = 'other';
    const sentences = [
      makeSentence('s-shared', [sharedConcept]),
      makeSentence('s-other', [otherConcept]),
    ];
    const fp = makeFingerprint({
      weeklyFocus: [sharedConcept],
      weeklySprintHistory: [
        makeSprintRecord({
          [sharedConcept]: { startScore: 60, endScore: 85, attempts: 5 },
        }),
      ],
    });
    // graph threshold is 80; endScore=85 >= 80 → graduate
    const graph = makeGraph([sharedConcept, otherConcept]);

    const items = buildWeeklyCheckItems(
      fp,
      graph,
      makeSentenceMap(sentences),
      makeAvailableIds(sentences),
    );

    const conceptsInItems = items.map((i) => i.conceptIds[0]);
    const uniqueConcepts = new Set(conceptsInItems);
    // sharedConcept must appear exactly once despite being in both lists
    expect(uniqueConcepts.size).toBe(items.length);
    expect(items.filter((i) => i.conceptIds[0] === sharedConcept)).toHaveLength(1);
  });

  it('includes last-week-graduates when 5 focus + 3 graduates, capped at MAX_ITEM_COUNT (8)', () => {
    const focusConcepts = ['f1', 'f2', 'f3', 'f4', 'f5'];
    const gradConcepts = ['g1', 'g2', 'g3'];
    const allConcepts = [...focusConcepts, ...gradConcepts];

    const sentences = allConcepts.map((cid) => makeSentence(`s-${cid}`, [cid]));
    const focusOutcomes = Object.fromEntries(
      gradConcepts.map((cid) => [cid, { startScore: 60, endScore: 90, attempts: 8, graduated: true }]),
    );

    const fp = makeFingerprint({
      weeklyFocus: focusConcepts,
      weeklySprintHistory: [makeSprintRecord(focusOutcomes)],
    });
    const graph = makeGraph(allConcepts);

    const items = buildWeeklyCheckItems(
      fp,
      graph,
      makeSentenceMap(sentences),
      makeAvailableIds(sentences),
    );

    expect(items.length).toBeGreaterThanOrEqual(6);
    expect(items.length).toBeLessThanOrEqual(8);
  });
});
