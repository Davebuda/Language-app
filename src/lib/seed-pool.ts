// Client-safe seed pool — the 397-sentence A1+A2 corpus statically imported
// from JSON so client-side schedulers see the same data the server grader has.
//
// The server grader (src/app/session/actions.ts) uses `loadContentSentences`
// from `content-loader.ts` (which uses Node `fs`) and is server-only.
// This module mirrors that data on the client via Next.js static JSON imports.
//
// Wired into:
// - src/app/dashboard/page.tsx — replaces the previous MOCK_SENTENCES preview
//   pool so the dashboard scheduler stops warning "no eligible sentence" for
//   concepts that DO have real sentences.

import a1Raw from '@content/sentences/a1.json'
import a2Raw from '@content/sentences/a2.json'
import b1Raw from '@content/sentences/b1.json'
import type { Sentence } from '@/types/content'

interface RawSentence {
  id: string
  norwegian: string
  english: string
  concept_ids?: string[]
  vocab_clusters?: string[]
  error_tags_detectable?: string[]
  cefr_level?: string
  difficulty?: number
  exercise_types?: string[]
  notes?: string
  audio_url?: string
  scenario_id?: string
}

function mapRow(raw: RawSentence): Sentence {
  return {
    id: raw.id,
    norwegian: raw.norwegian,
    english: raw.english,
    conceptIds: raw.concept_ids ?? [],
    vocabularyClusters: raw.vocab_clusters ?? [],
    errorTagsDetectable: (raw.error_tags_detectable ?? []) as Sentence['errorTagsDetectable'],
    cefrLevel: (raw.cefr_level ?? 'A1') as Sentence['cefrLevel'],
    difficulty: (raw.difficulty ?? 1) as Sentence['difficulty'],
    exerciseTypes: (raw.exercise_types ?? []) as Sentence['exerciseTypes'],
    notes: raw.notes,
    audioUrl: raw.audio_url,
    scenarioId: raw.scenario_id,
  }
}

import b2RawImport from '@content/sentences/b2.json'
const b2Raw: RawSentence[] = b2RawImport as RawSentence[]

const RAW: RawSentence[] = [
  ...(a1Raw as RawSentence[]),
  ...(a2Raw as RawSentence[]),
  ...(b1Raw as RawSentence[]),
  ...b2Raw,
]

export const SEED_SENTENCES: Record<string, Sentence> = {}
export const SEED_SENTENCE_IDS: Record<string, string[]> = {}

for (const raw of RAW) {
  const s = mapRow(raw)
  SEED_SENTENCES[s.id] = s
  for (const conceptId of s.conceptIds) {
    if (!SEED_SENTENCE_IDS[conceptId]) SEED_SENTENCE_IDS[conceptId] = []
    SEED_SENTENCE_IDS[conceptId].push(s.id)
  }
}
