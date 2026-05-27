import { describe, it, expect } from 'vitest'
import {
  getJournalPrompt,
  getDailyPrompt,
  sortErrorsByFocus,
  NORWEGIAN_CONCEPT_LABELS,
  FALLBACK_PROMPTS,
} from '@/lib/journal-prompts'
import type { MistakeFingerprint, ConceptMastery } from '@/types/fingerprint'

function makeMastery(overrides: Partial<ConceptMastery> & { conceptId: string }): ConceptMastery {
  return {
    conceptId: overrides.conceptId,
    rawScore: 50,
    confidenceScore: 0.5,
    decayedScore: 50,
    attemptCount: 10,
    correctCount: 7,
    uniqueDaysActive: 3,
    lastAttemptAt: new Date().toISOString(),
    lastCorrectAt: new Date().toISOString(),
    streak: 2,
    recentOutcomes: [true, true, false, true, true],
    srsLevel: 1,
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
    productionGap: {},
    totalSessionsCompleted: 1,
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

// ── getJournalPrompt ──────────────────────────────────────────────────────────

describe('getJournalPrompt', () => {
  it('returns daily fallback when weeklyFocus is empty', () => {
    const fp = makeFingerprint({ weeklyFocus: [] })
    const now = new Date('2026-05-22T10:00:00Z') // Friday — getDay() === 5 → index 5%5 = 0
    const result = getJournalPrompt(fp, now)
    expect(result.focusConceptId).toBeNull()
    expect(result.focusLabel).toBeNull()
    expect(result.prompt).toBe(FALLBACK_PROMPTS['A1'][0])
  })

  it('returns daily fallback when the live-lowest focus concept has no Norwegian label', () => {
    // Silent English-in-Norwegian prevention. If a focus concept ID isn't in
    // NORWEGIAN_CONCEPT_LABELS, we must NOT render `Skriv en kort tekst der du
    // bruker 'Some English Label' minst tre ganger.` — fall back to daily.
    const fp = makeFingerprint({
      weeklyFocus: ['this-concept-has-no-norwegian-label'],
      conceptMastery: {
        'this-concept-has-no-norwegian-label': makeMastery({
          conceptId: 'this-concept-has-no-norwegian-label',
          decayedScore: 10,
        }),
      },
    })
    const now = new Date('2026-05-22T10:00:00Z')
    const result = getJournalPrompt(fp, now)
    expect(result.focusConceptId).toBeNull()
    expect(result.focusLabel).toBeNull()
    expect(result.prompt).toBe(FALLBACK_PROMPTS['A1'][0])
  })

  it('picks the focus concept with the lowest live decayedScore, not weeklyFocus[0]', () => {
    // weeklyFocus is in selectWeeklyFocus order (weakest-first at week-open),
    // but live decayedScore drifts as the user practises. The function must
    // re-rank live, not trust the array order.
    const fp = makeFingerprint({
      weeklyFocus: ['noun-gender', 'present-tense-regular', 'common-prepositions'],
      conceptMastery: {
        // noun-gender was weakest at open, but the user has practised it up to 80
        'noun-gender': makeMastery({ conceptId: 'noun-gender', decayedScore: 80 }),
        // present-tense-regular is the live-weakest now
        'present-tense-regular': makeMastery({ conceptId: 'present-tense-regular', decayedScore: 25 }),
        'common-prepositions': makeMastery({ conceptId: 'common-prepositions', decayedScore: 60 }),
      },
    })
    const result = getJournalPrompt(fp)
    expect(result.focusConceptId).toBe('present-tense-regular')
    expect(result.focusLabel).toBe('presens av regelmessige verb')
    expect(result.prompt).toContain('presens av regelmessige verb')
    expect(result.prompt).toContain('Skriv 3 setninger')
  })

  it('treats a focus concept with no mastery entry as score 0 (eligible as weakest)', () => {
    // selectWeeklyFocus pulls from existing mastery, so this is mostly an
    // edge case — but if a focus concept is somehow seeded without mastery
    // (e.g. injected via openWeek's zero-snapshot fallback), it should still
    // be a valid candidate and treated as score 0.
    const fp = makeFingerprint({
      weeklyFocus: ['noun-gender', 'present-tense-regular'],
      conceptMastery: {
        'noun-gender': makeMastery({ conceptId: 'noun-gender', decayedScore: 35 }),
        // present-tense-regular has no mastery entry — treated as 0
      },
    })
    const result = getJournalPrompt(fp)
    expect(result.focusConceptId).toBe('present-tense-regular')
  })

  it('uses A2 labels when the focus concept is A2', () => {
    const fp = makeFingerprint({
      weeklyFocus: ['perfect-tense'],
      conceptMastery: {
        'perfect-tense': makeMastery({ conceptId: 'perfect-tense', decayedScore: 20 }),
      },
    })
    const result = getJournalPrompt(fp)
    expect(result.focusConceptId).toBe('perfect-tense')
    expect(result.focusLabel).toBe('presens perfektum (har + partisipp)')
  })

  it('every concept ID in NORWEGIAN_CONCEPT_LABELS is non-empty and Norwegian-flavoured', () => {
    for (const [id, label] of Object.entries(NORWEGIAN_CONCEPT_LABELS)) {
      expect(label.length, `Label for "${id}"`).toBeGreaterThan(0)
      // Soft Norwegian-flavoured guard: rejects obvious English fallthroughs
      // like "Noun gender" or "Personal pronouns" by checking for English
      // capitalisation patterns at word-start. Norwegian labels here are
      // lowercase nouns; English would be Title Case.
      const looksEnglish = /^[A-Z][a-z]+ [A-Z][a-z]+/.test(label)
      expect(looksEnglish, `Label for "${id}" looks English: "${label}"`).toBe(false)
    }
  })
})

// ── getDailyPrompt ────────────────────────────────────────────────────────────

describe('getDailyPrompt', () => {
  it('rotates by day-of-week deterministically', () => {
    // Sunday = 0, Monday = 1, ... Saturday = 6. 5 prompts → index = day % 5.
    const sunday = new Date('2026-05-17T10:00:00Z')   // day 0 → prompt[0]
    const monday = new Date('2026-05-18T10:00:00Z')   // day 1 → prompt[1]
    const friday = new Date('2026-05-22T10:00:00Z')   // day 5 → prompt[0]
    expect(getDailyPrompt(sunday, 'A1')).toBe(FALLBACK_PROMPTS['A1'][0])
    expect(getDailyPrompt(monday, 'A1')).toBe(FALLBACK_PROMPTS['A1'][1])
    expect(getDailyPrompt(friday, 'A1')).toBe(FALLBACK_PROMPTS['A1'][0])
  })
})

// ── sortErrorsByFocus ─────────────────────────────────────────────────────────

interface TestError {
  id: string
  tag: string
}

describe('sortErrorsByFocus', () => {
  it('puts focus errors before non-focus errors', () => {
    const errors: TestError[] = [
      { id: 'a', tag: 'spelling' },
      { id: 'b', tag: 'noun-gender' },
      { id: 'c', tag: 'preposition' },
      { id: 'd', tag: 'noun-gender' },
    ]
    const focusTags = new Set(['noun-gender'])
    const result = sortErrorsByFocus(errors, (e) => focusTags.has(e.tag))
    expect(result.map((e) => e.id)).toEqual(['b', 'd', 'a', 'c'])
  })

  it('preserves original order within the focus partition (stable)', () => {
    const errors: TestError[] = [
      { id: '1', tag: 'F' },
      { id: '2', tag: 'F' },
      { id: '3', tag: 'F' },
      { id: '4', tag: 'X' },
    ]
    const result = sortErrorsByFocus(errors, (e) => e.tag === 'F')
    expect(result.map((e) => e.id)).toEqual(['1', '2', '3', '4'])
  })

  it('preserves original order within the non-focus partition (stable)', () => {
    const errors: TestError[] = [
      { id: '1', tag: 'X' },
      { id: '2', tag: 'Y' },
      { id: '3', tag: 'Z' },
    ]
    const result = sortErrorsByFocus(errors, () => false)
    expect(result.map((e) => e.id)).toEqual(['1', '2', '3'])
  })

  it('returns empty array when input is empty', () => {
    expect(sortErrorsByFocus<TestError>([], () => true)).toEqual([])
  })

  it('handles all-focus and all-non-focus correctly', () => {
    const allFocus: TestError[] = [{ id: '1', tag: 'F' }, { id: '2', tag: 'F' }]
    const allOther: TestError[] = [{ id: '1', tag: 'X' }, { id: '2', tag: 'X' }]
    expect(sortErrorsByFocus(allFocus, () => true).map((e) => e.id)).toEqual(['1', '2'])
    expect(sortErrorsByFocus(allOther, () => false).map((e) => e.id)).toEqual(['1', '2'])
  })
})
