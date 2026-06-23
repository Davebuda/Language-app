'use client';

import { useCallback, useEffect, useRef } from 'react';
import type { User } from '@supabase/supabase-js';
import { useNotebookStore } from '@/stores/notebook-store';
import {
  saveNotebookItem,
  loadNotebookItems,
  deleteNotebookItem,
} from '@/storage/indexeddb';
import { createNotebookItem, type NotebookItem } from '@/types/notebook';
import { useAuth } from '@/hooks/useAuth';

// Reuse the SAME anon-id key + mechanism as useFingerprint so notebook items
// key to the identical userId as the fingerprint (auth user id when logged in,
// else the persisted anon UUID). Do NOT introduce a second anon-id key.
const ANON_ID_KEY = 'norsk-coach-anon-id';

function getOrCreateAnonId(): string {
  const stored = localStorage.getItem(ANON_ID_KEY);
  if (stored) return stored;
  const id = crypto.randomUUID();
  localStorage.setItem(ANON_ID_KEY, id);
  return id;
}

/**
 * Input for saveItem — everything createNotebookItem accepts EXCEPT id/userId,
 * which the hook stamps itself (id via crypto.randomUUID, userId via the same
 * resolution useFingerprint uses).
 */
type SaveItemInput = Omit<Parameters<typeof createNotebookItem>[0], 'id' | 'userId'>;

/**
 * Loads + persists the learner's notebook, IndexedDB-first and guest-capable.
 * Mirrors useFingerprint's bootstrap: resolves userId the same way (auth id or
 * the shared anon UUID), guards IndexedDB for SSR, and always writes IndexedDB
 * fire-and-forget. Supabase sync is a later phase (3F) — none here.
 */
export function useNotebook() {
  const { items, status, setItems, setStatus, upsertItem, removeItem: removeFromStore } =
    useNotebookStore();
  const { user, loading: authLoading } = useAuth();
  const prevUserRef = useRef<User | null>(null);
  const bootstrappingRef = useRef(false);

  useEffect(() => {
    if (authLoading) return;
    if (bootstrappingRef.current) return;

    async function bootstrap() {
      bootstrappingRef.current = true;
      // Resolve userId the SAME way useFingerprint does: auth id when logged in,
      // else the shared anon UUID. getOrCreateAnonId touches localStorage, so it
      // only runs inside this client-only effect (never on the server).
      const userId = user ? user.id : getOrCreateAnonId();
      const loaded = await loadNotebookItems(userId).catch(() => [] as NotebookItem[]);
      setItems(loaded);
      setStatus('ready');
    }

    bootstrap().finally(() => {
      bootstrappingRef.current = false;
    });
    prevUserRef.current = user;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, user?.id]);

  // Resolve the current userId outside the effect for the mutators. Guests use
  // the shared anon UUID; auth users use their id. Mirrors useFingerprint.
  const resolveUserId = useCallback((): string => {
    return user ? user.id : getOrCreateAnonId();
  }, [user]);

  const saveItem = useCallback(
    (input: SaveItemInput): NotebookItem => {
      const item = createNotebookItem({
        ...input,
        id: crypto.randomUUID(),
        userId: resolveUserId(),
      });
      upsertItem(item);
      saveNotebookItem(item).catch(console.warn);
      return item;
    },
    [resolveUserId, upsertItem],
  );

  const updateItem = useCallback(
    (id: string, patch: Partial<NotebookItem>): NotebookItem | null => {
      const existing = useNotebookStore.getState().items.find((i) => i.id === id);
      if (!existing) return null;
      const updated: NotebookItem = {
        ...existing,
        ...patch,
        updatedAt: new Date().toISOString(),
      };
      upsertItem(updated);
      saveNotebookItem(updated).catch(console.warn);
      return updated;
    },
    [upsertItem],
  );

  const removeItem = useCallback(
    (id: string): void => {
      removeFromStore(id);
      deleteNotebookItem(id).catch(console.warn);
    },
    [removeFromStore],
  );

  return { items, status, saveItem, updateItem, removeItem };
}
