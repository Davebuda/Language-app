import { createEmptyFingerprint } from '@/types/fingerprint'
import type { MistakeFingerprint } from '@/types/fingerprint'
import type { DiagnosticResult } from '@/lib/diagnostic/engine'

export interface BuildSeededOptions {
  userId: string
  now: string
  /** Resolved theme (e.g. getStoredTheme()); falls back to existing/default. */
  theme?: MistakeFingerprint['theme']
}

/**
 * Pure builder for the post-diagnostic fingerprint: stamps the diagnostic CEFR
 * level (levelSetByUser) and blends the seeded concept mastery onto the existing
 * (or a fresh empty) fingerprint.
 *
 * Extracted from OnboardingFlow's seedFingerprintFromDiagnostic so the
 * seed → diagnostic-level invariant is unit-testable without rendering the flow
 * (D-01). It does NO IO — the caller loads `existing`, persists the result, and
 * (per the D-01 fix) must AWAIT that write before navigating away, or the
 * destination's useFingerprint bootstrap can reload a not-yet-flushed record and
 * clobber the level back to A1.
 */
export function buildSeededFingerprint(
  existing: MistakeFingerprint | null,
  result: DiagnosticResult,
  opts: BuildSeededOptions,
): MistakeFingerprint {
  const now = opts.now
  const fp: MistakeFingerprint = existing ?? createEmptyFingerprint(opts.userId)

  fp.currentLevel = result.cefrLevel
  fp.levelSetByUser = true

  for (const [conceptId, seed] of Object.entries(result.conceptSeeds)) {
    const existingMastery = fp.conceptMastery[conceptId]
    if (existingMastery) {
      const totalAttempts = existingMastery.attemptCount + seed.attemptCount
      const totalCorrect = existingMastery.correctCount + seed.correctCount
      const blendedRawScore = Math.round((totalCorrect / totalAttempts) * 100)
      fp.conceptMastery[conceptId] = {
        ...existingMastery,
        conceptId,
        attemptCount: totalAttempts,
        correctCount: totalCorrect,
        rawScore: blendedRawScore,
        decayedScore: blendedRawScore,
        confidenceScore: Math.min(1, existingMastery.confidenceScore + 0.1),
        lastAttemptAt: seed.lastAttemptAt ?? now,
        lastCorrectAt: seed.lastCorrectAt ?? existingMastery.lastCorrectAt,
        streak: seed.streak > 0 ? existingMastery.streak + seed.streak : 0,
        recentOutcomes: [...existingMastery.recentOutcomes, ...seed.recentOutcomes].slice(-10),
      }
    } else {
      fp.conceptMastery[conceptId] = {
        conceptId,
        rawScore: seed.rawScore,
        confidenceScore: seed.confidenceScore,
        decayedScore: seed.decayedScore,
        attemptCount: seed.attemptCount,
        correctCount: seed.correctCount,
        uniqueDaysActive: seed.uniqueDaysActive,
        lastAttemptAt: seed.lastAttemptAt ?? now,
        lastCorrectAt: seed.lastCorrectAt,
        streak: seed.streak,
        recentOutcomes: seed.recentOutcomes,
        srsLevel: 0,
        nextReviewAt: new Date(Date.now() + 86400000).toISOString(),
      }
    }
  }

  const askedIdSet = new Set([
    ...(fp.askedDiagnosticQuestionIds ?? []),
    ...(result.askedQuestionIds ?? []),
  ])
  fp.askedDiagnosticQuestionIds = [...askedIdSet]

  // Bake the onboarding theme choice into the fingerprint so it syncs cross-device.
  fp.theme = opts.theme ?? fp.theme ?? 'honning'

  fp.updatedAt = now
  return fp
}
