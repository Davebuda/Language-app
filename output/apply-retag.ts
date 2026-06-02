/**
 * A2 seed: apply linguist-approved B1/B2 error-tag corrections + 3 Norwegian fixes
 * directly to the live corpus. Deterministic (absolute target tags). Idempotent on a
 * clean baseline. Run: npx tsx output/apply-retag.ts
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const TAXONOMY = new Set([
  'word-order', 'verb-tense', 'verb-conjugation', 'noun-gender', 'article-use',
  'adjective-agreement', 'pronoun-choice', 'preposition', 'modal-verb',
  'negation-placement', 'compound-word', 'wrong-word-same-category',
  'wrong-word-different-category', 'spelling', 'listening-recognition',
  'reading-parsing', 'meaning-misunderstood',
])

const ids = (concept: string, nums: number[]) =>
  nums.map((n) => `${concept}-${String(n).padStart(3, '0')}`)

// id -> absolute corrected error_tags_detectable (linguist verdict, primary = [0])
const TAG_CHANGES: Record<string, string[]> = {}
const set = (list: string[], tags: string[]) => list.forEach((id) => { TAG_CHANGES[id] = tags })

// B2 text-cohesion
set(ids('b2-tc', [3,5,7,9,11,14,16,17,19,21,23,25,27,28]), ['wrong-word-same-category'])
set(ids('b2-tc', [1,2,4,6,8,10,12,13,15,18,20,22,24,26,29,30]), ['meaning-misunderstood'])
// B2 advanced-verb-forms (present participles)
set(ids('b2-avf', [3,14,23]), ['spelling'])
// B1 present-participle fill-in (drop verb-tense -> adjective-agreement)
set(ids('b1-prp', [2,4,7,10,12,14,16,18,20,23,27,29]), ['adjective-agreement'])
// B1 cleft-sentences fill-in
set(ids('b1-cs', [2,4,6,8,10,14,17,19,22,25,28]), ['wrong-word-same-category'])
// B1 s-passive
set(ids('b1-pas', [9,21,27]), ['wrong-word-same-category'])
set(ids('b1-pas', [22,26,30]), ['verb-conjugation'])
// B1 complex-subordination
TAG_CHANGES['b1-cx-003'] = ['wrong-word-same-category']
TAG_CHANGES['b1-cx-005'] = ['modal-verb']

// validate all target tags are canonical
for (const [id, tags] of Object.entries(TAG_CHANGES)) {
  const bad = tags.filter((t) => !TAXONOMY.has(t))
  if (bad.length) throw new Error(`Non-taxonomy tag for ${id}: ${bad.join(',')}`)
}

type Row = Record<string, unknown> & { id: string; error_tags_detectable?: string[]; norwegian?: string }
const load = (f: string) => JSON.parse(readFileSync(f, 'utf-8')) as Row[]
const dir = join(process.cwd(), 'content', 'sentences')
const b1path = join(dir, 'b1.json')
const b2path = join(dir, 'b2.json')
let b1 = load(b1path)
let b2 = load(b2path)

const applyTags = (rows: Row[], level: string) => {
  const changed: string[] = []
  const missing: string[] = []
  for (const id of Object.keys(TAG_CHANGES)) {
    if ((level === 'b1' && !id.startsWith('b1-')) || (level === 'b2' && !id.startsWith('b2-'))) continue
    const row = rows.find((r) => r.id === id)
    if (!row) { missing.push(id); continue }
    row.error_tags_detectable = [...TAG_CHANGES[id]]
    changed.push(id)
  }
  return { changed, missing }
}
const r1 = applyTags(b1, 'b1')
const r2 = applyTags(b2, 'b2')

// --- 3 Norwegian fixes ---
const log: string[] = []
const sm018 = b2.find((r) => r.id === 'b2-sm-018')
if (sm018) {
  sm018.norwegian = 'Hvis hun hadde lyttet til foreldrenes råd, ville hun sluppet mange unødvendige problemer.'
  log.push('b2-sm-018 norwegian rewritten (possessive fix)')
} else log.push('b2-sm-018 NOT FOUND')

const avf018 = b2.find((r) => r.id === 'b2-avf-018')
if (avf018 && typeof avf018.norwegian === 'string') {
  const before = avf018.norwegian
  avf018.norwegian = before.replace('et svakt og generelt påstand', 'en svak og generell påstand')
  log.push(avf018.norwegian !== before ? 'b2-avf-018 gender fixed (et->en, generelt->generell)' : 'b2-avf-018 substring NOT matched')
} else log.push('b2-avf-018 NOT FOUND')

const beforeB1Len = b1.length
b1 = b1.filter((r) => r.id !== 'b1-prp-025')
log.push(b1.length === beforeB1Len - 1 ? 'b1-prp-025 removed (semantic mismatch)' : 'b1-prp-025 NOT removed')

// --- validate every row still has a valid non-empty tag set ---
const validateAll = (rows: Row[], level: string) => {
  for (const r of rows) {
    const tags = Array.isArray(r.error_tags_detectable) ? r.error_tags_detectable : []
    if (tags.length === 0) throw new Error(`${level} ${r.id}: empty error_tags_detectable`)
    const bad = tags.filter((t) => !TAXONOMY.has(t))
    if (bad.length) throw new Error(`${level} ${r.id}: invalid tags ${bad.join(',')}`)
  }
}
validateAll(b1, 'b1')
validateAll(b2, 'b2')

writeFileSync(b1path, JSON.stringify(b1, null, 2) + '\n', 'utf-8')
writeFileSync(b2path, JSON.stringify(b2, null, 2) + '\n', 'utf-8')

console.log(`B1: ${r1.changed.length} tag rows changed${r1.missing.length ? `, MISSING ${r1.missing.join(',')}` : ''}`)
console.log(`B2: ${r2.changed.length} tag rows changed${r2.missing.length ? `, MISSING ${r2.missing.join(',')}` : ''}`)
log.forEach((l) => console.log(' - ' + l))
console.log(`B1 rows: ${b1.length} (was 370), B2 rows: ${b2.length} (was 360)`)
console.log('SEED_OK')
