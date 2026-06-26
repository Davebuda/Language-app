import { describe, it, expect } from 'vitest'
import { getReadingContentLevel, isBelowReadingLevel } from '@/lib/reading-content'

describe('getReadingContentLevel (honest below-level disclosure, Rule 6 — R-02)', () => {
  it('A1 reads A1, A2 reads A2 — at or below the A1–A2 library ceiling', () => {
    expect(getReadingContentLevel('A1')).toBe('A1')
    expect(getReadingContentLevel('A2')).toBe('A2')
  })

  it('B1/B2 read A2 — the library has no B1/B2 texts (below-level)', () => {
    expect(getReadingContentLevel('B1')).toBe('A2')
    expect(getReadingContentLevel('B2')).toBe('A2')
  })

  it('unknown level falls back to the A2 ceiling', () => {
    expect(getReadingContentLevel('C1')).toBe('A2')
  })
})

describe('isBelowReadingLevel', () => {
  it('is true only when the learner is above everything the library serves', () => {
    expect(isBelowReadingLevel('A1')).toBe(false)
    expect(isBelowReadingLevel('A2')).toBe(false)
    expect(isBelowReadingLevel('B1')).toBe(true)
    expect(isBelowReadingLevel('B2')).toBe(true)
  })
})
