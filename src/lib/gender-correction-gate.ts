// The single per-correction gender gate (Lever 3). Shared by the journal + conversation
// write sites so there is ONE code path — the Rule-8 trace test drives this exact function,
// not a parallel mirror.
//
// An AI correction is admitted to the fingerprint ONLY when the deterministic verifier
// confirms a real noun-gender error. The returned RepairInput is always tagged 'noun-gender'
// (the verifier, not the AI, decides the class); a non-confirmed correction returns null and
// writes nothing — upholding "no unverified AI output moves mastery".
import { verifyGenderCorrection } from './gender-verifier'
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
