import { describe, it, expect } from 'vitest'
import { verifyConjugationCorrection } from '@/lib/conjugation-verifier'

const v = (original: string, corrected: string, context: string) =>
  verifyConjugationCorrection({ original, corrected, context })

describe('verifyConjugationCorrection (deterministic conjugation gate, p4 Lever 2)', () => {
  it('confirms a present→preterite fix when a past marker is present', () => {
    expect(v('spiser', 'spiste', 'jeg spiser middag i går')).toBe('confirmed')
    expect(v('snakker', 'snakket', 'vi snakker sammen i går')).toBe('confirmed')
  })

  it('confirms an irregular verb tense fix', () => {
    // går → gikk (gå), past marker "i går" in the utterance
    expect(v('går', 'gikk', 'i går går jeg hjem')).toBe('confirmed')
  })

  it('confirms when the change is a single token inside a phrase', () => {
    expect(v('jeg spiser', 'jeg spiste', 'i går spiser jeg middag')).toBe('confirmed')
  })

  it('rejects a correction that contradicts the marked tense', () => {
    // context is present ("i dag") but the AI changed to preterite → wrong
    expect(v('spiser', 'spiste', 'jeg spiser middag i dag')).toBe('rejected')
  })

  it('is not-applicable when there is no deterministic tense marker', () => {
    expect(v('spiser', 'spiste', 'jeg spiser middag')).toBe('not-applicable')
  })

  it('is not-applicable when the two words are different verbs (not a conjugation change)', () => {
    expect(v('spiser', 'drikker', 'jeg spiser i går')).toBe('not-applicable')
  })

  it('is OOV-safe: an unknown verb form never confirms', () => {
    expect(v('xyzzyfoo', 'spiste', 'i går xyzzyfoo jeg')).toBe('not-applicable')
  })

  it('is not-applicable when ambiguous markers conflict (past + present)', () => {
    expect(v('spiser', 'spiste', 'i går spiser jeg, men i dag også')).toBe('not-applicable')
  })

  it('never confirms a no-op (original === corrected)', () => {
    expect(v('spiste', 'spiste', 'jeg spiste i går')).toBe('not-applicable')
  })
})
