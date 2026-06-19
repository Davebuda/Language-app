import { describe, it, expect } from 'vitest'
import { LEVEL_CONTRACT, getLevelContract, type LanguageSkill } from '@/lib/level-contract'
import { ALL_ERROR_TAGS } from '@/types/taxonomy'

const LEVELS = ['A1', 'A2', 'B1', 'B2'] as const

describe('LEVEL_CONTRACT', () => {
  it('has an entry for every CEFR level', () => {
    for (const lvl of LEVELS) {
      expect(LEVEL_CONTRACT[lvl]).toBeDefined()
      expect(LEVEL_CONTRACT[lvl].level).toBe(lvl)
    }
  })

  it('difficulty floor ≤ ceiling at every level', () => {
    for (const lvl of LEVELS) {
      const c = LEVEL_CONTRACT[lvl]
      expect(c.difficultyFloor).toBeLessThanOrEqual(c.difficultyCeiling)
      expect([1, 2, 3]).toContain(c.difficultyFloor)
      expect([1, 2, 3]).toContain(c.difficultyCeiling)
    }
  })

  it('difficulty floor is monotonic non-decreasing across levels (B2 hardest)', () => {
    const floors = LEVELS.map((l) => LEVEL_CONTRACT[l].difficultyFloor)
    for (let i = 1; i < floors.length; i++) {
      expect(floors[i]).toBeGreaterThanOrEqual(floors[i - 1])
    }
    expect(LEVEL_CONTRACT.B2.difficultyFloor).toBeGreaterThan(LEVEL_CONTRACT.A1.difficultyFloor)
  })

  it('expected error tags are all real canonical tags (never `unspecified`)', () => {
    const valid = new Set<string>(ALL_ERROR_TAGS)
    for (const lvl of LEVELS) {
      for (const tag of LEVEL_CONTRACT[lvl].expectedErrorTags) {
        expect(valid.has(tag)).toBe(true)
        expect(tag).not.toBe('unspecified')
      }
    }
  })

  it('A2/B1/B2 expect the full diagnostic surface; A1 is a foundational subset', () => {
    const a1 = LEVEL_CONTRACT.A1.expectedErrorTags.length
    const a2 = LEVEL_CONTRACT.A2.expectedErrorTags.length
    expect(a1).toBeLessThan(a2)
    // remediate-at-level: higher levels keep the full surface exercisable
    expect(LEVEL_CONTRACT.B1.expectedErrorTags.length).toBe(a2)
    expect(LEVEL_CONTRACT.B2.expectedErrorTags.length).toBe(a2)
  })

  it('every level requires all four skills and offers the core exercise types', () => {
    const skills: LanguageSkill[] = ['listening', 'reading', 'speaking', 'writing']
    for (const lvl of LEVELS) {
      const c = LEVEL_CONTRACT[lvl]
      for (const s of skills) expect(c.requiredSkills).toContain(s)
      expect(c.allowedExerciseTypes).toContain('listening-comprehension')
      expect(c.gateConcepts.length).toBeGreaterThan(0)
    }
  })

  it('getLevelContract returns the matching entry', () => {
    expect(getLevelContract('B2')).toBe(LEVEL_CONTRACT.B2)
  })
})
