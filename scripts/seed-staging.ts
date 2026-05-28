/**
 * Phase 1 — Seed reviewed staging content into the live corpus (SAFE).
 *
 * Merges content/sentences/staging/gen-*.json into the live content/sentences/
 * <level>.json files. APPEND-ONLY with dedup by id + normalized norwegian — it
 * never overwrites or removes existing sentences. Dry-run by default; pass
 * --commit to actually write. After committing, run `npm run audit:corpus` to
 * confirm 0 ERRORs before the content is trusted.
 *
 *   npx tsx scripts/seed-staging.ts            # dry-run: report what would merge
 *   npx tsx scripts/seed-staging.ts --commit   # actually merge into live corpus
 *
 * Only run this AFTER human spot-check of the staged sentences.
 */
import { readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

const ROOT = process.cwd()
const SENT_DIR = join(ROOT, 'content', 'sentences')
const STAGE_DIR = join(SENT_DIR, 'staging')
const COMMIT = process.argv.includes('--commit')
const LEVELS = ['A1', 'A2', 'B1', 'B2'] as const

interface Row { id?: string; norwegian?: string; cefr_level?: string; [k: string]: unknown }
const norm = (s: string) => s.toLowerCase().replace(/[.,!?;:«»“”‘’…"'()/\-–—%]/g, '').replace(/_+/g, ' ').replace(/\s+/g, ' ').trim()

function loadArr(path: string): Row[] {
  if (!existsSync(path)) return []
  try { const p = JSON.parse(readFileSync(path, 'utf-8')); return Array.isArray(p) ? p : [] } catch { return [] }
}

if (!existsSync(STAGE_DIR)) { console.log('No staging directory — nothing to seed.'); process.exit(0) }
const stageFiles = readdirSync(STAGE_DIR).filter((f) => f.endsWith('.json'))
if (stageFiles.length === 0) { console.log('No staged files — nothing to seed.'); process.exit(0) }

// Group staged rows by their cefr_level (robust to filename drift).
const staged: Record<string, Row[]> = { A1: [], A2: [], B1: [], B2: [] }
for (const f of stageFiles) for (const r of loadArr(join(STAGE_DIR, f))) {
  const lvl = (r.cefr_level ?? '').toUpperCase()
  if (lvl in staged) staged[lvl].push(r)
  else console.warn(`  ⚠️  ${f}: row with unknown cefr_level ${JSON.stringify(r.cefr_level)} skipped`)
}

console.log(`${COMMIT ? 'SEEDING' : 'DRY-RUN'} — ${stageFiles.length} staging file(s)\n`)
let totalAdded = 0
for (const lvl of LEVELS) {
  const rows = staged[lvl]
  if (rows.length === 0) continue
  const livePath = join(SENT_DIR, `${lvl.toLowerCase()}.json`)
  const live = loadArr(livePath)
  const seenIds = new Set(live.map((r) => r.id).filter(Boolean) as string[])
  const seenText = new Set(live.map((r) => (r.norwegian ? norm(r.norwegian) : '')).filter(Boolean))
  const toAdd: Row[] = []
  let dupId = 0, dupText = 0
  for (const r of rows) {
    if (r.id && seenIds.has(r.id)) { dupId++; continue }
    if (r.norwegian && seenText.has(norm(r.norwegian))) { dupText++; continue }
    if (r.id) seenIds.add(r.id)
    if (r.norwegian) seenText.add(norm(r.norwegian))
    toAdd.push(r)
  }
  console.log(`${lvl}: ${live.length} live + ${toAdd.length} new = ${live.length + toAdd.length}  (skipped ${dupId} dup-id, ${dupText} dup-text)`)
  totalAdded += toAdd.length
  if (COMMIT && toAdd.length) writeFileSync(livePath, JSON.stringify([...live, ...toAdd], null, 2) + '\n', 'utf-8')
}

console.log(`\n${COMMIT ? `Seeded ${totalAdded} sentences. Run \`npm run audit:corpus\` to verify 0 ERRORs.` : `Would add ${totalAdded} sentences. Re-run with --commit to apply.`}`)
