import { describe, it, expect } from 'vitest'
import { generateSession } from '@/engine/scheduler'
import type { SchedulerInput } from '@/engine/scheduler'
import type { MistakeFingerprint } from '@/types/fingerprint'
import type { ConceptGraph } from '@/types/concepts'
import type { Sentence } from '@/types/content'
import type { ErrorLogEntry } from '@/types/fingerprint'

// Proves the moat edge "diagnosis → scheduling" (p4 / deep-audit fix): a TARGETED
// diagnosis rule names a root cause the decayedScore sort MISSES, and the scheduler
// now actually schedules it.
//
// Setup: rule 1 ("article + adjective errors point to gender") fires when recent
// errors carry >=3 article-use + >=2 adjective-agreement. Its rootCause is
// `noun-gender` — a concept we deliberately give ZERO attempts, so it is NOT in
// weakConcepts (decayedScore would never surface it). Only the diagnosis steer can
// put it in the session.

function makeGraph(conceptIds: string[]): ConceptGraph {
  return {
    concepts: conceptIds.map((id) => ({
      id, label: id, cefrLevel: 'A1', prerequisites: [],
      masteryThreshold: 70, minAttempts: 3, minDays: 1, primaryErrorTag: 'noun-gender' as const,
    })),
    edges: [],
  }
}

function sentence(id: string, conceptId: string): Sentence {
  return {
    id, norwegian: `Norsk ${id}.`, english: `English ${id}.`,
    conceptIds: [conceptId], vocabularyClusters: [], errorTagsDetectable: ['noun-gender'],
    cefrLevel: 'A1', difficulty: 1,
    exerciseTypes: ['translation-to-norwegian', 'fill-in-blank'] as Sentence['exerciseTypes'],
  }
}

function err(tag: ErrorLogEntry['errorTag'], i: number): ErrorLogEntry {
  return {
    id: `e${i}`, conceptId: 'x', errorTag: tag, exerciseType: 'translation-to-norwegian',
    wrong: 'a', correct: 'b', timestamp: new Date().toISOString(),
  }
}

function makeInput(recentErrors: ErrorLogEntry[]): SchedulerInput {
  // Two genuinely-weak filler concepts (low decayedScore, real attempts) so the
  // baseline remediation pool is non-empty WITHOUT noun-gender. noun-gender has
  // content but ZERO attempts → never in weakConcepts.
  const conceptIds = ['weak-a', 'weak-b', 'noun-gender']
  const sentences: Record<string, Sentence> = {
    sa: sentence('sa', 'weak-a'),
    sb: sentence('sb', 'weak-b'),
    sg: sentence('sg', 'noun-gender'),
  }
  const fingerprint: MistakeFingerprint = {
    userId: 'u', currentLevel: 'A1',
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    diagnosticCompleted: true, sessionsCompleted: 3,
    conceptMastery: {
      'weak-a': { conceptId: 'weak-a', rawScore: 35, confidenceScore: 0.5, decayedScore: 35, attemptCount: 8, uniqueDaysActive: 2, streak: 0, recentOutcomes: [false], nextReviewAt: null, srsLevel: 0, lastAttemptAt: new Date().toISOString() },
      'weak-b': { conceptId: 'weak-b', rawScore: 38, confidenceScore: 0.5, decayedScore: 38, attemptCount: 8, uniqueDaysActive: 2, streak: 0, recentOutcomes: [false], nextReviewAt: null, srsLevel: 0, lastAttemptAt: new Date().toISOString() },
      // noun-gender: NO attempts → excluded from weakConcepts (attemptCount > 0 filter)
      'noun-gender': { conceptId: 'noun-gender', rawScore: 80, confidenceScore: 0.6, decayedScore: 80, attemptCount: 0, uniqueDaysActive: 0, streak: 0, recentOutcomes: [], nextReviewAt: null, srsLevel: 0, lastAttemptAt: new Date().toISOString() },
    },
    recentErrors, errorPatterns: {}, productionGap: {}, speakingMinutes: 0,
    inputProductionPreference: 'balanced', weeklyFocus: [], weekStartedAt: null, weeklySprintHistory: [],
  }
  return {
    fingerprint, graph: makeGraph(conceptIds), sentences,
    availableSentenceIds: { 'weak-a': ['sa'], 'weak-b': ['sb'], 'noun-gender': ['sg'] },
  }
}

// Concepts that landed in the LÆR block's remediation slots — the pool the
// diagnosis steer controls (isolated from the Snakk block's speaking 'remediation').
function larRemediationConcepts(blocks: ReturnType<typeof generateSession>['blocks']): Set<string> {
  const lar = blocks.find((b) => b.type === 'lær')
  return new Set((lar?.items ?? []).filter((i) => i.purpose === 'remediation').flatMap((i) => i.conceptIds))
}

describe('generateSession — diagnosis steers scheduling (Option B)', () => {
  it('schedules the diagnosed root cause (noun-gender) that decayedScore would miss', () => {
    const recentErrors = [
      err('article-use', 1), err('article-use', 2), err('article-use', 3),
      err('adjective-agreement', 4), err('adjective-agreement', 5),
    ]
    const { blocks, diagnosisResults } = generateSession(makeInput(recentErrors))
    // Rule 1 fired with high confidence and named noun-gender.
    expect(diagnosisResults[0].rootCauseConceptId).toBe('noun-gender')
    expect(diagnosisResults[0].confidence).toBeGreaterThanOrEqual(0.7)
    // The moat edge: noun-gender — never a weakConcept (0 attempts) — is now drilled
    // in the LÆR block's REMEDIATION slots (the pool the steer controls). We scope to
    // the lær block because the Snakk block independently marks its speaking items
    // 'remediation' and pulls unlocked concepts, regardless of diagnosis.
    expect(larRemediationConcepts(blocks).has('noun-gender')).toBe(true)
  })

  it('does NOT steer remediation on a low-confidence (fallback-only) diagnosis', () => {
    // No article/adjective signature → only the 0.45 fallback rule fires → no steer.
    // noun-gender (0 attempts, not weak) must NOT enter the lær remediation block.
    const { blocks, diagnosisResults } = generateSession(makeInput([]))
    expect(diagnosisResults[0]?.confidence ?? 0).toBeLessThan(0.7)
    expect(larRemediationConcepts(blocks).has('noun-gender')).toBe(false)
  })

  // T1.4 — the diagnosed root cause is LABELLED `root_cause` so the in-session "why this"
  // can name it. Proves the label actually lands (Pipeline Honesty, Rule 8): the UI claim
  // "this is the root cause" must trace to a real scheduler tag, not a cosmetic string.
  it('labels the diagnosed root-cause item `root_cause` (and only that concept)', () => {
    const recentErrors = [
      err('article-use', 1), err('article-use', 2), err('article-use', 3),
      err('adjective-agreement', 4), err('adjective-agreement', 5),
    ]
    const { blocks } = generateSession(makeInput(recentErrors))
    const lar = blocks.find((b) => b.type === 'lær')
    const items = lar?.items ?? []
    const rootCauseItems = items.filter((i) => i.selectionReason === 'root_cause')
    // At least one item is tagged root_cause, and every such item IS the diagnosed
    // noun-gender concept (affected/symptom concepts keep weak_concept/weekly_focus).
    expect(rootCauseItems.length).toBeGreaterThan(0)
    expect(rootCauseItems.every((i) => i.conceptIds.includes('noun-gender'))).toBe(true)
  })

  it('uses NO `root_cause` label when no high-confidence diagnosis fires', () => {
    const { blocks } = generateSession(makeInput([]))
    const labelled = blocks.flatMap((b) => b.items).some((i) => i.selectionReason === 'root_cause')
    expect(labelled).toBe(false)
  })
})
