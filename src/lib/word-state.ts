// Pure, side-effect-free derivation of a word's notebook state for LingQ-style
// reader/notebook tinting. NO scheduler/SRS/mastery logic — it only reads the
// learner's existing saved notebook items and answers "have I saved this word,
// and do I consider it known?".
//
// Shared by the reader (`/reading`) and the notebook state-dots so the two
// surfaces render one coherent colour system.

import type { NotebookItem } from '@/types/notebook'

/**
 * Three mutually-exclusive states a word can be in relative to the notebook:
 *  - 'known'   → a matching item the learner has marked known (reviewStatus === 'known')
 *  - 'saved'   → a matching item that is NOT marked known
 *  - 'unknown' → no matching item ("tap me")
 */
export type WordState = 'unknown' | 'saved' | 'known'

/** Case-insensitive, trimmed comparison key for matching a word to an item. */
function normalize(text: string): string {
  return text.trim().toLowerCase()
}

/**
 * Derive the notebook state of `text` from the learner's saved `items`.
 *
 * Matching is case-insensitive and trimmed against each item's `norwegian`.
 * 'known' wins over 'saved' when both a known and a non-known item match the
 * same word (the strongest claim the notebook can make about it).
 *
 * Pure: does not mutate inputs, has no side effects, and never touches mastery,
 * SRS, or the scheduler.
 */
export function wordState(text: string, items: readonly NotebookItem[]): WordState {
  const key = normalize(text)
  if (!key) return 'unknown'

  let matched = false
  for (const item of items) {
    if (normalize(item.norwegian) !== key) continue
    matched = true
    if (item.reviewStatus === 'known') return 'known'
  }

  return matched ? 'saved' : 'unknown'
}
