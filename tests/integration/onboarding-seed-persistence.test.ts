// D-01 — the onboarding diagnostic seed must persist the diagnostic level before
// the flow navigates away. The destination re-bootstraps useFingerprint from
// IndexedDB; if the seed write hasn't flushed, the bootstrap finds no record and
// resets the learner to A1, losing the seeded mastery. The fix awaits the seed
// write before navigating. This proves the data invariant that guarantee rests on:
// the builder stamps the diagnostic level, and once the write is awaited a reload
// returns it — while an un-flushed read (the race) returns nothing.
//
// fake-indexeddb registered per-file so the real src/storage/indexeddb.ts runs.
import 'fake-indexeddb/auto';

import { describe, it, expect, beforeEach } from 'vitest';
import { openDB } from 'idb';
import { saveFingerprint, loadFingerprint } from '@/storage/indexeddb';
import { buildSeededFingerprint } from '@/lib/seed-fingerprint';
import type { DiagnosticResult } from '@/lib/diagnostic/engine';

const DB_NAME = 'norsk-coach';
const USER_ID = 'user-d01';
const NOW = '2026-06-26T00:00:00.000Z';

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
  db.close();
}

function b1Result(): DiagnosticResult {
  return {
    cefrLevel: 'B1',
    rawScore: 0.7,
    conceptSeeds: {
      'present-tense-regular': {
        rawScore: 80,
        attemptCount: 2,
        correctCount: 2,
        uniqueDaysActive: 1,
        confidenceScore: 0.5,
        decayedScore: 80,
        streak: 2,
        lastAttemptAt: NOW,
        lastCorrectAt: NOW,
        recentOutcomes: [true, true],
      },
    },
    askedQuestionIds: ['q1', 'q2'],
  };
}

describe('D-01 — onboarding seed persists the diagnostic level', () => {
  beforeEach(freshDB);

  it('buildSeededFingerprint stamps the diagnostic level (B1), not A1', () => {
    const fp = buildSeededFingerprint(null, b1Result(), { userId: USER_ID, now: NOW });
    expect(fp.currentLevel).toBe('B1');
    expect(fp.levelSetByUser).toBe(true);
    expect(fp.conceptMastery['present-tense-regular']).toBeTruthy();
    expect(fp.askedDiagnosticQuestionIds).toContain('q1');
  });

  it('once the seed write is AWAITED, a reload returns B1 — the level the destination bootstrap reads', async () => {
    const fp = buildSeededFingerprint(null, b1Result(), { userId: USER_ID, now: NOW });
    await saveFingerprint(fp); // the await the D-01 fix adds before router.push
    const reloaded = await loadFingerprint(USER_ID);
    expect(reloaded?.currentLevel).toBe('B1');
  });

  it('the race is real: reading the record BEFORE the seed write lands returns nothing (→ A1 fallback)', async () => {
    // No save yet — the destination bootstrap would find no record and reset to A1.
    const before = await loadFingerprint(USER_ID);
    expect(before ?? null).toBeNull();
  });
});
