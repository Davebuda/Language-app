/**
 * Concept-aware content gate (Phase 0b-lite, pure TS).
 *
 * The mechanical gate in generate-content.ts (char-set, word-count, dedup) is
 * necessary but insufficient: on 2026-05-28 it passed ~400 staged sentences of
 * which a 4-agent norwegian-linguist review found only ~34% acceptable. It
 * could not catch concept-misalignment ("Vi går til butikken" filed under
 * v2-word-order), grammatical hallucinations ("Jeg å spise"), Nynorsk leakage
 * ("kaffi", "ei sol"), tense scope creep (perfect/preterite in A1 present-tense
 * files), or generation artifacts (trailing "...", "(igjen)").
 *
 * This module adds those checks. It is deliberately HEURISTIC and conservative:
 * it only rejects clear, gross violations of the kind the linguists flagged.
 * Deep morphology (does the adjective ending truly agree?) needs a spaCy/ordbank
 * pipeline and remains out of scope — that is the real Phase 0b. False negatives
 * are acceptable; the human/linguist pass remains the final authority before
 * any seed. The goal here is to stop the generator from re-emitting the same
 * classes of garbage and to let us mechanically filter existing staging files.
 */

export interface GateRow {
  id?: string
  norwegian?: string
  english?: string
  concept_ids?: string[]
  exercise_types?: string[]
  cefr_level?: string
  notes?: string
}

export interface GateResult {
  ok: boolean
  reasons: string[]
}

// ── Lexicons (A1-scoped; small by design) ───────────────────────────────────

// Subject openers — if a declarative sentence starts with one of these, no V2
// inversion is occurring (subject is in first position).
const SUBJECT_PRONOUNS = new Set([
  'jeg', 'du', 'han', 'hun', 'det', 'den', 'vi', 'dere', 'de', 'man',
])

// Common A1 finite verb forms (present + the core irregular past/aux). Used to
// approximate "is token N a finite verb?" without a full morphology engine.
const FINITE_VERBS = new Set([
  // to-be / to-have
  'er', 'har', 'var', 'hadde', 'blir', 'ble',
  // high-frequency present-tense regulars + core irregulars
  'heter', 'bor', 'spiser', 'drikker', 'går', 'kommer', 'ser', 'leser',
  'skriver', 'jobber', 'snakker', 'liker', 'kjøper', 'tar', 'lager',
  'studerer', 'reiser', 'spiller', 'sover', 'bruker', 'gjør', 'får',
  'drar', 'besøker', 'møter', 'kjører', 'lytter', 'trenger', 'sitter',
  'leker', 'elsker', 'venter', 'hjelper', 'åpner', 'lukker', 'finner',
  'gir', 'sier', 'vet', 'tror', 'føler', 'hører', 'lever', 'bruker',
  // modals
  'kan', 'vil', 'skal', 'må', 'bør',
])

// Wh question words.
const WH_WORDS = new Set([
  'hva', 'hvor', 'hvem', 'hvorfor', 'hvordan', 'hvilken', 'hvilke', 'hvilket',
  'når', 'kor', // 'kor' is Nynorsk — caught separately, listed so it is recognised
])

// Nynorsk / dialectal tokens that must not appear in a Bokmål A1 corpus.
const NYNORSK_TOKENS = new Set([
  'kaffi', 'ikkje', 'eg', 'kva', 'korleis', 'kor', 'noko', 'ein', 'inkje',
  'å vere', 'vere', 'heiter', 'gjekk', 'kjem', 'frå', 'ho', 'dei', 'me',
])

// Past/perfect markers that must NOT appear in an A1 present-tense concept file.
const NON_PRESENT_MARKERS = new Set([
  'hadde', 'var', 'vært', 'hatt', 'ble', 'blei',
])
// Past participles that follow "har"/"hadde" to form perfect/pluperfect — their
// presence after an auxiliary signals a tense above the A1 present scope.
const PERFECT_PARTICIPLE = /\b(har|hadde)\s+(spist|drukket|sett|lest|skrevet|gått|kjøpt|tatt|gjort|bodd|studert|jobbet|vært|hatt|kommet|reist|laget)\b/i

// ── Helpers ──────────────────────────────────────────────────────────────────

function tokens(s: string): string[] {
  return s
    .replace(/[.,!?;:«»“”‘’…"'()/\-–—%]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
}

function lc(s: string): string[] {
  return tokens(s).map((t) => t.toLowerCase())
}

// ── Per-concept structural checks ─────────────────────────────────────────────
// Each returns a reason string when the sentence FAILS to demonstrate the
// concept, or null when it plausibly does. Conservative: only flags clear misses.

const CONCEPT_CHECKS: Record<string, (no: string, t: string[]) => string | null> = {
  'v2-word-order': (_no, t) => {
    // V2 is demonstrated when a NON-subject CONSTITUENT is fronted and the finite
    // verb is the second constituent, with the subject right after it. A fronted
    // element can be multi-word ("I dag kjøper jeg…") so we locate the first
    // finite verb by content, not by word index.
    if (t.length < 3) return 'too short to show V2 inversion'
    if (SUBJECT_PRONOUNS.has(t[0])) return 'starts with subject — no V2 inversion (plain SVO)'
    if (WH_WORDS.has(t[0])) return 'question, not a fronted-element V2 declarative'
    const vIdx = t.findIndex((w) => FINITE_VERBS.has(w))
    if (vIdx < 1) return 'no finite verb after a fronted element (inversion not shown)'
    if (!SUBJECT_PRONOUNS.has(t[vIdx + 1] ?? '')) return 'subject does not follow the verb (inversion not shown)'
    return null
  },
  'question-formation': (no, t) => {
    if (!no.trim().endsWith('?')) return 'not a question (no "?")'
    // Either a wh-word opener, or yes/no inversion (finite verb first).
    if (WH_WORDS.has(t[0]) || FINITE_VERBS.has(t[0])) return null
    return 'neither wh-word nor verb-first inversion'
  },
  'infinitive-form': (_no, t) => {
    // Catch the hallucinated "<Subject> å <verb>" non-construction.
    const aIdx = t.indexOf('å')
    if (aIdx === 1 && SUBJECT_PRONOUNS.has(t[0])) return 'ungrammatical "<subject> å <verb>" (not Norwegian)'
    // Valid: modal + bare infinitive, OR an "å + verb" embedded after a finite verb.
    const hasModal = t.some((w) => ['kan', 'vil', 'skal', 'må', 'bør'].includes(w))
    const hasÅverb = aIdx >= 0 && aIdx < t.length - 1
    if (hasModal || hasÅverb) return null
    return 'no infinitive (needs modal + infinitive or "å + verb")'
  },
  'indefinite-articles': (_no, t) => {
    const NUMERALS = new Set(['to', 'tre', 'fire', 'fem', 'seks', 'sju', 'syv', 'åtte', 'ni', 'ti', 'noen', 'mange', 'flere'])
    // Must contain en/et as an article; numerals-as-quantifier do not count.
    const hasArticle = t.some((w) => w === 'en' || w === 'et')
    if (!hasArticle) {
      if (t.some((w) => NUMERALS.has(w))) return 'uses a numeral/quantifier, not an indefinite article'
      return 'no indefinite article (en/et)'
    }
    return null
  },
  'definite-articles-singular': (_no, t) => {
    // Heuristic: needs a noun carrying a definite-singular suffix (-en/-et/-a),
    // and NOT merely an indefinite article. Approximate by looking for a token
    // (len>3, not a known function word) ending in en/et/a, excluding tokens
    // immediately preceded by "en"/"et" (those are indefinite).
    const STOP = new Set([...SUBJECT_PRONOUNS, ...FINITE_VERBS, 'en', 'et', 'ei', 'og', 'i', 'på', 'til', 'fra', 'med', 'av', 'for', 'om', 'ikke'])
    const hasDef = t.some((w, i) => w.length > 3 && /(?:en|et|a)$/.test(w) && !STOP.has(w) && t[i - 1] !== 'en' && t[i - 1] !== 'et')
    return hasDef ? null : 'no definite-singular noun (-en/-et/-a)'
  },
  'definite-articles-plural': (_no, t) => {
    const hasDefPl = t.some((w) => w.length > 4 && /(?:ene|a)$/.test(w))
    return hasDefPl ? null : 'no definite-plural noun (-ene/-a)'
  },
  'negation': (_no, t) => (t.includes('ikke') ? null : 'no negation ("ikke")'),
  // Present-tense families: reject past/perfect intrusions.
  'present-tense-regular': (no, t) => presentOnly(no, t),
  'to-be-verb': (no, t) => {
    if (presentOnly(no, t)) return presentOnly(no, t)
    return t.includes('er') ? null : 'no present-tense "er"'
  },
  'to-have-verb': (no, t) => {
    if (PERFECT_PARTICIPLE.test(no)) return 'perfect tense (har + participle), not A1 present "har"'
    if (t.includes('hadde')) return 'past tense "hadde", not A1 present "har"'
    return t.includes('har') ? null : 'no present-tense "har"'
  },
}

function presentOnly(no: string, t: string[]): string | null {
  if (PERFECT_PARTICIPLE.test(no)) return 'perfect/pluperfect tense above A1 present scope'
  const bad = t.find((w) => NON_PRESENT_MARKERS.has(w))
  if (bad) return `non-present form "${bad}" above A1 present scope`
  return null
}

// ── Top-level gate ─────────────────────────────────────────────────────────────

export function gateRow(row: GateRow): GateResult {
  const reasons: string[] = []
  const no = (row.norwegian ?? '').trim()
  const en = (row.english ?? '').trim()
  const level = (row.cefr_level ?? '').toUpperCase()
  const isFib = (row.exercise_types ?? []).includes('fill-in-blank')

  if (!no) reasons.push('empty norwegian')
  if (!en) reasons.push('empty english')

  // 1. Generation artifacts.
  if (/\.\.\.|…/.test(no)) reasons.push('trailing/embedded ellipsis (incomplete)')
  if (/\([^)]*\)/.test(no)) reasons.push('parenthetical generation artifact')

  // 2. Capitalization — every sentence starts with a capital letter.
  if (no && !/^[«"'(]?[A-ZÆØÅ0-9]/.test(no)) reasons.push('does not start with a capital letter')

  const t = lc(no)

  // 3. Nynorsk / dialect leakage (Bokmål only).
  const ny = t.find((w) => NYNORSK_TOKENS.has(w))
  if (ny) reasons.push(`Nynorsk/dialect token "${ny}" (Bokmål only)`)
  // "ei" as a standalone indefinite article — valid Bokmål but excluded at A1.
  if (level === 'A1' && t.includes('ei')) reasons.push('"ei" article excluded at A1 (use en/et)')

  // 4. Concept presence — for fill-in-blank the blank masks structure, so skip
  // the structural concept check (the blank itself encodes the target).
  if (!isFib) {
    for (const cid of row.concept_ids ?? []) {
      const check = CONCEPT_CHECKS[cid]
      if (check) {
        const reason = check(no, t)
        if (reason) reasons.push(`concept[${cid}]: ${reason}`)
      }
    }
  }

  return { ok: reasons.length === 0, reasons }
}

/** Structural near-duplicate signature: all tokens except the final content word.
 * Catches "Jeg heter Ole" / "Jeg heter Ola" and "Jeg har 50 kroner"/"...50 kr". */
export function structuralSignature(norwegian: string): string {
  const t = lc(norwegian)
  return t.slice(0, Math.max(1, t.length - 1)).join(' ')
}
