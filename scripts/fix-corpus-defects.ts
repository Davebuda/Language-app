/**
 * Phase 0 — Corpus defect fixes (one-time, user-approved 2026-05-28).
 *
 * 1. B1 difficulty out of contract: remap 3->1, 4->2, 5->3 so all levels use the
 *    documented within-level DifficultyTier (1|2|3). Preserves within-B1 ordering.
 * 2. B2 error tags outside the 17-tag taxonomy: retag to canonical tags.
 *      register-mismatch    -> wrong-word-same-category
 *      idiom-use            -> wrong-word-same-category
 *      passive-construction -> verb-conjugation
 *
 * Idempotent. Run: npx tsx scripts/fix-corpus-defects.ts
 * (blank-marker inconsistency is handled in code via extractBlank, not mutated here.)
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const ROOT = process.cwd()
const SENT = (lvl: string) => join(ROOT, 'content', 'sentences', `${lvl}.json`)

const DIFF_REMAP: Record<number, number> = { 1: 1, 2: 2, 3: 1, 4: 2, 5: 3 }
const TAG_REMAP: Record<string, string> = {
  'register-mismatch': 'wrong-word-same-category',
  'idiom-use': 'wrong-word-same-category',
  'passive-construction': 'verb-conjugation',
}

interface Row { difficulty?: number; error_tags_detectable?: string[]; [k: string]: unknown }

// ── B1: difficulty remap ───────────────────────────────────────────────────
const b1 = JSON.parse(readFileSync(SENT('b1'), 'utf-8')) as Row[]
let diffChanged = 0
const diffDist: Record<number, number> = {}
for (const r of b1) {
  const before = r.difficulty
  if (typeof before === 'number' && DIFF_REMAP[before] !== undefined && DIFF_REMAP[before] !== before) {
    r.difficulty = DIFF_REMAP[before]
    diffChanged++
  }
  diffDist[r.difficulty as number] = (diffDist[r.difficulty as number] ?? 0) + 1
}
writeFileSync(SENT('b1'), JSON.stringify(b1, null, 2) + '\n', 'utf-8')

// ── B2: error-tag retag ─────────────────────────────────────────────────────
const b2 = JSON.parse(readFileSync(SENT('b2'), 'utf-8')) as Row[]
let tagChanged = 0
const tagCounts: Record<string, number> = {}
for (const r of b2) {
  const tags = r.error_tags_detectable
  if (!Array.isArray(tags)) continue
  const mapped = tags.map((t) => {
    if (TAG_REMAP[t]) { tagChanged++; tagCounts[t] = (tagCounts[t] ?? 0) + 1; return TAG_REMAP[t] }
    return t
  })
  r.error_tags_detectable = [...new Set(mapped)] // dedup after mapping
}
writeFileSync(SENT('b2'), JSON.stringify(b2, null, 2) + '\n', 'utf-8')

// ── Report ──────────────────────────────────────────────────────────────────
console.log('Corpus defect fixes applied:')
console.log(`  B1 difficulty: ${diffChanged} rows remapped → distribution now ${JSON.stringify(diffDist)}`)
console.log(`  B2 error tags: ${tagChanged} tags retagged → ${JSON.stringify(tagCounts)}`)
