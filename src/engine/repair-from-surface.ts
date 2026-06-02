import type { MistakeFingerprint } from '@/types/fingerprint'
import type { ErrorTag } from '@/types/taxonomy'
import type { ExerciseType } from '@/types/session'
import type { ConceptGraph } from '@/types/concepts'
import { logError, aggregateErrorPatterns, updateConceptMastery, bumpDailyBrick } from './fingerprint'
import { errorTagToConceptId } from '@/lib/error-tag-to-concept'

export type SurfaceKind = 'journal' | 'conversation' | 'roleplay' | 'reading'

const SURFACE_EXERCISE_TYPE: Record<SurfaceKind, ExerciseType> = {
  journal: 'free-writing',
  conversation: 'translation-to-norwegian',
  roleplay: 'translation-to-norwegian',
  // The read→recite→WRITE step is free written production, like the journal.
  reading: 'free-writing',
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

export interface ProductionInput {
  /** The concept this production exercises (e.g. the passage's primary concept). */
  conceptId: string
  /**
   * Whether the learner wrote from a scaffold/sentence-frame (true) or produced
   * freely (false). Guided production earns a real-but-reduced mastery brick and
   * does NOT advance the SRS ladder (a copied frame is not spaced retrieval).
   */
  guided: boolean
}

/**
 * Pure function: record a CORRECT free-or-guided production from a non-session
 * surface (e.g. the read→recite→write WRITE step). The positive sibling of
 * repairFromSurface — it puts one mastery brick on the concept and:
 *   - does NOT call logError (a correct production is not an error)
 *   - leaves productionGap untouched (that signal is error-derived)
 *   - for guided frames, dampens the EMA step (learningRateScale 0.5) and freezes
 *     the SRS ladder; free production gets the full step and advances SRS.
 * Caller persists the result.
 */
const GUIDED_LEARNING_RATE_SCALE = 0.5

export function recordProductionFromSurface(
  fp: MistakeFingerprint,
  input: ProductionInput,
  graph: ConceptGraph,
): MistakeFingerprint {
  const { conceptId, guided } = input
  const node = graph.concepts.find((c) => c.id === conceptId)
  const existing = fp.conceptMastery[conceptId]

  const scale = guided ? GUIDED_LEARNING_RATE_SCALE : 1
  let updatedMastery = updateConceptMastery(
    existing,
    true,
    node?.minAttempts ?? 15,
    node?.minDays ?? 3,
    scale,
  )

  if (guided) {
    // A scaffolded fill is not spaced retrieval — keep the prior SRS state so a
    // guided correct never pushes the review schedule out.
    updatedMastery = {
      ...updatedMastery,
      srsLevel: existing?.srsLevel ?? 0,
      nextReviewAt: existing?.nextReviewAt ?? null,
    }
  }

  const withMastery: MistakeFingerprint = {
    ...fp,
    conceptMastery: {
      ...fp.conceptMastery,
      [conceptId]: { ...updatedMastery, conceptId },
    },
    updatedAt: new Date().toISOString(),
  }
  // Lay one production brick on today's wall — full-weight for free production,
  // the dampened 'guided' weight for scaffolded frames.
  return bumpDailyBrick(withMastery, guided ? 'guided' : 'production')
}

export interface SpeakingProductionInput {
  /** Minutes of spoken Norwegian (estimate or measured) — ALWAYS credited. */
  minutes: number
  /** Whether the learner self-reported producing it (Flytende/Nølende vs Bommet). */
  produced: boolean
}

/**
 * Pure: credit a self-reported speaking production (the daily Snakk block,
 * shadowing). `speakingMinutesTotal` ALWAYS accrues (they spoke — time is the
 * one objective signal). A guided (reduced-weight) production brick lands ONLY
 * when produced. It NEVER touches mastery, the error log, or productionGap — a
 * self-rating is too gameable to be an objective judge (Rule 8). Caller persists.
 */
export function recordSpeakingProductionToFingerprint(
  fp: MistakeFingerprint,
  input: SpeakingProductionInput,
): MistakeFingerprint {
  const withMinutes: MistakeFingerprint = {
    ...fp,
    speakingMinutesTotal: (fp.speakingMinutesTotal ?? 0) + Math.max(0, input.minutes),
    updatedAt: new Date().toISOString(),
  }
  return input.produced ? bumpDailyBrick(withMinutes, 'guided') : withMinutes
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
