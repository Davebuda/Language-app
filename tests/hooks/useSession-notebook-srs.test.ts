/**
 * Rule-8 / T1.6 guard for notebook-practice grading in useSession.
 *
 * A notebook_practice SessionItem (contentId `notebook:<id>`, selectionReason
 * 'notebook_practice') must advance ONLY the saved item's own SRS via the
 * notebook hook — it must NEVER reach recordFingerprintResult / conceptMastery.
 * This locks "no unverified AI/saved item moves mastery".
 *
 * Strategy: mock both collaborators at the hook boundary so we can assert which
 * write path fires. useFingerprint.recordResult is a spy (the fingerprint path);
 * useNotebook.updateItem is a spy (the notebook-SRS path). We drive a real
 * submitResult through the live session store and assert exactly one path runs.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import type { NotebookItem } from '@/types/notebook';
import type { SessionItem, ExerciseResult } from '@/types/session';
import { advanceNotebookSrs } from '@/lib/srs';

// ── Mocks ─────────────────────────────────────────────────────────────────────

const recordFingerprintResult = vi.fn();
const ensureWeekOpenAndPersist = vi.fn();
const recordSpeakingProduction = vi.fn();

vi.mock('@/hooks/useFingerprint', () => ({
  useFingerprint: () => ({
    recordResult: recordFingerprintResult,
    ensureWeekOpenAndPersist,
    recordSpeakingProduction,
  }),
}));

const updateNotebookItem = vi.fn();

// notebookItems is read by useSession only for startNewSession; submitResult reads
// the live notebook store directly. We expose a stable empty list + the spy.
vi.mock('@/hooks/useNotebook', () => ({
  useNotebook: () => ({ items: [] as NotebookItem[], updateItem: updateNotebookItem }),
}));

// aiService is touched on startNewSession/repair only — stub the surface used.
vi.mock('@/ai', () => ({
  aiService: {
    init: vi.fn().mockResolvedValue(undefined),
    isReady: () => false,
    generateContent: vi.fn().mockResolvedValue(null),
    explainMistake: vi.fn().mockResolvedValue({ source: 'template', text: '' }),
  },
}));

vi.mock('@/lib/events', () => ({ emitEvent: vi.fn() }));

// Import AFTER mocks are registered.
import { useSession } from '@/hooks/useSession';
import { useSessionStore } from '@/stores/session-store';
import { useNotebookStore } from '@/stores/notebook-store';

function makeNotebookItem(overrides: Partial<NotebookItem> = {}): NotebookItem {
  return {
    id: 'nb-1',
    userId: 'user-1',
    type: 'sentence',
    norwegian: 'Jeg liker kaffe',
    english: 'I like coffee',
    source: 'manual',
    tags: [],
    reviewStatus: 'new',
    verified: false,
    promoted: true,
    srsLevel: 0,
    nextReviewAt: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

function makeNotebookSessionItem(overrides: Partial<SessionItem> = {}): SessionItem {
  return {
    id: 'item-1',
    exerciseType: 'translation-to-norwegian',
    contentId: 'notebook:nb-1',
    conceptIds: [],
    estimatedSeconds: 30,
    isRepairItem: false,
    purpose: 'new-material',
    selectionReason: 'notebook_practice',
    ...overrides,
  };
}

function makeResult(overrides: Partial<ExerciseResult> = {}): ExerciseResult {
  return {
    sessionId: 'session-1',
    itemId: 'item-1',
    correct: true,
    userAnswer: 'Jeg liker kaffe',
    correctAnswer: 'Jeg liker kaffe',
    timeTakenSeconds: 5,
    conceptId: '',
    ...overrides,
  };
}

beforeEach(() => {
  recordFingerprintResult.mockClear();
  updateNotebookItem.mockClear();
  useSessionStore.setState({
    session: {
      id: 'session-1',
      userId: 'user-1',
      startedAt: '2026-01-01T00:00:00.000Z',
      status: 'active',
      recipe: {
        remediationRatio: 0.4,
        reviewRatio: 0.3,
        newMaterialRatio: 0.2,
        interleavingRatio: 0.1,
        targetDurationSeconds: 750,
        minNewVocabItems: 3,
      },
      items: [makeNotebookSessionItem()],
      completedItemIds: [],
      level: 'A1',
    },
    currentItemIndex: 0,
    results: [],
    isInRepair: false,
    repairPlan: null,
  });
  useNotebookStore.setState({ items: [makeNotebookItem()], status: 'ready' });
});

describe('useSession — notebook_practice grading (Rule 8 / T1.6)', () => {
  it('a CORRECT notebook_practice result advances notebook SRS and NEVER the fingerprint', () => {
    const { result } = renderHook(() => useSession());

    act(() => {
      result.current.submitResult(makeResult({ correct: true }));
    });

    // Notebook SRS advanced via the notebook hook with the correct id. We assert
    // the SRS level stepped up (0 → 1) + a review date was scheduled; the exact
    // nextReviewAt millisecond is clock-dependent so we don't pin it byte-for-byte.
    expect(updateNotebookItem).toHaveBeenCalledTimes(1);
    const [calledId, calledPatch] = updateNotebookItem.mock.calls[0] as [
      string,
      { srsLevel: number; nextReviewAt: string | null },
    ];
    expect(calledId).toBe('nb-1');
    expect(calledPatch.srsLevel).toBe(1);
    expect(typeof calledPatch.nextReviewAt).toBe('string');
    // Sanity: matches advanceNotebookSrs's level math for a correct answer.
    expect(calledPatch.srsLevel).toBe(
      advanceNotebookSrs({ srsLevel: 0, nextReviewAt: null }, true).srsLevel,
    );

    // conceptMastery / diagnosis fingerprint path must be untouched.
    expect(recordFingerprintResult).not.toHaveBeenCalled();
  });

  it('a WRONG notebook_practice result resets notebook SRS and NEVER the fingerprint', () => {
    const { result } = renderHook(() => useSession());

    act(() => {
      result.current.submitResult(makeResult({ correct: false, errorTag: 'word-order' }));
    });

    expect(updateNotebookItem).toHaveBeenCalledTimes(1);
    expect(updateNotebookItem).toHaveBeenCalledWith(
      'nb-1',
      advanceNotebookSrs({ srsLevel: 0, nextReviewAt: null }, false),
    );
    expect(recordFingerprintResult).not.toHaveBeenCalled();
  });

  it('a normal (non-notebook) result still records to the fingerprint and not the notebook', () => {
    useSessionStore.setState({
      session: {
        ...useSessionStore.getState().session!,
        items: [
          makeNotebookSessionItem({
            contentId: 'sentence-1',
            selectionReason: 'new_material',
            conceptIds: ['noun-gender'],
          }),
        ],
      },
    });

    const { result } = renderHook(() => useSession());

    act(() => {
      result.current.submitResult(makeResult({ correct: true, conceptId: 'noun-gender' }));
    });

    expect(recordFingerprintResult).toHaveBeenCalledTimes(1);
    expect(updateNotebookItem).not.toHaveBeenCalled();
  });
});
