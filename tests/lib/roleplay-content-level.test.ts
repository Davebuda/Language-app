import { describe, it, expect } from 'vitest'
import { getRoleplayContentLevel } from '@/lib/roleplayContent'

describe('getRoleplayContentLevel (honest below-level disclosure, Rule 6)', () => {
  it('A2 reuses A1 scenarios — below-level, must be disclosed not silent', () => {
    expect(getRoleplayContentLevel('A2')).toBe('A1')
  })

  it('A1/B1/B2 serve their own level', () => {
    expect(getRoleplayContentLevel('A1')).toBe('A1')
    expect(getRoleplayContentLevel('B1')).toBe('B1')
    expect(getRoleplayContentLevel('B2')).toBe('B2')
  })

  it('unknown level falls back to A1', () => {
    expect(getRoleplayContentLevel('C1')).toBe('A1')
  })
})
