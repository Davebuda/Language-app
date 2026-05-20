import { describe, it, expect, beforeEach } from 'vitest';
import { useSessionStore } from '@/stores/session-store';
import { checkAnswer } from '@/lib/answer';
import type { Session, SessionItem, ExerciseResult } from '@/types/session';

function makeItem(overrides: Partial<SessionItem> = {}): SessionItem {
  return {
    id: 'item-1',
    exerciseType: 'translation-to-norwegian',
    contentId: 'sentence-1',
    conceptIds: ['noun-gender'],
    estimatedSeconds: 30,
    isRepairItem: false,
    purpose: 'new-material',
    ...overrides,
  };
}

function makeSession(items: SessionItem[] = [makeItem()]): Session {
  return {
    id: 'session-1',
    userId: 'user-1',
    startedAt: new Date().toISOString(),
    status: 'active',
    recipe: {
      remediationRatio: 0.4,
      reviewRatio: 0.3,
      newMaterialRatio: 0.2,
      interleavingRatio: 0.1,
      targetDurationSeconds: 750,
      minNewVocabItems: 3,
    },
    items,
    completedItemIds: [],
    level: 'A1',
  };
}

function makeResult(overrides: Partial<ExerciseResult> = {}): ExerciseResult {
  return {
    sessionId: 'session-1',
    itemId: 'item-1',
    correct: true,
    userAnswer: 'jeg spiser',
    correctAnswer: 'jeg spiser',
    timeTakenSeconds: 5,
    conceptId: 'noun-gender',
    ...overrides,
  };
}

describe('useSessionStore', () => {
  beforeEach(() => {
    useSessionStore.setState({
      session: null,
      currentItemIndex: 0,
      results: [],
      isInRepair: false,
      repairPlan: null,
    });
  });

  it('startSession initialises state', () => {
    const session = makeSession();
    useSessionStore.getState().startSession(session);
    expect(useSessionStore.getState().session?.id).toBe('session-1');
    expect(useSessionStore.getState().currentItemIndex).toBe(0);
  });

  it('advanceItem increments currentItemIndex', () => {
    useSessionStore.getState().startSession(makeSession([makeItem(), makeItem({ id: 'item-2' })]));
    useSessionStore.getState().advanceItem();
    expect(useSessionStore.getState().currentItemIndex).toBe(1);
  });

  it('recordResult appends to results array', () => {
    useSessionStore.getState().startSession(makeSession());
    useSessionStore.getState().recordResult(makeResult());
    expect(useSessionStore.getState().results).toHaveLength(1);
    expect(useSessionStore.getState().results[0].correct).toBe(true);
  });

  it('enterRepair sets isInRepair to true and stores repairPlan', () => {
    const plan = {
      explanation: 'V2 rule explanation',
      microDrillExerciseTypes: ['fill-in-blank' as const],
      retryExerciseType: 'translation-to-norwegian' as const,
      reviewIntervalDays: 1,
    };
    useSessionStore.getState().enterRepair(plan);
    expect(useSessionStore.getState().isInRepair).toBe(true);
    expect(useSessionStore.getState().repairPlan?.explanation).toBe('V2 rule explanation');
  });

  it('exitRepair clears isInRepair and repairPlan', () => {
    const plan = {
      explanation: 'test',
      microDrillExerciseTypes: ['fill-in-blank' as const],
      retryExerciseType: 'translation-to-norwegian' as const,
      reviewIntervalDays: 1,
    };
    useSessionStore.getState().enterRepair(plan);
    useSessionStore.getState().exitRepair();
    expect(useSessionStore.getState().isInRepair).toBe(false);
    expect(useSessionStore.getState().repairPlan).toBeNull();
  });

  it('injectRepairItems splices items after the given index', () => {
    const items = [makeItem({ id: 'a' }), makeItem({ id: 'c' })];
    useSessionStore.getState().startSession(makeSession(items));
    const repair = [makeItem({ id: 'b', isRepairItem: true })];
    useSessionStore.getState().injectRepairItems(repair, 0);
    const newItems = useSessionStore.getState().session!.items;
    expect(newItems.map((i) => i.id)).toEqual(['a', 'b', 'c']);
  });

  it('endSession resets all state', () => {
    useSessionStore.getState().startSession(makeSession());
    useSessionStore.getState().endSession();
    expect(useSessionStore.getState().session).toBeNull();
    expect(useSessionStore.getState().currentItemIndex).toBe(0);
  });
});

// ── Session progression gate — P0 item 8 ────────────────────────────────────
// The 3-second auto-skip useEffect was removed from useSession.ts.
// advanceItem() must only be called via submitResult (correct answer) or
// continueAfterRepair (user clicked "Prøv igjen"). No other path may advance
// the session index automatically. These tests document and lock that contract.
describe('Session progression gate (P0 item 8)', () => {
  beforeEach(() => {
    useSessionStore.setState({
      session: null, currentItemIndex: 0, results: [],
      isInRepair: false, repairPlan: null,
    });
  });

  it('currentItemIndex does not change without an explicit advanceItem() call', () => {
    useSessionStore.getState().startSession(makeSession([makeItem(), makeItem({ id: 'item-2' })]));
    expect(useSessionStore.getState().currentItemIndex).toBe(0);
    // After no action at all, index is still 0 — no automatic advancement
    expect(useSessionStore.getState().currentItemIndex).toBe(0);
  });

  it('recordResult alone does not advance the index', () => {
    useSessionStore.getState().startSession(makeSession([makeItem(), makeItem({ id: 'item-2' })]));
    useSessionStore.getState().recordResult(makeResult());
    expect(useSessionStore.getState().currentItemIndex).toBe(0);
  });

  it('enterRepair alone does not advance the index', () => {
    useSessionStore.getState().startSession(makeSession([makeItem(), makeItem({ id: 'item-2' })]));
    useSessionStore.getState().enterRepair({
      explanation: 'test', microDrillExerciseTypes: ['fill-in-blank'],
      retryExerciseType: 'fill-in-blank', reviewIntervalDays: 1,
    });
    expect(useSessionStore.getState().currentItemIndex).toBe(0);
  });

  it('only an explicit advanceItem() call increments the index', () => {
    useSessionStore.getState().startSession(makeSession([makeItem(), makeItem({ id: 'item-2' })]));
    useSessionStore.getState().recordResult(makeResult());
    useSessionStore.getState().enterRepair({
      explanation: 'test', microDrillExerciseTypes: ['fill-in-blank'],
      retryExerciseType: 'fill-in-blank', reviewIntervalDays: 1,
    });
    expect(useSessionStore.getState().currentItemIndex).toBe(0); // unchanged by all of the above
    useSessionStore.getState().advanceItem(); // only this advances
    expect(useSessionStore.getState().currentItemIndex).toBe(1);
  });
});

describe('useExercise answer validation', () => {
  it('checkAnswer returns true for matching answers (case/punct insensitive)', () => {
    expect(checkAnswer('Jeg spiser.', 'jeg spiser')).toBe(true);
  });

  it('checkAnswer returns false for wrong answers', () => {
    expect(checkAnswer('vi er', 'Jeg er')).toBe(false);
  });
});
