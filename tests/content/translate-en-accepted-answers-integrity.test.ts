/**
 * G-03 integrity guard — translate-to-english accepted_answers.
 *
 * B1/B2 translate-to-english sentences now carry conservative accepted_answers
 * for valid paraphrase variants (synonym, BrE/AmE, optional "that", etc.).
 * This test enforces structural correctness of the authored alts.
 *
 * What it CAN check deterministically:
 *  - no alt is empty (an empty string would always grade wrong)
 *  - no alt is identical to the canonical english after normalization
 *    (redundant but harmless, still a mistake to leave in the corpus)
 *  - no duplicate alts within a sentence (authoring error)
 *  - the set stays small (≤3 alts — keeps the corpus reviewable)
 *
 * What it CANNOT check:
 *  - whether the alt is actually a valid English translation of the Norwegian
 *    (that is eye-verified, not machine-verifiable without an NLP judge)
 */
import { describe, it, expect } from 'vitest'
import { loadContentSentences } from '@/lib/content-loader'
import { normalizeAnswer } from '@/lib/answer'

describe('translate-to-english accepted_answers integrity', () => {
  const { sentences } = loadContentSentences()

  const translateEN = Object.values(sentences).filter(
    (s) =>
      s.exerciseTypes.includes('translation-to-english') &&
      s.acceptedAnswers &&
      s.acceptedAnswers.length > 0,
  )

  it('the corpus has B1/B2 translate-to-english sentences with accepted_answers (no vacuous pass)', () => {
    expect(translateEN.length).toBeGreaterThan(100)
  })

  it('every accepted_answer is a non-empty string', () => {
    const offenders: string[] = []
    for (const s of translateEN) {
      for (const alt of s.acceptedAnswers ?? []) {
        if (!alt || alt.trim().length === 0) {
          offenders.push(`${s.id}: empty alt`)
        }
      }
    }
    expect(offenders, `sentences with empty accepted_answers:\n${offenders.join('\n')}`).toEqual([])
  })

  it('no accepted_answer is identical to the canonical english (after normalization)', () => {
    const offenders: string[] = []
    for (const s of translateEN) {
      const canonNorm = normalizeAnswer(s.english)
      for (const alt of s.acceptedAnswers ?? []) {
        if (normalizeAnswer(alt) === canonNorm) {
          offenders.push(`${s.id}: alt "${alt}" duplicates canonical "${s.english}"`)
        }
      }
    }
    expect(
      offenders,
      `accepted_answers that duplicate the canonical english:\n${offenders.join('\n')}`,
    ).toEqual([])
  })

  it('no duplicate accepted_answers within a single sentence', () => {
    const offenders: string[] = []
    for (const s of translateEN) {
      const alts = s.acceptedAnswers ?? []
      const seen = new Set<string>()
      for (const alt of alts) {
        const norm = normalizeAnswer(alt)
        if (seen.has(norm)) {
          offenders.push(`${s.id}: duplicate alt "${alt}"`)
        }
        seen.add(norm)
      }
    }
    expect(offenders, `sentences with duplicate accepted_answers:\n${offenders.join('\n')}`).toEqual(
      [],
    )
  })

  it('each sentence has at most 3 accepted_answers (keeps corpus reviewable)', () => {
    const offenders = translateEN
      .filter((s) => (s.acceptedAnswers?.length ?? 0) > 3)
      .map((s) => `${s.id}: ${s.acceptedAnswers?.length} alts`)
    expect(
      offenders,
      `sentences with more than 3 accepted_answers:\n${offenders.join('\n')}`,
    ).toEqual([])
  })
})
