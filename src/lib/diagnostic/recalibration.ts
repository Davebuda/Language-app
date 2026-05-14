import type { MistakeFingerprint } from '@/types/fingerprint'
import type { ConceptGraph } from '@/types/concepts'
import { DIAGNOSTIC_QUESTIONS, type DiagnosticQuestion } from './questions'
import { createDiagnosticState, recordAnswer } from './engine'
import type { DiagnosticState } from './engine'
import { updateConceptMastery } from '@/engine'

export const MAX_RECALIBRATION_QUESTIONS = 7
const STALE_DAYS = 14          // concept not practiced in this many days → candidate
const LOW_CONFIDENCE = 0.55    // confidence below this → candidate

// ── Helpers ────────────────────────────────────────────────────────────────

function daysSince(iso: string | null): number {
  if (!iso) return Infinity
  return (Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60 * 24)
}

// ── Question selection ─────────────────────────────────────────────────────

/**
 * Pick questions that target concepts the user is weak on or hasn't practiced
 * recently. Falls back to any un-asked question at the user's current level.
 */
export function selectRecalibrationQuestion(
  state: DiagnosticState,
  fingerprint: MistakeFingerprint,
): DiagnosticQuestion | null {
  const alreadyAsked = new Set([
    ...state.askedIds,
    ...(fingerprint.askedDiagnosticQuestionIds ?? []),
  ])

  // Concepts that are weak or stale
  const targetConceptIds = new Set<string>()
  for (const [conceptId, mastery] of Object.entries(fingerprint.conceptMastery)) {
    const isStale = daysSince(mastery.lastAttemptAt) > STALE_DAYS
    const isWeak = mastery.confidenceScore < LOW_CONFIDENCE || mastery.rawScore < 60
    if (isStale || isWeak) targetConceptIds.add(conceptId)
  }

  const available = DIAGNOSTIC_QUESTIONS.filter((q) => !alreadyAsked.has(q.id))

  // Prefer questions targeting weak/stale concepts at or below the user's level
  const levelOrder = ['A1', 'A2', 'B1', 'B2']
  const userLevelIdx = levelOrder.indexOf(fingerprint.currentLevel)

  const targeted = available
    .filter((q) => targetConceptIds.has(q.conceptId) && levelOrder.indexOf(q.cefrLevel) <= userLevelIdx)
    .sort((a, b) => a.difficulty - b.difficulty) // easiest first — less stressful recalibration

  if (targeted.length > 0) return targeted[0]

  // Fallback: any un-asked question at or below current level
  const fallback = available.filter((q) => levelOrder.indexOf(q.cefrLevel) <= userLevelIdx)
  return fallback[0] ?? null
}

export function isRecalibrationComplete(state: DiagnosticState): boolean {
  return state.answers.length >= MAX_RECALIBRATION_QUESTIONS
}

// ── Result application ─────────────────────────────────────────────────────

export interface RecalibrationResult {
  /** Concepts that were tested and their mastery updates */
  updatedConceptIds: string[]
  /** New fingerprint with mastery updates applied */
  fingerprint: MistakeFingerprint
}

/**
 * Apply recalibration answers to the fingerprint.
 * Updates mastery for tested concepts only — does NOT change CEFR level.
 */
export function applyRecalibration(
  state: DiagnosticState,
  fingerprint: MistakeFingerprint,
  graph: ConceptGraph,
): RecalibrationResult {
  const now = new Date().toISOString()
  const updated = { ...fingerprint, conceptMastery: { ...fingerprint.conceptMastery } }
  const updatedConceptIds: string[] = []

  for (const { question, correct } of state.answers) {
    const conceptId = question.conceptId
    const node = graph.concepts.find((c) => c.id === conceptId)
    const existing = updated.conceptMastery[conceptId]
    const newMastery = updateConceptMastery(
      existing,
      correct,
      node?.minAttempts ?? 15,
      node?.minDays ?? 3,
    )
    updated.conceptMastery[conceptId] = { ...newMastery, conceptId }
    if (!updatedConceptIds.includes(conceptId)) updatedConceptIds.push(conceptId)
  }

  // Record asked question IDs
  const newIds = state.answers.map((a) => a.question.id)
  updated.askedDiagnosticQuestionIds = [
    ...(fingerprint.askedDiagnosticQuestionIds ?? []),
    ...newIds,
  ].slice(-50) // cap to last 50

  updated.lastRecalibrationAt = now
  updated.updatedAt = now

  return { updatedConceptIds, fingerprint: updated }
}

// ── Re-export shared engine utilities for convenience ──────────────────────
export { createDiagnosticState, recordAnswer, isRecalibrationComplete as isComplete }
