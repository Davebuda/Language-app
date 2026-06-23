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
 * Migrate notebook items saved under the prior anon id over to the now-authed
 * user id, mirroring useFingerprint.migrateAnonFingerprintToUser. A guest saves
 * items keyed by the anon UUID; on login the bootstrap would otherwise load
 * loadNotebookItems(user.id) (empty) and orphan the guest notebook.
 *
 * CRITICAL ordering: the prior anon id MUST be captured before useFingerprint
 * clobbers ANON_ID_KEY with user.id (it does `localStorage.setItem(ANON_ID_KEY,
 * user.id)` at the end of its own migration). The caller reads ANON_ID_KEY
 * SYNCHRONOUSLY at the top of the bootstrap effect — before any `await` — so it
 * sees the prior anon id regardless of which hook's effect runs first. If the
 * key already equals user.id (already-clobbered / not a guest transition / no
 * items), this is a no-op, so it is idempotent and never double-migrates.
 *
 * Returns the re-keyed items so the caller can seed the store directly without
 * a second IndexedDB read.
 */
export async function migrateAnonNotebookToUser(
  priorAnonId: string | null,
  userId: string,
): Promise<NotebookItem[] | null> {
  if (!priorAnonId || priorAnonId === userId) return null;
  const anonItems = await loadNotebookItems(priorAnonId).catch(() => [] as NotebookItem[]);
  if (anonItems.length === 0) return null;
  const rekeyed = anonItems.map((item) => ({ ...item, userId }));
  // Persist each re-keyed item under the user id (fire-and-forget mirror of the
  // store update). saveNotebookItem upserts by item.id, so re-running is safe.
  await Promise.all(rekeyed.map((item) => saveNotebookItem(item).catch(() => {})));
  return rekeyed;
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

    // Capture the prior anon id SYNCHRONOUSLY, before any await — useFingerprint
    // rewrites ANON_ID_KEY to user.id at the end of its own migration, so reading
    // it later could return the clobbered value. Reading here, before yielding,
    // mirrors how useFingerprint captures the prior id pre-migration.
    const priorAnonId =
      user && prevUserRef.current === null ? localStorage.getItem(ANON_ID_KEY) : null;

    async function bootstrap() {
      bootstrappingRef.current = true;
      // Resolve userId the SAME way useFingerprint does: auth id when logged in,
      // else the shared anon UUID. getOrCreateAnonId touches localStorage, so it
      // only runs inside this client-only effect (never on the server).
      const userId = user ? user.id : getOrCreateAnonId();

      // First transition guest → authed: migrate the guest notebook (saved under
      // the prior anon id) over to the user id before loading. Idempotent.
      if (user && prevUserRef.current === null) {
        const migrated = await migrateAnonNotebookToUser(priorAnonId, userId).catch(
          () => null,
        );
        if (migrated) {
          // Union the migrated items with any already saved under the user id, so
          // a partial prior migration doesn't drop either set (dedup by id).
          const existing = await loadNotebookItems(userId).catch(
            () => [] as NotebookItem[],
          );
          const byId = new Map<string, NotebookItem>();
          for (const item of existing) byId.set(item.id, item);
          for (const item of migrated) byId.set(item.id, item);
          setItems([...byId.values()]);
          setStatus('ready');
          return;
        }
      }

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
