import { describe, it, expect } from 'vitest'
import { gradeReadRespond, type GradeReadRespondParams } from '@/lib/grade-read-respond'

const PASSAGE_WORDS = ['friluftsliv', 'skogen', 'tur', 'helsa', 'luft', 'natur', 'vær']

function b1(text: string, overrides: Partial<GradeReadRespondParams> = {}): GradeReadRespondParams {
  return {
    text,
    level: 'B1',
    passageContentWords: PASSAGE_WORDS,
    targetConnectors: ['fordi', 'selv om', 'hvis', 'når'],
    targetStructureTag: 'word-order',
    ...overrides,
  }
}

describe('gradeReadRespond', () => {
  it('PASS: enough words+sentences, on-topic, target structure present', () => {
    const text =
      'Jeg liker friluftsliv fordi naturen gir meg ro. Når jeg går tur i skogen, føler jeg meg bedre. Frisk luft er bra for helsa. Selv om det regner, går jeg ut.'
    const g = gradeReadRespond(b1(text))
    expect(g.outcome).toBe('pass')
    expect(g.wordCount).toBeGreaterThanOrEqual(30)
    expect(g.sentenceCount).toBeGreaterThanOrEqual(4)
    expect(g.onTopicOverlap).toBeGreaterThanOrEqual(3)
    expect(g.hasTargetStructure).toBe(true)
    expect(g.missingStructureTag).toBeUndefined()
    expect(g.checklist.every((c) => c.ok)).toBe(true)
  })

  it('TOO-SHORT: below the word/sentence floor → no brick', () => {
    const g = gradeReadRespond(b1('Jeg liker skog.'))
    expect(g.outcome).toBe('too-short')
    expect(g.missingStructureTag).toBeUndefined()
  })

  it('OFF-TOPIC: long enough + structured but no overlap with the passage', () => {
    const text =
      'Jeg spiser pizza fordi det smaker godt. Når jeg er sulten, lager jeg mat. Selv om jeg er trøtt, vil jeg spise. Det er veldig deilig med ost hver dag.'
    const g = gradeReadRespond(b1(text))
    expect(g.wordCount).toBeGreaterThanOrEqual(30)
    expect(g.onTopicOverlap).toBeLessThan(3)
    expect(g.outcome).toBe('off-topic')
  })

  it('STRUCTURE-MISSING: effort + on-topic OK but no target connector → repair tag', () => {
    const text =
      'Jeg elsker friluftsliv og natur veldig mye. Skogen er fin om sommeren og vinteren. Jeg går tur i skogen hver enkelt dag. Frisk luft gir meg god helsa og masse energi. Vær og natur betyr mye for meg.'
    const g = gradeReadRespond(b1(text))
    expect(g.wordCount).toBeGreaterThanOrEqual(30)
    expect(g.onTopicOverlap).toBeGreaterThanOrEqual(3)
    expect(g.hasTargetStructure).toBe(false)
    expect(g.outcome).toBe('structure-missing')
    expect(g.missingStructureTag).toBe('word-order')
  })

  it('connector match is case-insensitive and handles multiword phrases', () => {
    const upper = gradeReadRespond(b1('x', { targetConnectors: ['fordi'] }))
    expect(upper.hasTargetStructure).toBe(false) // 'x' has no connector
    const text = 'SELV OM dette er kort.'
    expect(gradeReadRespond(b1(text, { targetConnectors: ['selv om'] })).hasTargetStructure).toBe(true)
    expect(gradeReadRespond(b1('Jeg liker det FORDI det er gøy.', { targetConnectors: ['fordi'] })).hasTargetStructure).toBe(true)
  })

  it('connector match respects word boundaries (no match inside a longer word)', () => {
    // 'når' must not match inside 'blånår'
    const g = gradeReadRespond(b1('Himmelen er blånår i dag.', { targetConnectors: ['når'] }))
    expect(g.hasTargetStructure).toBe(false)
  })

  it('no target structure required when targetConnectors is empty', () => {
    const text =
      'Jeg elsker friluftsliv og natur veldig mye. Skogen er fin. Jeg går tur ofte. Frisk luft gir god helsa hver dag her.'
    const g = gradeReadRespond(b1(text, { targetConnectors: [] }))
    expect(g.hasTargetStructure).toBe(true)
    // checklist drops the structure row when no connectors are required
    expect(g.checklist.some((c) => c.label.startsWith('Bruk en bindestruktur'))).toBe(false)
  })
})
