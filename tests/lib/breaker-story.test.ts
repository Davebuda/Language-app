import { describe, it, expect } from 'vitest'
import { deriveBreakerStory } from '@/lib/breaker-story'
import type { MistakeFingerprint } from '@/types/fingerprint'
import type { ConceptNode } from '@/types/concepts'

const NOW = Date.parse('2026-06-22T12:00:00Z')
const DAY = 24 * 60 * 60 * 1000
const at = (daysAgo: number) => new Date(NOW - daysAgo * DAY).toISOString()

function node(id: string, label: string): ConceptNode {
  return { id, label, cefrLevel: 'A1', prerequisites: [], masteryThreshold: 70, minAttempts: 3, minDays: 1, primaryErrorTag: 'noun-gender' } as ConceptNode
}

function err(conceptId: string, daysAgo: number, i: number) {
  return { id: `e${conceptId}${i}`, conceptId, errorTag: 'noun-gender' as const, exerciseType: 'translation-to-norwegian' as const, wrong: 'a', correct: 'b', timestamp: at(daysAgo) }
}

function fp(recentErrors: ReturnType<typeof err>[], mastery: Record<string, Partial<{ rawScore: number; decayedScore: number; attemptCount: number; uniqueDaysActive: number; confidenceScore: number }>>): MistakeFingerprint {
  const conceptMastery: MistakeFingerprint['conceptMastery'] = {}
  for (const [id, m] of Object.entries(mastery)) {
    conceptMastery[id] = { conceptId: id, rawScore: m.rawScore ?? 0, confidenceScore: m.confidenceScore ?? 0.5, decayedScore: m.decayedScore ?? 0, attemptCount: m.attemptCount ?? 0, correctCount: 0, uniqueDaysActive: m.uniqueDaysActive ?? 0, lastAttemptAt: at(1), lastCorrectAt: null, streak: 0, recentOutcomes: [], srsLevel: 0, nextReviewAt: null }
  }
  return {
    userId: 'u', currentLevel: 'A1', createdAt: at(30), updatedAt: at(0), diagnosticCompleted: true,
    sessionsCompleted: 5, conceptMastery, recentErrors, errorPatterns: [], productionGap: {},
    speakingMinutes: 0, inputProductionPreference: 'balanced', weeklyFocus: [], weekStartedAt: null, weeklySprintHistory: [],
  } as MistakeFingerprint
}

const concepts = [node('noun-gender', 'Substantivets kjønn'), node('word-order', 'Ordstilling'), node('negation', 'Nektelse')]

describe('deriveBreakerStory — honest breaker narrative (T1.3)', () => {
  it('marks an improving breaker "down" only when there is prior-week data', () => {
    const errors = [err('noun-gender', 1, 1), err('noun-gender', 2, 2), err('noun-gender', 10, 3), err('noun-gender', 11, 4), err('noun-gender', 12, 5)]
    const story = deriveBreakerStory(fp(errors, { 'noun-gender': { rawScore: 40, decayedScore: 40, attemptCount: 6, uniqueDaysActive: 3 } }), concepts, NOW)
    const ng = story.active.find((r) => r.conceptId === 'noun-gender')!
    expect(ng.trend).toBe('down') // 2 this week < 3 prior week
    expect(ng.thisWeek).toBe(2)
    expect(ng.priorWeek).toBe(3)
  })

  it('labels a first-week breaker "new", never "down" (no fabricated improvement)', () => {
    const errors = [err('word-order', 1, 1), err('word-order', 2, 2), err('word-order', 3, 3)]
    const story = deriveBreakerStory(fp(errors, { 'word-order': { rawScore: 30, decayedScore: 30, attemptCount: 4, uniqueDaysActive: 2 } }), concepts, NOW)
    const wo = story.active.find((r) => r.conceptId === 'word-order')!
    expect(wo.trend).toBe('new')
  })

  it('retires a breaker only when it WAS a real breaker AND is now mastered AND quiet this week', () => {
    const errors = [err('negation', 10, 1), err('negation', 11, 2)] // 2 errors, all prior week, none this week
    const story = deriveBreakerStory(fp(errors, { negation: { rawScore: 88, decayedScore: 88, attemptCount: 8, uniqueDaysActive: 4, confidenceScore: 0.85 } }), concepts, NOW)
    expect(story.retired.map((r) => r.conceptId)).toContain('negation')
    expect(story.active.map((r) => r.conceptId)).not.toContain('negation')
  })

  it('does NOT retire a mastered concept that is still erroring this week', () => {
    const errors = [err('negation', 1, 1), err('negation', 2, 2)] // mastered but erroring THIS week
    const story = deriveBreakerStory(fp(errors, { negation: { rawScore: 88, decayedScore: 88, attemptCount: 8, uniqueDaysActive: 4, confidenceScore: 0.85 } }), concepts, NOW)
    expect(story.active.map((r) => r.conceptId)).toContain('negation')
    expect(story.retired).toHaveLength(0)
  })

  it('empty error log → no fabricated breakers', () => {
    const story = deriveBreakerStory(fp([], {}), concepts, NOW)
    expect(story.active).toHaveLength(0)
    expect(story.retired).toHaveLength(0)
  })
})
