import { describe, it, expect } from 'vitest'
import { deriveAccuracyDisplay } from '@/lib/dashboard-stats'
import type { MistakeFingerprint, ConceptMastery } from '@/types/fingerprint'

function makeMastery(overrides: Partial<ConceptMastery> & { conceptId: string }): ConceptMastery {
  return {
    conceptId: overrides.conceptId,
    rawScore: 50,
    confidenceScore: 0.5,
    decayedScore: 50,
    attemptCount: 0,
    correctCount: 0,
    uniqueDaysActive: 0,
    lastAttemptAt: null,
    lastCorrectAt: null,
    streak: 0,
    recentOutcomes: [],
    srsLevel: 0,
    nextReviewAt: null,
    ...overrides,
  }
}

function makeFingerprint(overrides: Partial<MistakeFingerprint> = {}): MistakeFingerprint {
  return {
    userId: 'test-user',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    currentLevel: 'A1',
    levelSetByUser: false,
    conceptMastery: {},
    recentErrors: [],
    errorPatterns: [],
    vocabularyMastery: {},
    productionGap: {},
    totalSessionsCompleted: 0,
    calibrationSessionsRemaining: 0,
    lastSessionAt: null,
    speakingMinutesTotal: 0,
    inputProductionPreference: 'balanced',
    lastRecalibrationAt: null,
    askedDiagnosticQuestionIds: [],
    weeklyFocus: [],
    weekStartedAt: null,
    weeklySprintHistory: [],
    weekStartSnapshots: {},
    ...overrides,
  }
}

describe('deriveAccuracyDisplay', () => {
  it('returns — for a null/undefined fingerprint', () => {
    expect(deriveAccuracyDisplay(null)).toBe('—')
    expect(deriveAccuracyDisplay(undefined)).toBe('—')
  })

  it('returns — for a fresh guest with seeded-but-unattempted concepts', () => {
    // seedInitialMastery seeds rawScore/decayedScore 50 with attemptCount 0.
    const fp = makeFingerprint({
      totalSessionsCompleted: 0,
      conceptMastery: {
        'a1-pronouns': makeMastery({ conceptId: 'a1-pronouns', decayedScore: 50, attemptCount: 0 }),
        'a1-present-tense': makeMastery({ conceptId: 'a1-present-tense', decayedScore: 50, attemptCount: 0 }),
      },
    })
    expect(deriveAccuracyDisplay(fp)).toBe('—')
  })

  // F018 + F020 LOCK: the diagnostic leaves in-memory concept attempts
  // (attemptCount > 0) but increments NO session. The old gate showed a number
  // here (e.g. "43%") that then vanished to "—" on refresh. Gating on a real
  // completed session must render "—" in this state — consistently.
  it('returns — when concepts have in-memory attempts but no session is completed (F018/F020)', () => {
    const fp = makeFingerprint({
      totalSessionsCompleted: 0,
      conceptMastery: {
        'a1-pronouns': makeMastery({ conceptId: 'a1-pronouns', decayedScore: 43, attemptCount: 4 }),
        'a1-present-tense': makeMastery({ conceptId: 'a1-present-tense', decayedScore: 43, attemptCount: 3 }),
      },
    })
    expect(deriveAccuracyDisplay(fp)).toBe('—')
  })

  it('shows the rounded average accuracy once a real session is completed', () => {
    const fp = makeFingerprint({
      totalSessionsCompleted: 1,
      conceptMastery: {
        'a1-pronouns': makeMastery({ conceptId: 'a1-pronouns', decayedScore: 40, attemptCount: 5 }),
        'a1-present-tense': makeMastery({ conceptId: 'a1-present-tense', decayedScore: 46, attemptCount: 5 }),
      },
    })
    expect(deriveAccuracyDisplay(fp)).toBe('43%')
  })

  it('averages only attempted concepts, ignoring seeded-but-unattempted ones', () => {
    const fp = makeFingerprint({
      totalSessionsCompleted: 2,
      conceptMastery: {
        practiced: makeMastery({ conceptId: 'practiced', decayedScore: 80, attemptCount: 6 }),
        seededOnly: makeMastery({ conceptId: 'seededOnly', decayedScore: 50, attemptCount: 0 }),
      },
    })
    expect(deriveAccuracyDisplay(fp)).toBe('80%')
  })

  it('returns — for a legacy fingerprint missing totalSessionsCompleted', () => {
    // Returning-user read safety: a field-missing legacy blob must not throw and
    // must not claim accuracy. `?? 0` → "—".
    const fp = makeFingerprint({
      conceptMastery: {
        'a1-pronouns': makeMastery({ conceptId: 'a1-pronouns', decayedScore: 60, attemptCount: 4 }),
      },
    })
    // Simulate a legacy blob where the counter was never persisted.
    delete (fp as Partial<MistakeFingerprint>).totalSessionsCompleted
    expect(deriveAccuracyDisplay(fp)).toBe('—')
  })
})
