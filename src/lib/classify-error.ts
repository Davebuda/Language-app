// Observed-error classifier — deterministic, no AI.
//
// The diagnosis moat depends on logging WHAT the learner actually got wrong,
// not what a sentence was authored to potentially catch. Previously every wrong
// answer was tagged with `errorTagsDetectable[0]` (authored-positional), so the
// error log, error patterns, diagnosis rules and repair targeting all ran on a
// guess. This classifies the actual diff between the learner's answer and the
// correct one into one of the 17 taxonomy tags, biased toward the sentence's
// declared candidate tags but trusting high-confidence observations even when
// they fall outside that list.
import { normalizeAnswer } from './answer'
import { POS_MAP } from './pos-map'
import type { ErrorTag } from '@/types/taxonomy'
import type { ExerciseType } from '@/types/session'

const ARTICLES = new Set(['en', 'ei', 'et', 'den', 'det', 'de', 'denne', 'dette', 'disse'])
const NEGATIONS = new Set(['ikke', 'aldri', 'ingen', 'intet', 'ingenting'])
const MODALS = new Set(['kan', 'vil', 'skal', 'må', 'bør', 'kunne', 'ville', 'skulle', 'måtte', 'burde'])
const PRONOUNS = new Set([
  'jeg', 'meg', 'du', 'deg', 'han', 'ham', 'hun', 'henne', 'vi', 'oss', 'dere', 'de', 'dem', 'seg',
  'min', 'mitt', 'mine', 'din', 'ditt', 'dine', 'sin', 'sitt', 'sine',
  'hans', 'hennes', 'vår', 'vårt', 'våre', 'deres',
])

// Observations we trust even when they're not in the sentence's authored tag list —
// the diff signal for these is unambiguous. modal-verb / pronoun-choice /
// negation-placement use the IDENTICAL clean closed-class single-substitution
// logic as the long-trusted article-use (both tokens in the same closed class),
// so they carry the same precision and are trusted likewise (p6 W4). This closes
// the B2 gap where a clean pronoun/modal swap was detected then discarded in
// favour of the sentence's authored tag (B2 authors 0 pronoun/0 modal tags), so
// such errors were mislabelled (usually word-order) and invisible to diagnosis.
const HIGH_CONFIDENCE = new Set<ErrorTag>([
  'word-order',
  'article-use',
  'spelling',
  'compound-word',
  'modal-verb',
  'pronoun-choice',
  'negation-placement',
  // adjEndingVariant / verbFormVariant in observe() detect a clean adjective-ending
  // or verb-form swap as deterministically as the closed-class swaps above. Without
  // these, classifyError discarded the observed tag for the sentence's authored tag
  // (relabel leak, vision audit 2026-06-26 Lane 1): a real adjective error logged as
  // something else, starving diagnosis rule 1 (the flagship gender rule counts
  // adjective-agreement). Promoted so the observed tag is trusted (p7).
  'adjective-agreement',
  'verb-tense',
  // A disjoint-POS swap (two known words, no shared part of speech) is an
  // unambiguous wrong-word-DIFFERENT-category error — see observe()/pos-map.ts.
  'wrong-word-different-category',
])

// Exercise types whose ANSWER is English, not Norwegian. The observed-diff path
// reasons about Norwegian grammar (articles, V2 word order, adjective endings…),
// so running it on an English answer would invent a Norwegian-grammar tag from
// English text. For these we must NOT observe — defer to the sentence's authored
// candidate tags (the Norwegian errors the sentence can catch) or `unspecified`.
const ENGLISH_OUTPUT_TYPES = new Set<ExerciseType>(['translation-to-english', 'speed-round'])

function tokens(s: string): string[] {
  return normalizeAnswer(s).split(/\s+/).filter(Boolean)
}

function sameMultiset(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false
  const count = new Map<string, number>()
  for (const t of a) count.set(t, (count.get(t) ?? 0) + 1)
  for (const t of b) {
    const n = count.get(t)
    if (!n) return false
    count.set(t, n - 1)
  }
  return true
}

function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length
  if (m === 0) return n
  if (n === 0) return m
  let prev = Array.from({ length: n + 1 }, (_, i) => i)
  for (let i = 1; i <= m; i++) {
    const curr = [i]
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost)
    }
    prev = curr
  }
  return prev[n]
}

// stor/stort/store, fin/fint/fine — same stem, differ only by a trailing t/e.
function adjEndingVariant(a: string, b: string): boolean {
  const stem = (w: string) => w.replace(/(t|e)$/, '')
  const sa = stem(a), sb = stem(b)
  return sa.length >= 2 && sa === sb && a !== b
}

// snakker/snakket/snakke, spiser/spiste — shared stem, both ends look verb-ish.
const VERB_ENDINGS = ['er', 'te', 'et', 'de', 'dde', 'ar', 'r', 't', 'd', 'e', '']
function verbFormVariant(a: string, b: string): boolean {
  if (a.length < 3 || b.length < 3) return false
  const prefixLen = Math.min(a.length, b.length, 3)
  if (a.slice(0, prefixLen) !== b.slice(0, prefixLen)) return false
  const strip = (w: string) => {
    for (const e of [...VERB_ENDINGS].sort((x, y) => y.length - x.length)) {
      if (e && w.endsWith(e)) return w.slice(0, w.length - e.length)
    }
    return w
  }
  return strip(a) === strip(b) && a !== b
}

// Best-guess observation from the diff, or undefined when the diff is unclear.
function observe(userAnswer: string, correctAnswer: string): ErrorTag | undefined {
  const u = tokens(userAnswer)
  const c = tokens(correctAnswer)
  if (u.length === 0) return undefined

  // Same words, different order.
  if (sameMultiset(u, c) && u.join(' ') !== c.join(' ')) return 'word-order'

  if (u.length === c.length) {
    const diffs: Array<[string, string]> = []
    for (let i = 0; i < c.length; i++) if (u[i] !== c[i]) diffs.push([u[i], c[i]])
    if (diffs.length === 1) {
      const [uw, cw] = diffs[0]
      if (ARTICLES.has(uw) && ARTICLES.has(cw)) return 'article-use'
      // AND (both negations) — a clean negation-for-negation swap (ikke↔aldri).
      // A negation-for-non-negation swap is a lexical/meaning error, not placement,
      // so it falls through to wrong-word-same-category. Symmetric with the
      // article/modal/pronoun closed-class checks below, which lets it be trusted
      // as HIGH_CONFIDENCE. (True ikke-misplacement is the word-order / extra-token
      // branches, not a same-length single substitution.)
      if (NEGATIONS.has(uw) && NEGATIONS.has(cw)) return 'negation-placement'
      if (MODALS.has(uw) && MODALS.has(cw)) return 'modal-verb'
      if (PRONOUNS.has(uw) && PRONOUNS.has(cw)) return 'pronoun-choice'
      if (adjEndingVariant(uw, cw)) return 'adjective-agreement'
      if (verbFormVariant(uw, cw)) return 'verb-tense'
      if (levenshtein(uw, cw) <= 2) return 'spelling'
      // Deterministic POS check (src/lib/pos-map.ts, Norsk-ordbank CC-BY): a swap
      // between two KNOWN words with DISJOINT part-of-speech sets is a
      // wrong-word-DIFFERENT-category error (e.g. a noun typed where a verb
      // belongs). OOV-safe: if either word is absent from the lexicon, or their
      // POS sets overlap at all, fall back to the low-confidence same-category.
      const up = POS_MAP[uw]
      const cp = POS_MAP[cw]
      if (up && cp && (up & cp) === 0) return 'wrong-word-different-category'
      return 'wrong-word-same-category'
    }
    return undefined // multiple substitutions — too ambiguous to call
  }

  // One token inserted or dropped.
  if (Math.abs(u.length - c.length) === 1) {
    const [longer, shorter] = u.length > c.length ? [u, c] : [c, u]
    // Compound split/join (særskrivning) — two adjacent tokens on the longer side
    // concatenate to a single token on the shorter side ("kjøkken benk" ↔
    // "kjøkkenbenk"). A flagship Norwegian L2 error; the concat match is
    // unambiguous, so it's trusted as HIGH_CONFIDENCE regardless of authored tags.
    for (let i = 0; i < longer.length - 1; i++) {
      if (shorter.includes(longer[i] + longer[i + 1])) return 'compound-word'
    }
    const extra = longer.filter((t) => !shorter.includes(t))
    if (extra.some((t) => NEGATIONS.has(t))) return 'negation-placement'
    if (extra.some((t) => ARTICLES.has(t))) return 'article-use'
    return undefined
  }

  // Whole-answer near-miss (single typo across a longer string).
  if (levenshtein(normalizeAnswer(userAnswer), normalizeAnswer(correctAnswer)) <= 2) return 'spelling'
  return undefined
}

/**
 * Classify a wrong answer into one taxonomy tag.
 * @param candidateTags the sentence's authored `errorTagsDetectable` (used as a bias + fallback)
 * Returns undefined only when there is genuinely nothing to go on (empty candidates + no signal).
 */
export function classifyError(
  userAnswer: string,
  correctAnswer: string,
  exerciseType: ExerciseType,
  candidateTags: ErrorTag[] = [],
): ErrorTag | undefined {
  // English-output exercises: the answer is English, so a Norwegian-grammar diff
  // would be a fabrication. Defer to authored candidate tags / `unspecified` only.
  if (ENGLISH_OUTPUT_TYPES.has(exerciseType)) {
    if (candidateTags.length) return candidateTags[0]
    return 'unspecified'
  }

  const observed = observe(userAnswer, correctAnswer)

  if (observed) {
    if (candidateTags.includes(observed)) return observed // observation agrees with authored intent
    if (HIGH_CONFIDENCE.has(observed)) return observed     // trust unambiguous signals regardless
    if (candidateTags.length) return candidateTags[0]      // murky observation → defer to authored
    return observed
  }

  // No usable diff signal — fall back, with sensible defaults for comprehension types.
  if (candidateTags.length) return candidateTags[0]
  if (exerciseType === 'listening-comprehension') return 'listening-recognition'
  if (exerciseType === 'reading-comprehension') return 'reading-parsing'
  return 'unspecified'
}
