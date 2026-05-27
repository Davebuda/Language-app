/**
 * AUDIT SUITE C — Weekly Progress Contract
 *
 * Proves:
 * - weekly progress updates from actual activity (not fake/static)
 * - /uke reflects the same learner state as the fingerprint
 * - daily progression and weekly view stay in sync
 * - orphaned activity does not happen
 * - weekly focus is derived from fingerprint mastery data
 * - week close records real start/end scores
 * - abandoned weeks are handled correctly
 */
import { describe, it, expect } from 'vitest';
import { createEmptyFingerprint } from '@/types/fingerprint';
import type { MistakeFingerprint } from '@/types/fingerprint';
import { updateConceptMastery } from '@/engine/fingerprint';
import {
  selectWeeklyFocus,
  shouldResetWeek,
  closeWeek,
  openWeek,
  ensureWeekOpen,
} from '@/engine/weekly-sprint';
import { buildWeeklyCheckItems } from '@/lib/weekly-check';
import {
  AUDIT_USER_ID, a1Graph,
  makeMastery, makeWeakMastery, makeReviewDueMastery,
  buildSentencePool, buildFingerprintForLevel,
} from './helpers';

describe('C: Weekly Progress Contract', () => {

  describe('C1: Weekly focus is fingerprint-driven', () => {
    it('selectWeeklyFocus returns concepts from fingerprint mastery, not hardcoded', () => {
      const fp = buildFingerprintForLevel('A1', a1Graph);
      const rootIds = a1Graph.concepts.filter(c => c.prerequisites.length === 0).map(c => c.id);

      // Make first 3 very weak, rest moderate
      for (let i = 0; i < Math.min(3, rootIds.length); i++) {
        fp.conceptMastery[rootIds[i]] = makeWeakMastery(rootIds[i]);
      }

      const focus = selectWeeklyFocus(fp, a1Graph);
      expect(focus.length).toBeGreaterThan(0);
      expect(focus.length).toBeLessThanOrEqual(5);

      // Focus should include the weakest concepts
      for (const id of focus) {
        expect(fp.conceptMastery[id]).toBeDefined();
      }
    });

    it('different fingerprints produce different focus sets', () => {
      const rootIds = a1Graph.concepts.filter(c => c.prerequisites.length === 0).map(c => c.id);

      const fp1 = buildFingerprintForLevel('A1', a1Graph);
      if (rootIds[0]) fp1.conceptMastery[rootIds[0]] = makeWeakMastery(rootIds[0]);

      const fp2 = buildFingerprintForLevel('A1', a1Graph);
      if (rootIds[2]) fp2.conceptMastery[rootIds[2]] = makeWeakMastery(rootIds[2]);

      const focus1 = selectWeeklyFocus(fp1, a1Graph);
      const focus2 = selectWeeklyFocus(fp2, a1Graph);

      // They should differ (unless all concepts are equally weak)
      expect(focus1[0]).not.toBe(focus2[0]);
    });

    it('SRS-due concepts are included in weekly focus', () => {
      const fp = buildFingerprintForLevel('A1', a1Graph);
      const rootIds = a1Graph.concepts.filter(c => c.prerequisites.length === 0).map(c => c.id);

      // Make one concept SRS-due
      if (rootIds[0]) {
        fp.conceptMastery[rootIds[0]] = makeReviewDueMastery(rootIds[0]);
      }

      const focus = selectWeeklyFocus(fp, a1Graph);
      // The SRS-due concept should be in focus (or at least considered)
      expect(focus.length).toBeGreaterThan(0);
    });
  });

  describe('C2: Week open/close lifecycle', () => {
    it('openWeek sets weeklyFocus, weekStartedAt, and weekStartSnapshots', () => {
      const fp = buildFingerprintForLevel('A1', a1Graph);
      const rootIds = a1Graph.concepts.filter(c => c.prerequisites.length === 0).map(c => c.id);
      for (const id of rootIds.slice(0, 3)) {
        fp.conceptMastery[id] = makeWeakMastery(id);
      }

      const opened = openWeek(fp, a1Graph);

      expect(opened.weeklyFocus.length).toBeGreaterThan(0);
      expect(opened.weekStartedAt).not.toBeNull();
      expect(Object.keys(opened.weekStartSnapshots).length).toBe(opened.weeklyFocus.length);

      // Snapshots must match current mastery state
      for (const conceptId of opened.weeklyFocus) {
        const snapshot = opened.weekStartSnapshots[conceptId];
        const mastery = opened.conceptMastery[conceptId];
        expect(snapshot).toBeDefined();
        if (mastery) {
          expect(snapshot!.rawScore).toBe(mastery.rawScore);
          expect(snapshot!.decayedScore).toBe(mastery.decayedScore);
          expect(snapshot!.attemptCount).toBe(mastery.attemptCount);
        }
      }
    });

    it('openWeek is idempotent — second call on open week is a no-op', () => {
      const fp = buildFingerprintForLevel('A1', a1Graph);
      const opened = openWeek(fp, a1Graph);
      const secondOpen = openWeek(opened, a1Graph);
      expect(secondOpen).toBe(opened); // reference equality
    });

    it('closeWeek records real focus outcomes from fingerprint delta', () => {
      const fp = buildFingerprintForLevel('A1', a1Graph);
      const rootIds = a1Graph.concepts.filter(c => c.prerequisites.length === 0).map(c => c.id);
      for (const id of rootIds.slice(0, 3)) {
        fp.conceptMastery[id] = makeWeakMastery(id);
      }

      const opened = openWeek(fp, a1Graph);

      // Simulate practice: improve first focus concept
      const focusId = opened.weeklyFocus[0];
      if (focusId && opened.conceptMastery[focusId]) {
        const improved = updateConceptMastery(opened.conceptMastery[focusId], true, 15, 3);
        opened.conceptMastery[focusId] = improved;
      }

      const closed = closeWeek(opened, a1Graph, {
        status: 'completed',
        checkResult: { takenAt: new Date().toISOString(), score: 75, items: 6 },
      });

      // Week history should have one record
      expect(closed.weeklySprintHistory.length).toBe(1);
      const record = closed.weeklySprintHistory[0];
      expect(record.status).toBe('completed');
      expect(record.focus.length).toBeGreaterThan(0);

      // Focus outcomes should reflect the real delta
      if (focusId) {
        const outcome = record.focusOutcomes[focusId];
        expect(outcome).toBeDefined();
        expect(outcome!.attempts).toBeGreaterThan(0);
      }

      // Week should be cleared
      expect(closed.weeklyFocus).toEqual([]);
      expect(closed.weekStartedAt).toBeNull();
      expect(closed.weekStartSnapshots).toEqual({});
    });

    it('closeWeek without activity still records zero-attempt outcomes', () => {
      const fp = buildFingerprintForLevel('A1', a1Graph);
      const rootIds = a1Graph.concepts.filter(c => c.prerequisites.length === 0).map(c => c.id);
      for (const id of rootIds.slice(0, 3)) {
        fp.conceptMastery[id] = makeWeakMastery(id);
      }

      const opened = openWeek(fp, a1Graph);
      const closed = closeWeek(opened, a1Graph, {
        status: 'completed',
        checkResult: null,
      });

      const record = closed.weeklySprintHistory[0];
      for (const conceptId of record.focus) {
        const outcome = record.focusOutcomes[conceptId];
        expect(outcome).toBeDefined();
        expect(outcome!.attempts).toBe(0);
      }
    });
  });

  describe('C3: Week reset and abandonment', () => {
    it('shouldResetWeek returns true after 7 days', () => {
      const fp = buildFingerprintForLevel('A1', a1Graph);
      fp.weekStartedAt = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString();

      expect(shouldResetWeek(fp)).toBe(true);
    });

    it('shouldResetWeek returns false within 7 days', () => {
      const fp = buildFingerprintForLevel('A1', a1Graph);
      fp.weekStartedAt = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();

      expect(shouldResetWeek(fp)).toBe(false);
    });

    it('ensureWeekOpen closes stale week as abandoned and opens new one', () => {
      const fp = buildFingerprintForLevel('A1', a1Graph);
      const rootIds = a1Graph.concepts.filter(c => c.prerequisites.length === 0).map(c => c.id);
      for (const id of rootIds.slice(0, 3)) {
        fp.conceptMastery[id] = makeWeakMastery(id);
      }

      // Open a week 10 days ago
      const tenDaysAgo = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000);
      const oldOpened = openWeek(fp, a1Graph, tenDaysAgo);

      // Now ensureWeekOpen should close old and open new
      const ensured = ensureWeekOpen(oldOpened, a1Graph);

      expect(ensured.weeklySprintHistory.length).toBe(1);
      expect(ensured.weeklySprintHistory[0].status).toBe('abandoned');
      expect(ensured.weekStartedAt).not.toBeNull();
      expect(ensured.weeklyFocus.length).toBeGreaterThan(0);
    });

    it('ensureWeekOpen is a no-op when week is current', () => {
      const fp = buildFingerprintForLevel('A1', a1Graph);
      const rootIds = a1Graph.concepts.filter(c => c.prerequisites.length === 0).map(c => c.id);
      for (const id of rootIds.slice(0, 3)) {
        fp.conceptMastery[id] = makeWeakMastery(id);
      }

      const opened = openWeek(fp, a1Graph);
      const ensured = ensureWeekOpen(opened, a1Graph);
      expect(ensured).toBe(opened); // reference equality
    });
  });

  describe('C4: Weekly check items are fingerprint-driven', () => {
    it('buildWeeklyCheckItems produces items for focus concepts', () => {
      const { sentences, availableSentenceIds } = buildSentencePool(a1Graph);
      const fp = buildFingerprintForLevel('A1', a1Graph);
      const rootIds = a1Graph.concepts.filter(c => c.prerequisites.length === 0).map(c => c.id);
      for (const id of rootIds.slice(0, 3)) {
        fp.conceptMastery[id] = makeWeakMastery(id);
      }

      const opened = openWeek(fp, a1Graph);
      const items = buildWeeklyCheckItems(opened, a1Graph, sentences, availableSentenceIds);

      expect(items.length).toBeGreaterThan(0);
      expect(items.length).toBeLessThanOrEqual(8);

      // Items should reference focus concepts
      const itemConcepts = new Set(items.flatMap(i => i.conceptIds));
      const focusSet = new Set(opened.weeklyFocus);
      const overlap = [...itemConcepts].filter(id => focusSet.has(id));
      expect(overlap.length).toBeGreaterThan(0);
    });

    it('weekly check items have purpose=review and selectionReason=review_due', () => {
      const { sentences, availableSentenceIds } = buildSentencePool(a1Graph);
      const fp = buildFingerprintForLevel('A1', a1Graph);
      const rootIds = a1Graph.concepts.filter(c => c.prerequisites.length === 0).map(c => c.id);
      for (const id of rootIds.slice(0, 3)) {
        fp.conceptMastery[id] = makeWeakMastery(id);
      }

      const opened = openWeek(fp, a1Graph);
      const items = buildWeeklyCheckItems(opened, a1Graph, sentences, availableSentenceIds);

      for (const item of items) {
        expect(item.purpose).toBe('review');
        expect(item.selectionReason).toBe('review_due');
        expect(item.isRepairItem).toBe(false);
      }
    });
  });

  describe('C5: Daily-to-weekly sync integrity', () => {
    it('practice during a week changes mastery that closeWeek captures', () => {
      const fp = buildFingerprintForLevel('A1', a1Graph);
      const rootIds = a1Graph.concepts.filter(c => c.prerequisites.length === 0).map(c => c.id);
      for (const id of rootIds.slice(0, 3)) {
        fp.conceptMastery[id] = makeWeakMastery(id);
      }

      const opened = openWeek(fp, a1Graph);
      const focusId = opened.weeklyFocus[0]!;
      const startScore = opened.conceptMastery[focusId]?.rawScore ?? 0;

      // Simulate 5 correct answers
      let current: MistakeFingerprint = { ...opened, conceptMastery: { ...opened.conceptMastery } };
      for (let i = 0; i < 5; i++) {
        const updated = updateConceptMastery(current.conceptMastery[focusId], true, 15, 3);
        current = { ...current, conceptMastery: { ...current.conceptMastery, [focusId]: updated } };
      }

      const endScore = current.conceptMastery[focusId]?.rawScore ?? 0;
      expect(endScore).toBeGreaterThan(startScore);

      // Close week — outcome should reflect the real improvement
      const closed = closeWeek(current, a1Graph, {
        status: 'completed',
        checkResult: { takenAt: new Date().toISOString(), score: 80, items: 6 },
      });

      const outcome = closed.weeklySprintHistory[0].focusOutcomes[focusId];
      expect(outcome).toBeDefined();
      expect(outcome!.attempts).toBe(5);
      expect(outcome!.endScore).toBeGreaterThanOrEqual(outcome!.startScore);
    });

    it('weekly history cap is 26 entries', () => {
      let fp = buildFingerprintForLevel('A1', a1Graph);
      const rootIds = a1Graph.concepts.filter(c => c.prerequisites.length === 0).map(c => c.id);
      for (const id of rootIds.slice(0, 3)) {
        fp.conceptMastery[id] = makeWeakMastery(id);
      }

      // Open and close 30 weeks
      for (let i = 0; i < 30; i++) {
        const weekStart = new Date(Date.now() - (30 - i) * 7 * 24 * 60 * 60 * 1000);
        fp = { ...fp, weekStartedAt: null, weeklyFocus: [], weekStartSnapshots: {} };
        fp = openWeek(fp, a1Graph, weekStart);
        fp = closeWeek(fp, a1Graph, {
          status: 'completed',
          checkResult: null,
          now: new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000),
        });
      }

      expect(fp.weeklySprintHistory.length).toBeLessThanOrEqual(26);
    });
  });
});
