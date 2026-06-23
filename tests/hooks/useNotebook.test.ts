/**
 * Tests for useNotebook (IndexedDB-first, guest-capable notebook hook).
 *
 * jsdom has NO IndexedDB and fake-indexeddb is not a dependency, so the real
 * IndexedDB layer is mocked via vi.mock('@/storage/indexeddb') — the same
 * isolation strategy recordExposure.test.ts uses for the fingerprint hook. We
 * assert the hook's STORE interaction (upsert/remove) AND that it calls the
 * IndexedDB persistence layer. useAuth is mocked so userId resolution is
 * deterministic without a Supabase client.
 *
 * What IS covered:
 *   - mount loads items by userId into the store and sets status 'ready'
 *   - saveItem builds an item (stamping userId + id), upserts the store, AND
 *     calls saveNotebookItem
 *   - updateItem merges patch + bumps updatedAt, upserts, AND persists
 *   - removeItem removes from the store AND calls deleteNotebookItem
 *   - guest path resolves the SAME 'norsk-coach-anon-id' key useFingerprint uses
 *
 * What is NOT covered (jsdom limitation): real IndexedDB round-trip / cross-reload
 * persistence — that requires fake-indexeddb (not a dep) or an integration env.
 *
 * Supabase sync (phase 3F) IS covered at the call-shape level: the @/lib/supabase/client
 * createClient is mocked with a chainable stub so we can assert (a) the GUEST path makes
 * ZERO Supabase calls (guest-safety), and (b) the AUTH path upserts on saveItem and the
 * bootstrap reconcile loads from Supabase. The real cross-device round-trip is integration.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import type { NotebookItem } from '@/types/notebook';

// ── Mocks ─────────────────────────────────────────────────────────────────────

const saveNotebookItem = vi.fn().mockResolvedValue(undefined);
const loadNotebookItems = vi.fn().mockResolvedValue([] as NotebookItem[]);
const deleteNotebookItem = vi.fn().mockResolvedValue(undefined);

vi.mock('@/storage/indexeddb', () => ({
  saveNotebookItem: (item: NotebookItem) => saveNotebookItem(item),
  loadNotebookItems: (userId: string) => loadNotebookItems(userId),
  deleteNotebookItem: (id: string) => deleteNotebookItem(id),
}));

// ── Supabase client mock ───────────────────────────────────────────────────────
// A chainable stub mirroring the postgrest builder shape the hook uses:
//   .from(table).upsert(...)
//   .from(table).delete().eq(col, val)
//   .from(table).select('data').eq('user_id', id)  -> awaited { data, error }
// The select chain is thenable so `await ...eq(...)` resolves to the configured
// remote rows. Each verb is its own spy so tests can assert call shape.
const sbUpsert = vi.fn().mockResolvedValue({ error: null });
const sbDeleteEq = vi.fn().mockResolvedValue({ error: null });
const sbDelete = vi.fn(() => ({ eq: sbDeleteEq }));
// Default: no remote rows. Tests can override via setRemoteRows().
let remoteRows: { data: NotebookItem }[] = [];
const sbSelectEq = vi.fn(() =>
  Promise.resolve({ data: remoteRows, error: null }),
);
const sbSelect = vi.fn(() => ({ eq: sbSelectEq }));
const sbFrom = vi.fn(() => ({
  upsert: sbUpsert,
  delete: sbDelete,
  select: sbSelect,
}));
const createClient = vi.fn(() => ({ from: sbFrom }));

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => createClient(),
}));

function setRemoteRows(items: NotebookItem[]): void {
  remoteRows = items.map((data) => ({ data }));
}

// Mutable auth state so individual tests can flip between guest and auth user.
let mockAuth: { user: { id: string } | null; loading: boolean } = {
  user: null,
  loading: false,
};

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => mockAuth,
}));

// Import AFTER the mocks are registered.
import { useNotebook } from '@/hooks/useNotebook';
import { useNotebookStore } from '@/stores/notebook-store';

const ANON_ID_KEY = 'norsk-coach-anon-id';

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

beforeEach(() => {
  saveNotebookItem.mockClear();
  loadNotebookItems.mockClear();
  loadNotebookItems.mockResolvedValue([] as NotebookItem[]);
  deleteNotebookItem.mockClear();
  sbUpsert.mockClear();
  sbDelete.mockClear();
  sbDeleteEq.mockClear();
  sbSelect.mockClear();
  sbSelectEq.mockClear();
  sbFrom.mockClear();
  createClient.mockClear();
  remoteRows = [];
  mockAuth = { user: null, loading: false };
  localStorage.clear();
  useNotebookStore.setState({ items: [], status: 'loading' });
});

describe('useNotebook — bootstrap', () => {
  it('loads items for the resolved userId and sets status ready', async () => {
    const preloaded = [makeItem('a'), makeItem('b')];
    loadNotebookItems.mockResolvedValue(preloaded);

    const { result } = renderHook(() => useNotebook());

    await waitFor(() => expect(result.current.status).toBe('ready'));
    expect(loadNotebookItems).toHaveBeenCalledTimes(1);
    expect(useNotebookStore.getState().items).toEqual(preloaded);
  });

  it('resolves the guest userId from the shared norsk-coach-anon-id key', async () => {
    renderHook(() => useNotebook());

    await waitFor(() => expect(loadNotebookItems).toHaveBeenCalled());
    const anonId = localStorage.getItem(ANON_ID_KEY);
    expect(anonId).toBeTruthy();
    // The hook keyed the load to the same anon id it wrote to localStorage.
    expect(loadNotebookItems).toHaveBeenCalledWith(anonId);
  });

  it('reuses an existing anon id rather than minting a new one', async () => {
    localStorage.setItem(ANON_ID_KEY, 'existing-anon');
    renderHook(() => useNotebook());

    await waitFor(() => expect(loadNotebookItems).toHaveBeenCalled());
    expect(loadNotebookItems).toHaveBeenCalledWith('existing-anon');
    expect(localStorage.getItem(ANON_ID_KEY)).toBe('existing-anon');
  });

  it('uses the auth user id when logged in (not the anon key)', async () => {
    mockAuth = { user: { id: 'auth-user-9' }, loading: false };
    renderHook(() => useNotebook());

    await waitFor(() => expect(loadNotebookItems).toHaveBeenCalled());
    expect(loadNotebookItems).toHaveBeenCalledWith('auth-user-9');
  });

  it('does not load while auth is still loading', async () => {
    mockAuth = { user: null, loading: true };
    renderHook(() => useNotebook());
    // Give any effect a tick; nothing should fire.
    await Promise.resolve();
    expect(loadNotebookItems).not.toHaveBeenCalled();
  });
});

describe('useNotebook — saveItem', () => {
  it('upserts the built item into the store AND persists to IndexedDB', async () => {
    const { result } = renderHook(() => useNotebook());
    await waitFor(() => expect(result.current.status).toBe('ready'));

    let created!: NotebookItem;
    act(() => {
      created = result.current.saveItem({
        type: 'word',
        norwegian: 'katt',
        english: 'cat',
        source: 'reading',
      });
    });

    // Store upsert
    const stored = useNotebookStore.getState().items;
    expect(stored).toHaveLength(1);
    expect(stored[0].id).toBe(created.id);
    expect(stored[0].norwegian).toBe('katt');

    // IndexedDB persistence with the SAME item
    expect(saveNotebookItem).toHaveBeenCalledTimes(1);
    expect(saveNotebookItem).toHaveBeenCalledWith(created);
  });

  it('stamps the resolved userId onto the created item', async () => {
    localStorage.setItem(ANON_ID_KEY, 'guest-42');
    const { result } = renderHook(() => useNotebook());
    await waitFor(() => expect(result.current.status).toBe('ready'));

    let created!: NotebookItem;
    act(() => {
      created = result.current.saveItem({ type: 'phrase', norwegian: 'god morgen', source: 'manual' });
    });

    expect(created.userId).toBe('guest-42');
    expect(created.id).toBeTruthy();
  });
});

describe('useNotebook — updateItem', () => {
  it('merges the patch, bumps updatedAt, upserts the store, and persists', async () => {
    // Seed via the load path so the bootstrap effect populates (not overwrites) the store.
    loadNotebookItems.mockResolvedValue([
      makeItem('x', { norwegian: 'bil', updatedAt: '2020-01-01T00:00:00.000Z' }),
    ]);
    const { result } = renderHook(() => useNotebook());
    await waitFor(() => expect(useNotebookStore.getState().items).toHaveLength(1));

    let updated: NotebookItem | null = null;
    act(() => {
      updated = result.current.updateItem('x', { norwegian: 'bilen', reviewStatus: 'learning' });
    });

    expect(updated).not.toBeNull();
    const stored = useNotebookStore.getState().items.find((i) => i.id === 'x');
    expect(stored?.norwegian).toBe('bilen');
    expect(stored?.reviewStatus).toBe('learning');
    expect(stored?.updatedAt).not.toBe('2020-01-01T00:00:00.000Z');
    expect(saveNotebookItem).toHaveBeenCalledTimes(1);
  });

  it('returns null and persists nothing for an unknown id', async () => {
    const { result } = renderHook(() => useNotebook());
    await waitFor(() => expect(result.current.status).toBe('ready'));

    let updated: NotebookItem | null = makeItem('placeholder');
    act(() => {
      updated = result.current.updateItem('missing', { norwegian: 'x' });
    });

    expect(updated).toBeNull();
    expect(saveNotebookItem).not.toHaveBeenCalled();
  });
});

describe('useNotebook — removeItem', () => {
  it('removes from the store AND calls deleteNotebookItem', async () => {
    loadNotebookItems.mockResolvedValue([makeItem('a'), makeItem('b')]);
    const { result } = renderHook(() => useNotebook());
    await waitFor(() => expect(useNotebookStore.getState().items).toHaveLength(2));

    act(() => {
      result.current.removeItem('a');
    });

    const ids = useNotebookStore.getState().items.map((i) => i.id);
    expect(ids).toEqual(['b']);
    expect(deleteNotebookItem).toHaveBeenCalledWith('a');
  });
});

describe('useNotebook — Supabase sync (phase 3F)', () => {
  it('GUEST path makes ZERO Supabase calls (guest-safety)', async () => {
    // No auth user; mockAuth defaults to guest in beforeEach.
    loadNotebookItems.mockResolvedValue([makeItem('a')]);
    const { result } = renderHook(() => useNotebook());
    await waitFor(() => expect(result.current.status).toBe('ready'));

    // Mutate as a guest — still nothing should touch Supabase.
    act(() => {
      const created = result.current.saveItem({ type: 'word', norwegian: 'katt', source: 'manual' });
      result.current.updateItem(created.id, { reviewStatus: 'learning' });
      result.current.removeItem(created.id);
    });

    // Give any fire-and-forget mirror a tick to (not) fire.
    await Promise.resolve();

    expect(createClient).not.toHaveBeenCalled();
    expect(sbFrom).not.toHaveBeenCalled();
    expect(sbUpsert).not.toHaveBeenCalled();
    expect(sbDeleteEq).not.toHaveBeenCalled();
    expect(sbSelectEq).not.toHaveBeenCalled();
  });

  it('AUTH path upserts to Supabase on saveItem', async () => {
    mockAuth = { user: { id: 'auth-user-1' }, loading: false };
    const { result } = renderHook(() => useNotebook());
    await waitFor(() => expect(result.current.status).toBe('ready'));
    sbUpsert.mockClear(); // ignore any bootstrap pushes; assert the saveItem mirror

    let created!: NotebookItem;
    act(() => {
      created = result.current.saveItem({ type: 'word', norwegian: 'katt', source: 'manual' });
    });
    await waitFor(() => expect(sbUpsert).toHaveBeenCalled());

    expect(sbFrom).toHaveBeenCalledWith('learner_notebook');
    const [payload, options] = sbUpsert.mock.calls[0];
    expect(payload.id).toBe(created.id);
    expect(payload.user_id).toBe('auth-user-1');
    expect(payload.data).toEqual(created);
    expect(options).toEqual({ onConflict: 'id' });
  });

  it('AUTH bootstrap reconcile loads from Supabase and merges by newer updatedAt', async () => {
    mockAuth = { user: { id: 'auth-user-2' }, loading: false };
    // Local has an older copy of x and a local-only y; remote has a newer x and a remote-only z.
    loadNotebookItems.mockResolvedValue([
      makeItem('x', { norwegian: 'gammel', updatedAt: '2020-01-01T00:00:00.000Z' }),
      makeItem('y', { norwegian: 'lokal', updatedAt: '2026-01-01T00:00:00.000Z' }),
    ]);
    setRemoteRows([
      makeItem('x', { norwegian: 'ny', updatedAt: '2026-06-01T00:00:00.000Z' }),
      makeItem('z', { norwegian: 'fjern', updatedAt: '2026-01-01T00:00:00.000Z' }),
    ]);

    const { result } = renderHook(() => useNotebook());
    await waitFor(() => expect(result.current.status).toBe('ready'));

    // The reconcile loaded the remote notebook for the user.
    expect(sbSelect).toHaveBeenCalledWith('data');
    expect(sbSelectEq).toHaveBeenCalledWith('user_id', 'auth-user-2');

    // Merge: newer remote x wins, local-only y kept, remote-only z kept.
    const byId = new Map(useNotebookStore.getState().items.map((i) => [i.id, i]));
    expect(byId.get('x')?.norwegian).toBe('ny');
    expect(byId.get('y')?.norwegian).toBe('lokal');
    expect(byId.get('z')?.norwegian).toBe('fjern');
  });
});
