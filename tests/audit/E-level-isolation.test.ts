/**
 * AUDIT SUITE E — Level Isolation
 *
 * Proves:
 * - getLevelContentConfig returns correct graph + filtered sentences per level
 * - No cross-level sentence leakage (A1 sentences don't appear in B1 config)
 * - B2 gets B1 content with fallback flag
 * - Content loader respects level filter
 * - Level gate config is correct for all 4 levels
 * - B1 part files are loaded (b1_part2.json, b1_part3.json)
 */
import { describe, it, expect } from 'vitest';
import { getLevelContentConfig } from '@/lib/level-gate';
import { getGraphForLevel } from '@/lib/concept-graph-loader';
import type { CEFRLevel } from '@/types/fingerprint';

const LEVELS: CEFRLevel[] = ['A1', 'A2', 'B1', 'B2'];

describe('E: Level Isolation', () => {

  describe('E1: Level gate config correctness', () => {
    it('every level returns a non-empty graph', () => {
      for (const level of LEVELS) {
        const config = getLevelContentConfig(level);
        expect(config.graph.concepts.length).toBeGreaterThan(0);
      }
    });

    it('A1, A2, B1 return non-empty sentence pools', () => {
      for (const level of ['A1', 'A2', 'B1'] as const) {
        const config = getLevelContentConfig(level);
        expect(Object.keys(config.sentences).length).toBeGreaterThan(0);
        expect(Object.keys(config.availableSentenceIds).length).toBeGreaterThan(0);
      }
    });

    it('config.level matches the requested level', () => {
      for (const level of LEVELS) {
        const config = getLevelContentConfig(level);
        expect(config.level).toBe(level);
      }
    });

    it('all 4 levels are marked complete', () => {
      for (const level of LEVELS) {
        expect(getLevelContentConfig(level).isComplete).toBe(true);
      }
    });

    it('no level has a fallback message', () => {
      for (const level of LEVELS) {
        expect(getLevelContentConfig(level).fallbackMessage).toBeNull();
      }
    });

    it('every level effectiveLevel equals its own level', () => {
      for (const level of LEVELS) {
        expect(getLevelContentConfig(level).effectiveLevel).toBe(level);
      }
    });

    it('A1/A2/B1 effectiveLevel equals their own level', () => {
      expect(getLevelContentConfig('A1').effectiveLevel).toBe('A1');
      expect(getLevelContentConfig('A2').effectiveLevel).toBe('A2');
      expect(getLevelContentConfig('B1').effectiveLevel).toBe('B1');
    });
  });

  describe('E2: No cross-level sentence leakage', () => {
    it('A1 config contains only sentences tagged with A1 concepts', () => {
      const config = getLevelContentConfig('A1');
      const a1ConceptIds = new Set(config.graph.concepts.map(c => c.id));

      for (const [conceptId] of Object.entries(config.availableSentenceIds)) {
        expect(a1ConceptIds.has(conceptId)).toBe(true);
      }
    });

    it('A2 config contains only sentences tagged with A2 concepts', () => {
      const config = getLevelContentConfig('A2');
      const a2ConceptIds = new Set(config.graph.concepts.map(c => c.id));

      for (const [conceptId] of Object.entries(config.availableSentenceIds)) {
        expect(a2ConceptIds.has(conceptId)).toBe(true);
      }
    });

    it('B1 config contains only sentences tagged with B1 concepts', () => {
      const config = getLevelContentConfig('B1');
      const b1ConceptIds = new Set(config.graph.concepts.map(c => c.id));

      for (const [conceptId] of Object.entries(config.availableSentenceIds)) {
        expect(b1ConceptIds.has(conceptId)).toBe(true);
      }
    });

    it('A1 and A2 sentence pools do not overlap', () => {
      const a1 = getLevelContentConfig('A1');
      const a2 = getLevelContentConfig('A2');

      const a1SentenceIds = new Set(Object.keys(a1.sentences));
      const a2SentenceIds = new Set(Object.keys(a2.sentences));

      const overlap = [...a1SentenceIds].filter(id => a2SentenceIds.has(id));
      expect(overlap).toHaveLength(0);
    });

    it('A1 and B1 sentence pools do not overlap', () => {
      const a1 = getLevelContentConfig('A1');
      const b1 = getLevelContentConfig('B1');

      const a1SentenceIds = new Set(Object.keys(a1.sentences));
      const b1SentenceIds = new Set(Object.keys(b1.sentences));

      const overlap = [...a1SentenceIds].filter(id => b1SentenceIds.has(id));
      expect(overlap).toHaveLength(0);
    });
  });

  describe('E3: B2 has its own graph distinct from B1', () => {
    it('B2 graph has different concept IDs than B1', () => {
      const b1Graph = getGraphForLevel('B1');
      const b2Graph = getGraphForLevel('B2');

      const b1ConceptIds = new Set(b1Graph.concepts.map(c => c.id));
      const b2ConceptIds = new Set(b2Graph.concepts.map(c => c.id));

      const overlap = [...b2ConceptIds].filter(id => b1ConceptIds.has(id));
      expect(overlap).toHaveLength(0);
    });

    it('B2 graph has at least 10 concepts', () => {
      const b2Graph = getGraphForLevel('B2');
      expect(b2Graph.concepts.length).toBeGreaterThanOrEqual(10);
    });

    it('B2 concepts have B1 prerequisites', () => {
      const b1Ids = new Set(getGraphForLevel('B1').concepts.map(c => c.id));
      const b2Graph = getGraphForLevel('B2');

      const hasB1Prereq = b2Graph.concepts.some(c =>
        c.prerequisites.some(p => b1Ids.has(p))
      );
      expect(hasB1Prereq).toBe(true);
    });
  });

  describe('E4: Level gate filters sentences by graph', () => {
    it('A1 config sentences are all tagged with A1 concepts', () => {
      const config = getLevelContentConfig('A1');
      const a1ConceptIds = new Set(config.graph.concepts.map(c => c.id));
      for (const s of Object.values(config.sentences)) {
        const hasA1Concept = s.conceptIds.some(cid => a1ConceptIds.has(cid));
        expect(hasA1Concept).toBe(true);
      }
    });

    it('B1 config sentences are all tagged with B1 concepts', () => {
      const config = getLevelContentConfig('B1');
      const b1ConceptIds = new Set(config.graph.concepts.map(c => c.id));
      for (const s of Object.values(config.sentences)) {
        const hasB1Concept = s.conceptIds.some(cid => b1ConceptIds.has(cid));
        expect(hasB1Concept).toBe(true);
      }
    });

    it('A1/A2/B1 configs have non-empty sentence pools', () => {
      for (const level of ['A1', 'A2', 'B1'] as const) {
        const config = getLevelContentConfig(level);
        expect(Object.keys(config.sentences).length).toBeGreaterThan(0);
      }
    });
  });

  describe('E5: corpus has substantial content at each level', () => {
    // Updated 2026-05-29: the content-overhaul depth pass deepened A1 from ~198
    // to ~591 sentences (avg ~27/concept), so A1 is now the most populated level
    // — the old "B1 > A1" assertion encoded the pre-overhaul thinness of A1 and
    // is obsolete. The real intent is that every shipped level is substantial.
    it('A1 has substantial content after the depth overhaul (≥ 300)', () => {
      const a1 = getLevelContentConfig('A1');
      const a1Count = Object.keys(a1.sentences).length;
      expect(a1Count).toBeGreaterThanOrEqual(300);
    });

    it('B1 has at least 300 sentences (canonical b1.json = 360)', () => {
      const b1 = getLevelContentConfig('B1');
      const b1Count = Object.keys(b1.sentences).length;
      expect(b1Count).toBeGreaterThanOrEqual(300);
    });
  });

  describe('E6: Level graph isolation', () => {
    it('each level graph has unique concept IDs (no cross-level concepts)', () => {
      const a1Ids = new Set(getGraphForLevel('A1').concepts.map(c => c.id));
      const a2Ids = new Set(getGraphForLevel('A2').concepts.map(c => c.id));
      const b1Ids = new Set(getGraphForLevel('B1').concepts.map(c => c.id));

      const a1a2Overlap = [...a1Ids].filter(id => a2Ids.has(id));
      const a1b1Overlap = [...a1Ids].filter(id => b1Ids.has(id));
      const a2b1Overlap = [...a2Ids].filter(id => b1Ids.has(id));

      expect(a1a2Overlap).toHaveLength(0);
      expect(a1b1Overlap).toHaveLength(0);
      expect(a2b1Overlap).toHaveLength(0);
    });

    it('concept counts per level are reasonable', () => {
      expect(getGraphForLevel('A1').concepts.length).toBeGreaterThanOrEqual(10);
      expect(getGraphForLevel('A2').concepts.length).toBeGreaterThanOrEqual(10);
      expect(getGraphForLevel('B1').concepts.length).toBeGreaterThanOrEqual(10);
    });
  });
});
