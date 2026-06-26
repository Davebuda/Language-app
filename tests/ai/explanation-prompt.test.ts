import { describe, it, expect } from 'vitest'
import { buildExplanationPrompt } from '@/ai/prompts'
import type { ExplainParams } from '@/ai/types'

// Tier-2 Slice C — the repair explanation in Kari's voice. The rewrite must adopt the
// consistent Kari persona WITHOUT losing the precision that makes a correction
// explanation trustworthy: quote the mistake, name the rule, stay short, switch
// explanation language by level, and never claim mastery (it explains a known-correct
// deterministic correction — DISPLAY-ONLY, it never moves mastery).

function params(over: Partial<ExplainParams> = {}): ExplainParams {
  return { wrong: 'jeg er trøtt i dag', correct: 'i dag er jeg trøtt', errorTag: 'word-order', conceptId: 'v2-word-order', level: 'B1', ...over }
}

describe('buildExplanationPrompt — Kari-voiced repair explanation (Tier-2 Slice C)', () => {
  it('uses the Kari persona but keeps the precision rules + honesty guard', () => {
    const { system } = buildExplanationPrompt(params())
    expect(system).toMatch(/You are Kari/i)
    expect(system).toMatch(/quote their exact answer/i)
    expect(system).toMatch(/name the rule/i)
    expect(system).toMatch(/under 4 sentences/i)
    expect(system).toMatch(/Never claim the learner has mastered/i)
  })

  it('switches explanation language by level (B1/B2 Norwegian, A1/A2 English)', () => {
    expect(buildExplanationPrompt(params({ level: 'B1' })).system).toMatch(/Explanation language: Norwegian/)
    expect(buildExplanationPrompt(params({ level: 'B2' })).system).toMatch(/Explanation language: Norwegian/)
    expect(buildExplanationPrompt(params({ level: 'A1' })).system).toMatch(/Explanation language: English/)
    expect(buildExplanationPrompt(params({ level: 'A2' })).system).toMatch(/Explanation language: English/)
  })

  it('passes the learner mistake + the verified correct answer through to be quoted', () => {
    const { user } = buildExplanationPrompt(params({ wrong: 'en hus', correct: 'et hus' }))
    expect(user).toContain('en hus')
    expect(user).toContain('et hus')
  })

  it('surfaces the repeat-error history only when the count is > 2', () => {
    expect(buildExplanationPrompt(params({ errorCount: 4 })).user).toMatch(/hit this error 4 times/i)
    expect(buildExplanationPrompt(params({ errorCount: 1 })).user).not.toMatch(/hit this error/i)
  })
})
