'use server'

import { loadContentSentences } from '@/lib/content-loader'
import { checkAnswerWithAlternatives } from '@/lib/answer'
import { classifyError } from '@/lib/classify-error'
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

// S-01 fix: AI-GENERATED content is built client-side (or server-side then
// returned to the client) and exists in NEITHER the local corpus nor Supabase —
// so resolving by id alone returns null and the exercise froze (silent
// no-advance trap). The client always holds the resolved content it is
// displaying, so it passes that here as a fallback. Resolution by id is still
// tried first (authoritative corpus), so SEED grading is unchanged; this only
// rescues ids that don't resolve. The answer key already ships to the client in
// the session content map, so passing it back leaks nothing new.
export interface GradeableContent {
  norwegian: string
  english: string
  notes?: string
  errorTagsDetectable?: ErrorTag[]
  acceptedAnswers?: string[]
}

export async function gradeAnswer(
  sentenceId: string,
  exerciseType: ExerciseType,
  userAnswer: string,
  fallbackContent?: GradeableContent,
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

  // 3. Generated content rescue: the id resolved nowhere, but the client passed
  // the resolved content it is displaying (S-01). Grade against that. Resolution
  // by id was tried first, so seed/Supabase grading is unchanged.
  const src: GradeableContent | undefined = sentence ?? fallbackContent

  if (!src) {
    // Not in local JSON, not in Supabase, and no fallback content supplied.
    // Return null so callers can drop the result instead of persisting the
    // literal "[unavailable]" placeholder string into recentErrors (F011).
    console.warn(`[gradeAnswer] unknown sentence id and no fallback content: ${sentenceId}`)
    return null
  }

  const correctAnswer = deriveCorrectAnswer(
    exerciseType,
    src.norwegian,
    src.english,
    src.notes,
  )

  const correct = checkAnswerWithAlternatives(
    userAnswer,
    correctAnswer,
    src.acceptedAnswers ?? [],
  )
  return {
    correct,
    correctAnswer,
    // Observed-error tagging: classify the actual diff (biased toward the
    // sentence's authored detectable tags), not just errorTagsDetectable[0].
    errorTag: correct
      ? undefined
      : classifyError(userAnswer, correctAnswer, exerciseType, src.errorTagsDetectable ?? []),
  }
}
