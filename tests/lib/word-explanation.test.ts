import { describe, it, expect } from 'vitest'
import { resolveWordExplanation } from '@/lib/word-explanation'
import type { ConceptNode } from '@/types/concepts'
import type { VocabWord } from '@/types/vocab'

// Minimal fixtures so each path is asserted deterministically, independent of
// live corpus volume (the live B2 vocab ships every gloss as null today).
const concepts: ConceptNode[] = [
  {
    id: 'noun-gender',
    label: 'Substantivkjønn',
    description: 'Norwegian nouns belong to one of three grammatical genders.',
    cefrLevel: 'A1',
    prerequisites: [],
    masteryThreshold: 80,
    minAttempts: 15,
    minDays: 3,
    errorTags: ['noun-gender'],
  },
]

const vocabWords: VocabWord[] = [
  {
    id: 'nyse',
    infinitive: 'å nyse',
    lemma: 'nyse',
    presens: 'nyser',
    preteritum: 'nøs',
    perfektum: 'har nyst',
    irregular: true,
    ablautGroup: 'strong',
    reflexive: false,
    particle: null,
    clusterId: 'kroppsreaksjoner-smabevegelser',
    gloss: 'to sneeze',
  },
]

describe('resolveWordExplanation', () => {
  it('corpus-backed errorTag → verified.rule + source corpus', () => {
    const r = resolveWordExplanation(
      { text: 'huset', errorTag: 'noun-gender' },
      { concepts: [], vocabWords: [] },
    )
    expect(r.source).toBe('corpus')
    expect(r.verified?.rule).toBe('Substantivkjønn')
    expect(r.verified?.english).toBeUndefined()
    expect(r.aiSuggested).toBeUndefined()
  })

  it('conceptId → verified.rule from the concept label (precedence over tag)', () => {
    const r = resolveWordExplanation({ text: 'huset', conceptId: 'noun-gender' }, { concepts, vocabWords: [] })
    expect(r.source).toBe('corpus')
    expect(r.verified?.rule).toBe('Substantivkjønn')
  })

  it('vocab exact gloss → verified.english', () => {
    const r = resolveWordExplanation({ text: 'nyse' }, { concepts: [], vocabWords })
    expect(r.source).toBe('corpus')
    expect(r.verified?.english).toBe('to sneeze')
  })

  it('vocab exact gloss matches the infinitive form too', () => {
    const r = resolveWordExplanation({ text: 'å nyse' }, { concepts: [], vocabWords })
    expect(r.verified?.english).toBe('to sneeze')
  })

  it('null-gloss vocab word → NO fabricated english', () => {
    const nullGloss: VocabWord[] = [{ ...vocabWords[0], gloss: null }]
    const r = resolveWordExplanation({ text: 'nyse' }, { concepts: [], vocabWords: nullGloss })
    expect(r.verified?.english).toBeUndefined()
    expect(r.source).toBe('none')
  })

  it('unknown word, no tag/concept, no AI → source none, honest empty', () => {
    const r = resolveWordExplanation(
      { text: 'blablabla' },
      { concepts: [], vocabWords: [] },
    )
    expect(r).toEqual({ norwegian: 'blablabla', source: 'none' })
    expect(r.verified).toBeUndefined()
  })

  it('AI passthrough → aiSuggested verbatim + source ai (no fabricated english)', () => {
    const why = 'Dette er hankjønn fordi …'
    const r = resolveWordExplanation(
      { text: 'jobb', aiExplanation: why },
      { concepts: [], vocabWords: [] },
    )
    expect(r.source).toBe('ai')
    expect(r.aiSuggested).toBe(why)
    expect(r.verified).toBeUndefined()
  })

  it('never promotes AI text into verified; corpus wins source over AI', () => {
    const r = resolveWordExplanation(
      { text: 'huset', errorTag: 'noun-gender', aiExplanation: 'AI guess' },
      { concepts: [], vocabWords: [] },
    )
    expect(r.source).toBe('corpus')
    expect(r.verified?.rule).toBe('Substantivkjønn')
    expect(r.aiSuggested).toBe('AI guess')
  })

  it('blank AI explanation is ignored (not treated as a suggestion)', () => {
    const r = resolveWordExplanation(
      { text: 'blablabla', aiExplanation: '   ' },
      { concepts: [], vocabWords: [] },
    )
    expect(r.source).toBe('none')
    expect(r.aiSuggested).toBeUndefined()
  })
})
