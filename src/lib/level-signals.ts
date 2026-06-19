// Deterministic CEFR-level signals for a Norwegian sentence (p6 Phase A). NO AI,
// no external lexicon — calibrated against our own linguist-gated corpus (the
// scout-recommended path that sidesteps the Kelly-list license question).
//
// Three signals rise with level: LIX readability, sentence length (words), and
// subordinate-clause depth. Used to validate that AI-GENERATED content sits at
// the learner's level — complementary to validateNorwegianOutput (which checks
// Norwegian-ness, not difficulty). Single-sentence signals are noisy, so the
// validator rejects only when ≥2 of 3 clearly exceed the target band.

import type { CEFRLevel } from '@/types/fingerprint'

const LONG_WORD_LEN = 6 // LIX counts words longer than 6 letters as "long"

// High-frequency Norwegian subjunctions — a clause they introduce is subordinate
// (raises syntactic complexity). Conservative set (reliably subordinating only).
const SUBORDINATORS = new Set([
  'at', 'som', 'fordi', 'hvis', 'dersom', 'når', 'mens', 'siden', 'ettersom', 'enn',
])

export interface LevelSignals {
  lix: number
  words: number
  subClauses: number
}

function wordTokens(text: string): string[] {
  return text.toLowerCase().replace(/_+/g, ' ').split(/[^a-zæøå]+/).filter(Boolean)
}

/** LIX readability index: (words/sentences) + (longWords × 100 / words). */
export function lix(text: string): number {
  const words = wordTokens(text)
  if (words.length === 0) return 0
  const sentences = Math.max(1, (text.match(/[.!?]+/g) ?? []).length)
  const longWords = words.filter((w) => w.length > LONG_WORD_LEN).length
  return words.length / sentences + (longWords * 100) / words.length
}

/** Count of subordinate-clause markers (a syntactic-complexity proxy). */
export function subordinateClauseCount(text: string): number {
  return wordTokens(text).filter((w) => SUBORDINATORS.has(w)).length
}

export function levelSignals(text: string): LevelSignals {
  return {
    lix: Math.round(lix(text) * 10) / 10,
    words: wordTokens(text).length,
    subClauses: subordinateClauseCount(text),
  }
}

// Per-level "above this is too hard for the level" ceilings, CALIBRATED from the
// live corpus (scripts/calibrate-level-signals.ts: ~p90 + headroom). `words`
// reuses the corpus's accepted per-sentence max (LEVEL_MAX_WORDS in the audit).
// Generous on purpose — a false reject of valid content is worse than letting
// slightly-hard content through (other generation gates remain).
const CEILINGS: Record<CEFRLevel, LevelSignals> = {
  A1: { lix: 40, words: 8, subClauses: 1 },
  A2: { lix: 42, words: 12, subClauses: 2 },
  B1: { lix: 48, words: 18, subClauses: 3 },
  B2: { lix: 65, words: 24, subClauses: 4 },
}

export interface AtLevelResult {
  atLevel: boolean
  exceeded: string[]
  signals: LevelSignals
}

/**
 * Is `text` plausibly AT OR BELOW `level`? Rejects only when ≥2 of the 3 signals
 * exceed the level's calibrated ceiling — single-sentence signals are noisy, so a
 * lone outlier (one long compound, one extra clause) never rejects. Gates AI-
 * GENERATED content to the learner's level; NEVER used to grade a learner.
 */
export function validateAtLevel(text: string, level: CEFRLevel): AtLevelResult {
  const s = levelSignals(text)
  const c = CEILINGS[level]
  const exceeded: string[] = []
  if (s.lix > c.lix) exceeded.push('lix')
  if (s.words > c.words) exceeded.push('words')
  if (s.subClauses > c.subClauses) exceeded.push('subClauses')
  return { atLevel: exceeded.length < 2, exceeded, signals: s }
}
