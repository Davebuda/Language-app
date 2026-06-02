// Build a conjugation drill from the B2 vocab track (Slice 3.3).
// Deterministic given a seedOffset (no Math.random — testable; the UI varies it).
// Ablaut-grouped, irregulars prioritized (highest learning value).
import type { VocabWord } from '@/types/vocab'
import { VOCAB_WORDS } from './vocab-loader'
import type { ConjugationTense } from './grade-conjugation'

export interface DrillItem {
  wordId: string
  word: VocabWord
  tense: ConjugationTense
  clusterId: string
}

const TENSES: ConjugationTense[] = ['presens', 'preteritum', 'perfektum']

export function buildConjugationDrill(size = 10, seedOffset = 0): DrillItem[] {
  // Stable order: irregulars first (a→u patterns carry the most value), then regulars.
  const ordered = [...VOCAB_WORDS].sort((a, b) => Number(b.irregular) - Number(a.irregular))
  if (ordered.length === 0) return []
  const items: DrillItem[] = []
  for (let i = 0; i < size; i++) {
    const word = ordered[(i + seedOffset) % ordered.length]
    // For irregulars, bias toward the tenses that actually change (preteritum/perfektum).
    const tensePool = word.irregular ? (['preteritum', 'perfektum'] as ConjugationTense[]) : TENSES
    const tense = tensePool[(i + seedOffset) % tensePool.length]
    items.push({ wordId: word.id, word, tense, clusterId: word.clusterId })
  }
  return items
}
