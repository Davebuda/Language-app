import { describe, it, expect } from 'vitest'
import { generateSession, resolveNewMaterialFocus } from '@/engine/scheduler'
import type { SchedulerInput } from '@/engine/scheduler'
import type { MistakeFingerprint, ErrorLogEntry } from '@/types/fingerprint'
import type { ConceptGraph } from '@/types/concepts'
import type { Sentence } from '@/types/content'

// Plan C (T1.6, moat-safe scope): a high-confidence diagnosis now steers the
// PRODUCTION-facing pools it previously didn't —
//   ① the Snakk (speaking) block leads with the diagnosed root cause, and
//   ② new-material modality tilts toward the diagnosis focus (with a cold-start guard).
// The hard invariant: review / SRS-due stay diagnosis-AGNOSTIC (the SRS ladder must
// not be tilted by today's diagnosis). The boundary test below is the locked guard.
//
// Harness mirrors scheduler-diagnosis-steer.test.ts: rule 1 ("article + adjective
// errors → noun-gender") fires at confidence >=0.7 and names `noun-gender`, a concept
// with ZERO attempts so it never surfaces via decayedScore — only the diagnosis steer
// can place it. (speaking-production content-eligibility reuses translation-to-norwegian,
// so these sentences already qualify for the Snakk block.)

function makeGraph(conceptIds: string[]): ConceptGraph {
  return {
    concepts: conceptIds.map((id) => ({
      id, label: id, cefrLevel: 'A1', prerequisites: [],
      masteryThreshold: 70, minAttempts: 3, minDays: 1, primaryErrorTag: 'noun-gender' as const,
    })),
    edges: [],
  }
}

function sentence(
  id: string,
  conceptId: string,
  exerciseTypes: Sentence['exerciseTypes'] = ['translation-to-norwegian', 'fill-in-blank'],
): Sentence {
  return {
    id, norwegian: `Norsk ${id}.`, english: `English ${id}.`,
    conceptIds: [conceptId], vocabularyClusters: [], errorTagsDetectable: ['noun-gender'],
    cefrLevel: 'A1', difficulty: 1,
    exerciseTypes,
  }
}

function err(tag: ErrorLogEntry['errorTag'], i: number): ErrorLogEntry {
  return {
    id: `e${i}`, conceptId: 'x', errorTag: tag, exerciseType: 'translation-to-norwegian',
    wrong: 'a', correct: 'b', timestamp: new Date().toISOString(),
  }
}

const PAST = new Date(Date.now() - 5 * 86_400_000).toISOString()

function makeInput(recentErrors: ErrorLogEntry[]): SchedulerInput {
  const conceptIds = ['weak-a', 'weak-b', 'noun-gender', 'srs-due-z']
  const sentences: Record<string, Sentence> = {
    sa: sentence('sa', 'weak-a'),
    sb: sentence('sb', 'weak-b'),
    sg: sentence('sg', 'noun-gender'),
    // srs-due-z needs a RECOGNITION-gradable sentence so the review pool (REVIEW_EXERCISES
    // = recognition types) can actually schedule it.
    sz: sentence('sz', 'srs-due-z', ['translation-to-english', 'translation-to-norwegian']),
  }
  const now = new Date().toISOString()
  const fingerprint: MistakeFingerprint = {
    userId: 'u', currentLevel: 'A1',
    createdAt: now, updatedAt: now,
    diagnosticCompleted: true, sessionsCompleted: 3,
    conceptMastery: {
      'weak-a': { conceptId: 'weak-a', rawScore: 35, confidenceScore: 0.5, decayedScore: 35, attemptCount: 8, uniqueDaysActive: 2, streak: 0, recentOutcomes: [false], nextReviewAt: null, srsLevel: 0, lastAttemptAt: now },
      'weak-b': { conceptId: 'weak-b', rawScore: 38, confidenceScore: 0.5, decayedScore: 38, attemptCount: 8, uniqueDaysActive: 2, streak: 0, recentOutcomes: [false], nextReviewAt: null, srsLevel: 0, lastAttemptAt: now },
      // noun-gender: NO attempts → never in weakConcepts; only the diagnosis steer can place it.
      'noun-gender': { conceptId: 'noun-gender', rawScore: 80, confidenceScore: 0.6, decayedScore: 80, attemptCount: 0, uniqueDaysActive: 0, streak: 0, recentOutcomes: [], nextReviewAt: null, srsLevel: 0, lastAttemptAt: now },
      // srs-due-z: UNRELATED to the diagnosis, but SRS-due (nextReviewAt in the past) →
      // must still schedule in REVIEW regardless of today's diagnosis (the boundary).
      'srs-due-z': { conceptId: 'srs-due-z', rawScore: 60, confidenceScore: 0.6, decayedScore: 60, attemptCount: 5, uniqueDaysActive: 3, streak: 1, recentOutcomes: [true], nextReviewAt: PAST, srsLevel: 1, lastAttemptAt: PAST },
    },
    recentErrors, errorPatterns: {}, productionGap: {}, speakingMinutes: 0,
    inputProductionPreference: 'balanced', weeklyFocus: [], weekStartedAt: null, weeklySprintHistory: [],
  }
  return {
    fingerprint, graph: makeGraph(conceptIds), sentences,
    availableSentenceIds: { 'weak-a': ['sa'], 'weak-b': ['sb'], 'noun-gender': ['sg'], 'srs-due-z': ['sz'] },
  }
}

const SIGNATURE = [
  err('article-use', 1), err('article-use', 2), err('article-use', 3),
  err('adjective-agreement', 4), err('adjective-agreement', 5),
]

function snakkConcepts(blocks: ReturnType<typeof generateSession>['blocks']): Set<string> {
  const snakk = blocks.find((b) => b.type === 'snakk')
  return new Set((snakk?.items ?? []).flatMap((i) => i.conceptIds))
}
function reviewConcepts(blocks: ReturnType<typeof generateSession>['blocks']): Set<string> {
  const lar = blocks.find((b) => b.type === 'lær')
  return new Set((lar?.items ?? []).filter((i) => i.purpose === 'review').flatMap((i) => i.conceptIds))
}

describe('Plan C — diagnosis steers the snakk + new-material pools', () => {
  it('① the Snakk block leads with the diagnosed root cause (noun-gender)', () => {
    const { blocks, diagnosisResults } = generateSession(makeInput(SIGNATURE))
    expect(diagnosisResults[0].rootCauseConceptId).toBe('noun-gender')
    expect(diagnosisResults[0].confidence).toBeGreaterThanOrEqual(0.7)
    // noun-gender has 0 attempts → unreachable via the old [focus, weak, unlocked]
    // snakk pool; only the diagnosis steer can place it in the speaking block.
    expect(snakkConcepts(blocks).has('noun-gender')).toBe(true)
  })

  it('① the diagnosed root-cause snakk item is labelled `root_cause`', () => {
    const { blocks } = generateSession(makeInput(SIGNATURE))
    const snakk = blocks.find((b) => b.type === 'snakk')
    const rootCauseSnakk = (snakk?.items ?? []).filter((i) => i.selectionReason === 'root_cause')
    expect(rootCauseSnakk.length).toBeGreaterThan(0)
    expect(rootCauseSnakk.every((i) => i.conceptIds.includes('noun-gender'))).toBe(true)
  })

  it('① does NOT steer the Snakk block on a low-confidence (fallback-only) diagnosis', () => {
    // noun-gender (0 attempts, not mastered) is in unlockedConcepts, so it can appear
    // in the snakk block's unlocked tail regardless. The differentiator the steer adds
    // is the root_cause LEAD + label — which must be absent without a >=0.7 diagnosis.
    const { blocks, diagnosisResults } = generateSession(makeInput([]))
    expect(diagnosisResults[0]?.confidence ?? 0).toBeLessThan(0.7)
    const snakk = blocks.find((b) => b.type === 'snakk')
    const labelled = (snakk?.items ?? []).some((i) => i.selectionReason === 'root_cause')
    expect(labelled).toBe(false)
  })

  // THE LOCKED BOUNDARY (T1.6 acceptance criterion): diagnosis must never bleed into
  // review / SRS-due. An unrelated SRS-due concept still schedules under a strong
  // off-target diagnosis — the SRS ladder is untouched.
  it('keeps review diagnosis-agnostic: an unrelated SRS-due concept still schedules', () => {
    const withDiagnosis = generateSession(makeInput(SIGNATURE))
    const withoutDiagnosis = generateSession(makeInput([]))
    // srs-due-z is SRS-due and unrelated to the noun-gender diagnosis.
    expect(reviewConcepts(withDiagnosis.blocks).has('srs-due-z')).toBe(true)
    expect(reviewConcepts(withoutDiagnosis.blocks).has('srs-due-z')).toBe(true)
    // And the diagnosed root cause must NOT have leaked into the review pool.
    expect(reviewConcepts(withDiagnosis.blocks).has('noun-gender')).toBe(false)
  })
})

describe('② resolveNewMaterialFocus — cold-start guard', () => {
  it('never forces production output on a cold-start concept', () => {
    expect(resolveNewMaterialFocus('production', true)).toBeUndefined()
    expect(resolveNewMaterialFocus('mechanics', true)).toBeUndefined()
    expect(resolveNewMaterialFocus('application', true)).toBeUndefined()
  })

  it('lets a recognition tilt through even on cold-start (always safe)', () => {
    expect(resolveNewMaterialFocus('recognition', true)).toBe('recognition')
  })

  it('applies the production tilt once the concept has been attempted (non cold-start)', () => {
    expect(resolveNewMaterialFocus('production', false)).toBe('production')
    expect(resolveNewMaterialFocus('application', false)).toBe('application')
  })

  it('passes undefined through (no diagnosis → no tilt)', () => {
    expect(resolveNewMaterialFocus(undefined, true)).toBeUndefined()
    expect(resolveNewMaterialFocus(undefined, false)).toBeUndefined()
  })
})
