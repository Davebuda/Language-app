import { describe, it, expect } from 'vitest'
import { recordSpeakingProductionToFingerprint } from '@/engine/repair-from-surface'
import { createEmptyFingerprint } from '@/types/fingerprint'
import type { MistakeFingerprint } from '@/types/fingerprint'

const base = (): MistakeFingerprint => createEmptyFingerprint('speak-test')
const guidedTotal = (fp: MistakeFingerprint) =>
  fp.dailyProgress.reduce((sum, d) => sum + (d.bricks?.guided ?? 0), 0)

describe('recordSpeakingProductionToFingerprint — honest self-report write (Rule 8)', () => {
  it('accrues speaking minutes whether produced or not — the learner spoke either way', () => {
    expect(
      recordSpeakingProductionToFingerprint(base(), { minutes: 0.1, produced: true }).speakingMinutesTotal,
    ).toBeCloseTo(0.1)
    expect(
      recordSpeakingProductionToFingerprint(base(), { minutes: 0.1, produced: false }).speakingMinutesTotal,
    ).toBeCloseTo(0.1)
  })

  it('lays a guided production brick ONLY when produced (Flytende/Nølende), never on Bommet', () => {
    expect(guidedTotal(recordSpeakingProductionToFingerprint(base(), { minutes: 0.1, produced: true }))).toBe(1)
    expect(guidedTotal(recordSpeakingProductionToFingerprint(base(), { minutes: 0.1, produced: false }))).toBe(0)
  })

  it('NEVER touches mastery, the error log, or productionGap (a self-rating is not an objective judge)', () => {
    const fp = base()
    const out = recordSpeakingProductionToFingerprint(fp, { minutes: 0.1, produced: true })
    expect(out.conceptMastery).toEqual(fp.conceptMastery)
    expect(out.recentErrors).toEqual(fp.recentErrors)
    expect(out.productionGap).toEqual(fp.productionGap)
  })

  it('clamps negative minutes to zero', () => {
    expect(
      recordSpeakingProductionToFingerprint(base(), { minutes: -5, produced: false }).speakingMinutesTotal,
    ).toBe(0)
  })

  it('does not mutate the input fingerprint', () => {
    const fp = base()
    const before = JSON.stringify(fp)
    recordSpeakingProductionToFingerprint(fp, { minutes: 0.1, produced: true })
    expect(JSON.stringify(fp)).toBe(before)
  })
})
