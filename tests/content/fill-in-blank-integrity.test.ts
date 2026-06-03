/**
 * Fix 4 (audit 2026-06-03): fill-in-blank integrity guard.
 *
 * FillInBlankExercise reads `sentence.notes` as the correct answer
 * (FillInBlankExercise.tsx: `const correctAnswer = sentence.notes ?? ''`).
 * If notes is empty, the exercise becomes UNPASSABLE: the MultipleChoice path
 * collapses to null (no correct option) and the FreeText path requires the user
 * to submit the empty string. The grader is correct GIVEN populated notes — so
 * the honest fix is to make an empty-notes fill-in-blank sentence a CI failure
 * at authoring time rather than a silent in-session dead end.
 */
import { describe, it, expect } from 'vitest'
import { loadContentSentences } from '@/lib/content-loader'

describe('fill-in-blank content integrity', () => {
  const { sentences } = loadContentSentences()
  const fillInBlank = Object.values(sentences).filter((s) =>
    s.exerciseTypes.includes('fill-in-blank'),
  )

  it('the corpus actually contains fill-in-blank sentences (no vacuous pass)', () => {
    expect(fillInBlank.length).toBeGreaterThan(0)
  })

  it('every fill-in-blank sentence has a non-empty notes field (the blank answer)', () => {
    const offenders = fillInBlank
      .filter((s) => !s.notes || s.notes.trim().length === 0)
      .map((s) => s.id)
    expect(
      offenders,
      `fill-in-blank sentences with empty notes (unpassable): ${offenders.join(', ')}`,
    ).toEqual([])
  })

  it('every fill-in-blank sentence contains a blank marker (___)', () => {
    // extractBlank splits sentence.norwegian on /_+/; without a marker the UI
    // renders no gap and the exercise cannot be answered.
    const offenders = fillInBlank
      .filter((s) => !/_+/.test(s.norwegian))
      .map((s) => s.id)
    expect(
      offenders,
      `fill-in-blank sentences with no blank marker: ${offenders.join(', ')}`,
    ).toEqual([])
  })
})
