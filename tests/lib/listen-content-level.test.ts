import { describe, it, expect } from 'vitest'
import { getListenContentLevel } from '@/lib/listenRespondContent'

describe('getListenContentLevel (honest below-level disclosure, Rule 6)', () => {
  it('A2 reuses A1 questions — below-level, must be disclosed not silent', () => {
    expect(getListenContentLevel('A2')).toBe('A1')
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
