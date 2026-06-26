/**
 * The /reading seed library (`SEED_TEXTS` in src/app/reading/page.tsx) holds
 * A1–A2 texts only. A B1/B2 learner who opens /reading directly therefore reads
 * below-level content. Exposing the ACTUALLY-served level lets the UI honestly
 * disclose that instead of substituting silently (Operating Rule 6), mirroring
 * getRoleplayContentLevel / getListenContentLevel.
 *
 * Returns the learner's own level when it is at or below the library ceiling
 * (A2), else the ceiling. A1 → A1, A2 → A2, B1/B2/unknown → A2.
 */
export type ReadingContentLevel = 'A1' | 'A2'

export function getReadingContentLevel(level: string): ReadingContentLevel {
  if (level === 'A1') return 'A1'
  return 'A2' // A2 is the highest reading text available; B1/B2 read below level
}

/** True when the learner's level is above everything the reading library serves. */
export function isBelowReadingLevel(level: string): boolean {
  return getReadingContentLevel(level) !== level
}
