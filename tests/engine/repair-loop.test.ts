import { describe, it, expect } from 'vitest';
import { buildRepairPlan, makeRepairItems } from '@/engine/repair-loop';
import type { ErrorLogEntry } from '@/types/fingerprint';
import type { ExerciseType } from '@/types/session';

function makeError(overrides: Partial<ErrorLogEntry> = {}): ErrorLogEntry {
  return {
    id: 'err-1',
    conceptId: 'v2-word-order',
    errorTag: 'word-order',
    exerciseType: 'translation-to-norwegian',
    wrong: 'Jeg går til skolen i dag.',
    correct: 'I dag går jeg til skolen.',
    timestamp: new Date().toISOString(),
    ...overrides,
  };
}

const EXERCISE_TYPES: ExerciseType[] = [
  'translation-to-norwegian',
  'translation-to-english',
  'sentence-transformation',
  'fill-in-blank',
  'word-order',
  'speed-round',
  'listening-comprehension',
  'dictation',
];

// ── buildRepairPlan ───────────────────────────────────────────────────────────

describe('buildRepairPlan', () => {
  it('retryExerciseType matches the original exercise type exactly', () => {
    for (const exerciseType of EXERCISE_TYPES) {
      const plan = buildRepairPlan(makeError({ exerciseType }));
      expect(plan.retryExerciseType).toBe(exerciseType);
    }
  });

  it('microDrillExerciseTypes are capped at 2', () => {
    const plan = buildRepairPlan(makeError());
    expect(plan.microDrillExerciseTypes.length).toBeLessThanOrEqual(2);
  });

  it('explanation is non-empty for known error tags', () => {
    const plan = buildRepairPlan(makeError({ errorTag: 'noun-gender' }));
    expect(plan.explanation.length).toBeGreaterThan(0);
  });

  it('explanation falls back for unknown / unspecified tags', () => {
    const plan = buildRepairPlan(makeError({ errorTag: 'unspecified' }));
    expect(plan.explanation.length).toBeGreaterThan(0);
  });

  it('reviewIntervalDays is a positive number', () => {
    const plan = buildRepairPlan(makeError());
    expect(plan.reviewIntervalDays).toBeGreaterThan(0);
  });
});

// ── makeRepairItems ───────────────────────────────────────────────────────────

describe('makeRepairItems', () => {
  const error = makeError({ sentenceId: 'sentence-abc' });
  const plan = buildRepairPlan(error);
  const sentenceIds = ['sentence-abc', 'sentence-xyz', 'sentence-pqr'];

  it('produces micro-drills followed by exactly one retry item', () => {
    const items = makeRepairItems(error, plan, sentenceIds);
    const drills = items.filter((i) => i.repairContext?.step === 'micro-drill');
    const retries = items.filter((i) => i.repairContext?.step === 'retry');
    expect(drills.length).toBeGreaterThanOrEqual(1);
    expect(retries.length).toBe(1);
  });

  it('retry item is the last in the returned array', () => {
    const items = makeRepairItems(error, plan, sentenceIds);
    expect(items[items.length - 1]?.repairContext?.step).toBe('retry');
  });

  it('all repair items have isRepairItem: true', () => {
    const items = makeRepairItems(error, plan, sentenceIds);
    for (const item of items) {
      expect(item.isRepairItem).toBe(true);
    }
  });

  it('retry item exercise type matches the original (same-type verification)', () => {
    const items = makeRepairItems(error, plan, sentenceIds);
    const retry = items.find((i) => i.repairContext?.step === 'retry');
    expect(retry?.exerciseType).toBe(error.exerciseType);
  });

  it('retry item uses sentenceId from error when available', () => {
    const items = makeRepairItems(error, plan, sentenceIds);
    const retry = items.find((i) => i.repairContext?.step === 'retry');
    // contentId should be the original sentence, not a random pool draw
    expect(retry?.contentId).toBe('sentence-abc');
  });

  it('retry item falls back to pool draw when sentenceId is absent', () => {
    const errorWithoutId = makeError({ sentenceId: undefined });
    const planForError = buildRepairPlan(errorWithoutId);
    const items = makeRepairItems(errorWithoutId, planForError, sentenceIds);
    const retry = items.find((i) => i.repairContext?.step === 'retry');
    // Should draw from pool — any of the provided sentenceIds is acceptable
    expect(sentenceIds.concat(['unknown'])).toContain(retry?.contentId);
  });

  it('produces items with valid conceptIds matching the error', () => {
    const items = makeRepairItems(error, plan, sentenceIds);
    for (const item of items) {
      expect(item.conceptIds).toContain(error.conceptId);
    }
  });
});
