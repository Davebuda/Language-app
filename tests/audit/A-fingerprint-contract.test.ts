/**
 * AUDIT SUITE A — Fingerprint Contract
 *
 * Proves:
 * - fingerprint exists and has correct structure
 * - level exists and is a valid CEFRLevel
 * - weak concepts exist and are derived from mastery data
 * - mastery / exposure / review state exist and are well-formed
 * - the daily generator (scheduler) reads from the fingerprint
 * - seedInitialMastery populates root concepts
 * - decay, confidence, and SRS fields are computed correctly
 */
import { describe, it, expect } from 'vitest';
import { createEmptyFingerprint } from '@/types/fingerprint';
import type { CEFRLevel, ConceptMastery } from '@/types/fingerprint';
import { updateConceptMastery, seedInitialMastery, refreshDecay, isMastered, getConceptPhase } from '@/engine/fingerprint';
import { getPrimaryWeakConcepts, getDecayingConcepts, getReviewDueConcepts } from '@/engine/diagnosis';
import { generateSession } from '@/engine/scheduler';
import {
  AUDIT_USER_ID, a1Graph, a2Graph, b1Graph,
  makeMastery, makeWeakMastery, makeStrongMastery, makeReviewDueMastery,
  buildSentencePool, buildFingerprintForLevel,
} from './helpers';

describe('A: Fingerprint Contract', () => {

  describe('A1: Structure integrity', () => {
    it('createEmptyFingerprint returns all required fields', () => {
      const fp = createEmptyFingerprint(AUDIT_USER_ID);

      expect(fp.userId).toBe(AUDIT_USER_ID);
      expect(fp.currentLevel).toBe('A1');
      expect(fp.conceptMastery).toEqual({});
      expect(fp.recentErrors).toEqual([]);
      expect(fp.errorPatterns).toEqual([]);
      expect(fp.passedSentenceIds).toEqual({});
      expect(fp.weeklyFocus).toEqual([]);
      expect(fp.weekStartedAt).toBeNull();
      expect(fp.weeklySprintHistory).toEqual([]);
      expect(fp.weekStartSnapshots).toEqual({});
      expect(fp.calibrationSessionsRemaining).toBe(5);
      expect(fp.totalSessionsCompleted).toBe(0);
      expect(fp.productionGap).toEqual({});
      expect(fp.inputProductionPreference).toBe('balanced');
    });

    it('currentLevel is always a valid CEFRLevel', () => {
      const valid: CEFRLevel[] = ['A1', 'A2', 'B1', 'B2'];
      const fp = createEmptyFingerprint(AUDIT_USER_ID);
      expect(valid).toContain(fp.currentLevel);
    });

    it('passedSentenceIds is a record, not an array', () => {
      const fp = createEmptyFingerprint(AUDIT_USER_ID);
      expect(typeof fp.passedSentenceIds).toBe('object');
      expect(Array.isArray(fp.passedSentenceIds)).toBe(false);
    });
  });

  describe('A2: Seeding and initial mastery', () => {
    it('seedInitialMastery populates root concepts for A1 graph', () => {
      const fp = createEmptyFingerprint(AUDIT_USER_ID);
      const seeded = seedInitialMastery(fp, a1Graph);

      const rootConcepts = a1Graph.concepts.filter(c => c.prerequisites.length === 0);
      expect(rootConcepts.length).toBeGreaterThan(0);

      for (const concept of rootConcepts) {
        const m = seeded.conceptMastery[concept.id];
        expect(m).toBeDefined();
        expect(m.rawScore).toBe(50);
        expect(m.confidenceScore).toBe(0.15);
        expect(m.decayedScore).toBe(50);
        expect(m.attemptCount).toBe(0);
      }
    });

    it('seedInitialMastery does NOT seed dependent concepts', () => {
      const fp = createEmptyFingerprint(AUDIT_USER_ID);
      const seeded = seedInitialMastery(fp, a1Graph);

      const dependentConcepts = a1Graph.concepts.filter(c => c.prerequisites.length > 0);
      for (const concept of dependentConcepts) {
        expect(seeded.conceptMastery[concept.id]).toBeUndefined();
      }
    });

    it('seedInitialMastery is idempotent — second call is a no-op', () => {
      const fp = createEmptyFingerprint(AUDIT_USER_ID);
      const first = seedInitialMastery(fp, a1Graph);
      const second = seedInitialMastery(first, a1Graph);
      expect(second).toBe(first); // reference equality — same object
    });

    it('each level graph has at least 5 concepts', () => {
      expect(a1Graph.concepts.length).toBeGreaterThanOrEqual(5);
      expect(a2Graph.concepts.length).toBeGreaterThanOrEqual(5);
      expect(b1Graph.concepts.length).toBeGreaterThanOrEqual(5);
    });

    it('concept IDs are unique within each graph', () => {
      for (const graph of [a1Graph, a2Graph, b1Graph]) {
        const ids = graph.concepts.map(c => c.id);
        expect(new Set(ids).size).toBe(ids.length);
      }
    });
  });

  describe('A3: Mastery scoring correctness', () => {
    it('updateConceptMastery increases rawScore on correct answer', () => {
      const initial = makeMastery('test-concept', { rawScore: 50 });
      const updated = updateConceptMastery(initial, true, 15, 3);
      expect(updated.rawScore).toBeGreaterThan(50);
    });

    it('updateConceptMastery decreases rawScore on wrong answer', () => {
      const initial = makeMastery('test-concept', { rawScore: 50 });
      const updated = updateConceptMastery(initial, false, 15, 3);
      expect(updated.rawScore).toBeLessThan(50);
    });

    it('slip detection reduces impact of wrong answer after strong streak', () => {
      const strong = makeMastery('test-concept', {
        rawScore: 85,
        recentOutcomes: [true, true, true, true, true],
        attemptCount: 20,
      });
      const normalWrong = makeMastery('test-concept', {
        rawScore: 85,
        recentOutcomes: [false, false, true, false, true],
        attemptCount: 20,
      });

      const afterSlip = updateConceptMastery(strong, false, 15, 3);
      const afterNormalWrong = updateConceptMastery(normalWrong, false, 15, 3);

      // Slip should reduce score LESS than a normal wrong
      expect(afterSlip.rawScore).toBeGreaterThan(afterNormalWrong.rawScore);
    });

    it('SRS level advances on correct and resets on wrong', () => {
      const base = makeMastery('test-concept', { srsLevel: 2, nextReviewAt: null });
      const afterCorrect = updateConceptMastery(base, true, 15, 3);
      expect(afterCorrect.srsLevel).toBe(3);

      const afterWrong = updateConceptMastery(base, false, 15, 3);
      expect(afterWrong.srsLevel).toBe(0);
    });

    it('nextReviewAt is always set after an answer', () => {
      const base = makeMastery('test-concept', { nextReviewAt: null });
      const updated = updateConceptMastery(base, true, 15, 3);
      expect(updated.nextReviewAt).not.toBeNull();
    });

    it('isMastered requires ALL four gates', () => {
      // Missing confidence
      expect(isMastered(
        makeMastery('x', { rawScore: 90, confidenceScore: 0.5, attemptCount: 20, uniqueDaysActive: 5 }),
        80, 15, 3
      )).toBe(false);

      // Missing attempts
      expect(isMastered(
        makeMastery('x', { rawScore: 90, confidenceScore: 0.9, attemptCount: 5, uniqueDaysActive: 5 }),
        80, 15, 3
      )).toBe(false);

      // Missing days
      expect(isMastered(
        makeMastery('x', { rawScore: 90, confidenceScore: 0.9, attemptCount: 20, uniqueDaysActive: 1 }),
        80, 15, 3
      )).toBe(false);

      // Missing score
      expect(isMastered(
        makeMastery('x', { rawScore: 50, confidenceScore: 0.9, attemptCount: 20, uniqueDaysActive: 5 }),
        80, 15, 3
      )).toBe(false);

      // All gates met
      expect(isMastered(
        makeMastery('x', { rawScore: 90, confidenceScore: 0.9, attemptCount: 20, uniqueDaysActive: 5 }),
        80, 15, 3
      )).toBe(true);
    });
  });

  describe('A4: Decay system', () => {
    it('refreshDecay reduces decayedScore for stale concepts', () => {
      const fp = createEmptyFingerprint(AUDIT_USER_ID);
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      fp.conceptMastery['stale'] = makeMastery('stale', {
        rawScore: 80,
        decayedScore: 80,
        lastAttemptAt: thirtyDaysAgo,
      });

      const refreshed = refreshDecay(fp);
      const stale = refreshed.conceptMastery['stale'];
      expect(stale.decayedScore).toBeLessThan(80);
      expect(stale.decayedScore).toBeGreaterThanOrEqual(35); // decay floor
    });

    it('decay floor is 35, never zero', () => {
      const fp = createEmptyFingerprint(AUDIT_USER_ID);
      const yearAgo = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString();
      fp.conceptMastery['ancient'] = makeMastery('ancient', {
        rawScore: 90,
        decayedScore: 90,
        lastAttemptAt: yearAgo,
      });

      const refreshed = refreshDecay(fp);
      expect(refreshed.conceptMastery['ancient'].decayedScore).toBe(35);
    });

    it('recently practiced concepts do not decay significantly', () => {
      const fp = createEmptyFingerprint(AUDIT_USER_ID);
      fp.conceptMastery['fresh'] = makeMastery('fresh', {
        rawScore: 80,
        decayedScore: 80,
        lastAttemptAt: new Date().toISOString(),
      });

      const refreshed = refreshDecay(fp);
      expect(refreshed.conceptMastery['fresh'].decayedScore).toBeGreaterThanOrEqual(79);
    });
  });

  describe('A5: Weak / decaying / review-due concept detection', () => {
    it('getPrimaryWeakConcepts returns weakest by decayedScore', () => {
      const fp = buildFingerprintForLevel('A1', a1Graph);
      const rootIds = a1Graph.concepts.filter(c => c.prerequisites.length === 0).map(c => c.id);

      // Set different scores
      if (rootIds[0]) fp.conceptMastery[rootIds[0]] = makeWeakMastery(rootIds[0]);
      if (rootIds[1]) fp.conceptMastery[rootIds[1]] = makeMastery(rootIds[1], { decayedScore: 40 });
      if (rootIds[2]) fp.conceptMastery[rootIds[2]] = makeStrongMastery(rootIds[2]);

      const weak = getPrimaryWeakConcepts(fp, 3);
      expect(weak.length).toBeGreaterThan(0);
      // Weakest should be first
      if (rootIds[0]) expect(weak[0]).toBe(rootIds[0]);
    });

    it('getDecayingConcepts detects rawScore >= 70 but decayedScore < 70', () => {
      const fp = createEmptyFingerprint(AUDIT_USER_ID);
      fp.conceptMastery['decaying'] = makeMastery('decaying', {
        rawScore: 75,
        decayedScore: 60,
        attemptCount: 10,
      });
      fp.conceptMastery['healthy'] = makeMastery('healthy', {
        rawScore: 75,
        decayedScore: 75,
        attemptCount: 10,
      });

      const decaying = getDecayingConcepts(fp);
      expect(decaying).toContain('decaying');
      expect(decaying).not.toContain('healthy');
    });

    it('getReviewDueConcepts finds SRS-due concepts', () => {
      const fp = createEmptyFingerprint(AUDIT_USER_ID);
      fp.conceptMastery['due'] = makeReviewDueMastery('due');
      fp.conceptMastery['not-due'] = makeMastery('not-due', {
        nextReviewAt: new Date(Date.now() + 86400000).toISOString(),
      });

      const due = getReviewDueConcepts(fp);
      expect(due).toContain('due');
      expect(due).not.toContain('not-due');
    });
  });

  describe('A6: Phase model', () => {
    it('locked when prerequisites not met', () => {
      const phase = getConceptPhase(undefined, ['prereq-1'], new Set());
      expect(phase).toBe('locked');
    });

    it('intro when fewer than 5 attempts', () => {
      const m = makeMastery('x', { attemptCount: 3 });
      const phase = getConceptPhase(m, [], new Set());
      expect(phase).toBe('intro');
    });

    it('practice when >= 5 attempts and score < 70', () => {
      const m = makeMastery('x', { attemptCount: 10, rawScore: 50 });
      const phase = getConceptPhase(m, [], new Set());
      expect(phase).toBe('practice');
    });

    it('consolidation when score 70-84', () => {
      const m = makeMastery('x', { attemptCount: 10, rawScore: 75 });
      const phase = getConceptPhase(m, [], new Set());
      expect(phase).toBe('consolidation');
    });

    it('maintenance when score >= 85', () => {
      const m = makeMastery('x', { attemptCount: 10, rawScore: 90 });
      const phase = getConceptPhase(m, [], new Set());
      expect(phase).toBe('maintenance');
    });
  });

  describe('A7: Fingerprint feeds the scheduler', () => {
    it('scheduler reads fingerprint.conceptMastery to build weak concepts', () => {
      const graph = a1Graph;
      const { sentences, availableSentenceIds } = buildSentencePool(graph);
      const fp = buildFingerprintForLevel('A1', graph);

      const rootIds = graph.concepts.filter(c => c.prerequisites.length === 0).map(c => c.id);
      if (rootIds[0]) fp.conceptMastery[rootIds[0]] = makeWeakMastery(rootIds[0]);

      const result = generateSession({ fingerprint: fp, graph, availableSentenceIds, sentences });

      expect(result.weakConcepts.length).toBeGreaterThan(0);
      expect(result.session.items.length).toBeGreaterThan(0);
    });

    it('scheduler reads fingerprint.passedSentenceIds to filter content', () => {
      const graph = a1Graph;
      const { sentences, availableSentenceIds } = buildSentencePool(graph, 3);
      const fp = buildFingerprintForLevel('A1', graph);
      const rootIds = graph.concepts.filter(c => c.prerequisites.length === 0).map(c => c.id);

      // Mark ALL sentences for first root concept as passed
      if (rootIds[0]) {
        fp.conceptMastery[rootIds[0]] = makeWeakMastery(rootIds[0]);
        const sids = availableSentenceIds[rootIds[0]] ?? [];
        for (const sid of sids) {
          fp.passedSentenceIds[sid] = new Date().toISOString();
        }
      }

      const result = generateSession({ fingerprint: fp, graph, availableSentenceIds, sentences });
      const remediationForFirst = result.session.items.filter(
        i => i.purpose === 'remediation' && i.conceptIds.includes(rootIds[0]!)
      );
      // All sentences passed → concept should be skipped in remediation
      expect(remediationForFirst).toHaveLength(0);
    });

    it('scheduler reads fingerprint.weeklyFocus for remediation bias', () => {
      const graph = a1Graph;
      const { sentences, availableSentenceIds } = buildSentencePool(graph);
      const fp = buildFingerprintForLevel('A1', graph);

      const rootIds = graph.concepts.filter(c => c.prerequisites.length === 0).map(c => c.id);
      fp.weeklyFocus = rootIds.slice(0, 2);
      fp.weekStartedAt = new Date().toISOString();

      const result = generateSession({ fingerprint: fp, graph, availableSentenceIds, sentences });
      const focusItems = result.session.items.filter(
        i => i.selectionReason === 'weekly_focus'
      );
      expect(focusItems.length).toBeGreaterThan(0);
    });

    it('scheduler reads fingerprint.currentLevel via session output', () => {
      const fp = buildFingerprintForLevel('A2', a2Graph);
      const { sentences, availableSentenceIds } = buildSentencePool(a2Graph);

      const result = generateSession({ fingerprint: fp, graph: a2Graph, availableSentenceIds, sentences });
      expect(result.session.level).toBe('A2');
    });
  });
});
