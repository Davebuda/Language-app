/**
 * Phase 0 — Corpus integrity audit (read-only).
 *
 * Audits the existing seed corpus (content/sentences/*.json) against the
 * concept graphs, the error taxonomy, and the exercise-type set BEFORE any
 * AI generation scales the corpus. Mis-tagged sentences silently poison the
 * diagnostic moat (diagnosis depends on correct concept_ids + error_tags),
 * so this proves the validation rules on known content and surfaces existing
 * defects.
 *
 * Run: npx tsx scripts/audit-corpus.ts
 * Always exits 0 (reporting tool, not a CI gate yet). Prints ERROR/WARN counts.
 *
 * NOTE: the spaCy/ordbank PARSE check (does the sentence actually demonstrate
 * the tagged grammar concept — V2 order, gender agreement?) needs a Python
 * pipeline and is deliberately OUT of scope here (Phase 0b). This script does
 * every check possible in pure TS.
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { ALL_ERROR_TAGS } from '../src/types/taxonomy'

// Exercise types — source of truth: src/types/session.ts (ExerciseType union).
const VALID_EXERCISE_TYPES = new Set<string>([
  'translation-to-norwegian', 'translation-to-english', 'sentence-transformation',
  'fill-in-blank', 'word-order', 'listening-comprehension', 'dictation',
  'reading-comprehension', 'free-writing', 'speed-round',
])
const VALID_ERROR_TAGS = new Set<string>(ALL_ERROR_TAGS)
const LEVELS = ['A1', 'A2', 'B1', 'B2'] as const
type Level = (typeof LEVELS)[number]
const LEVEL_RANK: Record<string, number> = { A1: 1, A2: 2, B1: 3, B2: 4 }
const LEVEL_MAX_WORDS: Record<Level, number> = { A1: 8, A2: 12, B1: 18, B2: 18 }
const DEPTH_TARGET = 30 // matches B1/B2 standard per CLAUDE.md

const ROOT = process.cwd()
const SENT_DIR = join(ROOT, 'content', 'sentences')
const CONCEPT_DIR = join(ROOT, 'content', 'concepts')

interface RawSentence {
  id?: unknown; norwegian?: unknown; english?: unknown
  concept_ids?: unknown; vocab_clusters?: unknown; error_tags_detectable?: unknown
  cefr_level?: unknown; difficulty?: unknown; exercise_types?: unknown; notes?: unknown
}
interface Concept { id: string; cefrLevel: string; errorTags?: string[] }
interface Finding { sev: 'ERROR' | 'WARN' | 'INFO'; check: string; id: string; level: string; detail: string }

function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, 'utf-8')) as T
}
function isStr(v: unknown): v is string { return typeof v === 'string' && v.trim().length > 0 }
function norm(s: string): string {
  return s.toLowerCase().replace(/[.,!?;:«»"'()/\-–%]/g, '').replace(/\s+/g, ' ').trim()
}
function wordCount(no: string): number {
  return no.trim().replace(/_+/g, 'BLANK').split(/\s+/).filter(Boolean).length
}

// Norwegian validity heuristic. NOTE: src/ai/validate.ts NORWEGIAN_CHARS is
// STRICTER than this and wrongly rejects legit accented chars (é in "én",
// "idé", "kafé") and the em-dash — that's a real production-gate bug, tracked
// separately. This audit uses the correct, fuller Norwegian char set so it
// reports true corpus defects, not gate artifacts.
const NORWEGIAN_CHARS = /^[a-zA-ZæøåÆØÅéÉèÈêÊàÀçüÜäÄöÖ0-9\s.,!?;:'"«»“”‘’…()\-–—/%&]+$/
const NORWEGIAN_MARKERS = new Set(['er','har','ikke','jeg','du','vi','de','det','den','en','et','og','eller','men','å','i','på','til','fra','med','av','for','om','som','hva','hvor','hvem','når','hvorfor','kan','vil','skal','må','meg','deg','oss','dem','min','din','sin','han','hun','ham','henne','hans','hennes','dere','deres','seg','dette','disse','vår','var','blir','ble','ha','være'])
function norwegianValidity(no: string): { ok: boolean; sev: 'ERROR' | 'WARN'; detail: string } | null {
  const test = no.replace(/_+/g, '')
  if (!NORWEGIAN_CHARS.test(test)) {
    const bad = [...test].find((ch) => !NORWEGIAN_CHARS.test(ch))
    return { ok: false, sev: 'ERROR', detail: `unexpected char: ${JSON.stringify(bad)}` }
  }
  // Fill-in-blank removes the subject pronoun, so the marker check is unreliable
  // for sentences containing a blank — skip it to avoid false positives.
  if (/_/.test(no)) return null
  const words = test.toLowerCase().replace(/[.,!?;:«»“”‘’…"'()/\-–—%&]/g, ' ').split(/\s+/).filter(Boolean)
  if (words.length < 3) return null
  const tooLong = words.find((w) => w.length > 18)
  if (tooLong) return { ok: false, sev: 'WARN', detail: `synthetic-compound: ${tooLong}` }
  if (!words.some((w) => NORWEGIAN_MARKERS.has(w))) return { ok: false, sev: 'WARN', detail: 'zero Norwegian function words' }
  return null
}

// ── Load concept graphs ──────────────────────────────────────────────────
const conceptById = new Map<string, Concept>()
for (const lvl of LEVELS) {
  const g = readJson<{ concepts: Concept[] }>(join(CONCEPT_DIR, `${lvl.toLowerCase()}-graph.json`))
  for (const c of g.concepts) conceptById.set(c.id, { id: c.id, cefrLevel: c.cefrLevel, errorTags: c.errorTags ?? [] })
}

// ── Audit sentences ──────────────────────────────────────────────────────
const findings: Finding[] = []
const seenIds = new Map<string, string>()   // id -> level (dup detection)
const seenNorwegian = new Map<string, string>() // normalized -> id (dup detection)
const depth: Record<string, Record<string, number>> = { A1: {}, A2: {}, B1: {}, B2: {} }
let total = 0
const perLevelCount: Record<string, number> = { A1: 0, A2: 0, B1: 0, B2: 0 }

for (const lvl of LEVELS) {
  const rows = readJson<RawSentence[]>(join(SENT_DIR, `${lvl.toLowerCase()}.json`))
  for (const s of rows) {
    total++
    perLevelCount[lvl]++
    const id = isStr(s.id) ? s.id : '(no-id)'
    const add = (sev: Finding['sev'], check: string, detail: string) => findings.push({ sev, check, id, level: lvl, detail })

    // 1. id present + unique
    if (!isStr(s.id)) add('ERROR', 'missing-id', 'sentence has no id')
    else if (seenIds.has(s.id)) add('ERROR', 'duplicate-id', `also in ${seenIds.get(s.id)}`)
    else seenIds.set(s.id, lvl)

    // 2. core text
    if (!isStr(s.norwegian)) add('ERROR', 'missing-norwegian', 'empty/absent norwegian')
    if (!isStr(s.english)) add('ERROR', 'missing-english', 'empty/absent english')

    // 3. level field vs file
    if (s.cefr_level !== lvl) add('ERROR', 'level-mismatch', `cefr_level=${String(s.cefr_level)} in ${lvl}.json`)

    // 4. difficulty
    if (![1, 2, 3].includes(s.difficulty as number)) add('ERROR', 'bad-difficulty', `difficulty=${String(s.difficulty)}`)

    // 5. concepts
    const concepts = Array.isArray(s.concept_ids) ? (s.concept_ids as string[]) : []
    if (concepts.length === 0) add('ERROR', 'no-concepts', 'concept_ids empty')
    const conceptErrorTags = new Set<string>()
    for (const cid of concepts) {
      const c = conceptById.get(cid)
      if (!c) { add('ERROR', 'unknown-concept', cid); continue }
      ;(c.errorTags ?? []).forEach((t) => conceptErrorTags.add(t))
      if (LEVEL_RANK[c.cefrLevel] > LEVEL_RANK[lvl]) add('WARN', 'concept-above-level', `${cid} is ${c.cefrLevel} but sentence is ${lvl}`)
      depth[lvl][cid] = (depth[lvl][cid] ?? 0) + 1
    }

    // 6. error tags valid + consistent with concepts (moat check)
    const errTags = Array.isArray(s.error_tags_detectable) ? (s.error_tags_detectable as string[]) : []
    for (const t of errTags) {
      if (!VALID_ERROR_TAGS.has(t)) add('ERROR', 'invalid-error-tag', t)
      else if (t !== 'unspecified' && conceptErrorTags.size > 0 && !conceptErrorTags.has(t))
        // Low signal: a sentence can legitimately carry a detectable error beyond
        // its primary concept's declared tags. Only the Phase 0b spaCy parse can
        // judge whether the tag truly applies. Reported as INFO, not a defect.
        add('INFO', 'tag-not-in-concept', `${t} not declared by any tagged concept`)
    }

    // 7. exercise types
    const ex = Array.isArray(s.exercise_types) ? (s.exercise_types as string[]) : []
    if (ex.length === 0) add('ERROR', 'no-exercise-types', 'exercise_types empty')
    for (const t of ex) if (!VALID_EXERCISE_TYPES.has(t)) add('ERROR', 'invalid-exercise-type', t)

    // 8. fill-in-blank coherence + blank-marker consistency
    const no = isStr(s.norwegian) ? s.norwegian : ''
    const blankRun = no.match(/_+/)
    const hasBlank = blankRun !== null
    if (ex.includes('fill-in-blank')) {
      if (!hasBlank) add('ERROR', 'fib-no-blank', 'fill-in-blank type but no blank marker')
      if (!isStr(s.notes)) add('ERROR', 'fib-no-answer', 'fill-in-blank type but notes (answer) missing')
    } else if (hasBlank && !ex.includes('sentence-transformation')) {
      add('WARN', 'blank-without-fib', 'blank present but no fill-in/transformation type')
    }
    // FillInBlankExercise splits on the literal '___'; any other run length
    // (B1/B2 use '_____') will mis-render. Real consistency defect.
    if (hasBlank && blankRun![0].length !== 3) {
      add('WARN', 'nonstandard-blank-marker', `blank is ${blankRun![0].length} underscores, expected 3 (___)`)
    }

    // 9. Norwegian validity
    if (no) {
      const v = norwegianValidity(no)
      if (v) add(v.sev, `norwegian-${v.ok ? 'ok' : 'invalid'}`, v.detail)
    }

    // 10. length vs level
    if (no && !ex.includes('speed-round')) {
      const wc = wordCount(no)
      if (wc > LEVEL_MAX_WORDS[lvl]) add('WARN', 'over-length-for-level', `${wc} words > ${LEVEL_MAX_WORDS[lvl]} max for ${lvl}`)
    }

    // 11. exact duplicate norwegian
    if (no) {
      const key = norm(no)
      if (seenNorwegian.has(key)) add('WARN', 'duplicate-norwegian', `same text as ${seenNorwegian.get(key)}`)
      else seenNorwegian.set(key, id)
    }
  }
}

// ── Report ───────────────────────────────────────────────────────────────
const out: string[] = []
out.push('═'.repeat(72))
out.push('  NORSKCOACH CORPUS AUDIT — Phase 0')
out.push('═'.repeat(72))
out.push('')
out.push(`Sentences: ${total}  (A1 ${perLevelCount.A1} · A2 ${perLevelCount.A2} · B1 ${perLevelCount.B1} · B2 ${perLevelCount.B2})`)
out.push(`Concepts in graphs: ${conceptById.size}`)
const errors = findings.filter((f) => f.sev === 'ERROR')
const warns = findings.filter((f) => f.sev === 'WARN')
const infos = findings.filter((f) => f.sev === 'INFO')
out.push(`Findings: ${errors.length} ERROR · ${warns.length} WARN · ${infos.length} INFO`)
out.push('')

function tally(list: Finding[], title: string) {
  out.push(`── ${title} (${list.length}) ` + '─'.repeat(Math.max(0, 50 - title.length)))
  const byCheck = new Map<string, Finding[]>()
  for (const f of list) { if (!byCheck.has(f.check)) byCheck.set(f.check, []); byCheck.get(f.check)!.push(f) }
  const sorted = [...byCheck.entries()].sort((a, b) => b[1].length - a[1].length)
  for (const [check, fs] of sorted) {
    out.push(`  ${String(fs.length).padStart(4)}  ${check}`)
    for (const f of fs.slice(0, 4)) out.push(`         · [${f.level}] ${f.id.slice(0, 8)} — ${f.detail}`)
    if (fs.length > 4) out.push(`         · …and ${fs.length - 4} more`)
  }
  if (list.length === 0) out.push('  (none)')
  out.push('')
}
tally(errors, 'ERRORS (block the moat — fix before scaling)')
tally(warns, 'WARNINGS (review)')
out.push(`── INFO (low signal — needs Phase 0b spaCy parse to confirm) ─────`)
const infoByCheck = new Map<string, number>()
for (const f of infos) infoByCheck.set(f.check, (infoByCheck.get(f.check) ?? 0) + 1)
for (const [check, n] of [...infoByCheck.entries()].sort((a, b) => b[1] - a[1])) out.push(`  ${String(n).padStart(4)}  ${check}`)
if (infos.length === 0) out.push('  (none)')
out.push('')

// Depth table
out.push('── PER-CONCEPT DEPTH (target ≥' + DEPTH_TARGET + '/concept) ' + '─'.repeat(20))
for (const lvl of LEVELS) {
  const ids = [...conceptById.values()].filter((c) => c.cefrLevel === lvl).map((c) => c.id)
  const counts = ids.map((id) => ({ id, n: depth[lvl][id] ?? 0 }))
  const thin = counts.filter((c) => c.n < DEPTH_TARGET)
  const empty = counts.filter((c) => c.n === 0)
  const avg = counts.length ? (counts.reduce((a, c) => a + c.n, 0) / counts.length).toFixed(1) : '0'
  out.push(`  ${lvl}: ${ids.length} concepts · avg ${avg}/concept · ${thin.length} below target · ${empty.length} EMPTY`)
  for (const c of counts.sort((a, b) => a.n - b.n).slice(0, 6))
    out.push(`        ${String(c.n).padStart(3)}  ${c.id}${c.n === 0 ? '  ← EMPTY' : c.n < DEPTH_TARGET ? '  ← thin' : ''}`)
}
out.push('')
out.push('═'.repeat(72))
out.push(errors.length === 0 ? '  ✓ No integrity ERRORS. Corpus tags are structurally sound.' : `  ✗ ${errors.length} integrity ERRORS — these can mis-route diagnosis.`)
out.push('═'.repeat(72))

console.log(out.join('\n'))
