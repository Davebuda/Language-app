/**
 * Finalize deepen-staging files: run the mechanical content-gate, add uuids.
 *   npx tsx scripts/finalize-deepen.ts [file.json]
 * With no arg, processes every *.json in content/sentences/staging/deepen/.
 * Adds an `id` (uuid) to any row missing one and writes the file back.
 * Prints per-file gate results; exits 1 if any row FAILS the gate.
 */
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { randomUUID } from 'node:crypto'
import { gateRow } from './lib/content-gate'

// The canonical 17-tag error taxonomy (content/taxonomy/errors.json). Authors
// sometimes invent tags (e.g. "subordinator-at"); those must not reach the live
// corpus or the audit's invalid-error-tag check fails post-seed.
const VALID_TAGS = new Set([
  'word-order', 'verb-tense', 'verb-conjugation', 'noun-gender', 'article-use',
  'adjective-agreement', 'pronoun-choice', 'preposition', 'modal-verb',
  'negation-placement', 'compound-word', 'wrong-word-same-category',
  'wrong-word-different-category', 'spelling', 'listening-recognition',
  'reading-parsing', 'meaning-misunderstood',
])

const DIR = join(process.cwd(), 'content', 'sentences', 'staging', 'deepen')
const arg = process.argv[2]
const files = arg ? [arg.replace(/^.*[\\/]/, '')] : (existsSync(DIR) ? readdirSync(DIR).filter((f) => f.endsWith('.json')) : [])

let failed = 0
for (const f of files) {
  const path = join(DIR, f)
  const rows = JSON.parse(readFileSync(path, 'utf-8')) as Record<string, unknown>[]
  let added = 0
  const reasons: string[] = []
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i]
    const res = gateRow(r)
    if (!res.ok) { failed++; reasons.push(`  [${i}] ${String(r.norwegian)} :: ${res.reasons.join('; ')}`) }
    const tags = Array.isArray(r.error_tags_detectable) ? r.error_tags_detectable as string[] : []
    const badTags = tags.filter((t) => !VALID_TAGS.has(t))
    if (badTags.length) { failed++; reasons.push(`  [${i}] ${String(r.norwegian)} :: invalid error_tags ${JSON.stringify(badTags)}`) }
    if (!r.id) { r.id = randomUUID(); added++ }
  }
  writeFileSync(path, JSON.stringify(rows, null, 2) + '\n', 'utf-8')
  console.log(`${f}: ${rows.length} rows, ${added} ids added, gate-fail ${reasons.length}`)
  if (reasons.length) console.log(reasons.join('\n'))
}
console.log(failed === 0 ? 'GATE_OK' : `GATE_FAIL ${failed}`)
process.exit(failed === 0 ? 0 : 1)
