// TEST B — notebook SRS round-trip persists ("own SRS advances" proof) AND the
// fingerprint store is untouched by notebook writes.
//
// fake-indexeddb registered PER-FILE so the real src/storage/indexeddb.ts layer
// runs in-process. We save a notebook item, advance its OWN SRS via the shared
// primitive (src/lib/srs.ts advanceNotebookSrs), persist + reload, and assert the
// SRS state really round-trips through IndexedDB. We also save a fingerprint and
// prove notebook writes never mutate it — the storage-level half of "notebook
// practice never touches conceptMastery".
import 'fake-indexeddb/auto';

import { describe, it, expect, beforeEach } from 'vitest';
import { openDB } from 'idb';
import {
  saveNotebookItem,
  loadNotebookItems,
  saveFingerprint,
  loadFingerprint,
} from '@/storage/indexeddb';
import { createNotebookItem } from '@/types/notebook';
import { createEmptyFingerprint } from '@/types/fingerprint';
import { advanceNotebookSrs } from '@/lib/srs';

const DB_NAME = 'norsk-coach';
const USER_ID = 'user-roundtrip-B';

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

describe('notebook SRS round-trip through IndexedDB', () => {
  beforeEach(freshDB);

  it('persists an SRS advance (0→1 with nextReviewAt set) across save/reload', async () => {
    const item = createNotebookItem({
      id: 'srs-1',
      userId: USER_ID,
      type: 'word',
      norwegian: 'å lese',
      source: 'manual',
      srsLevel: 0,
      nextReviewAt: null,
    });
    await saveNotebookItem(item);

    const afterSave = await loadNotebookItems(USER_ID);
    expect(afterSave).toHaveLength(1);
    expect(afterSave[0].srsLevel).toBe(0);
    expect(afterSave[0].nextReviewAt).toBeNull();

    // Correct answer → advance the item's OWN SRS and persist the merged item.
    const advanced = advanceNotebookSrs(
      { srsLevel: afterSave[0].srsLevel, nextReviewAt: afterSave[0].nextReviewAt },
      true,
    );
    await saveNotebookItem({ ...afterSave[0], ...advanced });

    const afterAdvance = await loadNotebookItems(USER_ID);
    expect(afterAdvance).toHaveLength(1);
    expect(afterAdvance[0].srsLevel).toBe(1);
    expect(afterAdvance[0].nextReviewAt).not.toBeNull();
  });

  it('resets the persisted SRS to { 0, null } on a wrong answer', async () => {
    const item = createNotebookItem({
      id: 'srs-2',
      userId: USER_ID,
      type: 'word',
      norwegian: 'å skrive',
      source: 'manual',
      srsLevel: 3,
      nextReviewAt: '2099-01-01T00:00:00.000Z',
    });
    await saveNotebookItem(item);

    const loaded = await loadNotebookItems(USER_ID);
    const reset = advanceNotebookSrs(
      { srsLevel: loaded[0].srsLevel, nextReviewAt: loaded[0].nextReviewAt },
      false,
    );
    await saveNotebookItem({ ...loaded[0], ...reset });

    const afterReset = await loadNotebookItems(USER_ID);
    expect(afterReset[0].srsLevel).toBe(0);
    expect(afterReset[0].nextReviewAt).toBeNull();
  });

  it('leaves the fingerprint store UNTOUCHED across notebook writes', async () => {
    // Save a fingerprint, then exercise the notebook store, then prove the
    // fingerprint loads back byte-for-byte unchanged.
    const fp = createEmptyFingerprint(USER_ID);
    fp.totalSessionsCompleted = 4;
    fp.conceptMastery = {
      'noun-gender': {
        conceptId: 'noun-gender',
        rawScore: 62,
        confidenceScore: 0.5,
        decayedScore: 58,
        attemptCount: 10,
        correctCount: 6,
        uniqueDaysActive: 3,
        lastAttemptAt: '2026-06-01T00:00:00.000Z',
        lastCorrectAt: '2026-06-01T00:00:00.000Z',
        streak: 2,
        recentOutcomes: [true, false, true, true, false],
        srsLevel: 1,
        nextReviewAt: '2026-06-04T00:00:00.000Z',
      },
    };
    await saveFingerprint(fp);

    const before = await loadFingerprint(USER_ID);

    // A batch of notebook writes — saves, an SRS advance, all under the same userId.
    const nb = createNotebookItem({
      id: 'nb-x',
      userId: USER_ID,
      type: 'phrase',
      norwegian: 'god morgen',
      source: 'manual',
    });
    await saveNotebookItem(nb);
    const reloadedNb = (await loadNotebookItems(USER_ID))[0];
    const adv = advanceNotebookSrs(
      { srsLevel: reloadedNb.srsLevel, nextReviewAt: reloadedNb.nextReviewAt },
      true,
    );
    await saveNotebookItem({ ...reloadedNb, ...adv });

    const after = await loadFingerprint(USER_ID);
    // conceptMastery (and the whole fingerprint) is identical before/after — the
    // notebook never wrote into it.
    expect(after).toEqual(before);
    expect(after?.conceptMastery['noun-gender'].srsLevel).toBe(1);
    expect(after?.totalSessionsCompleted).toBe(4);
  });
});
