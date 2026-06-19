/**
 * C4 — merge the C3-gated Q-matrix enrichment into the LIVE B1/B2 corpus.
 *
 * Appends auto-derived foundational concept_ids (the A1/A2 concepts a B1/B2
 * sentence also EXERCISES) so remediate-at-level can select an at-level sentence
 * for a learner weak on a foundational concept (p6 Phase C). Additions come from
 * content/sentences/staging/multiskill/{b1,b2}-proposed.json (derive-multiskill-
 * tags.ts), AFTER the precision gate. Idempotent — additions dedupe against
 * existing tags, so re-running is a no-op. Preserves exact JSON formatting
 * (2-space, trailing newline) for a clean diff.
 *
 * Run: npx tsx scripts/merge-multiskill-tags.ts  (then `npm run audit:gate`)
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

interface Row { id?: string; concept_ids?: string[]; [k: string]: unknown }
interface Proposal { id: string; add: string[] }

const ROOT = process.cwd()
const SENT_DIR = join(ROOT, 'content', 'sentences')
const STAGE = join(SENT_DIR, 'staging', 'multiskill')

for (const lvl of ['b1', 'b2'] as const) {
  const file = join(SENT_DIR, `${lvl}.json`)
  const raw = readFileSync(file, 'utf-8')
  const rows = JSON.parse(raw) as Row[]
  const proposals = JSON.parse(readFileSync(join(STAGE, `${lvl}-proposed.json`), 'utf-8')) as Proposal[]
  const addById = new Map(proposals.map((p) => [p.id, p.add]))

  let touched = 0
  let added = 0
  for (const r of rows) {
    const adds = r.id ? addById.get(r.id) : undefined
    if (!adds || adds.length === 0) continue
    const existing = Array.isArray(r.concept_ids) ? r.concept_ids : []
    const merged = [...existing]
    for (const a of adds) if (!merged.includes(a)) { merged.push(a); added++ }
    if (merged.length !== existing.length) { r.concept_ids = merged; touched++ }
  }

  writeFileSync(file, JSON.stringify(rows, null, 2) + (raw.endsWith('\n') ? '\n' : ''))
  console.log(`${lvl.toUpperCase()}: ${touched} sentences enriched, ${added} concept tags added`)
}
console.log('Merged into live corpus. Run `npm run audit:gate` to confirm 0 ERRORS.')
