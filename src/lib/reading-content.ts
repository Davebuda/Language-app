/**
 * The /reading seed library (`SEED_TEXTS` in src/app/reading/page.tsx) holds
 * dedicated A1/A2/B1/B2 texts (B1/B2 added 2026-06-28). Every standard level now
 * reads at its own level; only an unknown level falls back (to the B2 ceiling).
 * Exposing the ACTUALLY-served level lets the UI honestly disclose any fallback
 * instead of substituting silently (Operating Rule 6), mirroring
 * getRoleplayContentLevel / getListenContentLevel.
 */
export type ReadingContentLevel = 'A1' | 'A2' | 'B1' | 'B2'

export function getReadingContentLevel(level: string): ReadingContentLevel {
  if (level === 'A1') return 'A1'
  if (level === 'A2') return 'A2'
  if (level === 'B1') return 'B1'
  return 'B2' // B2 is the highest level served; unknown levels read at the B2 ceiling
}

/** True when the learner's level is above everything the reading library serves. */
export function isBelowReadingLevel(level: string): boolean {
  return getReadingContentLevel(level) !== level
}
