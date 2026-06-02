/**
 * apply-retag-corrections.mjs
 * Applies all linguist-approved tag corrections to staging/retag and live corpus.
 * Run: node output/apply-retag-corrections.mjs
 * DO NOT COMMIT output/ files.
 */

import { readFileSync, writeFileSync } from 'fs'
import { resolve } from 'path'

const ROOT = resolve(import.meta.dirname, '..')

function load(rel) {
  return JSON.parse(readFileSync(resolve(ROOT, rel), 'utf8'))
}

function save(rel, data) {
  writeFileSync(resolve(ROOT, rel), JSON.stringify(data, null, 2) + '\n', 'utf8')
  console.log(`Wrote ${rel}`)
}

// ── Tag correction maps ────────────────────────────────────────────────────────

// B2 text-cohesion fill-in-blank → wrong-word-same-category (primary)
const B2_TC_WWSC = new Set([
  'b2-tc-003','b2-tc-005','b2-tc-007','b2-tc-009','b2-tc-011',
  'b2-tc-014','b2-tc-016','b2-tc-017','b2-tc-019','b2-tc-021',
  'b2-tc-023','b2-tc-025','b2-tc-027','b2-tc-028',
])

// B2 text-cohesion non-fill-in-blank → meaning-misunderstood (primary)
const B2_TC_MEANING = new Set([
  'b2-tc-001','b2-tc-002','b2-tc-004','b2-tc-006','b2-tc-008',
  'b2-tc-010','b2-tc-012','b2-tc-013','b2-tc-015','b2-tc-018',
  'b2-tc-020','b2-tc-022','b2-tc-024','b2-tc-026','b2-tc-029','b2-tc-030',
])

// B2 advanced-verb-forms → spelling (primary)
const B2_AVF_SPELL = new Set(['b2-avf-003','b2-avf-014','b2-avf-023'])

// B1 present-participle fill-in-blank → adjective-agreement primary, remove verb-tense
const B1_PRP_FIB = new Set([
  'b1-prp-002','b1-prp-004','b1-prp-007','b1-prp-010','b1-prp-012',
  'b1-prp-014','b1-prp-016','b1-prp-018','b1-prp-020','b1-prp-023',
  'b1-prp-027','b1-prp-029',
])

// B1 cleft-sentences fill-in-blank → wrong-word-same-category (primary)
const B1_CS_WWSC = new Set([
  'b1-cs-002','b1-cs-004','b1-cs-006','b1-cs-008','b1-cs-010',
  'b1-cs-014','b1-cs-017','b1-cs-019','b1-cs-022','b1-cs-025','b1-cs-028',
])

// B1 s-passive: wrong-word-same-category primary
const B1_PAS_WWSC = new Set(['b1-pas-009','b1-pas-021','b1-pas-027'])

// B1 s-passive: verb-conjugation primary (drop verb-tense)
const B1_PAS_VC = new Set(['b1-pas-022','b1-pas-026','b1-pas-030'])

// B1 complex-subordination
const B1_CX_WWSC = new Set(['b1-cx-003']) // → wrong-word-same-category
const B1_CX_MODAL = new Set(['b1-cx-005']) // → modal-verb

// ── Sentence text fixes ────────────────────────────────────────────────────────
const SENTENCE_FIXES = {
  'b2-sm-018': {
    norwegian: 'Hvis hun hadde lyttet til foreldrenes råd, ville hun sluppet mange unødvendige problemer.',
    english: 'If she had listened to her parents\' advice, she would have avoided many unnecessary problems.',
    notes: '\'slippe\' in result clause — avoid/escape; past perfect condition; \'foreldrenes råd\' = genitive',
  },
  'b2-avf-018': {
    norwegian: 'Et godt _____ argument er mer overbevisende enn en svak og generell påstand.',
    english: 'A well-reasoned argument is more convincing than a weak and general claim.',
    notes: 'begrunnet — past participle as attributive adjective: reasoned/substantiated; \'en påstand\' (common gender)',
  },
}

// b1-prp-025 is to be REMOVED from live b1.json entirely
const B1_REMOVE = new Set(['b1-prp-025'])

// ── Apply corrections to a row array ─────────────────────────────────────────

function applyTagCorrections(rows, isStaging) {
  const result = []
  for (const row of rows) {
    const id = row.id
    const r = { ...row }

    // Sentence fixes (apply to both staging and live)
    if (SENTENCE_FIXES[id]) {
      const fix = SENTENCE_FIXES[id]
      if (fix.norwegian) r.norwegian = fix.norwegian
      if (fix.english) r.english = fix.english
      if (fix.notes) r.notes = fix.notes
    }

    // B2 text-cohesion tag corrections
    if (B2_TC_WWSC.has(id)) {
      r.error_tags_detectable = ['wrong-word-same-category']
    } else if (B2_TC_MEANING.has(id)) {
      r.error_tags_detectable = ['meaning-misunderstood']
    }

    // B2 advanced-verb-forms spelling
    if (B2_AVF_SPELL.has(id)) {
      r.error_tags_detectable = ['spelling']
    }

    // B1 present-participle fill-in-blank: adjective-agreement primary, remove verb-tense
    if (B1_PRP_FIB.has(id)) {
      const tags = (r.error_tags_detectable || []).filter(t => t !== 'verb-tense')
      // Ensure adjective-agreement is first
      if (!tags.includes('adjective-agreement')) tags.unshift('adjective-agreement')
      else {
        // Move adjective-agreement to front
        const idx = tags.indexOf('adjective-agreement')
        tags.splice(idx, 1)
        tags.unshift('adjective-agreement')
      }
      r.error_tags_detectable = tags
    }

    // B1 cleft-sentences fill-in-blank
    if (B1_CS_WWSC.has(id)) {
      r.error_tags_detectable = ['wrong-word-same-category']
    }

    // B1 s-passive corrections
    if (B1_PAS_WWSC.has(id)) {
      r.error_tags_detectable = ['wrong-word-same-category']
    } else if (B1_PAS_VC.has(id)) {
      // verb-conjugation primary, drop verb-tense
      r.error_tags_detectable = ['verb-conjugation']
    }

    // B1 complex-subordination
    if (B1_CX_WWSC.has(id)) {
      r.error_tags_detectable = ['wrong-word-same-category']
    } else if (B1_CX_MODAL.has(id)) {
      r.error_tags_detectable = ['modal-verb']
    }

    result.push(r)
  }
  return result
}

function applyLiveCorrections(rows) {
  return applyTagCorrections(rows, false).filter(r => !B1_REMOVE.has(r.id))
}

// ── Process staging files ─────────────────────────────────────────────────────

console.log('\n── Staging b2.json ──')
const stagingB2 = load('content/sentences/staging/retag/b2.json')
const correctedStagingB2 = applyTagCorrections(stagingB2, true)
save('content/sentences/staging/retag/b2.json', correctedStagingB2)

console.log('\n── Staging b1.json ──')
const stagingB1 = load('content/sentences/staging/retag/b1.json')
// Also remove b1-prp-025 from staging
const correctedStagingB1 = applyTagCorrections(stagingB1, true).filter(r => !B1_REMOVE.has(r.id))
save('content/sentences/staging/retag/b1.json', correctedStagingB1)

// ── Process live corpus ────────────────────────────────────────────────────────

console.log('\n── Live b2.json ──')
const liveB2 = load('content/sentences/b2.json')
const correctedLiveB2 = applyLiveCorrections(liveB2)
save('content/sentences/b2.json', correctedLiveB2)

console.log('\n── Live b1.json ──')
const liveB1 = load('content/sentences/b1.json')
const correctedLiveB1 = applyLiveCorrections(liveB1)
save('content/sentences/b1.json', correctedLiveB1)

// ── Validation summary ────────────────────────────────────────────────────────

console.log('\n── Validation summary ──')

const VALID_TAGS = new Set([
  'word-order','verb-tense','verb-conjugation','noun-gender','article-use',
  'adjective-agreement','pronoun-choice','preposition','modal-verb',
  'negation-placement','compound-word','wrong-word-same-category',
  'wrong-word-different-category','spelling','listening-recognition',
  'reading-parsing','meaning-misunderstood','unspecified',
])

let gateFailures = 0
let invalidTags = 0
let emptyTags = 0

function validateRows(rows, label) {
  for (const row of rows) {
    const tags = row.error_tags_detectable || []
    if (tags.length === 0) {
      console.error(`  EMPTY tags: ${row.id} [${label}]`)
      emptyTags++
    }
    for (const tag of tags) {
      if (!VALID_TAGS.has(tag)) {
        console.error(`  INVALID tag "${tag}" on ${row.id} [${label}]`)
        invalidTags++
      }
    }
  }
}

validateRows(correctedStagingB2, 'staging/b2')
validateRows(correctedStagingB1, 'staging/b1')
validateRows(correctedLiveB2, 'live/b2')
validateRows(correctedLiveB1, 'live/b1')

if (gateFailures === 0 && invalidTags === 0 && emptyTags === 0) {
  console.log('GATE_OK — 0 gate failures, 0 invalid tags, 0 empty tag arrays')
} else {
  console.error(`GATE_FAIL — gateFailures=${gateFailures} invalidTags=${invalidTags} emptyTags=${emptyTags}`)
  process.exit(1)
}

// ── Change counts ─────────────────────────────────────────────────────────────
console.log('\n── Change counts ──')
console.log(`B2 tc-wwsc rows: ${B2_TC_WWSC.size}`)
console.log(`B2 tc-meaning rows: ${B2_TC_MEANING.size}`)
console.log(`B2 avf-spell rows: ${B2_AVF_SPELL.size}`)
console.log(`B1 prp-fib rows: ${B1_PRP_FIB.size}`)
console.log(`B1 cs-wwsc rows: ${B1_CS_WWSC.size}`)
console.log(`B1 pas-wwsc rows: ${B1_PAS_WWSC.size}`)
console.log(`B1 pas-vc rows: ${B1_PAS_VC.size}`)
console.log(`B1 cx rows: ${B1_CX_WWSC.size + B1_CX_MODAL.size}`)
console.log(`Sentence fixes: ${Object.keys(SENTENCE_FIXES).length}`)
console.log(`Rows removed (b1-prp-025): 1`)
