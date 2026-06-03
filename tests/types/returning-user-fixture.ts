import { createEmptyFingerprint } from '@/types/fingerprint'
import type { MistakeFingerprint, ConceptMastery } from '@/types/fingerprint'
import { getGraphForLevel } from '@/lib/concept-graph-loader'

/**
 * A "returning user" whose fingerprint was persisted by an OLDER schema:
 *  - several top-level fields the current code reads are ABSENT (the loader's
 *    normalizeFingerprint must backfill them), and
 *  - a nested weeklySprintHistory record predates `focusOutcomes` (the exact
 *    shape that crashed /progress on 2026-06-03).
 * It is also POPULATED with real mastery + history + a week snapshot so the
 * read-path math actually runs — this is the fixture that locks the crash/
 * honesty class: every read surface must survive it.
 *
 * Intentionally returns a partial blob cast to MistakeFingerprint — that IS the
 * shape a pre-migration persisted record has on load.
 */
export function makeReturningUserFingerprint(): MistakeFingerprint {
  const graph = getGraphForLevel('B1')
  const [c1, c2, c3] = graph.concepts.map((c) => c.id)

  const mastery = (id: string, over: Partial<ConceptMastery> = {}): ConceptMastery => ({
    conceptId: id,
    rawScore: 62,
    confidenceScore: 0.7,
    decayedScore: 48,
    attemptCount: 12,
    correctCount: 8,
    uniqueDaysActive: 4,
    lastAttemptAt: '2026-05-20T00:00:00Z',
    lastCorrectAt: '2026-05-20T00:00:00Z',
    streak: 2,
    recentOutcomes: [true, false, true, true, true],
    srsLevel: 2,
    nextReviewAt: '2026-06-10T00:00:00Z',
    ...over,
  })

  const legacy = {
    ...createEmptyFingerprint('returning-user'),
    currentLevel: 'B1',
    conceptMastery: {
      [c1]: mastery(c1),
      [c2]: mastery(c2, { decayedScore: 39 }),
      [c3]: mastery(c3),
    },
    weeklyFocus: [c1, c2, c3],
    weekStartSnapshots: {
      [c1]: { rawScore: 60, decayedScore: 55, attemptCount: 6 },
    },
    weeklySprintHistory: [
      // Legacy record: NO focusOutcomes — the field that crashed /progress.
      {
        weekStartedAt: '2026-05-12',
        weekEndedAt: '2026-05-19',
        focus: [c1],
        status: 'completed',
        checkResult: { takenAt: '2026-05-18T00:00:00Z', score: 80, items: 6 },
      },
    ],
  } as Record<string, unknown>

  // The pre-migration persisted shape simply lacked these keys.
  delete legacy.dailyProgress
  delete legacy.productionGap
  delete legacy.vocabularyMastery
  delete legacy.speakingMinutesTotal
  delete legacy.passedSentenceIds

  return legacy as unknown as MistakeFingerprint
}

/**
 * A returning user with a ConceptMastery ROW that predates `decayedScore`/
 * `rawScore`: the row is PRESENT (so `if (!mastery) continue` existence guards
 * pass) but these numeric fields are ABSENT. normalizeFingerprint deliberately
 * does NOT backfill ConceptMastery row fields, so an unguarded reader doing
 * `Math.round(row.decayedScore)` or `a.decayedScore - b.decayedScore` produces
 * NaN. This fixture is the lock that forces every decayedScore reader to guard
 * the field (returning-user read-safety contract, Operating Rule 3).
 *
 * `totalSessionsCompleted > 0` and `attemptCount > 0` so the dashboard accuracy
 * tile actually reaches the averaging math instead of short-circuiting to "—".
 */
export function makeFingerprintWithLegacyMasteryRow(): MistakeFingerprint {
  const graph = getGraphForLevel('B1')
  const [c1, c2, c3] = graph.concepts.map((c) => c.id)

  const legacyRow = {
    conceptId: c1,
    confidenceScore: 0.6,
    attemptCount: 8,
    correctCount: 5,
    uniqueDaysActive: 3,
    lastAttemptAt: '2026-05-20T00:00:00Z',
    lastCorrectAt: '2026-05-20T00:00:00Z',
    streak: 1,
    recentOutcomes: [true, false, true],
    srsLevel: 1,
    // decayedScore, rawScore, and nextReviewAt INTENTIONALLY absent — this is the
    // legacy shape (predates both the decayedScore and the SRS-schedule fields).
  } as unknown as ConceptMastery

  const fullRow = (id: string): ConceptMastery => ({
    conceptId: id,
    rawScore: 55,
    confidenceScore: 0.6,
    decayedScore: 50,
    attemptCount: 6,
    correctCount: 4,
    uniqueDaysActive: 3,
    lastAttemptAt: '2026-05-20T00:00:00Z',
    lastCorrectAt: '2026-05-20T00:00:00Z',
    streak: 1,
    recentOutcomes: [true, true, false],
    srsLevel: 1,
    nextReviewAt: '2026-06-10T00:00:00Z',
  })

  return {
    ...createEmptyFingerprint('returning-user-legacy-row'),
    currentLevel: 'B1',
    totalSessionsCompleted: 3,
    conceptMastery: {
      [c1]: legacyRow,
      [c2]: fullRow(c2),
      [c3]: fullRow(c3),
    },
    weeklyFocus: [c1, c2, c3],
  } as MistakeFingerprint
}
