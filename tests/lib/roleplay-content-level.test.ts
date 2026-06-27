import { describe, it, expect } from 'vitest'
import { getRoleplayContentLevel, getRoleplayScenarios } from '@/lib/roleplayContent'

describe('getRoleplayContentLevel (honest below-level disclosure, Rule 6)', () => {
  it('A2 now serves its OWN dedicated scenarios (no longer borrows A1)', () => {
    expect(getRoleplayContentLevel('A2')).toBe('A2')
    const a2 = getRoleplayScenarios('A2')
    expect(a2.length).toBeGreaterThan(0)
    // dedicated A2 set, not the A1 fallback
    expect(a2.every((s) => s.id.startsWith('a2-'))).toBe(true)
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
