import fs from 'fs'
import path from 'path'
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

function readJson(filePath: string): RawSentence[] {
  try {
    const raw = fs.readFileSync(filePath, 'utf-8')
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : (parsed.sentences ?? [])
  } catch {
    return []
  }
}

let cached: { sentences: Record<string, Sentence>; availableSentenceIds: Record<string, string[]> } | null = null

export function loadContentSentences(): {
  sentences: Record<string, Sentence>
  availableSentenceIds: Record<string, string[]>
} {
  if (cached) return cached

  const contentDir = path.join(process.cwd(), 'content', 'sentences')
  const a1 = readJson(path.join(contentDir, 'a1.json'))
  const a2 = readJson(path.join(contentDir, 'a2.json'))
  const b1 = readJson(path.join(contentDir, 'b1.json'))
  const b2 = readJson(path.join(contentDir, 'b2.json'))

  const sentences: Record<string, Sentence> = {}
  const availableSentenceIds: Record<string, string[]> = {}

  for (const raw of [...a1, ...a2, ...b1, ...b2]) {
    const s = mapRow(raw)
    sentences[s.id] = s
    for (const conceptId of s.conceptIds) {
      if (!availableSentenceIds[conceptId]) availableSentenceIds[conceptId] = []
      availableSentenceIds[conceptId].push(s.id)
    }
  }

  cached = { sentences, availableSentenceIds }
  return cached
}
