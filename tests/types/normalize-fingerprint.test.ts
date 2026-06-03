import { describe, it, expect } from 'vitest'
import { createEmptyFingerprint, normalizeFingerprint } from '@/types/fingerprint'
import { vocabCoverage } from '@/engine'
import { deriveProductionWallView } from '@/lib/production-wall'
import type { MistakeFingerprint } from '@/types/fingerprint'

// Regression suite for the returning-user crash class (prod incident 2026-06-03).
// A fingerprint persisted before a field existed loads via two paths (IndexedDB +
// Supabase). Both now run normalizeFingerprint, which backfills missing top-level
// keys from createEmptyFingerprint while letting stored values win.

// A legacy fingerprint: only the fields the old loose validity gates checked,
// plus a couple of real values that must survive the backfill untouched.
function legacyFingerprint(over: Record<string, unknown> = {}): MistakeFingerprint {
  return {
    userId: 'legacy-user',
    currentLevel: 'B2',
    conceptMastery: { 'noun-gender': { conceptId: 'noun-gender', rawScore: 70 } },
    recentErrors: [],
    totalSessionsCompleted: 9,
    ...over,
    // NOTE: deliberately missing dailyProgress, weeklyFocus, vocabularyMastery,
    // productionGap, speakingMinutesTotal, weekStartSnapshots, etc.
  } as unknown as MistakeFingerprint
}

describe('normalizeFingerprint — schema migration on load', () => {
  it('backfills every field added since the fingerprint was last saved', () => {
    const fp = normalizeFingerprint(legacyFingerprint())
    // fields the legacy object lacked are now present with safe defaults
    expect(fp.dailyProgress).toEqual([])
    expect(fp.weeklyFocus).toEqual([])
    expect(fp.vocabularyMastery).toEqual({})
    expect(fp.productionGap).toEqual({})
    expect(fp.speakingMinutesTotal).toBe(0)
    expect(fp.weekStartSnapshots).toEqual({})
    expect(fp.passedSentenceIds).toEqual({})
  })

  it('preserves stored values — defaults never clobber real data', () => {
    const fp = normalizeFingerprint(
      legacyFingerprint({ userId: 'real', currentLevel: 'B1', totalSessionsCompleted: 42 }),
    )
    expect(fp.userId).toBe('real')
    expect(fp.currentLevel).toBe('B1') // not reset to the factory default 'A1'
    expect(fp.totalSessionsCompleted).toBe(42)
    expect(fp.conceptMastery['noun-gender'].rawScore).toBe(70)
  })

  it('a fully current fingerprint round-trips unchanged in shape', () => {
    const full = createEmptyFingerprint('u')
    const normalized = normalizeFingerprint(full)
    expect(normalized).toEqual(full)
  })
})

describe('crash-class regression — readers tolerate a legacy fingerprint', () => {
  it('vocabCoverage does not throw when vocabularyMastery is absent (B2 hero crash)', () => {
    const legacy = legacyFingerprint() // no vocabularyMastery
    expect(() => vocabCoverage(legacy)).not.toThrow()
    expect(vocabCoverage(legacy)).toEqual({ activated: 0, missed: 0, total: 0 })
  })

  it('the B2 production-wall hero renders on a normalized legacy fingerprint', () => {
    const fp = normalizeFingerprint(legacyFingerprint()) // B2, backfilled
    expect(() => deriveProductionWallView(fp, [], '2026-06-03')).not.toThrow()
    const view = deriveProductionWallView(fp, [], '2026-06-03')
    expect(view.level).toBe('B2')
    expect(view.heroCount).toBe(0) // no activated vocab yet, honest zero
    expect(view.lexical).toBeDefined()
  })
})
