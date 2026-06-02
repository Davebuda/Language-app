import { describe, it, expect } from 'vitest'
import { buildClozeFromSentence } from '@/lib/auto-cloze'
import { buildClozeResults, getClozeGaps } from '@/lib/cloze'
import type { Sentence } from '@/types/content'

function makeSentence(overrides: Partial<Sentence> = {}): Sentence {
  return {
    id: 's1',
    norwegian: 'Hun snakker norsk hver dag',
    english: 'She speaks Norwegian every day',
    conceptIds: ['present-tense-regular'],
    vocabularyClusters: [],
    errorTagsDetectable: ['verb-conjugation'],
    cefrLevel: 'A1',
    difficulty: 1,
    exerciseTypes: ['fill-in-blank'],
    ...overrides,
  }
}

describe('buildClozeFromSentence', () => {
  it('builds a single-gap cloze from a vetted sentence', () => {
    const cloze = buildClozeFromSentence(makeSentence())
    expect(cloze).not.toBeNull()
    const gaps = getClozeGaps(cloze!)
    expect(gaps).toHaveLength(1)
    expect(cloze!.id).toBe('autocloze:s1')
    expect(cloze!.cefrLevel).toBe('A1')
    expect(cloze!.primaryConceptId).toBe('present-tense-regular')
  })

  it('propagates the sentence concept + error tag onto the gap (Rule 8)', () => {
    const cloze = buildClozeFromSentence(makeSentence())!
    const gap = getClozeGaps(cloze)[0]
    expect(gap.conceptId).toBe('present-tense-regular')
    expect(gap.errorTag).toBe('verb-conjugation')
  })

  it('blanks the longest non-function content word', () => {
    // "snakker" (7) is the longest content word; "norsk"/"hver" shorter.
    const cloze = buildClozeFromSentence(makeSentence())!
    const gap = getClozeGaps(cloze)[0]
    expect(gap.answer).toBe('snakker')
  })

  it('grades correctly through the existing cloze grader (parity)', () => {
    const cloze = buildClozeFromSentence(makeSentence())!
    const pass = buildClozeResults({
      passage: cloze,
      answers: ['snakker'],
      sessionId: 'auto',
      itemId: 'i1',
      timeTakenSeconds: 4,
    })
    expect(pass[0].correct).toBe(true)
    expect(pass[0].conceptId).toBe('present-tense-regular')
    expect(pass[0].sentenceId).toBe(cloze.id) // all-correct → passage marked passed once

    const fail = buildClozeResults({
      passage: cloze,
      answers: ['feil'],
      sessionId: 'auto',
      itemId: 'i1',
      timeTakenSeconds: 4,
    })
    expect(fail[0].correct).toBe(false)
    expect(fail[0].errorTag).toBe('verb-conjugation')
  })

  it('returns null for an existing fill-in-blank template (no double-processing)', () => {
    expect(buildClozeFromSentence(makeSentence({ norwegian: 'Hun ___ norsk hver dag' }))).toBeNull()
  })

  it('returns null when there is no concept to credit', () => {
    expect(buildClozeFromSentence(makeSentence({ conceptIds: [] }))).toBeNull()
  })

  it('returns null when there is no detectable error tag', () => {
    expect(buildClozeFromSentence(makeSentence({ errorTagsDetectable: [] }))).toBeNull()
  })

  it('returns null when no blankable content word exists', () => {
    expect(buildClozeFromSentence(makeSentence({ norwegian: 'Jeg er en av de' }))).toBeNull()
  })
})
