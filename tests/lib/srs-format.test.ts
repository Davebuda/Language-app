import { describe, it, expect } from 'vitest'
import { formatNextReview } from '@/lib/srs-format'

const inDays = (n: number) => new Date(Date.now() + n * 86400000).toISOString()

describe('formatNextReview', () => {
  it('returns empty string for no scheduled review', () => {
    expect(formatNextReview(null)).toBe('')
    expect(formatNextReview(undefined)).toBe('')
    expect(formatNextReview('')).toBe('')
  })

  it('returns "I dag" for now or overdue', () => {
    expect(formatNextReview(inDays(0))).toBe('I dag')
    expect(formatNextReview(inDays(-3))).toBe('I dag')
  })

  it('returns "I morgen" for ~1 day out', () => {
    expect(formatNextReview(inDays(1))).toBe('I morgen')
  })

  it('returns "Om N dager" for multi-day intervals (SRS ladder 3/7/14/30)', () => {
    expect(formatNextReview(inDays(3))).toBe('Om 3 dager')
    expect(formatNextReview(inDays(7))).toBe('Om 7 dager')
    expect(formatNextReview(inDays(14))).toBe('Om 14 dager')
    expect(formatNextReview(inDays(30))).toBe('Om 30 dager')
  })
})
