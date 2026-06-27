import { describe, it, expect } from 'vitest'
import { getReadingContentLevel, isBelowReadingLevel } from '@/lib/reading-content'

describe('getReadingContentLevel (honest below-level disclosure, Rule 6 — R-02)', () => {
  it('every standard level now reads at its own level (B1/B2 texts added 2026-06-28)', () => {
    expect(getReadingContentLevel('A1')).toBe('A1')
    expect(getReadingContentLevel('A2')).toBe('A2')
    expect(getReadingContentLevel('B1')).toBe('B1')
    expect(getReadingContentLevel('B2')).toBe('B2')
  })

  it('unknown level falls back to the B2 ceiling', () => {
    expect(getReadingContentLevel('C1')).toBe('B2')
  })
})

describe('isBelowReadingLevel', () => {
  it('is false for every standard level — the library now serves A1–B2', () => {
    expect(isBelowReadingLevel('A1')).toBe(false)
    expect(isBelowReadingLevel('A2')).toBe(false)
    expect(isBelowReadingLevel('B1')).toBe(false)
    expect(isBelowReadingLevel('B2')).toBe(false)
  })

  it('is true only for an unknown level above the served range', () => {
    expect(isBelowReadingLevel('C1')).toBe(true)
  })
})
