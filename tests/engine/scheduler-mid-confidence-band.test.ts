import { describe, it, expect } from 'vitest'
import { generateSession } from '@/engine/scheduler'
import type { SchedulerInput } from '@/engine/scheduler'
import type { MistakeFingerprint, ErrorLogEntry } from '@/types/fingerprint'
import type { ConceptGraph } from '@/types/concepts'
import type { Sentence } from '@/types/content'

// P2 (vision audit 2026-06-26, Lane 1): the MID-confidence steer band. A diagnosis with
// confidence in [0.55, 0.7) — e.g. a single-class pattern at exactly 2 occurrences (→0.6) —
// is real but less certain, so it steers ONLY the moat-safe pools (snakk + new-material)
// and NEVER remediation / review / SRS-due. >=0.7 still drives everything (FULL band).
//
// Harness: N modal-verb errors → the single-class rule names `common-modal-verbs` (0 attempts,
// so only the steer can place it). 2 errors → 0.6 (mid); 3 → 0.7 (full).

function makeGraph(ids: string[]): ConceptGraph {
  return {
    concepts: ids.map((id) => ({
      id, label: id, cefrLevel: 'B1', prerequisites: [],
      masteryThreshold: 70, minAttempts: 3, minDays: 1, primaryErrorTag: 'modal-verb' as const,
    })),
    edges: [],
  }
}
function sentence(id: string, conceptId: string, exerciseTypes: Sentence['exerciseTypes'] = ['translation-to-norwegian', 'fill-in-blank']): Sentence {
  return {
    id, norwegian: `Norsk ${id}.`, english: `English ${id}.`,
    conceptIds: [conceptId], vocabularyClusters: [], errorTagsDetectable: ['modal-verb'],
    cefrLevel: 'B1', difficulty: 1, exerciseTypes,
  }
}
function err(i: number): ErrorLogEntry {
  return { id: `e${i}`, conceptId: 'x', errorTag: 'modal-verb', exerciseType: 'translation-to-norwegian', wrong: 'a', correct: 'b', timestamp: new Date().toISOString() }
}
const PAST = new Date(Date.now() - 5 * 86_400_000).toISOString()

function makeInput(modalErrorCount: number): SchedulerInput {
  const now = new Date().toISOString()
  const recentErrors = Array.from({ length: modalErrorCount }, (_, i) => err(i))
  const fingerprint: MistakeFingerprint = {
    userId: 'u', currentLevel: 'B1', createdAt: now, updatedAt: now,
    diagnosticCompleted: true, sessionsCompleted: 4,
    conceptMastery: {
      'weak-a': { conceptId: 'weak-a', rawScore: 35, confidenceScore: 0.5, decayedScore: 35, attemptCount: 8, uniqueDaysActive: 2, streak: 0, recentOutcomes: [false], nextReviewAt: null, srsLevel: 0, lastAttemptAt: now },
      // common-modal-verbs: 0 attempts → never weak; only the diagnosis steer can place it.
      'common-modal-verbs': { conceptId: 'common-modal-verbs', rawScore: 80, confidenceScore: 0.6, decayedScore: 80, attemptCount: 0, uniqueDaysActive: 0, streak: 0, recentOutcomes: [], nextReviewAt: null, srsLevel: 0, lastAttemptAt: now },
      'srs-due-z': { conceptId: 'srs-due-z', rawScore: 60, confidenceScore: 0.6, decayedScore: 60, attemptCount: 5, uniqueDaysActive: 3, streak: 1, recentOutcomes: [true], nextReviewAt: PAST, srsLevel: 1, lastAttemptAt: PAST },
    },
    recentErrors, errorPatterns: {}, productionGap: {}, speakingMinutes: 0,
    inputProductionPreference: 'balanced', weeklyFocus: [], weekStartedAt: null, weeklySprintHistory: [],
  }
  return {
    fingerprint, graph: makeGraph(['weak-a', 'common-modal-verbs', 'srs-due-z']),
    sentences: {
      sa: sentence('sa', 'weak-a'),
      sm: sentence('sm', 'common-modal-verbs'),
      sz: sentence('sz', 'srs-due-z', ['translation-to-english', 'translation-to-norwegian']),
    },
    availableSentenceIds: { 'weak-a': ['sa'], 'common-modal-verbs': ['sm'], 'srs-due-z': ['sz'] },
  }
}

function snakkRootCause(blocks: ReturnType<typeof generateSession>['blocks']): Set<string> {
  const snakk = blocks.find((b) => b.type === 'snakk')
  return new Set((snakk?.items ?? []).filter((i) => i.selectionReason === 'root_cause').flatMap((i) => i.conceptIds))
}
function larRootCause(blocks: ReturnType<typeof generateSession>['blocks']): Set<string> {
  const lar = blocks.find((b) => b.type === 'lær')
  return new Set((lar?.items ?? []).filter((i) => i.selectionReason === 'root_cause').flatMap((i) => i.conceptIds))
}
function reviewConcepts(blocks: ReturnType<typeof generateSession>['blocks']): Set<string> {
  const lar = blocks.find((b) => b.type === 'lær')
  return new Set((lar?.items ?? []).filter((i) => i.purpose === 'review').flatMap((i) => i.conceptIds))
}

describe('scheduler — mid-confidence steer band (P2)', () => {
  it('0.6 diagnosis steers SNAKK (root-cause lead + label) but NOT remediation', () => {
    const { blocks, diagnosisResults } = generateSession(makeInput(2))
    expect(diagnosisResults[0].rootCauseConceptId).toBe('common-modal-verbs')
    expect(diagnosisResults[0].confidence).toBe(0.6)
    // SAFE band (>=0.55) → snakk leads with + labels the root cause.
    expect(snakkRootCause(blocks).has('common-modal-verbs')).toBe(true)
    // FULL band (>=0.7) NOT reached → remediation is NOT steered (no root_cause label there).
    expect(larRootCause(blocks).has('common-modal-verbs')).toBe(false)
    expect(larRootCause(blocks).size).toBe(0)
  })

  it('0.7 diagnosis (3 errors) DOES steer remediation too (FULL band)', () => {
    const { blocks, diagnosisResults } = generateSession(makeInput(3))
    expect(diagnosisResults[0].confidence).toBe(0.7)
    expect(larRootCause(blocks).has('common-modal-verbs')).toBe(true)
    expect(snakkRootCause(blocks).has('common-modal-verbs')).toBe(true)
  })

  it('keeps review diagnosis-agnostic under the mid band (the locked boundary)', () => {
    // srs-due-z (SRS-due, unrelated to the modal diagnosis) still schedules in review.
    expect(reviewConcepts(generateSession(makeInput(2)).blocks).has('srs-due-z')).toBe(true)
    expect(reviewConcepts(generateSession(makeInput(3)).blocks).has('srs-due-z')).toBe(true)
  })
})
