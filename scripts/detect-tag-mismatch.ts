/**
 * Tag-mismatch detector — B1 and B2 only.
 *
 * Detection rule:
 *   For every sentence, build the UNION of errorTags declared by all concept
 *   nodes that the sentence references (searched across all four CEFR-level
 *   graphs, because B1 concepts can list A2 or A1 prerequisites that are
 *   themselves valid co-concepts on a sentence).
 *   A sentence is FLAGGED when errorTagsDetectable[0] (the primary / load-
 *   bearing tag that the repair loop uses first) is NOT in that union — OR
 *   when any other tag in the list is not in the union.
 *
 * Does NOT modify any file. Writes proposals to:
 *   content/sentences/staging/retag/b1.json
 *   content/sentences/staging/retag/b2.json
 *
 * Run: npx tsx scripts/detect-tag-mismatch.ts
 */

import { readFileSync, mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

// ── Types ──────────────────────────────────────────────────────────────────

interface ConceptNode {
  id: string
  cefrLevel: string
  errorTags?: string[]
}

interface Sentence {
  id: string
  norwegian: string
  english: string
  concept_ids: string[]
  vocab_clusters?: string[]
  error_tags_detectable: string[]
  cefr_level: string
  difficulty: number
  exercise_types: string[]
  notes?: string
  [k: string]: unknown
}

interface FlaggedSentence extends Sentence {
  _mismatch: {
    primaryTagOk: boolean
    offendingTags: string[]       // tags not in the valid union
    validUnion: string[]          // full set of valid tags for this sentence's concepts
    conceptIds: string[]
  }
}

interface StagingRow extends Sentence {
  error_tags_detectable: string[]  // corrected
  _linguistReview?: string         // present when auto-proposal is ambiguous
}

// ── Load concept graphs (all four levels — cross-level refs exist) ─────────

const ROOT = process.cwd()
const CONCEPT_DIR = join(ROOT, 'content', 'concepts')
const SENT_DIR = join(ROOT, 'content', 'sentences')
const STAGING_OUT = join(ROOT, 'content', 'sentences', 'staging', 'retag')

const conceptById = new Map<string, ConceptNode>()
for (const lvl of ['a1', 'a2', 'b1', 'b2']) {
  const graph = JSON.parse(
    readFileSync(join(CONCEPT_DIR, `${lvl}-graph.json`), 'utf-8')
  ) as { concepts: ConceptNode[] }
  for (const c of graph.concepts) {
    conceptById.set(c.id, { id: c.id, cefrLevel: c.cefrLevel, errorTags: c.errorTags ?? [] })
  }
}

// ── Helper: build valid error-tag union for a sentence ────────────────────

function validTagUnion(conceptIds: string[]): Set<string> {
  const union = new Set<string>()
  for (const cid of conceptIds) {
    const node = conceptById.get(cid)
    if (node) for (const t of node.errorTags ?? []) union.add(t)
  }
  return union
}

// ── Helper: propose corrected tags for a flagged sentence ─────────────────
//
// Strategy:
//   1. Keep every existing tag that IS in the valid union (no guessing needed).
//   2. Drop every offending tag (not in union) — these are provably wrong.
//   3. Ensure the proposed list starts with the concept's intended primary tag
//      (first errorTag declared by the primary concept node).
//      If that tag is already in the kept list, promote it to index 0.
//      If not in the kept list but in the union, prepend it.
//   4. Mark _linguistReview when:
//      (a) After dropping offenders the surviving-valid list is empty, meaning
//          ALL original tags were wrong — the concept-preferred primary is
//          prepended as a best-effort fallback but the linguist must confirm.
//      (b) Auto-proposal is clean (>= 1 original valid tag survived) — no
//          review needed because we only removed provably wrong tags.

function proposeCorrection(
  sentence: Sentence,
  validUnion: Set<string>,
  offendingTags: string[]
): { proposed: string[]; needsLinguistReview: boolean; reviewReason: string } {
  const existing = sentence.error_tags_detectable

  // Step 1 & 2: keep valid, drop offending
  const survivingValid = existing.filter((t) => validUnion.has(t))
  const allDropped = survivingValid.length === 0

  // Step 3: ensure preferred primary (concept author's intent) is at index 0
  const primaryConceptId = sentence.concept_ids[0]
  const primaryConcept = conceptById.get(primaryConceptId)
  const preferredPrimary = primaryConcept?.errorTags?.[0]

  const working = [...survivingValid]

  if (preferredPrimary && validUnion.has(preferredPrimary)) {
    const idx = working.indexOf(preferredPrimary)
    if (idx > 0) {
      working.splice(idx, 1)
      working.unshift(preferredPrimary)
    } else if (idx === -1) {
      working.unshift(preferredPrimary)
    }
  }

  const proposed = [...new Set(working)]

  // Absolute safety: if still empty, take first from union sorted for stability
  if (proposed.length === 0) {
    const fallback = [...validUnion].sort()[0]
    if (fallback) proposed.push(fallback)
  }

  // Step 4: review needed only when all original tags were dropped (full replacement)
  if (allDropped) {
    return {
      proposed,
      needsLinguistReview: true,
      reviewReason: `ambiguous: all original tags [${existing.join(', ')}] were outside the valid union; proposed [${proposed.join(', ')}] from concept-preferred primary — confirm this is the right diagnostic signal for concept(s) [${sentence.concept_ids.join(', ')}] (valid union: [${[...validUnion].sort().join(', ')}])`,
    }
  }

  return { proposed, needsLinguistReview: false, reviewReason: '' }
}

// ── Detect mismatches ─────────────────────────────────────────────────────

interface LevelResult {
  total: number
  flagged: FlaggedSentence[]
  // concept → flagged sentences for that concept
  byConceptId: Map<string, FlaggedSentence[]>
}

function detectLevel(level: 'B1' | 'B2'): LevelResult {
  const sentences = JSON.parse(
    readFileSync(join(SENT_DIR, `${level.toLowerCase()}.json`), 'utf-8')
  ) as Sentence[]

  const flagged: FlaggedSentence[] = []
  const byConceptId = new Map<string, FlaggedSentence[]>()

  for (const s of sentences) {
    if (!Array.isArray(s.concept_ids) || s.concept_ids.length === 0) continue
    if (!Array.isArray(s.error_tags_detectable) || s.error_tags_detectable.length === 0) continue

    const validUnion = validTagUnion(s.concept_ids)
    if (validUnion.size === 0) continue  // concept not found — skip (audit-corpus catches this)

    const tags = s.error_tags_detectable
    const primaryTag = tags[0]
    const primaryTagOk = validUnion.has(primaryTag)
    const offendingTags = tags.filter((t) => !validUnion.has(t))

    if (primaryTagOk && offendingTags.length === 0) continue  // clean — no flag

    const flaggedRow: FlaggedSentence = {
      ...s,
      _mismatch: {
        primaryTagOk,
        offendingTags,
        validUnion: [...validUnion].sort(),
        conceptIds: s.concept_ids,
      },
    }
    flagged.push(flaggedRow)

    for (const cid of s.concept_ids) {
      if (!byConceptId.has(cid)) byConceptId.set(cid, [])
      byConceptId.get(cid)!.push(flaggedRow)
    }
  }

  return { total: sentences.length, flagged, byConceptId }
}

const b1 = detectLevel('B1')
const b2 = detectLevel('B2')

// ── Build staging proposals ────────────────────────────────────────────────

function buildStagingRows(result: LevelResult): { rows: StagingRow[]; autoCount: number; ambiguousCount: number } {
  let autoCount = 0
  let ambiguousCount = 0
  const rows: StagingRow[] = []

  for (const fs of result.flagged) {
    const validUnion = new Set(fs._mismatch.validUnion)
    const { proposed, needsLinguistReview, reviewReason } = proposeCorrection(
      fs, validUnion, fs._mismatch.offendingTags
    )

    // Produce a clean row (no internal _mismatch field)
    const { _mismatch, ...rest } = fs
    void _mismatch  // used above

    const stagingRow: StagingRow = {
      ...rest,
      error_tags_detectable: proposed,
    }

    if (needsLinguistReview) {
      stagingRow._linguistReview = reviewReason
      ambiguousCount++
    } else {
      autoCount++
    }

    rows.push(stagingRow)
  }

  return { rows, autoCount, ambiguousCount }
}

const b1Staging = buildStagingRows(b1)
const b2Staging = buildStagingRows(b2)

// ── Write staging files ────────────────────────────────────────────────────

mkdirSync(STAGING_OUT, { recursive: true })

if (b1Staging.rows.length > 0) {
  writeFileSync(
    join(STAGING_OUT, 'b1.json'),
    JSON.stringify(b1Staging.rows, null, 2) + '\n',
    'utf-8'
  )
}

if (b2Staging.rows.length > 0) {
  writeFileSync(
    join(STAGING_OUT, 'b2.json'),
    JSON.stringify(b2Staging.rows, null, 2) + '\n',
    'utf-8'
  )
}

// ── Print report ───────────────────────────────────────────────────────────

function bar(n = 72) { return '═'.repeat(n) }
function dash(n = 70) { return '─'.repeat(n) }

const lines: string[] = []
lines.push(bar())
lines.push('  TAG-MISMATCH DETECTOR — B1 + B2')
lines.push('  Detection rule: errorTagsDetectable[0] OR any tag not in the')
lines.push('  union of errorTags declared by the sentence\'s concept nodes')
lines.push('  (all four CEFR-level graphs searched for cross-level concepts).')
lines.push(bar())
lines.push('')
lines.push(`  B1: ${b1.total} sentences · ${b1.flagged.length} flagged (${pct(b1.flagged.length, b1.total)}%)`)
lines.push(`  B2: ${b2.total} sentences · ${b2.flagged.length} flagged (${pct(b2.flagged.length, b2.total)}%)`)
lines.push(`  Total flagged: ${b1.flagged.length + b2.flagged.length} / ${b1.total + b2.total}`)
lines.push('')

function pct(n: number, d: number): string {
  return d === 0 ? '0' : ((n / d) * 100).toFixed(1)
}

function clusterReport(result: LevelResult, level: string) {
  lines.push(dash())
  lines.push(`  ${level} — per-concept mismatch clusters`)
  lines.push(dash())
  if (result.byConceptId.size === 0) {
    lines.push('  (none flagged)')
    lines.push('')
    return
  }

  // Sort by count desc
  const sorted = [...result.byConceptId.entries()].sort((a, b) => b[1].length - a[1].length)
  for (const [cid, rows] of sorted) {
    const concept = conceptById.get(cid)
    const validTags = concept?.errorTags ?? []
    lines.push(`  ${cid}  [${rows.length} flagged / valid tags: ${validTags.join(', ')}]`)

    // Show up to 3 examples
    for (const r of rows.slice(0, 3)) {
      const offending = r._mismatch.offendingTags
      const primaryBad = !r._mismatch.primaryTagOk
      lines.push(`    · [${r.id}] ${r.norwegian.slice(0, 70)}`)
      lines.push(`      current tags: [${r.error_tags_detectable.join(', ')}]`)
      if (primaryBad) lines.push(`      PRIMARY MISMATCH: "${r.error_tags_detectable[0]}" not in valid union`)
      if (offending.length > 0) lines.push(`      offending tags:  [${offending.join(', ')}]`)
      lines.push(`      valid union:     [${r._mismatch.validUnion.join(', ')}]`)
    }
    if (rows.length > 3) lines.push(`    · …and ${rows.length - 3} more`)
    lines.push('')
  }
}

clusterReport(b1, 'B1')
clusterReport(b2, 'B2')

lines.push(bar())
lines.push('  STAGING PROPOSALS')
lines.push(bar())
lines.push('')
lines.push(`  B1: ${b1Staging.autoCount} auto-proposed, ${b1Staging.ambiguousCount} marked _linguistReview`)
lines.push(`  B2: ${b2Staging.autoCount} auto-proposed, ${b2Staging.ambiguousCount} marked _linguistReview`)
lines.push('')
if (b1Staging.rows.length > 0) lines.push(`  content/sentences/staging/retag/b1.json  (${b1Staging.rows.length} rows)`)
if (b2Staging.rows.length > 0) lines.push(`  content/sentences/staging/retag/b2.json  (${b2Staging.rows.length} rows)`)
if (b1Staging.rows.length === 0 && b2Staging.rows.length === 0) lines.push('  (no staging files — no mismatches found)')
lines.push('')
lines.push(bar())
lines.push(
  b1.flagged.length + b2.flagged.length === 0
    ? '  ✓ No tag mismatches found. Diagnosis signal is clean.'
    : `  ${b1.flagged.length + b2.flagged.length} sentences have mismatched tags — review staging files before next seed.`
)
lines.push(bar())

console.log(lines.join('\n'))
