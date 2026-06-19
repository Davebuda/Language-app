import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { levelSignals, validateAtLevel } from '@/lib/level-signals'
import type { CEFRLevel } from '@/types/fingerprint'

const B2_SENTENCE =
  'Selv om prisen er høy, er kvaliteten likevel god nok til å rettferdiggjøre investeringen.'

describe('level-signals', () => {
  it('LIX and length rise with complexity', () => {
    const simple = levelSignals('Jeg liker kaffe')
    const complex = levelSignals(B2_SENTENCE)
    expect(complex.words).toBeGreaterThan(simple.words)
    expect(complex.lix).toBeGreaterThan(simple.lix)
  })

  it('flags clearly-above-level content and accepts at-level', () => {
    expect(validateAtLevel(B2_SENTENCE, 'A1').atLevel).toBe(false) // too hard for A1
    expect(validateAtLevel(B2_SENTENCE, 'B2').atLevel).toBe(true) // fine at B2
    expect(validateAtLevel('Jeg liker kaffe', 'A1').atLevel).toBe(true)
  })

  it('a lone outlier signal does not reject (needs ≥2 of 3)', () => {
    // A1 sentence with one long compound (LIX bumped) but short + no clauses.
    const r = validateAtLevel('Barnehageplassen er ledig', 'A1')
    expect(r.exceeded.length).toBeLessThan(2)
    expect(r.atLevel).toBe(true)
  })

  it('does NOT over-reject: ≥97% of each level\'s own corpus passes at its level', () => {
    const LEVELS: CEFRLevel[] = ['A1', 'A2', 'B1', 'B2']
    for (const level of LEVELS) {
      const file = join(process.cwd(), 'content', 'sentences', `${level.toLowerCase()}.json`)
      const rows = JSON.parse(readFileSync(file, 'utf-8')) as Array<{ norwegian?: string; exercise_types?: string[] }>
      const sents = rows.filter(
        (r) => typeof r.norwegian === 'string' && !(r.exercise_types ?? []).includes('speed-round'),
      )
      const pass = sents.filter((r) => validateAtLevel(r.norwegian as string, level).atLevel).length
      const rate = pass / sents.length
      expect(rate, `${level} false-reject rate too high (${(rate * 100).toFixed(1)}% pass)`).toBeGreaterThanOrEqual(0.97)
    }
  })
})
