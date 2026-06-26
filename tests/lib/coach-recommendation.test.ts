import { describe, it, expect } from 'vitest'
import { scoreLane } from '@/lib/coach-recommendation'
import type { MistakeFingerprint } from '@/types/fingerprint'
import type { ConceptGraph } from '@/types/concepts'

// P1 (vision audit 2026-06-26): a high-confidence PRODUCTION-focus diagnosis should let the
// coach surface a speaking lane (conversation/roleplay) as the prescribed action on
// production-gap days — but only when the remediation backlog (session gaps) is modest; a big
// backlog still wins the core økt.

const GRAPH: ConceptGraph = { concepts: [], edges: [] }

// 'v2-word-order' is in CONCEPT_TO_TOPIC, so conversation gets the topic-match base (80).
function fp(decayedScore: number): MistakeFingerprint {
  const now = new Date().toISOString()
  return {
    userId: 'u', currentLevel: 'B1', createdAt: now, updatedAt: now,
    diagnosticCompleted: true, sessionsCompleted: 5,
    conceptMastery: {
      'v2-word-order': { conceptId: 'v2-word-order', rawScore: decayedScore, confidenceScore: 0.6, decayedScore, attemptCount: 6, uniqueDaysActive: 3, streak: 0, recentOutcomes: [], nextReviewAt: null, srsLevel: 0, lastAttemptAt: now },
    },
    recentErrors: [], errorPatterns: {}, productionGap: {}, speakingMinutes: 0,
    inputProductionPreference: 'balanced', weeklyFocus: ['v2-word-order'], weekStartedAt: null, weeklySprintHistory: [],
  }
}

describe('scoreLane — production-focus coach steer (P1)', () => {
  it('surfaces a speaking lane above the økt when production-focused AND the backlog is modest', () => {
    const f = fp(78) // small gap → session base ≈ 102
    expect(scoreLane('conversation', f, GRAPH, 'production')).toBeGreaterThan(
      scoreLane('session', f, GRAPH, 'production'),
    )
    expect(scoreLane('roleplay', f, GRAPH, 'application')).toBeGreaterThan(
      scoreLane('session', f, GRAPH, 'application'),
    )
  })

  it('keeps the økt leading when the remediation backlog is large, even under production focus', () => {
    const f = fp(20) // big gap → session base ≈ 160
    expect(scoreLane('session', f, GRAPH, 'production')).toBeGreaterThan(
      scoreLane('conversation', f, GRAPH, 'production'),
    )
  })

  it('does NOT steer without a production focus (session leads)', () => {
    const f = fp(78)
    expect(scoreLane('session', f, GRAPH, undefined)).toBeGreaterThan(
      scoreLane('conversation', f, GRAPH, undefined),
    )
  })

  it('does NOT boost speaking on a recognition focus', () => {
    const f = fp(78)
    expect(scoreLane('conversation', f, GRAPH, 'recognition')).toBe(
      scoreLane('conversation', f, GRAPH, undefined),
    )
  })

  it('boosts written production (journal) less than speaking', () => {
    const f = fp(78)
    const base = scoreLane('journal', f, GRAPH, undefined)
    const boosted = scoreLane('journal', f, GRAPH, 'production')
    expect(boosted).toBeGreaterThan(base)
    // speaking gets the larger boost (+35) than journal (+20)
    const speakBoost = scoreLane('conversation', f, GRAPH, 'production') - scoreLane('conversation', f, GRAPH, undefined)
    const journalBoost = boosted - base
    expect(speakBoost).toBeGreaterThan(journalBoost)
  })
})
