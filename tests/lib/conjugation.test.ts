import { describe, it, expect } from 'vitest'
import { gradeConjugation, acceptedAnswers } from '@/lib/grade-conjugation'
import { buildConjugationDrill } from '@/lib/conjugation-drill'
import { VOCAB_WORD_BY_ID } from '@/lib/vocab-loader'

const word = (id: string) => {
  const w = VOCAB_WORD_BY_ID.get(id)
  if (!w) throw new Error(`fixture word ${id} missing`)
  return w
}

describe('gradeConjugation', () => {
  it('accepts the correct form, case- and whitespace-insensitive', () => {
    const trekke = word('trekke') // trekker / trakk / har trukket (irregular)
    expect(gradeConjugation(trekke, 'presens', 'trekker').correct).toBe(true)
    expect(gradeConjugation(trekke, 'preteritum', '  Trakk ').correct).toBe(true)
    expect(gradeConjugation(trekke, 'preteritum', 'trekte').correct).toBe(false)
  })

  it('accepts perfektum with OR without the "har" auxiliary', () => {
    const trekke = word('trekke')
    expect(gradeConjugation(trekke, 'perfektum', 'har trukket').correct).toBe(true)
    expect(gradeConjugation(trekke, 'perfektum', 'trukket').correct).toBe(true)
    expect(gradeConjugation(trekke, 'perfektum', 'har trakk').correct).toBe(false)
  })

  it('accepts BOTH dual forms the linguist flagged (fraråde / gnage)', () => {
    const frarade = word('frarade') // preteritum "frarådet / frarådde"
    expect(gradeConjugation(frarade, 'preteritum', 'frarådet').correct).toBe(true)
    expect(gradeConjugation(frarade, 'preteritum', 'frarådde').correct).toBe(true)
    const gnage = word('gnage') // preteritum "gnagde / gnaget"
    expect(gradeConjugation(gnage, 'preteritum', 'gnagde').correct).toBe(true)
    expect(gradeConjugation(gnage, 'preteritum', 'gnaget').correct).toBe(true)
  })

  it('rejects an empty answer', () => {
    expect(gradeConjugation(word('antyde'), 'presens', '   ').correct).toBe(false)
  })

  it('acceptedAnswers exposes the variant set', () => {
    const acc = acceptedAnswers(word('frarade'), 'preteritum')
    expect(acc).toEqual(expect.arrayContaining(['frarådet', 'frarådde']))
  })
})

describe('buildConjugationDrill', () => {
  it('builds a drill of the requested size with valid words + tenses', () => {
    const drill = buildConjugationDrill(10)
    expect(drill).toHaveLength(10)
    for (const item of drill) {
      expect(VOCAB_WORD_BY_ID.has(item.wordId)).toBe(true)
      expect(['presens', 'preteritum', 'perfektum']).toContain(item.tense)
      expect(item.word.clusterId).toBe(item.clusterId)
    }
  })

  it('prioritizes irregular verbs first and drills their changing tenses', () => {
    const drill = buildConjugationDrill(5)
    expect(drill[0].word.irregular).toBe(true)
    // irregular items are quizzed on preteritum/perfektum (where the form actually changes)
    for (const item of drill) {
      if (item.word.irregular) expect(['preteritum', 'perfektum']).toContain(item.tense)
    }
  })

  it('is deterministic given a seedOffset', () => {
    expect(buildConjugationDrill(8, 3).map((i) => `${i.wordId}:${i.tense}`)).toEqual(
      buildConjugationDrill(8, 3).map((i) => `${i.wordId}:${i.tense}`),
    )
  })
})
