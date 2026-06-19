import { describe, it, expect } from 'vitest'
import { withinLevelCeiling, preferAtLevel } from '@/lib/at-level-select'

const s = (id: string, cefrLevel: string) => ({ id, cefrLevel })

describe('withinLevelCeiling', () => {
  it('keeps at-or-below level, drops above (A1 learner never gets B1)', () => {
    const pool = [s('a', 'A1'), s('b', 'B1'), s('c', 'B2'), s('d', 'A2')]
    expect(withinLevelCeiling(pool, 'A1').map((x) => x.id)).toEqual(['a'])
    expect(withinLevelCeiling(pool, 'A2').map((x) => x.id)).toEqual(['a', 'd'])
    expect(withinLevelCeiling(pool, 'B2').map((x) => x.id).sort()).toEqual(['a', 'b', 'c', 'd'])
  })

  it('drops unknown/garbage cefr levels', () => {
    expect(withinLevelCeiling([s('a', 'C1'), s('b', 'A1')], 'B2').map((x) => x.id)).toEqual(['b'])
  })
})

describe('preferAtLevel', () => {
  it('prefers current-level sentences when present (remediate-at-level)', () => {
    // a B2 learner weak on a foundational concept: pool has A1 + B2 sentences
    const pool = [s('a1-gender', 'A1'), s('b2-gender', 'B2'), s('a1-gender-2', 'A1')]
    expect(preferAtLevel(pool, 'B2').map((x) => x.id)).toEqual(['b2-gender'])
  })

  it('falls back to the full pool when no at-level sentence exists (comprehensibility)', () => {
    const pool = [s('a1-x', 'A1'), s('a2-x', 'A2')]
    expect(preferAtLevel(pool, 'B2')).toBe(pool)
  })

  it('is a preference only — never raises the ceiling (compose with withinLevelCeiling first)', () => {
    const raw = [s('a', 'A1'), s('b', 'B2')]
    const ceiled = withinLevelCeiling(raw, 'A1')
    expect(preferAtLevel(ceiled, 'A1').map((x) => x.id)).toEqual(['a'])
  })
})
