/**
 * W1 — B1/B2 listening parity (p6 completeness). NO new content, NO audio gen.
 *
 * B1/B2 listening-comprehension ≈ 0 only because those vetted sentences omit the
 * `listening-comprehension` exercise type — yet they already have real MP3s
 * (public/audio/sentences/<id>.mp3, id-derived) and a TTS fallback. This enables
 * the listening type on a CURATED, length-bounded, per-concept-capped subset
 * (matching the A1/A2 scale and spreading across every concept) so a B1/B2 learner
 * can finally train listening. Idempotent. Preserves exact JSON formatting.
 *
 * Run: npx tsx scripts/enrich-listening-tags.ts   (then `npm run audit:gate`)
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'

interface Row { id?: string; norwegian?: string; concept_ids?: string[]; exercise_types?: string[]; error_tags_detectable?: string[] }

const ROOT = process.cwd()
const SENT_DIR = join(ROOT, 'content', 'sentences')
const AUDIO_DIR = join(ROOT, 'public', 'audio', 'sentences')

// Existing A1/A2 listening items cap at 9/11 words; continue the progression.
const CONFIG = { b1: { cap: 13 }, b2: { cap: 15 } }
const PER_CONCEPT_CAP = 8 // spread listening across concepts, ~A1/A2 total scale

const wc = (s: string) => s.trim().replace(/_+/g, 'x').split(/\s+/).filter(Boolean).length

function qualifies(r: Row, cap: number): boolean {
  const no = typeof r.norwegian === 'string' ? r.norwegian : ''
  const ex = r.exercise_types ?? []
  if (!no || /_/.test(no)) return false // clean sentence only (no fill-blank)
  if (ex.includes('listening-comprehension')) return false
  if (!ex.includes('translation-to-norwegian')) return false // a full produced sentence
  if (wc(no) > cap) return false
  if (!r.id || !existsSync(join(AUDIO_DIR, `${r.id}.mp3`))) return false // real audio only
  return true
}

for (const lvl of ['b1', 'b2'] as const) {
  const file = join(SENT_DIR, `${lvl}.json`)
  const raw = readFileSync(file, 'utf-8')
  const rows = JSON.parse(raw) as Row[]
  const cap = CONFIG[lvl].cap

  const perConcept: Record<string, number> = {}
  // Idempotency: seed the per-concept counter with sentences ALREADY tagged
  // listening-comprehension, so re-running respects the cap instead of adding
  // another batch on top of the existing ones.
  for (const r of rows) {
    if ((r.exercise_types ?? []).includes('listening-comprehension')) {
      const primary = r.concept_ids?.[0] ?? '(none)'
      perConcept[primary] = (perConcept[primary] ?? 0) + 1
    }
  }
  let added = 0
  let tagAdded = 0
  const samples: string[] = []
  for (const r of rows) {
    let hasListening = (r.exercise_types ?? []).includes('listening-comprehension')
    if (!hasListening && qualifies(r, cap)) {
      const primary = r.concept_ids?.[0] ?? '(none)' // original level concept (Q-matrix appended foundational ones after)
      if ((perConcept[primary] ?? 0) < PER_CONCEPT_CAP) {
        perConcept[primary] = (perConcept[primary] ?? 0) + 1
        ;(r.exercise_types ??= []).push('listening-comprehension')
        hasListening = true
        added++
        if (samples.length < 4) samples.push(`  · ${r.norwegian}`)
      }
    }
    // A listening item should DECLARE listening-recognition (matches A1/A2) — it's
    // a genuinely detectable class on a listen-and-type exercise (classify-error's
    // listening fallback), so authoring it closes the diagnostic gap honestly.
    if (hasListening && !(r.error_tags_detectable ?? []).includes('listening-recognition')) {
      ;(r.error_tags_detectable ??= []).push('listening-recognition')
      tagAdded++
    }
  }

  writeFileSync(file, JSON.stringify(rows, null, 2) + (raw.endsWith('\n') ? '\n' : ''))
  console.log(`${lvl.toUpperCase()}: +${added} listening items across ${Object.keys(perConcept).length} concepts (cap ${cap}w, ≤${PER_CONCEPT_CAP}/concept); +${tagAdded} listening-recognition tags`)
  samples.forEach((s) => console.log(s))
}
console.log('\nEnriched. Run `npm run audit:gate` to confirm 0 ERRORS + the coverage gate.')
