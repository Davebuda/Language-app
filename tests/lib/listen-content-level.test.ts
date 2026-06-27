import { describe, it, expect } from 'vitest'
import { getListenContentLevel, getListenQuestions } from '@/lib/listenRespondContent'

describe('getListenContentLevel (honest below-level disclosure, Rule 6)', () => {
  it('A2 now serves its OWN dedicated questions (no longer borrows A1)', () => {
    expect(getListenContentLevel('A2')).toBe('A2')
    const a2 = getListenQuestions('A2')
    expect(a2.length).toBeGreaterThan(0)
    // dedicated A2 set, not the A1 fallback
    expect(a2.every((q) => q.id.startsWith('a2-'))).toBe(true)
  })

  it('unknown level falls back to A1 questions', () => {
    expect(getListenContentLevel('C1')).toBe('A1')
  })

  it('A1/B1/B2 serve their own level', () => {
    expect(getListenContentLevel('A1')).toBe('A1')
    expect(getListenContentLevel('B1')).toBe('B1')
    expect(getListenContentLevel('B2')).toBe('B2')
  })
})
