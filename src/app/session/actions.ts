'use server'

import { loadContentSentences } from '@/lib/content-loader'
import { checkAnswer } from '@/lib/answer'
import { deriveCorrectAnswer } from '@/lib/grade-utils'
import type { ExerciseType } from '@/types/session'
import type { ErrorTag } from '@/types/taxonomy'

interface GradeResult {
  correct: boolean
  correctAnswer: string
  errorTag: ErrorTag | undefined
}

// Returned when the sentence id cannot be resolved against either the local
// JSON corpus or Supabase. Callers must check for this null and NOT persist
// a placeholder result — storing "[unavailable]" as the correct answer was the
// F011 corruption observed in the third walkthrough.
export type GradeResponse = GradeResult | null

// Pick the most relevant error tag from those the sentence declares detectable.
// Returns undefined when the list is empty — callers must handle that case.
function pickErrorTag(tags: ErrorTag[]): ErrorTag | undefined {
  return tags.length > 0 ? tags[0] : undefined
}

export async function gradeAnswer(
  sentenceId: string,
  exerciseType: ExerciseType,
  userAnswer: string,
): Promise<GradeResponse> {
  // 1. Try local JSON content first (fast, no network)
  const { sentences: localSentences } = loadContentSentences()
  let sentence = localSentences[sentenceId]

  // 2. Fall back to Supabase if not in local content
  if (!sentence) {
    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
      const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      if (supabaseUrl && supabaseKey) {
        const { createClient } = await import('@supabase/supabase-js')
        const supabase = createClient(supabaseUrl, supabaseKey)
        const { data } = await supabase
          .from('sentences')
          .select('id, norwegian, english, notes, exercise_types, error_tags_detectable')
          .eq('id', sentenceId)
          .single()
        if (data) {
          sentence = {
            id: data.id,
            norwegian: data.norwegian,
            english: data.english,
            notes: data.notes ?? undefined,
            conceptIds: [],
            vocabularyClusters: [],
            errorTagsDetectable: data.error_tags_detectable ?? [],
            cefrLevel: 'A1',
            difficulty: 1,
            exerciseTypes: data.exercise_types ?? [],
          }
        }
      }
    } catch { /* fall through to mock fallback */ }
  }

  if (!sentence) {
    // Sentence not found in either local JSON or Supabase. Return null so
    // callers can drop the result instead of persisting the literal
    // "[unavailable]" placeholder string into recentErrors (F011).
    console.warn(`[gradeAnswer] unknown sentence id: ${sentenceId}`)
    return null
  }

  const correctAnswer = deriveCorrectAnswer(
    exerciseType,
    sentence.norwegian,
    sentence.english,
    sentence.notes,
  )

  const correct = checkAnswer(userAnswer, correctAnswer)
  return {
    correct,
    correctAnswer,
    errorTag: correct ? undefined : pickErrorTag(sentence.errorTagsDetectable),
  }
}
