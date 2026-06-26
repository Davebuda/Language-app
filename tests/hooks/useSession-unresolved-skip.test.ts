/**
 * S-05 guard — an item that resolves to NO content must surface an honest skip,
 * not an indefinite LoadingSkeleton, and skipping must write nothing (Rule 8).
 *
 * Setup: a single non-notebook, non-cloze item for a concept with no seeds, with
 * AI not ready (aiService.isReady() === false) and an empty sentence map. resolveItem
 * therefore produces no content. We assert the hook reports currentItemUnresolved,
 * and that skipUnresolvedItem advances the index WITHOUT touching the fingerprint.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import type { NotebookItem } from '@/types/notebook';
import type { SessionItem } from '@/types/session';

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
vi.mock('@/hooks/useNotebook', () => ({
  useNotebook: () => ({ items: [] as NotebookItem[], updateItem: updateNotebookItem }),
}));

vi.mock('@/ai', () => ({
  aiService: {
    init: vi.fn().mockResolvedValue(undefined),
    isReady: () => false, // no AI top-up → an empty seed pool stays empty
    generateContent: vi.fn().mockResolvedValue(null),
    explainMistake: vi.fn().mockResolvedValue({ source: 'template', text: '' }),
  },
}));

vi.mock('@/lib/events', () => ({ emitEvent: vi.fn() }));

import { useSession } from '@/hooks/useSession';
import { useSessionStore } from '@/stores/session-store';
import { useNotebookStore } from '@/stores/notebook-store';

function makeUnresolvableItem(overrides: Partial<SessionItem> = {}): SessionItem {
  return {
    id: 'item-x',
    exerciseType: 'translation-to-norwegian',
    contentId: 'sentence-x', // not notebook:, not a cloze-passage
    conceptIds: ['noun-gender'], // no seeds for it (empty sentence map)
    estimatedSeconds: 30,
    isRepairItem: false,
    purpose: 'new-material',
    selectionReason: 'new_material',
    ...overrides,
  };
}

beforeEach(() => {
  recordFingerprintResult.mockClear();
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
      items: [makeUnresolvableItem(), makeUnresolvableItem({ id: 'item-y' })],
      completedItemIds: [],
      level: 'A1',
    },
    currentItemIndex: 0,
    results: [],
    isInRepair: false,
    repairPlan: null,
  });
  useNotebookStore.setState({ items: [], status: 'ready' });
});

describe('useSession — unresolved item honest skip (S-05 / Rule 8)', () => {
  it('reports currentItemUnresolved (not infinite skeleton) when no content resolves', async () => {
    const { result } = renderHook(() => useSession());

    // The prefetch effect runs resolveItem asynchronously; wait for it to settle.
    await waitFor(() => expect(result.current.currentItemUnresolved).toBe(true));
    expect(result.current.currentContent).toBeUndefined();
    expect(result.current.currentCloze).toBeUndefined();
  });

  it('skipUnresolvedItem advances WITHOUT any fingerprint write', async () => {
    const { result } = renderHook(() => useSession());
    await waitFor(() => expect(result.current.currentItemUnresolved).toBe(true));

    act(() => {
      result.current.skipUnresolvedItem();
    });

    expect(useSessionStore.getState().currentItemIndex).toBe(1);
    expect(recordFingerprintResult).not.toHaveBeenCalled();
  });

  it('skipping the last item completes the session (index reaches item count)', async () => {
    useSessionStore.setState({
      session: { ...useSessionStore.getState().session!, items: [makeUnresolvableItem()] },
      currentItemIndex: 0,
    });
    const { result } = renderHook(() => useSession());
    await waitFor(() => expect(result.current.currentItemUnresolved).toBe(true));

    act(() => {
      result.current.skipUnresolvedItem();
    });

    expect(useSessionStore.getState().currentItemIndex).toBe(1); // >= items.length → complete
    expect(recordFingerprintResult).not.toHaveBeenCalled();
  });
});
