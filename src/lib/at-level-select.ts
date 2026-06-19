// At-level sentence selection (p6 Phase D). Two pure helpers used at sentence
// resolution so the corpus's multi-skill Q-matrix tags (a foundational concept
// now tagged on higher-level sentences) produce remediate-at-level behaviour
// WITHOUT leaking above-level content downward.

import type { CEFRLevel } from '@/types/fingerprint'

const LEVEL_ORDER: CEFRLevel[] = ['A1', 'A2', 'B1', 'B2']

/**
 * CEFR ceiling (safety): keep only sentences at or below the learner's level.
 * Load-bearing after the Q-matrix merge — a concept index can now contain
 * above-level sentences (e.g. the A1 `personal-pronouns` concept tagged on a B1
 * sentence), and a learner must never be served above their level.
 */
export function withinLevelCeiling<T extends { cefrLevel: string }>(pool: T[], level: CEFRLevel): T[] {
  const max = LEVEL_ORDER.indexOf(level)
  if (max < 0) return []
  return pool.filter((s) => {
    const i = LEVEL_ORDER.indexOf(s.cefrLevel as CEFRLevel)
    return i >= 0 && i <= max
  })
}

/**
 * Remediate-at-level (preference): prefer sentences AT the learner's current
 * level over lower-level ones, so a B2 learner weak on a foundational concept
 * practises it inside B2 content (where the Q-matrix put the tag) rather than
 * dropping to an A1 drill. Falls back to the full pool when no at-level sentence
 * exists — the comprehensibility fallback (a learner still gets practice).
 *
 * NOTE: this is a PREFERENCE within an already-ceiling-filtered pool — it never
 * raises the ceiling; it only avoids picking needlessly-low content.
 */
export function preferAtLevel<T extends { cefrLevel: string }>(pool: T[], level: CEFRLevel): T[] {
  const atLevel = pool.filter((s) => s.cefrLevel === level)
  return atLevel.length > 0 ? atLevel : pool
}
