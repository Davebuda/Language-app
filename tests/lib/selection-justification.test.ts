import { describe, it, expect } from 'vitest'
import { selectionJustification } from '@/lib/selection-justification'
import type { ConceptMastery } from '@/types/fingerprint'

const mastery = (recentOutcomes: boolean[]): ConceptMastery =>
  ({ recentOutcomes } as ConceptMastery)

describe('selectionJustification', () => {
  it('weak_concept names the recent-miss count when evidence exists', () => {
    expect(selectionJustification('weak_concept', mastery([false, true, false, false, true])))
      .toBe('Du bommet 3 av 5 sist')
  })

  it('weak_concept falls back gracefully with no misses or no mastery row', () => {
    expect(selectionJustification('weak_concept', mastery([true, true, true]))).toBe('Et svakt punkt for deg')
    expect(selectionJustification('weak_concept', undefined)).toBe('Et svakt punkt for deg')
    // legacy mastery row lacking recentOutcomes must not throw
    expect(selectionJustification('weak_concept', {} as ConceptMastery)).toBe('Et svakt punkt for deg')
  })

  it('every selection reason yields a non-empty Norwegian phrase', () => {
    const reasons = [
      'review_due', 'decaying', 'new_material', 'interleaving',
      'weekly_focus', 'repair_target', 'cold_start',
    ] as const
    for (const r of reasons) {
      const s = selectionJustification(r)
      expect(s.length).toBeGreaterThan(0)
    }
  })
})
