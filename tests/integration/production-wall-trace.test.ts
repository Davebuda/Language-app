// Rule-8 integration trace for the ProductionWall: chains the REAL engine write
// functions exactly as the session/journal surfaces call them, then derives the
// view — proving end-to-end that production moves the hero and recognition does
// not. This is the automated, CI-able equivalent of the live in-browser trace.
import { describe, it, expect } from 'vitest'
import { brickWeightForExercise, bumpDailyBrick } from '@/engine'
import { recordProductionFromSurface } from '@/engine/repair-from-surface'
import { deriveProductionWallView } from '@/lib/production-wall'
import { getGraphForLevel } from '@/lib/concept-graph-loader'
import { createEmptyFingerprint } from '@/types/fingerprint'
import type { MistakeFingerprint } from '@/types/fingerprint'

const TODAY = new Date().toISOString().slice(0, 10)

function b1(): MistakeFingerprint {
  return { ...createEmptyFingerprint('trace'), currentLevel: 'B1' }
}

describe('ProductionWall — Rule-8 end-to-end trace (B1)', () => {
  it('production moves the hero; a correct recognition answer lands a brick but never moves it', () => {
    const graph = getGraphForLevel('B1')
    const conceptId = graph.concepts[0].id
    let fp = b1()

    // 1. Correct RECOGNITION answer (fill-in-blank) — mirrors recordResult on
    //    `result.correct`: classify by exercise type, then bump that weight.
    fp = bumpDailyBrick(fp, brickWeightForExercise('fill-in-blank'))
    let view = deriveProductionWallView(fp, [], TODAY)
    expect(view.heroCount).toBe(0) // recognition did NOT move the production hero
    expect(view.bricks.filter((b) => b.weight === 'recognition')).toHaveLength(1) // but it IS on the wall

    // 2. Correct PRODUCTION answer (translation-to-norwegian).
    fp = bumpDailyBrick(fp, brickWeightForExercise('translation-to-norwegian'))
    view = deriveProductionWallView(fp, [], TODAY)
    expect(view.heroCount).toBe(1)

    // 3. Free JOURNAL production via the real engine write (recordProductionFromSurface).
    const before = fp.conceptMastery[conceptId]?.rawScore ?? 0
    fp = recordProductionFromSurface(fp, { conceptId, guided: false }, graph)
    view = deriveProductionWallView(fp, [], TODAY)
    expect(view.heroCount).toBe(2) // journal free production also moved it

    // The brick rode on a REAL mastery write, not a cosmetic increment.
    expect(fp.conceptMastery[conceptId].rawScore).toBeGreaterThan(before)
    const today = fp.dailyProgress.find((d) => d.date === TODAY)
    expect(today?.bricks).toMatchObject({ production: 2, recognition: 1 })
  })

  it('guided production earns its own reduced-weight brick, freezes SRS, and still counts toward the hero', () => {
    const graph = getGraphForLevel('B1')
    const conceptId = graph.concepts[0].id
    let fp = b1()
    const srsBefore = fp.conceptMastery[conceptId]?.srsLevel ?? 0

    fp = recordProductionFromSurface(fp, { conceptId, guided: true }, graph)

    const today = fp.dailyProgress.find((d) => d.date === TODAY)
    expect(today?.bricks?.guided).toBe(1)
    expect(today?.bricks?.production).toBe(0) // guided is a distinct weight, not production
    expect(fp.conceptMastery[conceptId].srsLevel).toBe(srsBefore) // SRS frozen for scaffolded frames

    const view = deriveProductionWallView(fp, [], TODAY)
    expect(view.heroCount).toBe(1) // hero = production + guided
  })

  it('exposure lays the faintest brick and is excluded from the hero entirely', () => {
    let fp = b1()
    fp = bumpDailyBrick(fp, 'exposure')
    fp = bumpDailyBrick(fp, 'exposure')
    const view = deriveProductionWallView(fp, [], TODAY)
    expect(view.heroCount).toBe(0)
    expect(view.bricks.filter((b) => b.weight === 'exposure')).toHaveLength(2)
  })
})
