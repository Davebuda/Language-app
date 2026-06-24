'use client';

import { useCallback, useEffect, useRef } from 'react';
import type { User } from '@supabase/supabase-js';
import { useNotebookStore } from '@/stores/notebook-store';
import {
  saveNotebookItem,
  loadNotebookItems,
  deleteNotebookItem,
} from '@/storage/indexeddb';
import { createNotebookItem, normalizeNotebookItem, type NotebookItem } from '@/types/notebook';
import { useAuth } from '@/hooks/useAuth';
import { createClient } from '@/lib/supabase/client';
import { useToastStore } from '@/stores/toast-store';

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

// ── Supabase sync (Phase 3F) ────────────────────────────────────────────────
// Cross-device mirror of the notebook, mirroring useFingerprint's pattern. The
// `learner_notebook` table is ROW-PER-ITEM (one row per NotebookItem) with RLS
// "auth.uid() = user_id". Every call site is GUEST-SAFE — gated by `if (user)`
// — so guests never touch Supabase. IndexedDB stays the offline-first source of
// truth; these are fire-and-forget mirrors at the call sites.

async function saveNotebookItemToSupabase(item: NotebookItem): Promise<void> {
  const supabase = createClient();
  await supabase.from('learner_notebook').upsert(
    { id: item.id, user_id: item.userId, data: item, updated_at: new Date().toISOString() },
    { onConflict: 'id' },
  );
}

async function deleteNotebookItemFromSupabase(id: string): Promise<void> {
  const supabase = createClient();
  await supabase.from('learner_notebook').delete().eq('id', id);
}

async function loadNotebookFromSupabase(userId: string): Promise<NotebookItem[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('learner_notebook')
    .select('data')
    .eq('user_id', userId);
  if (error || !data) return [];
  // Each row's `data` is the jsonb blob (the full NotebookItem). Normalize it the
  // same way the IndexedDB load path does so a legacy remote item missing a field
  // added since it was synced can't reach render unbackfilled.
  return data.map((row: { data: NotebookItem }) => normalizeNotebookItem(row.data));
}

/**
 * Merge local + remote notebook items by id, "newer updatedAt wins". Used during
 * the auth bootstrap reconcile so an item edited on another device converges.
 * Returns the merged set plus the ids that are local-only or locally-newer (the
 * ones to push back up to Supabase so remote catches up).
 */
function mergeNotebooks(
  local: NotebookItem[],
  remote: NotebookItem[],
): { merged: NotebookItem[]; toPush: NotebookItem[] } {
  const remoteById = new Map<string, NotebookItem>();
  for (const item of remote) remoteById.set(item.id, item);

  const merged = new Map<string, NotebookItem>();
  const toPush: NotebookItem[] = [];

  for (const item of local) {
    const r = remoteById.get(item.id);
    if (!r) {
      // Local-only — keep it and push it up.
      merged.set(item.id, item);
      toPush.push(item);
    } else if (item.updatedAt >= r.updatedAt) {
      // Local is newer-or-equal — local wins; push it up so remote converges.
      merged.set(item.id, item);
      if (item.updatedAt > r.updatedAt) toPush.push(item);
    } else {
      // Remote is newer — remote wins; no push needed.
      merged.set(item.id, r);
    }
  }
  // Remote-only items: remote wins, nothing to push.
  for (const r of remote) {
    if (!merged.has(r.id)) merged.set(r.id, r);
  }

  return { merged: [...merged.values()], toPush };
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
          const unioned = [...byId.values()];
          setItems(unioned);
          setStatus('ready');
          // The migrated items are now the user's — push them up to Supabase so
          // remote owns them too (fire-and-forget; guest path never reaches here).
          for (const item of unioned) {
            saveNotebookItemToSupabase(item).catch(console.warn);
          }
          return;
        }
      }

      const loaded = await loadNotebookItems(userId).catch(() => [] as NotebookItem[]);

      // Auth users: reconcile the local set against Supabase so edits on another
      // device converge. Guests stay local-only (no Supabase call). Merge by id,
      // newer updatedAt wins, persist the merged set back to IndexedDB (local
      // catches up), and push local-only / locally-newer items up (remote catches
      // up). All Supabase work is fire-and-forget so a network blip can't block
      // the offline-first IndexedDB read.
      if (user) {
        const remote = await loadNotebookFromSupabase(userId).catch(
          () => [] as NotebookItem[],
        );
        const { merged, toPush } = mergeNotebooks(loaded, remote);
        setItems(merged);
        setStatus('ready');
        // Persist the merged set back to IndexedDB so local catches up to remote.
        for (const item of merged) {
          saveNotebookItem(item).catch(console.warn);
        }
        // Push the items remote is missing or has an older copy of.
        for (const item of toPush) {
          saveNotebookItemToSupabase(item).catch(console.warn);
        }
        return;
      }

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
      // IndexedDB write is the offline-first source of truth and always runs.
      saveNotebookItem(item).catch(console.warn);
      // Auth users also mirror to Supabase (fire-and-forget); guests stay local.
      if (user) saveNotebookItemToSupabase(item).catch(console.warn);
      // Make the otherwise-silent save VISIBLE (the engine made felt). Copy is
      // HONEST (Rule 8): only an item that is ACTUALLY promoted may claim it
      // "kommer tilbake i økta"; a plain save is just "lagret i notatboka". A
      // save promoted at create-time can come back; otherwise default honest.
      useToastStore.getState().showToast(
        item.promoted
          ? `«${item.norwegian}» kommer tilbake i økta`
          : `«${item.norwegian}» lagret i notatboka`,
      );
      return item;
    },
    [resolveUserId, upsertItem, user],
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
      if (user) saveNotebookItemToSupabase(updated).catch(console.warn);
      return updated;
    },
    [upsertItem, user],
  );

  const removeItem = useCallback(
    (id: string): void => {
      removeFromStore(id);
      deleteNotebookItem(id).catch(console.warn);
      if (user) deleteNotebookItemFromSupabase(id).catch(console.warn);
    },
    [removeFromStore, user],
  );

  return { items, status, saveItem, updateItem, removeItem };
}
