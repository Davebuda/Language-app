// Deterministic sentence → single-gap cloze generator (Move A, "Per-Level Day").
//
// Turns an already-vetted Sentence into a one-gap ClozePassage so the cloze
// exercise type exists at levels with no authored passages (B1/B2 today) and so
// one sentence yields an extra retrieval mode — more daily questions at $0, no AI.
//
// Honesty (Rule 6/8): this is NOT new content — it re-frames a vetted sentence.
// The gap carries the sentence's REAL conceptId + errorTagsDetectable[0], so a
// wrong answer logs a true diagnostic tag (same contract as authored cloze gaps,
// cloze.ts). Returns null whenever it cannot form an honest gap (already a
// fill-in-blank template, no concept, no detectable error tag, or no blankable
// content word) — the caller then simply does not schedule an auto-cloze item.

import type { Sentence, ClozePassage, ClozeSegment } from '@/types/content'

// Small, deterministic Norwegian function-word set — never blank these (too
// guessable / not diagnostic). Kept intentionally minimal and stable.
const NB_FUNCTION_WORDS = new Set([
  'jeg', 'du', 'han', 'hun', 'det', 'den', 'vi', 'de', 'dere', 'deg', 'meg', 'seg',
  'er', 'var', 'har', 'hadde', 'blir', 'ble',
  'og', 'eller', 'men', 'som', 'at', 'om', 'for', 'til', 'av', 'med', 'på', 'i',
  'fra', 'under', 'over', 'mot', 'enn', 'så', 'da', 'når', 'fordi',
  'en', 'et', 'ei', 'den', 'det', 'de',
  'ikke', 'kan', 'vil', 'skal', 'må', 'bør', 'have', 'her', 'der', 'nå',
])

const MIN_BLANK_LEN = 4

/**
 * Build a single-gap ClozePassage from a vetted sentence, or null if it can't
 * form an honest gap. Pure + framework-free (unit-testable, no side effects).
 */
export function buildClozeFromSentence(sentence: Sentence): ClozePassage | null {
  // Already a fill-in-blank template — don't double-process it.
  if (sentence.norwegian.includes('___')) return null
  // No concept to credit / no detectable error to log → cannot be honest.
  if (sentence.conceptIds.length === 0) return null
  if (sentence.errorTagsDetectable.length === 0) return null

  // Pick the longest non-function content word as the blank (deterministic).
  const tokenRegex = /[A-Za-zÆØÅæøå]+/g
  let best: { word: string; start: number; end: number } | null = null
  let m: RegExpExecArray | null
  while ((m = tokenRegex.exec(sentence.norwegian)) !== null) {
    const word = m[0]
    if (word.length < MIN_BLANK_LEN) continue
    if (NB_FUNCTION_WORDS.has(word.toLowerCase())) continue
    if (best === null || word.length > best.word.length) {
      best = { word, start: m.index, end: m.index + word.length }
    }
  }
  if (best === null) return null

  const before = sentence.norwegian.slice(0, best.start)
  const after = sentence.norwegian.slice(best.end)

  const segments: ClozeSegment[] = []
  if (before) segments.push({ kind: 'text', value: before })
  segments.push({
    kind: 'gap',
    answer: best.word,
    conceptId: sentence.conceptIds[0],
    errorTag: sentence.errorTagsDetectable[0],
  })
  if (after) segments.push({ kind: 'text', value: after })

  return {
    id: `autocloze:${sentence.id}`,
    cefrLevel: sentence.cefrLevel,
    primaryConceptId: sentence.conceptIds[0],
    englishGloss: sentence.english,
    segments,
    difficulty: sentence.difficulty,
  }
}
