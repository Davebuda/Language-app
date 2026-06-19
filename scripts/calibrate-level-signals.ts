/**
 * Calibrate the at-level validator against our OWN linguist-gated corpus
 * (p6 Phase A). Computes the three level signals (LIX, word count, subordinate-
 * clause count) for every live sentence and prints per-level percentiles, so the
 * committed thresholds in level-signals-thresholds.ts are derived from real data,
 * not guessed. Sidesteps the missing Norwegian LIX→CEFR literature (scout Lane B).
 *
 * Run: npx tsx scripts/calibrate-level-signals.ts
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { levelSignals } from '../src/lib/level-signals'

interface Row { norwegian?: string; exercise_types?: string[] }
const ROOT = process.cwd()
const SENT_DIR = join(ROOT, 'content', 'sentences')
const LEVELS = ['a1', 'a2', 'b1', 'b2'] as const

function pct(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0
  const i = Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length))
  return sorted[i]
}

console.log('level   | LIX  p50 / p90 | words p50 / p90 | subClauses p50 / p90')
for (const lvl of LEVELS) {
  const rows = JSON.parse(readFileSync(join(SENT_DIR, `${lvl}.json`), 'utf-8')) as Row[]
  const lixV: number[] = []
  const wV: number[] = []
  const sV: number[] = []
  for (const r of rows) {
    const no = typeof r.norwegian === 'string' ? r.norwegian : ''
    // speed-round entries are word lists, not sentences — skip (would skew length).
    if (!no || (r.exercise_types ?? []).includes('speed-round')) continue
    const s = levelSignals(no)
    lixV.push(s.lix); wV.push(s.words); sV.push(s.subClauses)
  }
  lixV.sort((a, b) => a - b); wV.sort((a, b) => a - b); sV.sort((a, b) => a - b)
  const f = (n: number) => String(n).padStart(4)
  console.log(
    `${lvl.toUpperCase()}     | ${f(pct(lixV, 50))} / ${f(pct(lixV, 90))} | ${f(pct(wV, 50))} / ${f(pct(wV, 90))}      | ${f(pct(sV, 50))} / ${f(pct(sV, 90))}`,
  )
}
