// Deterministic conjugation grader (Slice 3.3). No AI — the form is right or
// wrong against the linguist-gated conjugation tables. Accepts the dual forms
// the linguist flagged (fraråde: frarådet/frarådde · gnage: gnagde/gnaget) and
// the optional "har" auxiliary on perfektum.
import type { VocabWord } from '@/types/vocab'

export type ConjugationTense = 'presens' | 'preteritum' | 'perfektum'

export const TENSE_LABELS: Record<ConjugationTense, string> = {
  presens: 'presens',
  preteritum: 'preteritum',
  perfektum: 'presens perfektum',
}

function norm(s: string): string {
  return s.trim().replace(/\s+/g, ' ').toLowerCase()
}

/** The accepted (normalized) answer variants for a word's tense. */
export function acceptedAnswers(word: VocabWord, tense: ConjugationTense): string[] {
  const raw = word[tense] // e.g. "frarådet / frarådde", "har gnidd"
  const out = new Set<string>()
  for (const variant of raw.split('/')) {
    const v = norm(variant)
    if (!v) continue
    out.add(v)
    // perfektum: accept with OR without the "har" auxiliary
    if (tense === 'perfektum') out.add(v.replace(/^har\s+/, ''))
  }
  return [...out]
}

export interface ConjugationGrade {
  correct: boolean
  accepted: string[]
  expected: string // canonical display form (word[tense])
}

export function gradeConjugation(
  word: VocabWord,
  tense: ConjugationTense,
  answer: string,
): ConjugationGrade {
  const accepted = acceptedAnswers(word, tense)
  const a = norm(answer)
  const candidates = tense === 'perfektum' ? [a, a.replace(/^har\s+/, '')] : [a]
  return { correct: candidates.some((c) => c.length > 0 && accepted.includes(c)), accepted, expected: word[tense] }
}
