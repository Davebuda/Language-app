import { describe, it, expect } from 'vitest'
import { deriveProductionWallView, LENS_CONFIG } from '@/lib/production-wall'
import { recordVocabResult } from '@/engine'
import { createEmptyFingerprint } from '@/types/fingerprint'
import type { MistakeFingerprint, DailyProgress, CEFRLevel } from '@/types/fingerprint'

const TODAY = '2026-06-02'

function fpWith(
  level: CEFRLevel,
  bricks?: DailyProgress['bricks'],
  extra: Partial<MistakeFingerprint> = {},
): MistakeFingerprint {
  const fp = createEmptyFingerprint('anon')
  return {
    ...fp,
    currentLevel: level,
    dailyProgress: bricks
      ? [
          {
            date: TODAY,
            blocks: {
              lytt: { completed: 0, total: 0, correct: 0 },
              lær: { completed: 0, total: 0, correct: 0 },
              snakk: { completed: 0, total: 0, correct: 0 },
            },
            completedAt: null,
            bricks,
          },
        ]
      : [],
    ...extra,
  }
}

describe('deriveProductionWallView — hero honesty', () => {
  it('hero counts production + guided only, never recognition or exposure', () => {
    const fp = fpWith('B1', { production: 3, guided: 1, recognition: 5, exposure: 2 })
    const view = deriveProductionWallView(fp, [], TODAY)
    expect(view.heroCount).toBe(4) // 3 + 1, NOT + 5 recognition + 2 exposure
    expect(view.heroUnit).toBe('setninger produsert')
  })

  it('a wall of pure recognition bricks leaves the hero at zero (the meter recognition cannot move)', () => {
    const fp = fpWith('B1', { production: 0, guided: 0, recognition: 8, exposure: 0 })
    const view = deriveProductionWallView(fp, [], TODAY)
    expect(view.heroCount).toBe(0)
    // but the recognition bricks still render on the wall (context, not credit)
    expect(view.bricks.filter((b) => b.weight === 'recognition').length).toBe(8)
    expect(view.wallNote).toBe('gjenkjenning teller ikke her')
  })
})

describe('deriveProductionWallView — per-level lens', () => {
  it('A1 uses the foundations lens with a brick-count wall note', () => {
    const fp = fpWith('A1', { production: 2, guided: 0, recognition: 1, exposure: 1 })
    const view = deriveProductionWallView(fp, [], TODAY)
    expect(view.objectiveKicker).toBe('Dagens mål · grunnmur')
    expect(view.heroUnit).toBe('grunnsteiner rørt')
    expect(view.wallNote).toMatch(/av 12 brikker$/) // count, not the B1 note
    expect(view.interim).toBeUndefined()
  })

  it('B2 hero is the lexical-coverage meter (vocabCoverage), NOT a brick sum', () => {
    // bricks present but NO vocab activated → the lexical hero stays 0 (bricks must not inflate it)
    const fp = fpWith('B2', { production: 5, guided: 1, recognition: 0, exposure: 0 })
    const view = deriveProductionWallView(fp, [], TODAY)
    expect(view.heroUnit).toBe('ord du mestrer')
    expect(view.heroCount).toBe(0)
    expect(view.lexical).toBeDefined()
    expect(view.lexical!.activated).toBe(0)
    // honest variety disclosure; the track now exists so it no longer says "kommer"
    expect(view.interim).toMatch(/færre øvingstyper/)
    expect(view.interim).not.toMatch(/Ordforråd-sporet kommer/)
  })

  it('B2 hero reflects activated vocab words (missed → produced correctly)', () => {
    let fp = fpWith('B2')
    fp = recordVocabResult(fp, { clusterId: 'c1', wordId: 'w1', correct: false, isProduction: true, totalWordCount: 5 })
    fp = recordVocabResult(fp, { clusterId: 'c1', wordId: 'w1', correct: true, isProduction: true, totalWordCount: 5 })
    const view = deriveProductionWallView(fp, [], TODAY)
    expect(view.heroCount).toBe(1)
    expect(view.lexical!.activated).toBe(1)
    expect(view.lexical!.missed).toBe(1)
  })

  it('every CEFR level has a lens config', () => {
    for (const level of ['A1', 'A2', 'B1', 'B2'] as CEFRLevel[]) {
      expect(LENS_CONFIG[level]).toBeDefined()
      expect(LENS_CONFIG[level].heroWeights).toEqual(['production', 'guided'])
    }
  })
})

describe('deriveProductionWallView — robustness', () => {
  it('renders a zero-state for an empty fingerprint without throwing', () => {
    const fp = fpWith('A1')
    const view = deriveProductionWallView(fp, [], TODAY)
    expect(view.heroCount).toBe(0)
    expect(view.bricks).toHaveLength(12)
    expect(view.bricks.every((b) => b.weight === 'empty')).toBe(true)
    expect(view.weekBars).toHaveLength(7)
  })

  it('treats a legacy today-record without a bricks field as zeros', () => {
    const fp = fpWith('B1')
    fp.dailyProgress = [
      {
        date: TODAY,
        blocks: {
          lytt: { completed: 3, total: 5, correct: 3 },
          lær: { completed: 0, total: 0, correct: 0 },
          snakk: { completed: 0, total: 0, correct: 0 },
        },
        completedAt: null,
        // no bricks field (legacy)
      },
    ]
    const view = deriveProductionWallView(fp, [], TODAY)
    expect(view.heroCount).toBe(0)
  })

  it('marks the last filled brick as landed and pads the rest empty', () => {
    const fp = fpWith('B1', { production: 2, guided: 0, recognition: 0, exposure: 0 })
    const view = deriveProductionWallView(fp, [], TODAY)
    const filled = view.bricks.filter((b) => b.weight !== 'empty')
    expect(filled).toHaveLength(2)
    expect(filled[filled.length - 1].landed).toBe(true)
    expect(view.bricks.filter((b) => b.weight === 'empty')).toHaveLength(10)
  })

  it('weekBars flag today and count its production+guided', () => {
    const fp = fpWith('B1', { production: 4, guided: 1, recognition: 9, exposure: 0 })
    const view = deriveProductionWallView(fp, [], TODAY)
    const liveBar = view.weekBars.find((b) => b.live)
    expect(liveBar).toBeDefined()
    expect(liveBar?.value).toBe(5) // 4 production + 1 guided, recognition excluded
  })

  it('counts focus concepts with an open production gap', () => {
    const fp = fpWith('B1', { production: 1, guided: 0, recognition: 0, exposure: 0 }, {
      weeklyFocus: ['a', 'b', 'c'],
      productionGap: { a: 40, b: 0, c: 25 },
    })
    const view = deriveProductionWallView(fp, [], TODAY)
    expect(view.gapConceptCount).toBe(2) // a and c have gap > 0
  })
})
