import { describe, it, expect } from 'vitest'
import { gradeAnswer } from '@/app/session/actions'

// S-01 (audit 2026-06-22): AI-generated content exists in neither the local
// corpus nor Supabase, so resolving by id returned null and the exercise froze
// (silent no-advance trap). The client now passes the resolved content it holds
// as a fallback. These lock that: generated content grades; the F011 null guard
// is preserved when there is genuinely nothing to grade against.

describe('gradeAnswer — generated-content fallback (S-01)', () => {
  it('grades AI-generated content via fallback when the id resolves nowhere', async () => {
    const res = await gradeAnswer(
      'gen-not-in-corpus-xyz',
      'translation-to-english',
      'the house',
      { norwegian: 'huset', english: 'the house', errorTagsDetectable: [], acceptedAnswers: [] },
    )
    expect(res).not.toBeNull()
    expect(res?.correct).toBe(true)
    expect(res?.correctAnswer).toBe('the house')
  })

  it('marks a wrong answer on generated content wrong (not a free pass)', async () => {
    const res = await gradeAnswer(
      'gen-not-in-corpus-abc',
      'translation-to-english',
      'the car',
      { norwegian: 'huset', english: 'the house', errorTagsDetectable: [], acceptedAnswers: [] },
    )
    expect(res?.correct).toBe(false)
  })

  it('preserves the F011 null guard when id is unresolvable AND no fallback is supplied', async () => {
    const res = await gradeAnswer('gen-none-xyz', 'translation-to-english', 'x')
    expect(res).toBeNull()
  })
})
