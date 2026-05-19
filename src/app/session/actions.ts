'use server'

import { loadContentSentences } from '@/lib/content-loader'
import { checkAnswer } from '@/lib/answer'
import type { ExerciseType } from '@/types/session'
import type { ErrorTag } from '@/types/taxonomy'

interface GradeResult {
  correct: boolean
  correctAnswer: string
  errorTag: ErrorTag | undefined
}

function deriveCorrectAnswer(
  exerciseType: ExerciseType,
  norwegian: string,
  english: string,
  notes: string | undefined,
): string {
  switch (exerciseType) {
    case 'translation-to-norwegian':
    case 'sentence-transformation':
    case 'word-order':
    case 'listening-comprehension':
    case 'dictation':
      return norwegian
    case 'translation-to-english':
    case 'speed-round':
      return english
    case 'fill-in-blank':
      return notes ?? ''
    default:
      return norwegian
  }
}

// Pick the most relevant error tag from those the sentence declares detectable.
// Returns undefined when the list is empty — callers must handle that case.
function pickErrorTag(tags: ErrorTag[]): ErrorTag | undefined {
  return tags.length > 0 ? tags[0] : undefined
}

export async function gradeAnswer(
  sentenceId: string,
  exerciseType: ExerciseType,
  userAnswer: string,
): Promise<GradeResult> {
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
    // Sentence not found — fail open so the session is not blocked
    return { correct: false, correctAnswer: '[unavailable]', errorTag: undefined }
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
