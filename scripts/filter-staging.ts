/**
 * Run the concept-aware content gate (scripts/lib/content-gate.ts) over the
 * staging files and report what survives. Read-only by default.
 *
 *   npx tsx scripts/filter-staging.ts                 # report per-file pass/fail + reasons
 *   npx tsx scripts/filter-staging.ts --only=gen-A1   # restrict to matching filenames
 *   npx tsx scripts/filter-staging.ts --write         # write PASS-only rows to staging/filtered/<file>
 *
 * This is the mechanical pre-filter. A norwegian-linguist pass is still required
 * on whatever survives before seeding — the gate stops gross failures, it does
 * not certify grammar or naturalness.
 */
import { readFileSync, writeFileSync, existsSync, readdirSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { gateRow, structuralSignature, type GateRow } from './lib/content-gate'

const ROOT = process.cwd()
const STAGE_DIR = join(ROOT, 'content', 'sentences', 'staging')
const OUT_DIR = join(STAGE_DIR, 'filtered')
const WRITE = process.argv.includes('--write')
const only = (process.argv.find((a) => a.startsWith('--only=')) ?? '').split('=')[1] ?? 'gen-'

if (!existsSync(STAGE_DIR)) { console.log('No staging directory.'); process.exit(0) }
const files = readdirSync(STAGE_DIR).filter((f) => f.endsWith('.json') && f.includes(only))
if (files.length === 0) { console.log(`No staging files matching "${only}".`); process.exit(0) }

let grandTotal = 0, grandPass = 0
const reasonTally = new Map<string, number>()

for (const f of files) {
  let rows: GateRow[]
  try { rows = JSON.parse(readFileSync(join(STAGE_DIR, f), 'utf-8')) } catch { console.log(`  ⚠️  ${f}: unreadable`); continue }
  if (!Array.isArray(rows)) continue

  const seenSig = new Set<string>()
  const pass: GateRow[] = []
  const fails: { no: string; reasons: string[] }[] = []
  let nearDup = 0

  for (const r of rows) {
    const res = gateRow(r)
    // Near-dup is ADVISORY only — exact dedup is enforced by seed-staging.ts and
    // semantic dedup is the linguist's job. We only count it to surface thin
    // variety; it never fails an otherwise-valid row. Restrict the signal to
    // longer sentences (≥5 tokens) so short SVC pairs ("Hun er kort"/"god",
    // where the final word is the taught content) are not falsely merged.
    const toks = (r.norwegian ?? '').split(/\s+/).filter(Boolean)
    if (res.ok && toks.length >= 5) {
      const sig = structuralSignature(r.norwegian ?? '')
      if (seenSig.has(sig)) nearDup++
      else seenSig.add(sig)
    }
    if (res.ok) pass.push(r)
    else fails.push({ no: r.norwegian ?? '(empty)', reasons: res.reasons })
    for (const reason of res.reasons) {
      const key = reason.replace(/"[^"]*"/g, '"…"').replace(/\[[^\]]*\]/g, '[…]')
      reasonTally.set(key, (reasonTally.get(key) ?? 0) + 1)
    }
  }

  grandTotal += rows.length
  grandPass += pass.length
  const rate = rows.length ? Math.round((100 * pass.length) / rows.length) : 0
  const flag = rate < 50 ? '  ✗ CATASTROPHIC' : rate < 80 ? '  ⚠' : '  ✓'
  const dupNote = nearDup ? `  (${nearDup} near-dup, advisory)` : ''
  console.log(`\n${f}  —  ${pass.length}/${rows.length} pass (${rate}%)${flag}${dupNote}`)
  for (const fail of fails.slice(0, 5)) console.log(`     ✗ "${fail.no}" — ${fail.reasons.join('; ')}`)
  if (fails.length > 5) console.log(`     …and ${fails.length - 5} more rejected`)

  if (WRITE && pass.length) {
    if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true })
    writeFileSync(join(OUT_DIR, f), JSON.stringify(pass, null, 2) + '\n', 'utf-8')
  }
}

console.log('\n' + '═'.repeat(64))
console.log(`TOTAL: ${grandPass}/${grandTotal} pass (${Math.round((100 * grandPass) / grandTotal)}%)`)
console.log('\nTop rejection reasons:')
for (const [reason, n] of [...reasonTally.entries()].sort((a, b) => b[1] - a[1]).slice(0, 15)) {
  console.log(`  ${String(n).padStart(4)}  ${reason}`)
}
if (WRITE) console.log(`\nPASS-only rows written to ${OUT_DIR}`)
else console.log('\nRe-run with --write to emit PASS-only rows to staging/filtered/')
