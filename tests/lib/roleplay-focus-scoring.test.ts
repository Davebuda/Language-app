import { describe, it, expect } from 'vitest'
import { scoreFocusOverlap, rankScenariosByFocusOverlap } from '@/lib/roleplay-focus-scoring'
import { ROLEPLAY_SCENARIOS } from '@/lib/roleplayContent'

describe('scoreFocusOverlap', () => {
  it('returns 0 when weeklyFocus is empty', () => {
    expect(scoreFocusOverlap(ROLEPLAY_SCENARIOS[0], [])).toBe(0)
  })

  it('counts unique matching concepts', () => {
    // 'kaffe' scenario has: common-modal-verbs, basic-adjectives, personal-pronouns, to-have-verb
    const score = scoreFocusOverlap(ROLEPLAY_SCENARIOS[0], ['common-modal-verbs', 'personal-pronouns'])
    expect(score).toBe(2)
  })

  it('deduplicates repeated concepts in turns', () => {
    // 'introduksjon' has common-prepositions in turns 'from' AND 'work'
    const score = scoreFocusOverlap(ROLEPLAY_SCENARIOS[2], ['common-prepositions'])
    expect(score).toBe(1) // counted once, not twice
  })

  it('returns 0 when no concepts match', () => {
    expect(scoreFocusOverlap(ROLEPLAY_SCENARIOS[0], ['perfect-tense', 'passive-voice'])).toBe(0)
  })
})

describe('rankScenariosByFocusOverlap', () => {
  it('returns original order when weeklyFocus is empty', () => {
    const ranked = rankScenariosByFocusOverlap(ROLEPLAY_SCENARIOS, [])
    expect(ranked.map(s => s.id)).toEqual(ROLEPLAY_SCENARIOS.map(s => s.id))
  })

  it('puts scenario with highest overlap first', () => {
    // 'veibeskrivelse' has question-formation + common-prepositions
    // 'introduksjon' has common-prepositions (2 turns) + common-modal-verbs + personal-pronouns
    const ranked = rankScenariosByFocusOverlap(ROLEPLAY_SCENARIOS, ['common-prepositions', 'personal-pronouns'])
    // introduksjon has 2 matching unique concepts, veibeskrivelse has 1
    expect(ranked[0].id).toBe('introduksjon')
  })

  it('preserves original order for equal overlap (stable)', () => {
    // Focus on to-have-verb — present in kaffe AND veibeskrivelse
    const ranked = rankScenariosByFocusOverlap(ROLEPLAY_SCENARIOS, ['to-have-verb'])
    const haveTwoIds = ranked.filter(s => scoreFocusOverlap(s, ['to-have-verb']) === 1).map(s => s.id)
    // Both kaffe and veibeskrivelse have to-have-verb; kaffe was first originally
    expect(haveTwoIds[0]).toBe('kaffe')
    expect(haveTwoIds[1]).toBe('veibeskrivelse')
  })

  it('does not mutate the original array', () => {
    const original = [...ROLEPLAY_SCENARIOS]
    rankScenariosByFocusOverlap(ROLEPLAY_SCENARIOS, ['common-prepositions'])
    expect(ROLEPLAY_SCENARIOS.map(s => s.id)).toEqual(original.map(s => s.id))
  })
})
