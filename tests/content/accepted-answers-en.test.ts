import { describe, it, expect } from 'vitest'
import { loadContentSentences } from '@/lib/content-loader'
import { checkAnswerWithAlternatives } from '@/lib/answer'

// Option B (translate-to-English accepted_answers, VC §3.1). Traces the content
// write end-to-end (Rule 8): a hand-authored English paraphrase must reach the
// grader via the loader's snake_case→camelCase map and grade CORRECT, while a
// wrong-meaning answer still grades wrong.
describe('Option B — hand-authored English accepted_answers feed the grader', () => {
  const { sentences } = loadContentSentences()
  const s = Object.values(sentences).find((x) => x.english === 'There are seven days in a week.')

  it('the batch sentence loaded with its acceptedAnswers (loader maps accepted_answers)', () => {
    expect(s).toBeTruthy()
    expect(s!.acceptedAnswers).toContain('A week has seven days')
  })

  it('a hand-authored paraphrase now grades CORRECT', () => {
    expect(checkAnswerWithAlternatives('A week has seven days', s!.english, s!.acceptedAnswers ?? [])).toBe(true)
  })

  it('GUARD: a wrong-meaning answer still grades wrong (no false-positive)', () => {
    expect(checkAnswerWithAlternatives('There are six days in a week', s!.english, s!.acceptedAnswers ?? [])).toBe(false)
  })
})
