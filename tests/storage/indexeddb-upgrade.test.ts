// TEST A — IndexedDB v1→v2 upgrade preserves fingerprints (the data-loss guard).
//
// fake-indexeddb is registered PER-FILE (not in the shared vitest setup) so the
// real storage layer runs in-process against a genuine IndexedDB implementation,
// while the other 879 tests stay untouched. We open 'norsk-coach' at VERSION 1
// with only the v1 'fingerprints' store, write a row, close, then call the app's
// own getDB()-backed helpers (which open at version 2) to trigger the REAL
// v1→v2 upgrade in src/storage/indexeddb.ts and prove it is non-destructive.
import 'fake-indexeddb/auto';

import { describe, it, expect, beforeEach } from 'vitest';
import { openDB } from 'idb';
import { loadFingerprint, saveNotebookItem, loadNotebookItems } from '@/storage/indexeddb';
import { createEmptyFingerprint } from '@/types/fingerprint';
import { createNotebookItem } from '@/types/notebook';

const DB_NAME = 'norsk-coach';
const USER_ID = 'user-upgrade-A';

// Open the database at the ORIGINAL v1 schema: a single 'fingerprints' store
// keyPath 'userId', exactly as the app shipped before the notebook (v2) existed.
async function seedV1WithFingerprint() {
  const db = await openDB(DB_NAME, 1, {
    upgrade(database) {
      database.createObjectStore('fingerprints', { keyPath: 'userId' });
    },
  });
  const fp = createEmptyFingerprint(USER_ID);
  fp.totalSessionsCompleted = 7; // a distinctive value to prove the SAME row survives
  await db.put('fingerprints', fp);
  db.close();
}

describe('IndexedDB v1→v2 upgrade (data-loss guard)', () => {
  beforeEach(async () => {
    await new Promise<void>((resolve, reject) => {
      const req = indexedDB.deleteDatabase(DB_NAME);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
      req.onblocked = () => resolve();
    });
  });

  it('preserves the pre-existing v1 fingerprint AND adds a writable notebook store', async () => {
    await seedV1WithFingerprint();

    // First app call opens at version 2 → runs the real v1→v2 upgrade().
    const loaded = await loadFingerprint(USER_ID);
    expect(loaded).not.toBeNull();
    // The v1 row is STILL readable after the upgrade — not dropped/recreated.
    expect(loaded?.userId).toBe(USER_ID);
    expect(loaded?.totalSessionsCompleted).toBe(7);

    // The new v2 'notebook-items' store now exists and is writable.
    const item = createNotebookItem({
      id: 'nb-1',
      userId: USER_ID,
      type: 'word',
      norwegian: 'hund',
      source: 'manual',
    });
    await saveNotebookItem(item);
    const items = await loadNotebookItems(USER_ID);
    expect(items).toHaveLength(1);
    expect(items[0].id).toBe('nb-1');

    // And the fingerprint is STILL intact after a notebook write touched the DB.
    const reloaded = await loadFingerprint(USER_ID);
    expect(reloaded?.totalSessionsCompleted).toBe(7);
  });
});
