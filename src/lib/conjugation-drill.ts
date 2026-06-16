// Build a conjugation drill from the B2 vocab track (Slice 3.3).
// Deterministic given (seedOffset, fingerprint) — no Math.random, testable.
// SRS-aware: words scheduled in the future (just drilled) are pushed behind due
// words so they don't recur within days; irregulars prioritized within each group.
import type { VocabWord } from '@/types/vocab'
import type { MistakeFingerprint } from '@/types/fingerprint'
import { VOCAB_WORDS } from './vocab-loader'
import type { ConjugationTense } from './grade-conjugation'

export interface DrillItem {
  wordId: string
  word: VocabWord
  tense: ConjugationTense
  clusterId: string
}

const TENSES: ConjugationTense[] = ['presens', 'preteritum', 'perfektum']

/** Left-rotate by `off` (each element appears once) — per-seed variety, no dupes. */
function rotate<T>(a: T[], off: number): T[] {
  if (a.length === 0) return a
  const k = ((off % a.length) + a.length) % a.length
  return a.map((_, i) => a[(i + k) % a.length])
}

export function buildConjugationDrill(size = 10, seedOffset = 0, fp?: MistakeFingerprint): DrillItem[] {
  // Stable order: irregulars first (a→u patterns carry the most value), then regulars.
  const ordered = [...VOCAB_WORDS].sort((a, b) => Number(b.irregular) - Number(a.irregular))
  if (ordered.length === 0) return []

  // A word is "due" if it has no schedule yet or its nextReviewAt has passed. Words
  // drilled recently are scheduled ≥2 days out → not due → pushed behind due words,
  // so they only reappear if the due pool can't fill the drill (never within days).
  const srs = fp?.vocabWordSrs ?? {}
  const now = Date.now()
  const isDue = (id: string): boolean => {
    const r = srs[id]
    return !r?.nextReviewAt || new Date(r.nextReviewAt).getTime() <= now
  }
  const due = rotate(ordered.filter((w) => isDue(w.id)), seedOffset)
  const notDue = rotate(ordered.filter((w) => !isDue(w.id)), seedOffset)
  const chosen = [...due, ...notDue].slice(0, size) // due-first; partition ⇒ no duplicate word

  return chosen.map((word, i) => {
    // For irregulars, bias toward the tenses that actually change (preteritum/perfektum).
    const tensePool = word.irregular ? (['preteritum', 'perfektum'] as ConjugationTense[]) : TENSES
    const tense = tensePool[(i + seedOffset) % tensePool.length]
    return { wordId: word.id, word, tense, clusterId: word.clusterId }
  })
}
