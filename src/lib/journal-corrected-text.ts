import type { WritingFeedback } from '@/ai/types'

type JournalError = WritingFeedback['errors'][number]

export interface CorrectedTextResult {
  /** The original text with ONLY gate-confirmed corrections woven in. */
  text: string
  /** Confirmed corrections that couldn't be string-matched in the text. */
  unapplied: number
  /** Unconfirmed AI corrections deliberately NOT woven in (show-don't-grade). */
  withheld: number
}

/**
 * Build the authoritative "Rettet versjon" shown to the learner.
 *
 * AI-01: the displayed corrected text is an authoritative claim, so it must only
 * assert corrections a deterministic verifier confirms — the SAME `confirmedRepair`
 * gate that governs mastery. A wrong-but-valid AI correction (e.g. "en jobb" →
 * "et jobb", which the gender gate rejects because *jobb* is masculine) is withheld
 * from the woven text rather than presented as truth. show-don't-grade extends to
 * the display, not just the fingerprint. Unconfirmed corrections still surface in
 * the per-error list as savable suggestions ("Forslag"); they just aren't asserted
 * here as the canonical correct version.
 *
 * `isConfirmed` is injected (the caller passes the confirmedRepair check) so this
 * stays pure and unit-testable without the gender/conjugation lexicons.
 */
export function buildCorrectedText(
  original: string,
  errors: WritingFeedback['errors'],
  isConfirmed: (err: JournalError) => boolean,
): CorrectedTextResult {
  let result = original
  let unapplied = 0
  let withheld = 0
  for (const err of errors) {
    if (!err.wrong || !err.correct) continue
    if (!isConfirmed(err)) {
      withheld++
      continue
    }
    // Case-insensitive: the AI often lowercases excerpts (e.g. "jeg" when the
    // original has "Jeg"). String.replace is case-sensitive and would silently miss.
    const escaped = err.wrong.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const regex = new RegExp(escaped, 'i')
    const next = result.replace(regex, err.correct)
    if (next === result) {
      unapplied++
      console.warn('[journal] correction could not be applied:', err.wrong, '→', err.correct)
    }
    result = next
  }
  return { text: result, unapplied, withheld }
}
