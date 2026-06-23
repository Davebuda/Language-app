import { describe, it, expect, beforeEach } from 'vitest';
import { useNotebookStore } from '@/stores/notebook-store';
import type { NotebookItem } from '@/types/notebook';

function makeItem(id: string, overrides: Partial<NotebookItem> = {}): NotebookItem {
  return {
    id,
    userId: 'user-1',
    type: 'word',
    norwegian: 'hund',
    source: 'manual',
    tags: [],
    reviewStatus: 'new',
    verified: false,
    promoted: false,
    srsLevel: 0,
    nextReviewAt: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('useNotebookStore', () => {
  beforeEach(() => {
    useNotebookStore.setState({ items: [], status: 'loading' });
  });

  it('setItems replaces all items', () => {
    const items = [makeItem('a'), makeItem('b')];
    useNotebookStore.getState().setItems(items);
    expect(useNotebookStore.getState().items).toEqual(items);
  });

  it('setStatus updates status', () => {
    useNotebookStore.getState().setStatus('ready');
    expect(useNotebookStore.getState().status).toBe('ready');
  });

  it('upsertItem adds a new item when id is not present', () => {
    const item = makeItem('new-1');
    useNotebookStore.getState().upsertItem(item);
    expect(useNotebookStore.getState().items).toHaveLength(1);
    expect(useNotebookStore.getState().items[0]).toEqual(item);
  });

  it('upsertItem replaces an existing item by id', () => {
    const original = makeItem('x', { norwegian: 'bil' });
    useNotebookStore.getState().setItems([original]);

    const updated = makeItem('x', { norwegian: 'bilen' });
    useNotebookStore.getState().upsertItem(updated);

    const state = useNotebookStore.getState();
    expect(state.items).toHaveLength(1);
    expect(state.items[0].norwegian).toBe('bilen');
  });

  it('upsertItem preserves other items when replacing', () => {
    useNotebookStore.getState().setItems([makeItem('a'), makeItem('b'), makeItem('c')]);
    useNotebookStore.getState().upsertItem(makeItem('b', { norwegian: 'updated' }));

    const { items } = useNotebookStore.getState();
    expect(items).toHaveLength(3);
    expect(items.find((i) => i.id === 'b')?.norwegian).toBe('updated');
  });

  it('removeItem removes the item with the given id', () => {
    useNotebookStore.getState().setItems([makeItem('a'), makeItem('b')]);
    useNotebookStore.getState().removeItem('a');

    const { items } = useNotebookStore.getState();
    expect(items).toHaveLength(1);
    expect(items[0].id).toBe('b');
  });

  it('removeItem is a no-op when id is not found', () => {
    useNotebookStore.getState().setItems([makeItem('a')]);
    useNotebookStore.getState().removeItem('nonexistent');
    expect(useNotebookStore.getState().items).toHaveLength(1);
  });
});
