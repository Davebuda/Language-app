// Deterministic multi-skill detectors — the Q-matrix deriver (p6 Phase C). NO AI.
//
// For a Norwegian sentence, return the set of FOUNDATIONAL (A1/A2) grammar
// concepts it ALSO exercises, so a B1/B2 sentence can advertise the lower-level
// skills it drills. This is what makes remediate-at-level possible: a B2 learner
// weak on gender then gets a B2 sentence that contains a real gender choice,
// instead of being dropped to an A1 drill (CD-CAT / Q-matrix logic — see
// output/level-gates-plan-2026-06-19.md).
//
// HARD DESIGN RULE: under-tag over over-tag (precision ≥ recall). The auto-derived
// tags are a PROPOSAL gated by a norwegian-linguist spot-review before any merge
// into the live corpus (Phase C3/C4) — never write tags straight to content that
// feeds the engine (Operating Rule 8).
//
// Coverage today: closed-class signals (pronouns, modals, negation, prepositions,
// numbers) are word-list exact; noun-gender/article reuses the committed gender
// lexicon. Morphology-heavy concepts (verb tense, adjective agreement, V2 word
// order) need a parser and are deliberately NOT detected here — deferred to a
// calibrated follow-up so this first batch stays high-precision.

import { resolveGender } from './gender-verifier'

// Closed-class word lists. Concept ids match the live A1/A2 graphs exactly.
const PERSONAL_PRONOUNS = new Set(['jeg', 'du', 'han', 'hun', 'det', 'den', 'vi', 'dere', 'de'])
const OBJECT_PRONOUNS = new Set(['meg', 'deg', 'ham', 'henne', 'oss', 'dem', 'seg'])
const POSSESSIVES = new Set([
  'min', 'mi', 'mitt', 'mine', 'din', 'di', 'ditt', 'dine', 'hans', 'hennes',
  'dens', 'dets', 'vår', 'vårt', 'våre', 'deres', 'sin', 'si', 'sitt', 'sine',
])
const MODALS = new Set(['kan', 'vil', 'skal', 'må', 'bør', 'kunne', 'ville', 'skulle', 'måtte', 'burde'])
const NEGATIONS = new Set(['ikke', 'aldri', 'ingen', 'ingenting', 'intet', 'ikkje'])
// 'en/ei/ett' deliberately EXCLUDED — they read overwhelmingly as the indefinite
// article, not the numeral "one", so counting them as numbers over-fires.
const NUMBERS = new Set([
  'to', 'tre', 'fire', 'fem', 'seks', 'sju', 'syv', 'åtte', 'ni', 'ti',
  'elleve', 'tolv', 'tretten', 'tjue', 'tretti', 'førti', 'femti', 'hundre', 'tusen',
])
const PREPOSITIONS = new Set([
  'i', 'på', 'til', 'fra', 'med', 'av', 'om', 'under', 'over', 'etter', 'ved',
  'hos', 'mot', 'gjennom', 'mellom', 'uten', 'bak', 'foran', 'innen', 'utenfor',
  'rundt', 'langs',
])
const ARTICLES = new Set(['en', 'ei', 'et'])

function tokenize(s: string): string[] {
  return s.toLowerCase().split(/[^a-zæøå0-9]+/).filter(Boolean)
}

// Article + (≤2 intervening adjectives) + known noun → a real gender/article
// choice point ("en bil", "en liten oppstart", "et globalt selskap"). Reuses the
// committed gender lexicon so only genuine nouns count.
function hasArticleNoun(toks: string[]): boolean {
  for (let i = 0; i < toks.length - 1; i++) {
    if (!ARTICLES.has(toks[i])) continue
    for (let j = i + 1; j <= Math.min(i + 3, toks.length - 1); j++) {
      if (resolveGender(toks[j]) > 0) return true
    }
  }
  return false
}

/**
 * The foundational concepts a sentence demonstrably exercises (high-precision,
 * closed-class + lexicon-backed signals only). Returns concept ids that match the
 * live A1/A2 concept graphs.
 */
export function detectExercisedConcepts(norwegian: string): string[] {
  const toks = tokenize(norwegian)
  const out = new Set<string>()
  const anyIn = (words: Set<string>) => toks.some((t) => words.has(t))

  if (anyIn(PERSONAL_PRONOUNS)) out.add('personal-pronouns')
  if (anyIn(OBJECT_PRONOUNS)) out.add('object-pronouns')
  if (anyIn(POSSESSIVES)) out.add('possessive-pronouns')
  if (anyIn(MODALS)) out.add('common-modal-verbs')
  if (anyIn(NEGATIONS)) out.add('negation')
  if (anyIn(PREPOSITIONS)) out.add('common-prepositions')
  if (toks.some((t) => NUMBERS.has(t) || /^\d+$/.test(t))) out.add('numbers-basic')
  if (hasArticleNoun(toks)) {
    out.add('noun-gender')
    out.add('indefinite-articles')
  }

  return [...out]
}
