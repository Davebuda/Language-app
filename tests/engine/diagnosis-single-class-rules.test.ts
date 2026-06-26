import { describe, it, expect } from 'vitest'
import { runDiagnosis } from '@/engine/diagnosis'
import type { MistakeFingerprint, ErrorLogEntry } from '@/types/fingerprint'

// P2 (vision audit 2026-06-26, Lane 1): single-class root-cause rules for the cleanly-
// mapped orphaned HIGH_CONFIDENCE classes. Two-tier confidence: >=3 → 0.7 (full steer),
// >=2 → 0.6 (mid-confidence band). wrong-word-different-category is intentionally NOT a
// root-cause rule (it maps to the fallback concept — root-causing it would fabricate a
// cause, Rule 6).

function err(tag: ErrorLogEntry['errorTag'], i: number): ErrorLogEntry {
  return { id: `e${i}`, conceptId: 'x', errorTag: tag, exerciseType: 'translation-to-norwegian', wrong: 'a', correct: 'b', timestamp: new Date().toISOString() }
}

function fpWith(errors: ErrorLogEntry[]): MistakeFingerprint {
  const now = new Date().toISOString()
  return {
    userId: 'u', currentLevel: 'B1', createdAt: now, updatedAt: now,
    diagnosticCompleted: true, sessionsCompleted: 3,
    conceptMastery: {}, recentErrors: errors, errorPatterns: {}, productionGap: {}, speakingMinutes: 0,
    inputProductionPreference: 'balanced', weeklyFocus: [], weekStartedAt: null, weeklySprintHistory: [],
  }
}

describe('diagnosis — single-class root-cause rules (P2)', () => {
  it('3+ of a class → HIGH confidence (0.7) root cause', () => {
    const r = runDiagnosis(fpWith([err('modal-verb', 1), err('modal-verb', 2), err('modal-verb', 3)]))[0]
    expect(r.rootCauseConceptId).toBe('common-modal-verbs')
    expect(r.confidence).toBe(0.7)
  })

  it('exactly 2 of a class → MID confidence (0.6) root cause', () => {
    const r = runDiagnosis(fpWith([err('pronoun-choice', 1), err('pronoun-choice', 2)]))[0]
    expect(r.rootCauseConceptId).toBe('personal-pronouns')
    expect(r.confidence).toBe(0.6)
  })

  it('1 of a class is below threshold — no single-class diagnosis', () => {
    const results = runDiagnosis(fpWith([err('negation-placement', 1)]))
    expect(results.find((r) => r.rootCauseConceptId === 'negation')).toBeUndefined()
  })

  it('negation + compound map to the right root-cause concepts', () => {
    expect(runDiagnosis(fpWith([err('negation-placement', 1), err('negation-placement', 2), err('negation-placement', 3)]))[0].rootCauseConceptId).toBe('negation')
    expect(runDiagnosis(fpWith([err('compound-word', 1), err('compound-word', 2), err('compound-word', 3)]))[0].rootCauseConceptId).toBe('word-formation')
  })

  it('wrong-word-different-category never becomes a (fallback-concept) root cause (Rule 6)', () => {
    const results = runDiagnosis(fpWith([err('wrong-word-different-category', 1), err('wrong-word-different-category', 2), err('wrong-word-different-category', 3)]))
    expect(results.find((r) => r.rootCauseConceptId === 'noun-gender')).toBeUndefined()
  })
})
