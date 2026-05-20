import type { ExerciseType } from '@/types/session'

// Pure utility — no server-only imports. Extracted so it can be unit-tested
// independently of the 'use server' gradeAnswer action.
export function deriveCorrectAnswer(
  exerciseType: ExerciseType,
  norwegian: string,
  english: string,
  notes: string | undefined,
): string {
  switch (exerciseType) {
    case 'translation-to-norwegian':
    case 'word-order':
    case 'listening-comprehension':
    case 'dictation':
      return norwegian
    case 'translation-to-english':
    case 'sentence-transformation': // renders as "Oversett til engelsk" → expects English output
    case 'speed-round':
      return english
    case 'fill-in-blank':
      return notes ?? ''
    default:
      return norwegian
  }
}
