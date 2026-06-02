import { describe, it, expect } from 'vitest'
import { brickWeightForExercise, bumpDailyBrick } from '@/engine'
import { createEmptyFingerprint } from '@/types/fingerprint'
import type { DailyProgress } from '@/types/fingerprint'

const TODAY = new Date().toISOString().slice(0, 10)

function emptyDay(date: string, bricks?: DailyProgress['bricks']): DailyProgress {
  return {
    date,
    blocks: {
      lytt: { completed: 1, total: 5, correct: 1 },
      lær: { completed: 0, total: 0, correct: 0 },
      snakk: { completed: 0, total: 0, correct: 0 },
    },
    completedAt: null,
    bricks,
  }
}

describe('brickWeightForExercise', () => {
  it('classifies production-type exercises as production', () => {
    expect(brickWeightForExercise('translation-to-norwegian')).toBe('production')
    expect(brickWeightForExercise('word-order')).toBe('production')
    expect(brickWeightForExercise('free-writing')).toBe('production')
    expect(brickWeightForExercise('cloze-passage')).toBe('production')
  })

  it('classifies recognition-type exercises as recognition (the meter recognition cannot move)', () => {
    expect(brickWeightForExercise('fill-in-blank')).toBe('recognition')
    expect(brickWeightForExercise('listening-comprehension')).toBe('recognition')
    expect(brickWeightForExercise('speed-round')).toBe('recognition')
    expect(brickWeightForExercise('translation-to-english')).toBe('recognition')
  })
})

describe('bumpDailyBrick', () => {
  it('creates today record with the weight set to 1 when no day record exists', () => {
    const fp = createEmptyFingerprint('anon')
    const next = bumpDailyBrick(fp, 'production')
    const today = next.dailyProgress.find((d) => d.date === TODAY)
    expect(today?.bricks).toEqual({ exposure: 0, recognition: 0, production: 1, guided: 0 })
  })

  it('increments an existing weight and leaves others untouched', () => {
    let fp = createEmptyFingerprint('anon')
    fp = bumpDailyBrick(fp, 'production')
    fp = bumpDailyBrick(fp, 'production')
    fp = bumpDailyBrick(fp, 'recognition')
    const today = fp.dailyProgress.find((d) => d.date === TODAY)
    expect(today?.bricks).toEqual({ exposure: 0, recognition: 1, production: 2, guided: 0 })
  })

  it('treats a legacy day record (no bricks field) as all-zeros, preserving blocks', () => {
    const fp = { ...createEmptyFingerprint('anon'), dailyProgress: [emptyDay(TODAY)] }
    const next = bumpDailyBrick(fp, 'guided')
    const today = next.dailyProgress.find((d) => d.date === TODAY)
    expect(today?.bricks).toEqual({ exposure: 0, recognition: 0, production: 0, guided: 1 })
    // existing block progress is preserved, not clobbered
    expect(today?.blocks.lytt).toEqual({ completed: 1, total: 5, correct: 1 })
  })

  it('does not mutate the input fingerprint', () => {
    const fp = createEmptyFingerprint('anon')
    const before = JSON.stringify(fp.dailyProgress)
    bumpDailyBrick(fp, 'exposure')
    expect(JSON.stringify(fp.dailyProgress)).toBe(before)
  })

  it('keeps the rolling 7-day window capped at 7 entries', () => {
    const olderDays = Array.from({ length: 7 }, (_, i) => emptyDay(`2026-05-0${i + 1}`))
    const fp = { ...createEmptyFingerprint('anon'), dailyProgress: olderDays }
    const next = bumpDailyBrick(fp, 'production')
    expect(next.dailyProgress.length).toBe(7)
    // today's freshly-created record is newest-first
    expect(next.dailyProgress[0].date).toBe(TODAY)
  })
})
