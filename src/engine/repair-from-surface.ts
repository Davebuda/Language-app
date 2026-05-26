import type { MistakeFingerprint } from '@/types/fingerprint'
import type { ErrorTag } from '@/types/taxonomy'
import type { ExerciseType } from '@/types/session'
import type { ConceptGraph } from '@/types/concepts'
import { logError, aggregateErrorPatterns, updateConceptMastery } from './fingerprint'
import { errorTagToConceptId } from '@/lib/error-tag-to-concept'

export type SurfaceKind = 'journal' | 'conversation' | 'roleplay'

const SURFACE_EXERCISE_TYPE: Record<SurfaceKind, ExerciseType> = {
  journal: 'free-writing',
  conversation: 'translation-to-norwegian',
  roleplay: 'translation-to-norwegian',
}

export interface RepairInput {
  surfaceKind: SurfaceKind
  errorTag: string
  conceptId?: string
  wrong?: string
  correct?: string
}

/**
 * Pure function: apply a single error from a non-session surface to the fingerprint.
 * Updates mastery (wrong answer), logs the error, aggregates error patterns.
 * Does NOT fire drills, display UI, or persist — caller does that.
 */
export function repairFromSurface(
  fp: MistakeFingerprint,
  input: RepairInput,
  graph: ConceptGraph,
): MistakeFingerprint {
  const conceptId = input.conceptId ?? errorTagToConceptId(input.errorTag)
  const node = graph.concepts.find((c) => c.id === conceptId)

  // 1. Update mastery (wrong answer)
  const updatedMastery = updateConceptMastery(
    fp.conceptMastery[conceptId],
    false,
    node?.minAttempts ?? 15,
    node?.minDays ?? 3,
  )
  const withMastery: MistakeFingerprint = {
    ...fp,
    conceptMastery: {
      ...fp.conceptMastery,
      [conceptId]: { ...updatedMastery, conceptId },
    },
    updatedAt: new Date().toISOString(),
  }

  // 2. Log the error
  const withError = logError(withMastery, {
    conceptId,
    errorTag: input.errorTag as ErrorTag,
    exerciseType: SURFACE_EXERCISE_TYPE[input.surfaceKind],
    wrong: input.wrong ?? '',
    correct: input.correct ?? '',
  })

  // 3. Aggregate error patterns
  return {
    ...withError,
    errorPatterns: aggregateErrorPatterns(withError),
  }
}

/**
 * Fold multiple errors from a single surface submission.
 */
export function repairBatchFromSurface(
  fp: MistakeFingerprint,
  inputs: RepairInput[],
  graph: ConceptGraph,
): MistakeFingerprint {
  return inputs.reduce(
    (acc, input) => repairFromSurface(acc, input, graph),
    fp,
  )
}
