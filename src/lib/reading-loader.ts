// Client-safe reading-passage pool for the read→recite→write module.
// B1+B2 passages are statically imported from JSON (camelCase, matching the
// ReadingPassage type directly — no field mapping needed, unlike the snake_case
// cloze passages). Mirrors src/lib/passage-pool.ts. The /skriv screen applies
// the level gate (passages at or below the learner's level), so a B2 learner
// draws B2 passages while B1 stays B1.

import b1Raw from '@content/reading/b1.json'
import b2Raw from '@content/reading/b2.json'
import type { ReadingPassage } from '@/types/content'

const RAW: ReadingPassage[] = [
  ...(b1Raw as ReadingPassage[]),
  ...(b2Raw as ReadingPassage[]),
]

export const SEED_READING_PASSAGES: Record<string, ReadingPassage> = {}
export const SEED_READING_PASSAGE_IDS: Record<string, string[]> = {} // primaryConceptId → passage ids

for (const p of RAW) {
  SEED_READING_PASSAGES[p.id] = p
  if (!SEED_READING_PASSAGE_IDS[p.primaryConceptId]) SEED_READING_PASSAGE_IDS[p.primaryConceptId] = []
  SEED_READING_PASSAGE_IDS[p.primaryConceptId].push(p.id)
}
