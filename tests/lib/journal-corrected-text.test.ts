import { describe, it, expect } from 'vitest'
import { buildCorrectedText } from '@/lib/journal-corrected-text'
import type { WritingFeedback } from '@/ai/types'

type JournalError = WritingFeedback['errors'][number]

function err(wrong: string, correct: string, tag: JournalError['tag'] = 'noun-gender'): JournalError {
  return { tag, wrong, correct, briefWhy: 'test' }
}

describe('buildCorrectedText (AI-01 — show-don\'t-grade extends to the displayed text)', () => {
  it('does NOT weave a wrong-but-valid gender correction the gate rejects', () => {
    // The classic poisoning case: Groq "corrects" en jobb → et jobb, but jobb is
    // masculine, so the deterministic gate rejects it. It must not be asserted as
    // truth in the authoritative "Rettet versjon".
    const original = 'Jeg har en jobb i Oslo.'
    const rejectAll = () => false
    const result = buildCorrectedText(original, [err('en jobb', 'et jobb')], rejectAll)

    expect(result.text).toBe(original) // unchanged — the bad correction is withheld
    expect(result.text).not.toContain('et jobb')
    expect(result.withheld).toBe(1) // surfaced as a caveat, not silent
  })

  it('weaves in a correction the gate confirms', () => {
    const original = 'Jeg har et bok.'
    const confirmAll = () => true
    const result = buildCorrectedText(original, [err('et bok', 'en bok')], confirmAll)

    expect(result.text).toBe('Jeg har en bok.')
    expect(result.withheld).toBe(0)
    expect(result.unapplied).toBe(0)
  })

  it('applies only confirmed corrections in a mixed batch and counts the rest as withheld', () => {
    const original = 'Jeg har et bok og en jobb.'
    const errors = [err('et bok', 'en bok'), err('en jobb', 'et jobb')]
    // Confirm only the genuinely-correct one (et bok → en bok); reject the bad one.
    const isConfirmed = (e: JournalError) => e.correct === 'en bok'
    const result = buildCorrectedText(original, errors, isConfirmed)

    expect(result.text).toBe('Jeg har en bok og en jobb.') // only the confirmed fix
    expect(result.text).not.toContain('et jobb')
    expect(result.withheld).toBe(1)
  })

  it('reports a confirmed correction that cannot be string-matched as unapplied', () => {
    const original = 'Jeg har en bok.'
    const result = buildCorrectedText(original, [err('et hus', 'et huset')], () => true)
    expect(result.unapplied).toBe(1)
    expect(result.text).toBe(original)
  })
})
