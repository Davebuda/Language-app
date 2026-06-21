import { describe, it, expect } from 'vitest'
import { verifyAdjectiveCorrection } from '@/lib/adjective-verifier'

const v = (original: string, corrected: string, context: string) =>
  verifyAdjectiveCorrection({ original, corrected, context })

describe('verifyAdjectiveCorrection (deterministic agreement gate, p4 Lever 2)', () => {
  it('confirms a neuter +t fix after "et"', () => {
    expect(v('stor', 'stort', 'jeg har et stor hus')).toBe('confirmed')
  })

  it('confirms a common base fix after "en"', () => {
    // learner over-applied -t: "en stort bil" → "en stor bil"
    expect(v('stort', 'stor', 'jeg ser en stort bil')).toBe('confirmed')
  })

  it('confirms a plural/definite +e fix after a plural determiner', () => {
    expect(v('stor', 'store', 'de stor husene er fine')).toBe('confirmed')
  })

  it('rejects a correction that contradicts the determiner (en → still common)', () => {
    // context is "en" (common) but the AI wrongly changes the correct "stor" to neuter "stort"
    expect(v('stor', 'stort', 'jeg ser en stor bil')).toBe('rejected')
  })

  it('respects -ig adjectives that take no -t (et viktig møte)', () => {
    // learner wrote plural "viktige" in a neuter singular slot → corrected to "viktig"
    expect(v('viktige', 'viktig', 'det er et viktige møte')).toBe('confirmed')
  })

  it('is not-applicable with no determiner (predicative position out of scope)', () => {
    expect(v('stor', 'stort', 'huset er stor')).toBe('not-applicable')
  })

  it('is not-applicable when the words are different adjectives (not an agreement change)', () => {
    expect(v('stor', 'god', 'jeg har et stor hus')).toBe('not-applicable')
  })

  it('is OOV-safe: an unknown adjective never confirms', () => {
    expect(v('zzqqx', 'stort', 'jeg har et zzqqx hus')).toBe('not-applicable')
  })

  it('never confirms a no-op (original === corrected)', () => {
    expect(v('stort', 'stort', 'jeg har et stort hus')).toBe('not-applicable')
  })
})
