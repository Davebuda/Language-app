// Local fingerprint persistence using IndexedDB (via idb library).
// The fingerprint lives on the device — it never leaves without user consent.

import { openDB, type IDBPDatabase } from 'idb';
import { normalizeFingerprint, type MistakeFingerprint } from '@/types/fingerprint';
import { normalizeNotebookItem, type NotebookItem } from '@/types/notebook';

const DB_NAME = 'norsk-coach';
const DB_VERSION = 2;
const FINGERPRINT_STORE = 'fingerprints';
const NOTEBOOK_STORE = 'notebook-items';

async function getDB(): Promise<IDBPDatabase> {
  if (typeof window === 'undefined') throw new Error('IndexedDB unavailable on server');
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db, oldVersion) {
      // v1: original fingerprint store. Guarded by contains() so an existing
      // store is never recreated/dropped on a v1→v2 upgrade.
      if (!db.objectStoreNames.contains(FINGERPRINT_STORE)) {
        db.createObjectStore(FINGERPRINT_STORE, { keyPath: 'userId' });
      }
      // v2: notebook items store (keyPath 'id') + userId index for per-user loads.
      // Only touches the new store; the v1 fingerprint store above is untouched.
      if (oldVersion < 2 && !db.objectStoreNames.contains(NOTEBOOK_STORE)) {
        const store = db.createObjectStore(NOTEBOOK_STORE, { keyPath: 'id' });
        store.createIndex('userId', 'userId');
      }
    },
  });
}

export async function saveFingerprint(fingerprint: MistakeFingerprint): Promise<void> {
  const db = await getDB();
  await db.put(FINGERPRINT_STORE, fingerprint);
}

function isValidFingerprint(obj: unknown): obj is MistakeFingerprint {
  if (!obj || typeof obj !== 'object') return false;
  const fp = obj as Record<string, unknown>;
  return (
    typeof fp.userId === 'string' &&
    typeof fp.currentLevel === 'string' &&
    typeof fp.conceptMastery === 'object' &&
    fp.conceptMastery !== null &&
    typeof fp.totalSessionsCompleted === 'number'
  );
}

export async function loadFingerprint(userId: string): Promise<MistakeFingerprint | null> {
  const db = await getDB();
  const result = await db.get(FINGERPRINT_STORE, userId);
  if (!result) return null;
  if (!isValidFingerprint(result)) {
    console.warn('[indexeddb] Corrupt fingerprint detected, treating as empty');
    return null;
  }
  // Schema migration on load: backfill any field added after this fingerprint
  // was last saved (shared with the Supabase load path via normalizeFingerprint).
  // A fingerprint persisted before the weekly-sprint / production-wall / vocab
  // fields existed would otherwise crash readers that assume them present.
  return normalizeFingerprint(result);
}

export async function deleteFingerprint(userId: string): Promise<void> {
  const db = await getDB();
  await db.delete(FINGERPRINT_STORE, userId);
}

export async function getAllFingerprints(): Promise<MistakeFingerprint[]> {
  const db = await getDB();
  return db.getAll(FINGERPRINT_STORE);
}

// ---------------------------------------------------------------------------
// Notebook items (DB v2). Own store, keyed by item id, indexed by userId.
// Each item carries its own SRS fields — the notebook never writes into the
// fingerprint, so these helpers stay independent of the fingerprint ones.
// ---------------------------------------------------------------------------

export async function saveNotebookItem(item: NotebookItem): Promise<void> {
  const db = await getDB();
  await db.put(NOTEBOOK_STORE, item);
}

export async function loadNotebookItems(userId: string): Promise<NotebookItem[]> {
  const db = await getDB();
  const items = await db.getAllFromIndex(NOTEBOOK_STORE, 'userId', userId);
  // Schema migration on load: backfill any field added after an item was last
  // saved (shared with the Supabase load path via normalizeNotebookItem).
  return items.map((item) => normalizeNotebookItem(item as NotebookItem));
}

export async function deleteNotebookItem(id: string): Promise<void> {
  const db = await getDB();
  await db.delete(NOTEBOOK_STORE, id);
}
