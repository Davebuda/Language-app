import { describe, it, expect } from 'vitest'
import { verifyCompoundCorrection } from '@/lib/compound-verifier'

const v = (original: string, corrected: string) =>
  verifyCompoundCorrection({ original, corrected })

describe('verifyCompoundCorrection (deterministic særskrivning gate, p4 Lever 2)', () => {
  it('confirms an isolated split→join of an attested compound', () => {
    expect(v('fot ball', 'fotball')).toBe('confirmed')
  })

  it('confirms the split→join in-sentence with aligned leading context', () => {
    expect(v('jeg har en rød vin', 'jeg har en rødvin')).toBe('confirmed')
  })

  it('confirms a linking-element compound by matching the JOINED form (barne+hage)', () => {
    // The parts ("barne") need not be standalone words — only the joined form must
    // be attested. This is why the anchor is the join, not the constituents.
    expect(v('barne hage', 'barnehage')).toBe('confirmed')
  })

  it('is not-applicable for a productive compound absent from the lexicon (conservative)', () => {
    // "kaffekopp" is a real compound but outside the frequency-bounded pos-map →
    // we cannot prove it, so we stay show-don't-grade rather than guess.
    expect(v('kaffe kopp', 'kaffekopp')).toBe('not-applicable')
  })

  it('does NOT confirm joining two known words into a non-word (over-join guard)', () => {
    // "jeg" + "ser" are both real words, but "jegser" is not a compound. The
    // attested-join anchor rejects it — the exact false positive a "both parts
    // known" rule would wrongly admit to mastery.
    expect(v('jeg ser', 'jegser')).toBe('not-applicable')
  })

  it('is not-applicable for the reverse over-join direction (idag → i dag)', () => {
    // The canonical error is the split; a lexicon cannot prove a join is invalid.
    expect(v('idag', 'i dag')).toBe('not-applicable')
  })

  it('is not-applicable when more than the compound differs (multiple edits)', () => {
    expect(v('jeg ser fot ball', 'du ser fotball')).toBe('not-applicable')
  })

  it('never confirms a no-op (original === corrected)', () => {
    expect(v('fotball', 'fotball')).toBe('not-applicable')
  })
})
