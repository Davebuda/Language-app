import { describe, it, expect } from 'vitest'
import { confirmedRepair } from '@/lib/gender-correction-gate'

// Pipeline-honesty guard (Rule 8): the shared gate must ADMIT a deterministically-
// confirmed verb-conjugation correction (as a verb-conjugation RepairInput) and DROP
// everything it can't verify — so the conversation/journal mastery write is real, not a
// shown-but-no-op correction.
describe('confirmedRepair — shared verifier gate (gender + conjugation)', () => {
  it('admits a confirmed conjugation correction as a verb-conjugation repair', () => {
    const r = confirmedRepair(
      { original: 'spiser', corrected: 'spiste', context: 'jeg spiser middag i går' },
      'conversation',
    )
    expect(r).not.toBeNull()
    expect(r!.errorTag).toBe('verb-conjugation')
    expect(r!.conceptId).toBeTruthy()
    expect(r!.surfaceKind).toBe('conversation')
    expect(r!.wrong).toBe('spiser')
    expect(r!.correct).toBe('spiste')
  })

  it('drops a conjugation correction with no tense context (cannot verify → no write)', () => {
    expect(confirmedRepair({ original: 'spiser', corrected: 'spiste' }, 'conversation')).toBeNull()
  })

  it('drops a conjugation correction when the sentence has no tense marker', () => {
    expect(
      confirmedRepair({ original: 'spiser', corrected: 'spiste', context: 'jeg spiser middag' }, 'journal'),
    ).toBeNull()
  })

  it('drops an unverifiable correction (neither gender nor conjugation)', () => {
    expect(
      confirmedRepair({ original: 'huset', corrected: 'bilen', context: 'jeg ser huset' }, 'conversation'),
    ).toBeNull()
  })
})
