import { describe, it, expect } from 'vitest'
import { detectExercisedConcepts } from '@/lib/concept-detectors'

describe('detectExercisedConcepts (Q-matrix, precision-first)', () => {
  it('detects personal pronouns', () => {
    expect(detectExercisedConcepts('Jeg liker kaffe')).toContain('personal-pronouns')
  })

  it('detects a gender/article choice point through intervening adjectives', () => {
    const r = detectExercisedConcepts('Det blir en ny bil')
    expect(r).toContain('noun-gender')
    expect(r).toContain('indefinite-articles')
  })

  it('detects modals and negation together', () => {
    const r = detectExercisedConcepts('Han kan ikke komme')
    expect(r).toContain('common-modal-verbs')
    expect(r).toContain('negation')
  })

  it('does NOT mistake the indefinite article "en" for the numeral "one"', () => {
    expect(detectExercisedConcepts('Jeg har en bil')).not.toContain('numbers-basic')
  })

  it('detects real numerals (≥2) and digits', () => {
    expect(detectExercisedConcepts('Hun bor her i tre år')).toContain('numbers-basic')
    expect(detectExercisedConcepts('Jeg er 30 år gammel')).toContain('numbers-basic')
  })

  it('detects prepositions and possessives', () => {
    const r = detectExercisedConcepts('Boka ligger på mitt bord')
    expect(r).toContain('common-prepositions')
    expect(r).toContain('possessive-pronouns')
  })

  it('under-tags: definite-form noun with no article is NOT a gender choice point', () => {
    const r = detectExercisedConcepts('Kvaliteten forbedres stadig')
    expect(r).not.toContain('noun-gender')
    expect(r).not.toContain('personal-pronouns')
  })

  it('does NOT fire personal-pronouns on the expletive/formal-subject "det"', () => {
    // "It can be argued that…" — det is a formal subject, not a referential pronoun.
    expect(detectExercisedConcepts('Det kan argumenteres for dette')).not.toContain('personal-pronouns')
    // but a real referential pronoun still fires
    expect(detectExercisedConcepts('Vi argumenterer for dette')).toContain('personal-pronouns')
  })
})
