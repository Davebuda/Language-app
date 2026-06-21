// The single per-correction gender gate (Lever 3). Shared by the journal + conversation
// write sites so there is ONE code path — the Rule-8 trace test drives this exact function,
// not a parallel mirror.
//
// An AI correction is admitted to the fingerprint ONLY when the deterministic verifier
// confirms a real noun-gender error. The returned RepairInput is always tagged 'noun-gender'
// (the verifier, not the AI, decides the class); a non-confirmed correction returns null and
// writes nothing — upholding "no unverified AI output moves mastery".
import { verifyGenderCorrection } from './gender-verifier'
import { verifyConjugationCorrection } from './conjugation-verifier'
import { errorTagToConceptId } from './error-tag-to-concept'
import type { RepairInput, SurfaceKind } from '@/engine/repair-from-surface'

export function confirmedGenderRepair(
  correction: { original: string; corrected: string },
  surfaceKind: SurfaceKind,
): RepairInput | null {
  if (verifyGenderCorrection(correction) !== 'confirmed') return null
  return {
    surfaceKind,
    errorTag: 'noun-gender',
    conceptId: errorTagToConceptId('noun-gender'),
    wrong: correction.original,
    correct: correction.corrected,
  }
}

// The single per-correction gate for ALL deterministically-verifiable classes.
// An AI correction is admitted to the fingerprint ONLY when a deterministic verifier
// confirms it; the verifier (not the AI) decides the class. noun-gender (Lever 3) and
// verb-conjugation (p4 Lever 2) are armed; every other class returns null (show-don't-grade).
// `context` is the learner's full utterance/text — required for the conjugation tense check.
export function confirmedRepair(
  correction: { original: string; corrected: string; context?: string },
  surfaceKind: SurfaceKind,
): RepairInput | null {
  if (verifyGenderCorrection(correction) === 'confirmed') {
    return {
      surfaceKind,
      errorTag: 'noun-gender',
      conceptId: errorTagToConceptId('noun-gender'),
      wrong: correction.original,
      correct: correction.corrected,
    }
  }
  if (
    correction.context &&
    verifyConjugationCorrection({
      original: correction.original,
      corrected: correction.corrected,
      context: correction.context,
    }) === 'confirmed'
  ) {
    return {
      surfaceKind,
      errorTag: 'verb-conjugation',
      conceptId: errorTagToConceptId('verb-conjugation'),
      wrong: correction.original,
      correct: correction.corrected,
    }
  }
  return null
}
