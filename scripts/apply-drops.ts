/**
 * Apply the norwegian-linguist confirm drop-list to the gate-survivor files and
 * emit seed-ready lexical content.
 *
 *   npx tsx scripts/apply-drops.ts
 *
 * Reads content/sentences/staging/filtered/<file> (gate survivors), removes rows
 * whose id starts with any prefix in staging/drops.json, and writes the LEXICAL
 * allowlist files to content/sentences/staging/ready/. Structural concepts are
 * intentionally excluded — they are regenerated via a stronger model (Groq 70B),
 * not salvaged.
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'

const ROOT = process.cwd()
const STAGE = join(ROOT, 'content', 'sentences', 'staging')
const FILTERED = join(STAGE, 'filtered')
const READY = join(STAGE, 'ready')

// All salvageable concept files: the lexical batch (NB-Llama, confirmed by
// linguist) PLUS the structural batch regenerated via Groq 70B (v2, questions,
// infinitive, definite-articles, to-be/to-have, plural-formation, present-tense),
// also linguist-confirmed. Already-seeded rows dedup-skip on re-seed, so listing
// all of them is safe — only new rows are added.
const LEXICAL = [
  // lexical (NB-Llama)
  'gen-A1-svo-word-order.json', 'gen-A1-common-prepositions.json', 'gen-A1-numbers-basic.json',
  'gen-A1-personal-pronouns.json', 'gen-A1-noun-gender.json', 'gen-A1-negation.json',
  'gen-A1-basic-adjectives.json', 'gen-A1-adjective-agreement.json', 'gen-A1-indefinite-articles.json',
  'gen-A1-common-modal-verbs.json', 'gen-A1-preterite-regular.json', 'gen-A1-preterite-irregular-core.json',
  'gen-A2-perfect-tense.json', 'gen-A2-future-constructions.json', 'gen-B1-past-perfect.json',
  // structural (Groq 70B)
  'gen-A1-v2-word-order.json', 'gen-A1-question-formation.json', 'gen-A1-infinitive-form.json',
  'gen-A1-definite-articles-singular.json', 'gen-A1-definite-articles-plural.json',
  'gen-A1-to-be-verb.json', 'gen-A1-to-have-verb.json', 'gen-A1-plural-formation.json',
  'gen-A1-present-tense-regular.json',
]

const drops: string[] = (JSON.parse(readFileSync(join(STAGE, 'drops.json'), 'utf-8')) as { drop: string[] }).drop
const dropSet = new Set(drops)
const isDropped = (id: unknown) => typeof id === 'string' && dropSet.has(id.slice(0, 8))

if (!existsSync(READY)) mkdirSync(READY, { recursive: true })

let totalIn = 0, totalOut = 0
for (const f of LEXICAL) {
  const path = join(FILTERED, f)
  if (!existsSync(path)) { console.log(`  ⚠️  ${f}: not found in filtered/`); continue }
  const rows = JSON.parse(readFileSync(path, 'utf-8')) as Array<{ id?: string }>
  const kept = rows.filter((r) => !isDropped(r.id))
  totalIn += rows.length
  totalOut += kept.length
  writeFileSync(join(READY, f), JSON.stringify(kept, null, 2) + '\n', 'utf-8')
  console.log(`  ${f}: ${kept.length}/${rows.length} kept (dropped ${rows.length - kept.length})`)
}

const matched = drops.filter((p) => true).length
console.log(`\nReady: ${totalOut}/${totalIn} sentences across ${LEXICAL.length} lexical files → ${READY}`)
console.log(`Drop-list had ${matched} id-prefixes.`)
