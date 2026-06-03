import type { MistakeFingerprint } from '@/types/fingerprint'

/**
 * Accuracy ("Treff") is a PRACTICE statistic, not a placement statistic.
 *
 * The diagnostic seeds in-memory concept attempts (attemptCount > 0) that do
 * NOT survive a page reload. That produced findings F018 + F020: the tile showed
 * e.g. "43%" right after the diagnostic, then silently "downgraded" to "—" on a
 * hard refresh — two different answers from the same fingerprint, and a number
 * the learner never earned through real practice.
 *
 * Gate on a real completed session. `totalSessionsCompleted` is written only at
 * /session/complete (never by the diagnostic), so the displayed value is
 * consistent across hydration and only ever reflects practiced accuracy.
 *
 * Null-safe by design: a legacy fingerprint missing `totalSessionsCompleted`
 * falls back to 0 → "—" (see returning-user read-safety contract).
 */
export function deriveAccuracyDisplay(fingerprint: MistakeFingerprint | null | undefined): string {
  if (!fingerprint) return '—'
  if ((fingerprint.totalSessionsCompleted ?? 0) <= 0) return '—'

  const attempted = Object.values(fingerprint.conceptMastery ?? {}).filter(
    (mastery) => mastery.attemptCount > 0,
  )
  if (attempted.length === 0) return '—'

  const avg =
    attempted.reduce((sum, mastery) => sum + (mastery.decayedScore ?? 0), 0) / attempted.length
  return `${Math.round(avg)}%`
}
