import { describe, it, expect } from 'vitest'
import { recordVocabResult, vocabCoverage } from '@/engine'
import { buildConjugationDrill } from '@/lib/conjugation-drill'
import { VOCAB_WORDS } from '@/lib/vocab-loader'
import { createEmptyFingerprint } from '@/types/fingerprint'
import type { MistakeFingerprint } from '@/types/fingerprint'

const DAY_MS = 86_400_000
const daysFromNow = (iso: string): number => (new Date(iso).getTime() - Date.now()) / DAY_MS

const base = (): MistakeFingerprint => createEmptyFingerprint('vocab')
const input = (over = {}) => ({ clusterId: 'c1', wordId: 'w1', correct: true, isProduction: true, totalWordCount: 12, ...over })

describe('recordVocabResult — activation gate', () => {
  it('a wrong answer records the miss, drops the score, and activates nothing', () => {
    const fp = recordVocabResult(base(), input({ correct: false }))
    const c = fp.vocabularyMastery.c1
    expect(c.missedWordIds).toEqual(['w1'])
    expect(c.activatedWordIds).toEqual([])
    expect(c.score).toBeLessThan(50)
    expect(c.totalWordCount).toBe(12)
  })

  it('a correct production on a word NEVER missed does NOT activate it (no "was")', () => {
    const fp = recordVocabResult(base(), input({ correct: true, isProduction: true }))
    const c = fp.vocabularyMastery.c1
    expect(c.activatedWordIds).toEqual([]) // "no longer miss" requires a prior miss
    expect(c.score).toBeGreaterThan(50)
  })

  it('miss → correct PRODUCTION activates the word', () => {
    let fp = recordVocabResult(base(), input({ correct: false }))
    fp = recordVocabResult(fp, input({ correct: true, isProduction: true }))
    expect(fp.vocabularyMastery.c1.activatedWordIds).toEqual(['w1'])
  })

  it('miss → correct RECOGNITION does NOT activate (production only — north-star)', () => {
    let fp = recordVocabResult(base(), input({ correct: false }))
    fp = recordVocabResult(fp, input({ correct: true, isProduction: false }))
    expect(fp.vocabularyMastery.c1.activatedWordIds).toEqual([])
  })

  it('does not double-count an already-activated word or an already-missed word', () => {
    let fp = recordVocabResult(base(), input({ correct: false }))
    fp = recordVocabResult(fp, input({ correct: false })) // miss again
    fp = recordVocabResult(fp, input({ correct: true })) // activate
    fp = recordVocabResult(fp, input({ correct: true })) // activate again
    const c = fp.vocabularyMastery.c1
    expect(c.missedWordIds).toEqual(['w1'])
    expect(c.activatedWordIds).toEqual(['w1'])
  })

  it('does not mutate the input fingerprint', () => {
    const fp = base()
    const before = JSON.stringify(fp.vocabularyMastery)
    recordVocabResult(fp, input({ correct: false }))
    expect(JSON.stringify(fp.vocabularyMastery)).toBe(before)
  })

  it('handles a legacy/partial cluster record (missing arrays) without throwing', () => {
    const fp = base()
    // simulate a truncated/legacy record lacking the new arrays
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(fp.vocabularyMastery as any).c1 = { clusterId: 'c1', score: 70, totalWordCount: 12 }
    expect(() => recordVocabResult(fp, input({ correct: true }))).not.toThrow()
    expect(() => vocabCoverage(fp)).not.toThrow()
    const out = recordVocabResult(fp, input({ correct: false }))
    expect(out.vocabularyMastery.c1.missedWordIds).toEqual(['w1'])
  })
})

describe('vocabCoverage — honest, decay-gated meter', () => {
  it('counts activated words from warm clusters only', () => {
    let fp = base()
    fp = recordVocabResult(fp, input({ correct: false })) // miss w1
    fp = recordVocabResult(fp, input({ correct: true })) // activate w1 (cluster warms)
    const cov = vocabCoverage(fp)
    expect(cov.activated).toBe(1)
    expect(cov.missed).toBe(1)
    expect(cov.total).toBe(12)
  })

  it('the count goes DOWN when a cluster cools below the floor (the honesty property)', () => {
    let fp = base()
    fp = recordVocabResult(fp, input({ correct: false }))
    fp = recordVocabResult(fp, input({ correct: true })) // activated, warm
    expect(vocabCoverage(fp).activated).toBe(1)
    // hammer the cluster with wrong answers on OTHER words → score cools below floor
    for (let i = 0; i < 4; i++) fp = recordVocabResult(fp, input({ wordId: `wx${i}`, correct: false }))
    expect(fp.vocabularyMastery.c1.score).toBeLessThan(50)
    expect(vocabCoverage(fp).activated).toBe(0) // activated words stop counting while the cluster is cold
  })
})

describe('recordVocabResult — per-word SRS (Option B)', () => {
  it('a correct answer sets word SRS to level 1, scheduled >= 2 days out', () => {
    const fp = recordVocabResult(base(), input({ correct: true }))
    const srs = fp.vocabWordSrs.w1
    expect(srs.srsLevel).toBe(1)
    expect(srs.nextReviewAt).not.toBeNull()
    expect(daysFromNow(srs.nextReviewAt!)).toBeGreaterThan(1.9) // never within 2 days
    expect(srs.lastSeenAt).not.toBeNull()
  })

  it('climbs the ladder on consecutive corrects', () => {
    let fp = recordVocabResult(base(), input({ correct: true }))
    fp = recordVocabResult(fp, input({ correct: true }))
    expect(fp.vocabWordSrs.w1.srsLevel).toBe(2)
  })

  it('a wrong answer resets the word to level 0 but still schedules >= 2 days out', () => {
    let fp = recordVocabResult(base(), input({ correct: true }))
    fp = recordVocabResult(fp, input({ correct: true })) // level 2
    fp = recordVocabResult(fp, input({ correct: false })) // reset
    expect(fp.vocabWordSrs.w1.srsLevel).toBe(0)
    expect(daysFromNow(fp.vocabWordSrs.w1.nextReviewAt!)).toBeGreaterThan(1.9)
  })

  it('handles a fingerprint missing vocabWordSrs (legacy) without throwing', () => {
    const fp = base()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (fp as any).vocabWordSrs
    expect(() => recordVocabResult(fp, input({ correct: true }))).not.toThrow()
    const out = recordVocabResult(fp, input({ correct: true }))
    expect(out.vocabWordSrs.w1.srsLevel).toBe(1)
  })
})

describe('buildConjugationDrill — SRS-aware selection', () => {
  it('excludes a word scheduled in the future when the due pool can still fill the drill', () => {
    const word = VOCAB_WORDS[0]
    const fp = recordVocabResult(base(), {
      clusterId: word.clusterId, wordId: word.id, correct: true, isProduction: true, totalWordCount: 12,
    })
    // word is now scheduled ~2 days out → not due; 60+ other words remain due
    const drill = buildConjugationDrill(10, 0, fp)
    expect(drill).toHaveLength(10)
    expect(drill.some((d) => d.wordId === word.id)).toBe(false)
    expect(new Set(drill.map((d) => d.wordId)).size).toBe(10) // no within-session repeat
  })

  it('falls back to not-due words (and still fills the drill) when nothing is due', () => {
    let fp = base()
    for (const w of VOCAB_WORDS) {
      fp = recordVocabResult(fp, { clusterId: w.clusterId, wordId: w.id, correct: true, isProduction: true, totalWordCount: 12 })
    }
    const drill = buildConjugationDrill(10, 0, fp) // every word scheduled in the future
    expect(drill).toHaveLength(10)
    expect(new Set(drill.map((d) => d.wordId)).size).toBe(10)
  })

  it('with no fingerprint, behaves as before (all words eligible, no repeats)', () => {
    const drill = buildConjugationDrill(10, 5)
    expect(drill).toHaveLength(10)
    expect(new Set(drill.map((d) => d.wordId)).size).toBe(10)
  })
})
