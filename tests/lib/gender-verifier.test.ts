import { describe, it, expect } from 'vitest'
import { verifyGenderCorrection, resolveGender } from '@/lib/gender-verifier'

describe('resolveGender', () => {
  it('resolves common nouns to their gender bitmask', () => {
    expect(resolveGender('hus')).toBe(4)   // neuter
    expect(resolveGender('jobb')).toBe(1)  // masculine
    expect(resolveGender('bok')).toBe(3)   // m|f two-gender
  })

  it('falls back to the final element for OOV compounds (longest-suffix)', () => {
    // "sommerjobb" is not a lexicon entry, but "jobb" is → inherit masculine.
    expect(resolveGender('sommerjobb')).toBe(1)
  })

  it('returns 0 for unknown words', () => {
    expect(resolveGender('zzqxnotaword')).toBe(0)
  })
})

describe('verifyGenderCorrection', () => {
  it('CONFIRMS a real gender error (learner wrong, AI right)', () => {
    // "et jobb" (neuter) is wrong — jobb is masculine; "en jobb" is right.
    expect(verifyGenderCorrection({ original: 'Jeg har et jobb', corrected: 'Jeg har en jobb' })).toBe('confirmed')
    // "en hus" wrong (hus is neuter) → "et hus".
    expect(verifyGenderCorrection({ original: 'en hus', corrected: 'et hus' })).toBe('confirmed')
  })

  it('REJECTS the poisoning case — AI changes a valid form to a wrong one', () => {
    // Learner wrote the CORRECT "en jobb"; the 8B wrongly "corrects" it to "et jobb".
    // jobb is masculine, so the learner was valid and the AI proposal is invalid → no grade.
    expect(verifyGenderCorrection({ original: 'en jobb', corrected: 'et jobb' })).toBe('rejected')
  })

  it('REJECTS the two-gender class — both articles are valid (no false flag)', () => {
    // "bok" is m|f: "en bok" and "ei bok" are BOTH correct Bokmål. An AI swap is not an error.
    expect(verifyGenderCorrection({ original: 'ei bok', corrected: 'en bok' })).toBe('rejected')
    expect(verifyGenderCorrection({ original: 'en bok', corrected: 'ei bok' })).toBe('rejected')
  })

  it('is NOT-APPLICABLE for unknown nouns (OOV → never grade)', () => {
    expect(verifyGenderCorrection({ original: 'et zzqxword', corrected: 'en zzqxword' })).toBe('not-applicable')
  })

  it('is NOT-APPLICABLE when there is no article+noun gender pair', () => {
    // Definite-form swap (boka↔boken) carries no indefinite article to assert a gender.
    expect(verifyGenderCorrection({ original: 'jeg leste boka', corrected: 'jeg leste boken' })).toBe('not-applicable')
    // Article omission, not a gender error.
    expect(verifyGenderCorrection({ original: 'jeg har jobb', corrected: 'jeg har en jobb' })).toBe('not-applicable')
    // Spelling-only diff (noun changes, no shared-noun gender swap).
    expect(verifyGenderCorrection({ original: 'en katt', corrected: 'en katter' })).toBe('not-applicable')
  })

  it('handles a confirmed error embedded in a longer sentence', () => {
    expect(
      verifyGenderCorrection({
        original: 'I går kjøpte jeg et bok på butikken',
        corrected: 'I går kjøpte jeg ei bok på butikken',
      }),
    ).toBe('confirmed') // "et bok" (neuter) is invalid for bok (m|f); "ei bok" is valid
  })
})
