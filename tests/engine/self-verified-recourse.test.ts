import { describe, it, expect } from 'vitest'
import { updateConceptMastery } from '@/engine/fingerprint'
import { checkAnswer } from '@/lib/answer'
import type { ConceptMastery } from '@/types/fingerprint'

// Tier-0 / Option D (translate-to-English near-miss recourse, VC §3.7 + §3.1).
// Two guarantees that keep the recourse honest:
//   (A) REGRESSION — a self-attested correct moves mastery, but LESS than a verified
//       correct (reduced weight via learningRateScale), and never DOWN.
//   (B) GUARD — D adds recourse ON TOP of grading; it must not loosen the grader, so a
//       genuinely wrong-meaning English answer still grades wrong.

const base: ConceptMastery = {
  conceptId: 'c', rawScore: 50, confidenceScore: 0.5, decayedScore: 50,
  attemptCount: 6, correctCount: 3, uniqueDaysActive: 3,
  lastAttemptAt: new Date('2020-01-01').toISOString(), lastCorrectAt: null,
  streak: 0, recentOutcomes: [false, true, false], srsLevel: 2,
  nextReviewAt: new Date('2020-01-05').toISOString(),
}

describe('Option D — self-verified recourse keeps mastery honest', () => {
  it('(A) a self-verified correct moves mastery UP but by LESS than a verified correct', () => {
    const verified = updateConceptMastery(base, true, 15, 3, 1)      // full weight
    const selfVerified = updateConceptMastery(base, true, 15, 3, 0.5) // reduced weight (D)
    // Both move up from 50…
    expect(verified.rawScore).toBeGreaterThan(base.rawScore)
    expect(selfVerified.rawScore).toBeGreaterThan(base.rawScore)
    // …but the self-verified move is strictly smaller (the system didn't verify it).
    expect(selfVerified.rawScore).toBeLessThan(verified.rawScore)
  })

  it('(A) reduced weight never turns a correct into a mastery DROP', () => {
    const selfVerified = updateConceptMastery(base, true, 15, 3, 0.5)
    expect(selfVerified.rawScore).toBeGreaterThanOrEqual(base.rawScore)
  })

  it('(B) GUARD: the grader is unchanged — a wrong-meaning English answer still grades wrong', () => {
    // "the dog bites the man" vs "the man bites the dog" share all content words but
    // mean the opposite. D must not have loosened this into a pass.
    expect(checkAnswer('the dog bites the man', 'the man bites the dog')).toBe(false)
    // An exact/contraction match still passes (sanity — recourse never triggers here).
    expect(checkAnswer("I do not know", "I don't know")).toBe(true)
  })
})
