import { SessionScreen } from '@/components/session/SessionScreen'
import { MOCK_SENTENCES, MOCK_SENTENCE_IDS } from '@/lib/mock-sentences'
import type { Sentence } from '@/types/content'

export const metadata = { title: 'Økt — NorskCoach' }

async function fetchSupabaseSentences(): Promise<{
  sentences: Record<string, Sentence>
  ids: Record<string, string[]>
}> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!supabaseUrl || !supabaseKey) return { sentences: {}, ids: {} }

  try {
    const { createClient } = await import('@supabase/supabase-js')
    const supabase = createClient(supabaseUrl, supabaseKey)
    const { data: rows, error } = await supabase
      .from('sentences')
      .select(
        'id, norwegian, english, concept_ids, vocab_clusters, error_tags_detectable, cefr_level, difficulty, exercise_types, audio_url, notes, scenario_id'
      )
      .eq('cefr_level', 'A1')
      .limit(1000)

    if (error || !rows?.length) return { sentences: {}, ids: {} }

    const sentences: Record<string, Sentence> = {}
    const ids: Record<string, string[]> = {}
    for (const row of rows) {
      const s: Sentence = {
        id: row.id,
        norwegian: row.norwegian,
        english: row.english,
        conceptIds: row.concept_ids ?? [],
        vocabularyClusters: row.vocab_clusters ?? [],
        errorTagsDetectable: row.error_tags_detectable ?? [],
        cefrLevel: row.cefr_level,
        difficulty: row.difficulty,
        exerciseTypes: row.exercise_types ?? [],
        audioUrl: row.audio_url ?? undefined,
        scenarioId: row.scenario_id ?? undefined,
        notes: row.notes ?? undefined,
      }
      sentences[s.id] = s
      for (const cId of s.conceptIds) {
        ids[cId] = [...(ids[cId] ?? []), s.id]
      }
    }
    return { sentences, ids }
  } catch {
    return { sentences: {}, ids: {} }
  }
}

export default async function SessionPage() {
  const { sentences: dbSentences, ids: dbIds } = await fetchSupabaseSentences()

  // DB content takes priority over mock for same IDs
  const sentences: Record<string, Sentence> = { ...MOCK_SENTENCES, ...dbSentences }
  const availableSentenceIds: Record<string, string[]> = { ...MOCK_SENTENCE_IDS }
  for (const [conceptId, sentenceIds] of Object.entries(dbIds)) {
    availableSentenceIds[conceptId] = [
      ...(availableSentenceIds[conceptId] ?? []),
      ...sentenceIds,
    ]
  }

  return (
    <main className="bg-nc-bg min-h-dvh">
      <SessionScreen
        availableSentenceIds={availableSentenceIds}
        sentences={sentences}
      />
    </main>
  )
}
