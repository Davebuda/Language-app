// TEST C — anon→auth notebook migration re-keys items.
//
// fake-indexeddb registered PER-FILE so migrateAnonNotebookToUser (exported from
// src/hooks/useNotebook.ts) runs against the REAL storage layer in-process. It
// loads items saved under the anon id, re-keys each to the user id, and upserts
// them back. We prove the re-key, idempotency on a second call, and the documented
// no-op guards (anonId === userId, anonId === null).
import 'fake-indexeddb/auto';

import { describe, it, expect, beforeEach } from 'vitest';
import { openDB } from 'idb';
import { saveNotebookItem, loadNotebookItems } from '@/storage/indexeddb';
import { createNotebookItem } from '@/types/notebook';
import { migrateAnonNotebookToUser } from '@/hooks/useNotebook';

const DB_NAME = 'norsk-coach';
const ANON_ID = 'anon-uuid-C';
const USER_ID = 'auth-user-C';

// The app's getDB() opens a connection per call and never closes it, so
// indexedDB.deleteDatabase() blocks on those lingering connections between tests.
// Clear the stores via a short-lived connection (opened at the app's v2 schema,
// then closed) for a deterministic fresh DB without fighting open handles.
async function freshDB() {
  const db = await openDB(DB_NAME, 2, {
    upgrade(database) {
      if (!database.objectStoreNames.contains('fingerprints')) {
        database.createObjectStore('fingerprints', { keyPath: 'userId' });
      }
      if (!database.objectStoreNames.contains('notebook-items')) {
        const store = database.createObjectStore('notebook-items', { keyPath: 'id' });
        store.createIndex('userId', 'userId');
      }
    },
  });
  await db.clear('fingerprints');
  await db.clear('notebook-items');
  db.close();
}

async function seedAnonItems() {
  await saveNotebookItem(
    createNotebookItem({
      id: 'item-1',
      userId: ANON_ID,
      type: 'word',
      norwegian: 'hund',
      source: 'manual',
    }),
  );
  await saveNotebookItem(
    createNotebookItem({
      id: 'item-2',
      userId: ANON_ID,
      type: 'phrase',
      norwegian: 'god kveld',
      source: 'manual',
    }),
  );
}

describe('migrateAnonNotebookToUser', () => {
  beforeEach(freshDB);

  it('re-keys anon items to the user id', async () => {
    await seedAnonItems();

    const migrated = await migrateAnonNotebookToUser(ANON_ID, USER_ID);
    expect(migrated).not.toBeNull();
    expect(migrated).toHaveLength(2);
    expect(migrated!.every((i) => i.userId === USER_ID)).toBe(true);

    // The items are now loadable under the user id (the index is re-keyed).
    const underUser = await loadNotebookItems(USER_ID);
    expect(underUser).toHaveLength(2);
    expect(underUser.map((i) => i.id).sort()).toEqual(['item-1', 'item-2']);
    expect(underUser.every((i) => i.userId === USER_ID)).toBe(true);
  });

  it('is idempotent on a second call', async () => {
    await seedAnonItems();
    await migrateAnonNotebookToUser(ANON_ID, USER_ID);

    // saveNotebookItem upserts by id, so a re-run must not duplicate. The anon
    // items were re-keyed (so a second anon load is empty → no-op), but even if
    // they re-migrated, the user store would still hold exactly 2 by id.
    const second = await migrateAnonNotebookToUser(ANON_ID, USER_ID);
    const underUser = await loadNotebookItems(USER_ID);
    expect(underUser).toHaveLength(2);
    expect(underUser.map((i) => i.id).sort()).toEqual(['item-1', 'item-2']);
    // After the first migration the anon items are gone from the anon key, so the
    // second call finds nothing to migrate and returns null.
    expect(second).toBeNull();
  });

  it('is a no-op when anonId === userId', async () => {
    await saveNotebookItem(
      createNotebookItem({
        id: 'same-1',
        userId: USER_ID,
        type: 'word',
        norwegian: 'katt',
        source: 'manual',
      }),
    );
    const result = await migrateAnonNotebookToUser(USER_ID, USER_ID);
    expect(result).toBeNull();
    // The existing item is untouched.
    expect(await loadNotebookItems(USER_ID)).toHaveLength(1);
  });

  it('is a no-op when anonId is null', async () => {
    const result = await migrateAnonNotebookToUser(null, USER_ID);
    expect(result).toBeNull();
    expect(await loadNotebookItems(USER_ID)).toHaveLength(0);
  });
});
