import { describe, it, expect } from 'vitest'
import { normalizeFingerprint } from '@/types/fingerprint'
import { makeReturningUserFingerprint } from '../types/returning-user-fixture'
import { deriveProductionWallView } from '@/lib/production-wall'
import { summarizeWeeklyProgress } from '@/lib/weekly-progress'
import { vocabCoverage } from '@/engine'
import { runDiagnosis } from '@/engine/diagnosis'
import { getGraphForLevel } from '@/lib/concept-graph-loader'

// The lock for the returning-user crash/honesty class (incident 2026-06-03).
// A fingerprint persisted under an older schema — missing top-level fields AND
// a nested focusOutcomes — must flow through normalizeFingerprint and then
// through EVERY read-path function without throwing or producing NaN. When a
// future field is added and a reader assumes it, this fixture (which lacks newer
// fields) makes that reader fail here, before it can ship to a returning user.
const TODAY = '2026-06-03'

describe('returning-user read-path safety (locked class)', () => {
  const fp = normalizeFingerprint(makeReturningUserFingerprint())
  const graph = getGraphForLevel(fp.currentLevel)

  it('normalizeFingerprint backfills every missing top-level field', () => {
    expect(fp.dailyProgress).toEqual([])
    expect(fp.productionGap).toEqual({})
    expect(fp.vocabularyMastery).toEqual({})
    expect(fp.speakingMinutesTotal).toBe(0)
    expect(fp.passedSentenceIds).toEqual({})
  })

  it('deepens nested weeklySprintHistory records so focusOutcomes is always present', () => {
    expect(fp.weeklySprintHistory.length).toBeGreaterThan(0)
    for (const r of fp.weeklySprintHistory) {
      expect(r.focusOutcomes).toBeDefined()
      expect(() => Object.values(r.focusOutcomes)).not.toThrow()
    }
  })

  it('preserves real stored mastery (defaults never clobber populated data)', () => {
    const ids = Object.keys(fp.conceptMastery)
    expect(ids.length).toBe(3)
    expect(fp.conceptMastery[ids[0]].rawScore).toBe(62)
    expect(fp.currentLevel).toBe('B1')
  })

  it('summarizeWeeklyProgress never throws and never yields NaN', () => {
    expect(() => summarizeWeeklyProgress(fp, graph)).not.toThrow()
    for (const e of summarizeWeeklyProgress(fp, graph)) {
      expect(Number.isFinite(e.deltaDecayed)).toBe(true)
      expect(Number.isFinite(e.attemptsThisWeek)).toBe(true)
    }
  })

  it('deriveProductionWallView renders finite numbers (no NaN hero/minutes)', () => {
    const entries = summarizeWeeklyProgress(fp, graph)
    const wall = deriveProductionWallView(fp, entries, TODAY)
    expect(Number.isFinite(wall.heroCount)).toBe(true)
    expect(Number.isFinite(wall.speakingMinutes)).toBe(true)
    expect(wall.weekBars.every((b) => Number.isFinite(b.value))).toBe(true)
  })

  it('vocabCoverage and runDiagnosis survive the legacy fingerprint', () => {
    const cov = vocabCoverage(fp)
    expect(Number.isFinite(cov.activated)).toBe(true)
    expect(Number.isFinite(cov.total)).toBe(true)
    expect(() => runDiagnosis(fp)).not.toThrow()
  })
})
