/**
 * Q-matrix deriver — p6 Phase C (hybrid: auto-derive + linguist gate).
 *
 * Reads the LIVE B1/B2 corpus, runs the deterministic concept detectors, and
 * writes a PROPOSED enrichment to staging. It NEVER touches the live corpus — the
 * merge into content/sentences/{b1,b2}.json is gated by a norwegian-linguist
 * spot-review (Phase C3) and applied separately (C4). This upholds Operating
 * Rule 8: no tags reach engine-feeding content without the gate.
 *
 * Run: npx tsx scripts/derive-multiskill-tags.ts
 * Output: content/sentences/staging/multiskill/{b1,b2}-proposed.json + a summary.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { detectExercisedConcepts } from '../src/lib/concept-detectors'

interface Row { id?: string; norwegian?: string; concept_ids?: string[] }
interface Proposal { id: string; norwegian: string; current: string[]; add: string[] }

const ROOT = process.cwd()
const SENT_DIR = join(ROOT, 'content', 'sentences')
const OUT_DIR = join(SENT_DIR, 'staging', 'multiskill')
mkdirSync(OUT_DIR, { recursive: true })

const LEVELS = ['b1', 'b2'] as const

for (const lvl of LEVELS) {
  const rows = JSON.parse(readFileSync(join(SENT_DIR, `${lvl}.json`), 'utf-8')) as Row[]
  const proposals: Proposal[] = []
  const addCounts: Record<string, number> = {}

  for (const s of rows) {
    const no = typeof s.norwegian === 'string' ? s.norwegian : ''
    if (!no) continue
    const current = new Set<string>(Array.isArray(s.concept_ids) ? s.concept_ids : [])
    const additions = detectExercisedConcepts(no).filter((c) => !current.has(c))
    if (additions.length === 0) continue
    for (const a of additions) addCounts[a] = (addCounts[a] ?? 0) + 1
    proposals.push({ id: s.id ?? '(no-id)', norwegian: no, current: [...current], add: additions })
  }

  writeFileSync(join(OUT_DIR, `${lvl}-proposed.json`), JSON.stringify(proposals, null, 2))
  const pct = ((proposals.length / rows.length) * 100).toFixed(0)
  console.log(`\n${lvl.toUpperCase()}: ${proposals.length}/${rows.length} sentences gain ≥1 foundational concept (${pct}%)`)
  for (const [c, n] of Object.entries(addCounts).sort((a, b) => b[1] - a[1])) {
    console.log(`  +${String(n).padStart(4)}  ${c}`)
  }
}

console.log(`\nProposals → ${OUT_DIR}  (STAGING — not merged; norwegian-linguist gate next, then C4 merge).`)
