// Production-wall view-model — the pure layer between the fingerprint and the
// dashboard <ProductionWall> presenter. All per-level behaviour lives in
// LENS_CONFIG (data), so the component never branches on level and the honesty
// rules (what counts toward the hero, what the wall is called) are in one place.
//
// Honesty rails (CLAUDE.md Rule 6/8):
//  - The hero count is a REAL count, never a %. A1/A2/B1: production+guided bricks.
//  - Recognition bricks render but NEVER count toward the hero (B1/B2 say so).
//  - B2's hero is a REAL lexical-coverage count (vocabCoverage): words produced
//    correctly after being missed ("ord du ikke lenger bommer på") — decay-gated,
//    can go down. Not a fabricated meter.

import type {
  MistakeFingerprint,
  CEFRLevel,
  BrickWeight,
} from '@/types/fingerprint'
import type { WeeklyProgressEntry } from '@/lib/weekly-progress'
import { vocabCoverage } from '@/engine'
import type { VocabCoverage } from '@/engine'

export type BrickCellWeight = BrickWeight | 'empty'

export interface BrickCell {
  weight: BrickCellWeight
  /** The most-recent filled brick — the presenter animates this one in. */
  landed?: boolean
}

export interface WeekBar {
  weekday: string
  /** production + guided bricks laid that day (recognition/exposure excluded). */
  value: number
  live: boolean
}

export interface ProductionWallView {
  level: CEFRLevel
  objectiveKicker: string
  objectiveTitle: string
  heroCount: number
  heroUnit: string
  speakingMinutes: number
  /** focus concepts with an open production gap (production lagging recognition). */
  gapConceptCount: number
  bricks: BrickCell[]
  wallCaption: string
  wallNote: string
  weekBars: WeekBar[]
  rollupLabel: string
  rollupDetail: string
  /** B2 only: honest exercise-variety disclosure (lytt/hurtigrunde not yet at B2). */
  interim?: string
  /** B2 only: honest lexical-coverage meter (activated/missed/total words). */
  lexical?: VocabCoverage
  legendShowsGuided: boolean
}

interface LensConfig {
  kicker: string
  title: string
  heroUnit: string
  wallCaption: string
  /** Static note (e.g. "gjenkjenning teller ikke her"); null → show a brick count. */
  wallNote: string | null
  rollupLabel: string
  interim?: string
  /** Which brick weights count toward the hero number (never recognition/exposure). */
  heroWeights: BrickWeight[]
  /** B2: the hero is vocabCoverage.activated (words mastered), not a brick sum. */
  lexicalMeter?: boolean
  rollupDetail: (improvedLabels: string[], gapCount: number) => string
}

const PROD_AND_GUIDED: BrickWeight[] = ['production', 'guided']

export const LENS_CONFIG: Record<CEFRLevel, LensConfig> = {
  A1: {
    kicker: 'Dagens mål · grunnmur',
    title: 'Bygg grunnmuren',
    heroUnit: 'grunnsteiner rørt',
    wallCaption: 'Dagens mur',
    wallNote: null,
    rollupLabel: 'Ukens sprint · grunnmur',
    heroWeights: PROD_AND_GUIDED,
    rollupDetail: (labels) =>
      labels.length ? `Styrket: ${labels.join(', ')}.` : 'Bygg videre på grunnmuren denne uka.',
  },
  A2: {
    kicker: 'Dagens mål · kombinasjon',
    title: 'Sett sammen lengre ytringer',
    heroUnit: 'setninger satt sammen',
    wallCaption: 'Dagens mur',
    wallNote: null,
    rollupLabel: 'Ukens sprint · kombinasjoner',
    heroWeights: PROD_AND_GUIDED,
    rollupDetail: (labels) =>
      labels.length ? `Kombinert: ${labels.join(', ')}.` : 'Sett sammen lengre ytringer denne uka.',
  },
  B1: {
    kicker: 'Dagens mål · produksjon',
    title: 'Produser leddsetninger',
    heroUnit: 'setninger produsert',
    wallCaption: 'Dagens produksjonsmur',
    wallNote: 'gjenkjenning teller ikke her',
    rollupLabel: 'Ukens sprint · produksjonsgap',
    heroWeights: PROD_AND_GUIDED,
    rollupDetail: (labels, gap) =>
      labels.length
        ? `Gap faller på ${labels.join(', ')}.`
        : gap > 0
          ? `Produksjonsgap på ${gap} begrep${gap === 1 ? '' : 'er'}.`
          : 'Produser på ukens fokus.',
  },
  B2: {
    kicker: 'Dagens mål · ordforråd',
    title: 'Aktiver ordforrådet',
    heroUnit: 'ord du mestrer',
    wallCaption: 'Dagens produksjonsmur',
    wallNote: 'gjenkjenning teller ikke her',
    rollupLabel: 'Ukens sprint · ordforråd',
    // Honest exercise-variety disclosure (the ordforråd track now exists — see lexical meter).
    interim:
      'B2 har foreløpig færre øvingstyper (lytting og hurtigrunde kommer). Bøyningsdrillen aktiverer ord du har bommet på.',
    heroWeights: PROD_AND_GUIDED,
    lexicalMeter: true,
    rollupDetail: () =>
      'Et ord teller når du produserer det riktig etter å ha bommet på det.',
  },
}

const EMPTY_BRICKS = { exposure: 0, recognition: 0, production: 0, guided: 0 }
const DISPLAY_BRICK_SLOTS = 12
const WEEKDAY_LABELS = ['ma', 'ti', 'on', 'to', 'fr', 'lø', 'sø']

// Build a Mon–Sun bar series for the current week; each bar = that day's
// production+guided brick count, today flagged `live`. Date keys use the same
// UTC YYYY-MM-DD slice as bumpDailyBrick, so they line up exactly.
function buildWeekBars(fp: MistakeFingerprint, todayStr: string): WeekBar[] {
  const today = new Date(`${todayStr}T00:00:00Z`)
  const mondayOffset = (today.getUTCDay() + 6) % 7 // 0 = Monday
  const monday = new Date(today)
  monday.setUTCDate(today.getUTCDate() - mondayOffset)

  const byDate = new Map((fp.dailyProgress ?? []).map((d) => [d.date, d]))

  return WEEKDAY_LABELS.map((weekday, i) => {
    const dt = new Date(monday)
    dt.setUTCDate(monday.getUTCDate() + i)
    const ds = dt.toISOString().slice(0, 10)
    const rec = byDate.get(ds)
    const value = (rec?.bricks?.production ?? 0) + (rec?.bricks?.guided ?? 0)
    return { weekday, value, live: ds === todayStr }
  })
}

/**
 * Pure: derive the production-wall view for a learner. Reads today's brick
 * tally, the week's production bars, the production gap, speaking minutes, and
 * the weekly focus deltas. Never throws on legacy fingerprints (missing
 * `bricks` → zeros).
 */
export function deriveProductionWallView(
  fp: MistakeFingerprint,
  weeklyEntries: WeeklyProgressEntry[],
  todayStr: string = new Date().toISOString().slice(0, 10),
): ProductionWallView {
  const level = fp.currentLevel
  const lens = LENS_CONFIG[level]

  const todayRec = (fp.dailyProgress ?? []).find((d) => d.date === todayStr)
  const tally = { ...EMPTY_BRICKS, ...(todayRec?.bricks ?? {}) }

  const brickHero = lens.heroWeights.reduce((sum, w) => sum + tally[w], 0)
  // B2: the hero is the honest lexical-coverage count (words activated), not bricks.
  const lexical = lens.lexicalMeter ? vocabCoverage(fp) : undefined
  const heroCount = lexical ? lexical.activated : brickHero

  // Visible cells: production first (never pushed off the grid), then guided,
  // recognition, exposure; pad to the grid; the last filled cell "lands".
  const order: BrickWeight[] = ['production', 'guided', 'recognition', 'exposure']
  const cells: BrickCell[] = []
  for (const w of order) {
    for (let i = 0; i < tally[w] && cells.length < DISPLAY_BRICK_SLOTS; i++) {
      cells.push({ weight: w })
    }
  }
  const filled = cells.length
  if (filled > 0) {
    // Land the entrance accent on the most meaningful filled brick (last
    // production/guided), falling back to the last filled cell.
    let landIdx = filled - 1
    for (let i = filled - 1; i >= 0; i--) {
      if (cells[i].weight === 'production' || cells[i].weight === 'guided') {
        landIdx = i
        break
      }
    }
    cells[landIdx].landed = true
  }
  while (cells.length < DISPLAY_BRICK_SLOTS) cells.push({ weight: 'empty' })

  const gapConceptCount = (fp.weeklyFocus ?? []).filter((id) => (fp.productionGap?.[id] ?? 0) > 0).length
  const improved = weeklyEntries.filter((e) => e.deltaDecayed > 0).slice(0, 2).map((e) => e.label)

  return {
    level,
    objectiveKicker: lens.kicker,
    objectiveTitle: lens.title,
    heroCount,
    heroUnit: lens.heroUnit,
    speakingMinutes: Math.round(fp.speakingMinutesTotal ?? 0),
    gapConceptCount,
    bricks: cells,
    wallCaption: lens.wallCaption,
    wallNote: lens.wallNote ?? `${filled} av ${DISPLAY_BRICK_SLOTS} brikker`,
    weekBars: buildWeekBars(fp, todayStr),
    rollupLabel: lens.rollupLabel,
    rollupDetail: lens.rollupDetail(improved, gapConceptCount),
    interim: lens.interim,
    lexical,
    // Only advertise the "Med stillas" legend entry when guided bricks are
    // actually on the wall — no legend/grid mismatch.
    legendShowsGuided: tally.guided > 0,
  }
}
