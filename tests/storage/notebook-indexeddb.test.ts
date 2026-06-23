// Tests for the notebook IndexedDB store helpers (Task 3.2).
//
// TEST-INFRA GAP — READ THIS FIRST:
// This repo runs vitest with the `jsdom` environment, which does NOT implement
// IndexedDB (probe in this session: `typeof indexedDB === 'undefined'`), and
// `fake-indexeddb` is NOT a project dependency. The only place real IndexedDB is
// exercised today is the Playwright harness (`tests/harness/fingerprint.spec.ts`),
// which runs in a real browser — there is no in-process IndexedDB unit-test infra.
//
// Adding a dependency (`fake-indexeddb`) is out of scope for this task, so the
// save→loadNotebookItems round-trip and the v1→v2 fingerprint-preservation
// assertion CANNOT be exercised here. They are covered conceptually below by
// unit-testing the pure logic each helper composes:
//   - `loadNotebookItems` maps every loaded row through `normalizeNotebookItem`
//     (the same normalizer the Supabase load path uses) → tested directly.
//   - the `userId` index filter (different-userId exclusion) is the IndexedDB
//     `getAllFromIndex(store, 'userId', userId)` semantics → modelled as a pure
//     filter over a fixture set so the contract is asserted even without IDB.
// The genuinely-IndexedDB-only behaviours (real put/getAllFromIndex against an
// engine, and the upgrade preserving a pre-existing fingerprint store) are NOTED
// as gaps and belong in a Playwright harness spec, mirroring the fingerprint one.

import { describe, it, expect } from 'vitest';
import {
  normalizeNotebookItem,
  createNotebookItem,
  type NotebookItem,
} from '@/types/notebook';

function makeItem(overrides: Partial<NotebookItem> & { id: string; userId: string }): NotebookItem {
  return createNotebookItem({
    type: 'word',
    norwegian: 'jobb',
    source: 'okt',
    ...overrides,
  });
}

describe('notebook IndexedDB helpers — pure logic the helpers compose', () => {
  describe('loadNotebookItems normalization (every loaded row → normalizeNotebookItem)', () => {
    it('returns a saved item normalized (backfills fields a legacy row lacks)', () => {
      // Simulate a row persisted before later fields existed: only the required
      // keys are present. `loadNotebookItems` maps each row through this exact
      // normalizer, so this asserts the loaded shape a caller would receive.
      const legacyRow = {
        id: 'nb-1',
        userId: 'user-a',
        type: 'word',
        norwegian: 'jobb',
        source: 'okt',
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      } as unknown as NotebookItem;

      const loaded = normalizeNotebookItem(legacyRow);

      expect(loaded.id).toBe('nb-1');
      expect(loaded.userId).toBe('user-a');
      expect(loaded.norwegian).toBe('jobb');
      // Backfilled defaults:
      expect(loaded.tags).toEqual([]);
      expect(loaded.reviewStatus).toBe('new');
      expect(loaded.verified).toBe(false);
      expect(loaded.promoted).toBe(false);
      expect(loaded.srsLevel).toBe(0);
      expect(loaded.nextReviewAt).toBeNull();
    });

    it('preserves stored values over defaults (stored wins, mirrors normalizeFingerprint spread order)', () => {
      const saved = makeItem({
        id: 'nb-2',
        userId: 'user-a',
        tags: ['arbeid'],
        reviewStatus: 'learning',
        verified: true,
        promoted: true,
        srsLevel: 3,
        nextReviewAt: '2026-02-01T00:00:00.000Z',
      });

      const loaded = normalizeNotebookItem(saved);

      expect(loaded.tags).toEqual(['arbeid']);
      expect(loaded.reviewStatus).toBe('learning');
      expect(loaded.verified).toBe(true);
      expect(loaded.promoted).toBe(true);
      expect(loaded.srsLevel).toBe(3);
      expect(loaded.nextReviewAt).toBe('2026-02-01T00:00:00.000Z');
    });
  });

  describe('userId index filter (different-userId exclusion)', () => {
    // Models the IndexedDB `getAllFromIndex(NOTEBOOK_STORE, 'userId', userId)`
    // contract that `loadNotebookItems(userId)` relies on: only rows whose
    // userId matches are returned; other users' rows are excluded.
    const store: NotebookItem[] = [
      makeItem({ id: 'nb-a1', userId: 'user-a', norwegian: 'jobb' }),
      makeItem({ id: 'nb-a2', userId: 'user-a', norwegian: 'hus' }),
      makeItem({ id: 'nb-b1', userId: 'user-b', norwegian: 'bil' }),
    ];

    function loadForUser(userId: string): NotebookItem[] {
      return store
        .filter((row) => row.userId === userId)
        .map((row) => normalizeNotebookItem(row));
    }

    it('returns only items for the requested userId (normalized)', () => {
      const result = loadForUser('user-a');
      expect(result.map((i) => i.id).sort()).toEqual(['nb-a1', 'nb-a2']);
      expect(result.every((i) => i.userId === 'user-a')).toBe(true);
      // normalized shape:
      expect(result.every((i) => Array.isArray(i.tags))).toBe(true);
    });

    it('excludes items belonging to a different userId', () => {
      const result = loadForUser('user-a');
      expect(result.some((i) => i.userId === 'user-b')).toBe(false);
      expect(result.some((i) => i.id === 'nb-b1')).toBe(false);
    });

    it('returns an empty array for a userId with no items', () => {
      expect(loadForUser('user-c')).toEqual([]);
    });
  });
});

// ---------------------------------------------------------------------------
// NOTED GAPS (require a real IndexedDB engine — Playwright harness, not vitest):
//   1. Real saveNotebookItem → loadNotebookItems(userId) round-trip against an
//      actual engine (put + getAllFromIndex('userId')).
//   2. v1→v2 upgrade PRESERVES a pre-existing fingerprint row: cannot be
//      simulated here because jsdom has no IndexedDB and fake-indexeddb is not a
//      dependency. The upgrade() guards (contains() checks + `oldVersion < 2`)
//      are written to be non-destructive; verifying that at runtime needs a real
//      engine and should live alongside tests/harness/fingerprint.spec.ts.
// ---------------------------------------------------------------------------
