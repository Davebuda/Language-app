import { describe, it, expect } from 'vitest';
import { SEED_PASSAGES, SEED_PASSAGE_IDS } from '@/lib/passage-pool';

describe('passage-pool', () => {
  it('loads passages keyed by id with camelCase fields', () => {
    const p = SEED_PASSAGES['cz-a1-v2-morning'];
    expect(p).toBeDefined();
    expect(p.primaryConceptId).toBe('v2-word-order');
    expect(p.segments.some((s) => s.kind === 'gap')).toBe(true);
  });

  it('maps gap snake_case fields to camelCase', () => {
    const p = SEED_PASSAGES['cz-a1-v2-morning'];
    const gap = p.segments.find((s) => s.kind === 'gap');
    expect(gap).toBeDefined();
    if (gap && gap.kind === 'gap') {
      expect(typeof gap.answer).toBe('string');
      expect(typeof gap.conceptId).toBe('string');
      expect(typeof gap.errorTag).toBe('string');
    }
  });

  it('indexes passage ids by primaryConceptId', () => {
    expect(SEED_PASSAGE_IDS['v2-word-order']).toContain('cz-a1-v2-morning');
    expect(SEED_PASSAGE_IDS['preterite-regular']).toContain('cz-a2-preterite-dinner');
  });
});
