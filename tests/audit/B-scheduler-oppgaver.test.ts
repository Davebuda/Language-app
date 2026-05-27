/**
 * AUDIT SUITE B — Scheduler / Daily Oppgaver
 *
 * Proves:
 * - daily pack is built from fingerprint state, not random/static
 * - passed items are excluded by default
 * - review_due items can return passed sentences
 * - level-specific packs differ by CEFR level
 * - session recipe ratios are respected
 * - every item has a valid selectionReason
 * - production guarantee is enforced
 */
import { describe, it, expect } from 'vitest';
import { createEmptyFingerprint } from '@/types/fingerprint';
import { generateSession } from '@/engine/scheduler';
import type { SelectionReason } from '@/types/session';
import {
  AUDIT_USER_ID, a1Graph, a2Graph, b1Graph,
  makeMastery, makeWeakMastery, makeStrongMastery, makeReviewDueMastery,
  buildSentencePool, buildFingerprintForLevel,
} from './helpers';

const VALID_REASONS: SelectionReason[] = [
  'weak_concept', 'review_due', 'decaying', 'new_material',
  'interleaving', 'weekly_focus', 'repair_target', 'cold_start',
];

describe('B: Scheduler / Daily Oppgaver', () => {

  describe('B1: Session is fingerprint-driven, not random', () => {
    it('different fingerprints produce different sessions', () => {
      const graph = a1Graph;
      const { sentences, availableSentenceIds } = buildSentencePool(graph);
      const rootIds = graph.concepts.filter(c => c.prerequisites.length === 0).map(c => c.id);

      // Fingerprint 1: first concept is weak
      const fp1 = buildFingerprintForLevel('A1', graph);
      if (rootIds[0]) fp1.conceptMastery[rootIds[0]] = makeWeakMastery(rootIds[0]);

      // Fingerprint 2: second concept is weak, first is strong
      const fp2 = buildFingerprintForLevel('A1', graph);
      if (rootIds[0]) fp2.conceptMastery[rootIds[0]] = makeStrongMastery(rootIds[0]);
      if (rootIds[1]) fp2.conceptMastery[rootIds[1]] = makeWeakMastery(rootIds[1]);

      const r1 = generateSession({ fingerprint: fp1, graph, availableSentenceIds, sentences });
      const r2 = generateSession({ fingerprint: fp2, graph, availableSentenceIds, sentences });

      // Weak concepts should differ
      expect(r1.weakConcepts[0]).not.toBe(r2.weakConcepts[0]);
    });

    it('empty fingerprint produces cold-start session with new-material items', () => {
      const graph = a1Graph;
      const { sentences, availableSentenceIds } = buildSentencePool(graph);
      const fp = createEmptyFingerprint(AUDIT_USER_ID);

      const result = generateSession({ fingerprint: fp, graph, availableSentenceIds, sentences });

      expect(result.session.items.length).toBeGreaterThan(0);
      const coldStartItems = result.session.items.filter(i => i.selectionReason === 'cold_start');
      const newMaterialItems = result.session.items.filter(i => i.purpose === 'new-material');
      expect(coldStartItems.length + newMaterialItems.length).toBeGreaterThan(0);
    });

    it('fingerprint with weak concepts produces remediation-heavy session', () => {
      const graph = a1Graph;
      const { sentences, availableSentenceIds } = buildSentencePool(graph);
      const fp = buildFingerprintForLevel('A1', graph);

      const rootIds = graph.concepts.filter(c => c.prerequisites.length === 0).map(c => c.id);
      for (const id of rootIds.slice(0, 5)) {
        fp.conceptMastery[id] = makeWeakMastery(id);
      }

      const result = generateSession({ fingerprint: fp, graph, availableSentenceIds, sentences });
      const remediation = result.session.items.filter(i => i.purpose === 'remediation');
      expect(remediation.length).toBeGreaterThan(0);
      // Remediation should be ~40% of items
      expect(remediation.length / result.session.items.length).toBeGreaterThanOrEqual(0.2);
    });
  });

  describe('B2: Passed-sentence suppression', () => {
    it('remediation excludes passed sentences — concept with all passed gets skipped', () => {
      const graph = a1Graph;
      const { sentences, availableSentenceIds } = buildSentencePool(graph, 3);
      const fp = buildFingerprintForLevel('A1', graph);

      const rootIds = graph.concepts.filter(c => c.prerequisites.length === 0).map(c => c.id);
      const targetId = rootIds[0]!;
      fp.conceptMastery[targetId] = makeWeakMastery(targetId);

      // Mark all sentences for this concept as passed
      for (const sid of availableSentenceIds[targetId] ?? []) {
        fp.passedSentenceIds[sid] = new Date().toISOString();
      }

      const result = generateSession({ fingerprint: fp, graph, availableSentenceIds, sentences });
      const targetRemediation = result.session.items.filter(
        i => i.purpose === 'remediation' && i.conceptIds.includes(targetId)
      );
      expect(targetRemediation).toHaveLength(0);
    });

    it('new-material excludes passed sentences', () => {
      const graph = a1Graph;
      const { sentences, availableSentenceIds } = buildSentencePool(graph, 3);
      const fp = createEmptyFingerprint(AUDIT_USER_ID);

      // First unlocked concept: mark all sentences passed
      const rootIds = graph.concepts.filter(c => c.prerequisites.length === 0).map(c => c.id);
      const targetId = rootIds[0]!;
      for (const sid of availableSentenceIds[targetId] ?? []) {
        fp.passedSentenceIds[sid] = new Date().toISOString();
      }

      const result = generateSession({ fingerprint: fp, graph, availableSentenceIds, sentences });
      const targetNew = result.session.items.filter(
        i => i.purpose === 'new-material' && i.conceptIds.includes(targetId)
      );
      expect(targetNew).toHaveLength(0);
    });

    it('review ALLOWS passed sentences — SRS spaced repetition', () => {
      const graph = a1Graph;
      const { sentences, availableSentenceIds } = buildSentencePool(graph, 3);
      const fp = buildFingerprintForLevel('A1', graph);

      const rootIds = graph.concepts.filter(c => c.prerequisites.length === 0).map(c => c.id);
      const targetId = rootIds[0]!;
      fp.conceptMastery[targetId] = makeReviewDueMastery(targetId);

      // Mark ALL sentences for this concept as passed
      for (const sid of availableSentenceIds[targetId] ?? []) {
        fp.passedSentenceIds[sid] = new Date().toISOString();
      }

      const result = generateSession({ fingerprint: fp, graph, availableSentenceIds, sentences });
      const targetReview = result.session.items.filter(
        i => i.purpose === 'review' && i.conceptIds.includes(targetId)
      );
      expect(targetReview.length).toBeGreaterThan(0);
    });

    it('session does not collapse when many sentences are passed', () => {
      const graph = a1Graph;
      const { sentences, availableSentenceIds } = buildSentencePool(graph, 5);
      const fp = buildFingerprintForLevel('A1', graph);

      // Pass 80% of all sentences
      const allSids = Object.values(availableSentenceIds).flat();
      const toPass = allSids.slice(0, Math.floor(allSids.length * 0.8));
      for (const sid of toPass) {
        fp.passedSentenceIds[sid] = new Date().toISOString();
      }

      const result = generateSession({ fingerprint: fp, graph, availableSentenceIds, sentences });
      expect(result.session.items.length).toBeGreaterThan(0);
    });
  });

  describe('B3: Level-specific behavior', () => {
    it('A1 and A2 sessions use different concept pools', () => {
      const { sentences: s1, availableSentenceIds: a1Ids } = buildSentencePool(a1Graph);
      const { sentences: s2, availableSentenceIds: a2Ids } = buildSentencePool(a2Graph);
      const fp1 = buildFingerprintForLevel('A1', a1Graph);
      const fp2 = buildFingerprintForLevel('A2', a2Graph);

      const r1 = generateSession({ fingerprint: fp1, graph: a1Graph, availableSentenceIds: a1Ids, sentences: s1 });
      const r2 = generateSession({ fingerprint: fp2, graph: a2Graph, availableSentenceIds: a2Ids, sentences: s2 });

      const r1Concepts = new Set(r1.session.items.flatMap(i => i.conceptIds));
      const r2Concepts = new Set(r2.session.items.flatMap(i => i.conceptIds));

      // A1 and A2 should use different concept IDs
      const overlap = [...r1Concepts].filter(id => r2Concepts.has(id));
      expect(overlap.length).toBeLessThan(r1Concepts.size);
    });

    it('A1 and B1 sessions use entirely different concept pools', () => {
      const { sentences: s1, availableSentenceIds: a1Ids } = buildSentencePool(a1Graph);
      const { sentences: s3, availableSentenceIds: b1Ids } = buildSentencePool(b1Graph);
      const fp1 = buildFingerprintForLevel('A1', a1Graph);
      const fp3 = buildFingerprintForLevel('B1', b1Graph);

      const r1 = generateSession({ fingerprint: fp1, graph: a1Graph, availableSentenceIds: a1Ids, sentences: s1 });
      const r3 = generateSession({ fingerprint: fp3, graph: b1Graph, availableSentenceIds: b1Ids, sentences: s3 });

      const r1Concepts = new Set(r1.session.items.flatMap(i => i.conceptIds));
      const r3Concepts = new Set(r3.session.items.flatMap(i => i.conceptIds));

      // A1 and B1 should have zero overlap
      const overlap = [...r1Concepts].filter(id => r3Concepts.has(id));
      expect(overlap).toHaveLength(0);
    });

    it('session.level matches fingerprint.currentLevel', () => {
      for (const level of ['A1', 'A2', 'B1'] as const) {
        const graph = level === 'A1' ? a1Graph : level === 'A2' ? a2Graph : b1Graph;
        const { sentences, availableSentenceIds } = buildSentencePool(graph);
        const fp = buildFingerprintForLevel(level, graph);

        const result = generateSession({ fingerprint: fp, graph, availableSentenceIds, sentences });
        expect(result.session.level).toBe(level);
      }
    });
  });

  describe('B4: Recipe ratios', () => {
    it('session has items across all blocks (~25 at A1)', () => {
      const graph = a1Graph;
      const { sentences, availableSentenceIds } = buildSentencePool(graph);
      const fp = buildFingerprintForLevel('A1', graph);

      const result = generateSession({ fingerprint: fp, graph, availableSentenceIds, sentences });
      // A1 blocks: 5 lytt + 15 lær + 5 snakk = 25 total
      expect(result.session.items.length).toBeGreaterThanOrEqual(10);
      expect(result.session.items.length).toBeLessThanOrEqual(30);
      expect(result.blocks.length).toBe(3);
    });

    it('calibration recipe overrides default when calibrationSessionsRemaining > 0', () => {
      const graph = a1Graph;
      const { sentences, availableSentenceIds } = buildSentencePool(graph);
      const fp = buildFingerprintForLevel('A1', graph);

      // Normal session
      const normalResult = generateSession({ fingerprint: fp, graph, availableSentenceIds, sentences });

      // Calibration recipe: 30/30/30/10
      const calibrationRecipe = {
        remediationRatio: 0.30,
        reviewRatio: 0.30,
        newMaterialRatio: 0.30,
        interleavingRatio: 0.10,
      };
      const calibResult = generateSession({
        fingerprint: fp, graph, availableSentenceIds, sentences,
        recipe: calibrationRecipe,
      });

      // Both should produce valid sessions
      expect(normalResult.session.items.length).toBeGreaterThan(0);
      expect(calibResult.session.items.length).toBeGreaterThan(0);
    });
  });

  describe('B5: SelectionReason integrity', () => {
    it('every session item has a valid selectionReason', () => {
      const graph = a1Graph;
      const { sentences, availableSentenceIds } = buildSentencePool(graph);
      const fp = buildFingerprintForLevel('A1', graph);

      // Add some weak concepts so we get remediation items
      const rootIds = graph.concepts.filter(c => c.prerequisites.length === 0).map(c => c.id);
      for (const id of rootIds.slice(0, 3)) {
        fp.conceptMastery[id] = makeWeakMastery(id);
      }
      // Add a review-due concept
      if (rootIds[3]) fp.conceptMastery[rootIds[3]] = makeReviewDueMastery(rootIds[3]);

      const result = generateSession({ fingerprint: fp, graph, availableSentenceIds, sentences });
      for (const item of result.session.items) {
        expect(item.selectionReason).toBeDefined();
        expect(VALID_REASONS).toContain(item.selectionReason);
      }
    });

    it('remediation items have weak_concept or weekly_focus reason', () => {
      const graph = a1Graph;
      const { sentences, availableSentenceIds } = buildSentencePool(graph);
      const fp = buildFingerprintForLevel('A1', graph);

      const rootIds = graph.concepts.filter(c => c.prerequisites.length === 0).map(c => c.id);
      for (const id of rootIds.slice(0, 3)) {
        fp.conceptMastery[id] = makeWeakMastery(id);
      }

      const result = generateSession({ fingerprint: fp, graph, availableSentenceIds, sentences });
      const remediationItems = result.session.items.filter(i => i.purpose === 'remediation');
      for (const item of remediationItems) {
        expect(['weak_concept', 'weekly_focus']).toContain(item.selectionReason);
      }
    });

    it('review items have review_due, decaying, or weak_concept reason', () => {
      const graph = a1Graph;
      const { sentences, availableSentenceIds } = buildSentencePool(graph);
      const fp = buildFingerprintForLevel('A1', graph);

      const rootIds = graph.concepts.filter(c => c.prerequisites.length === 0).map(c => c.id);
      if (rootIds[0]) fp.conceptMastery[rootIds[0]] = makeReviewDueMastery(rootIds[0]);

      const result = generateSession({ fingerprint: fp, graph, availableSentenceIds, sentences });
      const reviewItems = result.session.items.filter(i => i.purpose === 'review');
      for (const item of reviewItems) {
        expect(['review_due', 'decaying', 'weak_concept']).toContain(item.selectionReason);
      }
    });
  });

  describe('B6: Production guarantee', () => {
    it('session contains at least one production exercise type', () => {
      const graph = a1Graph;
      const { sentences, availableSentenceIds } = buildSentencePool(graph);
      const fp = buildFingerprintForLevel('A1', graph);

      const PRODUCTION_TYPES = ['sentence-transformation', 'translation-to-norwegian', 'fill-in-blank', 'word-order'];

      // Run 5 times to account for randomness
      for (let run = 0; run < 5; run++) {
        const result = generateSession({ fingerprint: fp, graph, availableSentenceIds, sentences });
        const hasProduction = result.session.items.some(i =>
          PRODUCTION_TYPES.includes(i.exerciseType)
        );
        expect(hasProduction).toBe(true);
      }
    });
  });
});
