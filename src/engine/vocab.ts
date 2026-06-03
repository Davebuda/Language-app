// B2 vocabulary track engine (Phase 3, Slice 3.2) — Option C: cluster-level EMA
// + an activated-word-id set. Pure functions; the caller persists.
//
// Honesty model (from .scout/last-brief.md):
//  - `score` is an EMA of correctness — drives scheduling AND lets the coverage
//    meter go DOWN (a cluster cooled by wrong answers stops counting).
//  - A word enters `activatedWordIds` ONLY when produced correctly (not
//    recognition — north-star) AFTER a prior miss. That's the literal meaning of
//    "ord du ikke lenger bommer på" (words you no longer miss): there must be a
//    "was". Words always answered correctly are not the story this meter tells.
//  - Per-word SRS/decay is deliberately NOT modelled here — that is the Option-B
//    upgrade, gated on a dedicated vocab review surface + real users.

import type { MistakeFingerprint, VocabularyClusterMastery } from '@/types/fingerprint'

const VOCAB_ALPHA = 0.3 // fixed EMA learning rate for the cluster score (v1)
const START_SCORE = 50
const COVERAGE_SCORE_FLOOR = 50 // a cluster must stay this warm for its activated words to count

function ema(prev: number, outcome: number, alpha = VOCAB_ALPHA): number {
  return Math.round(prev + alpha * (outcome - prev))
}

const addUnique = (arr: string[], id: string): string[] => (arr.includes(id) ? arr : [...arr, id])

export interface VocabResultInput {
  clusterId: string
  wordId: string
  correct: boolean
  /** Recognition answers never activate a word — production only (north-star). */
  isProduction: boolean
  /** |cluster.wordIds| from the content (denominator for the cluster). */
  totalWordCount: number
}

function emptyCluster(clusterId: string, totalWordCount: number): VocabularyClusterMastery {
  return { clusterId, score: START_SCORE, activatedWordIds: [], missedWordIds: [], totalWordCount }
}

/**
 * Pure: fold one vocab answer into the fingerprint's cluster mastery.
 * Returns a new fingerprint; never mutates the input.
 */
export function recordVocabResult(fp: MistakeFingerprint, input: VocabResultInput): MistakeFingerprint {
  const { clusterId, wordId, correct, isProduction, totalWordCount } = input
  const existing = fp.vocabularyMastery[clusterId] ?? emptyCluster(clusterId, totalWordCount)

  // Defensive defaults: a legacy/partial cluster record (e.g. truncated sync)
  // may lack the arrays — never throw inside a React state update.
  let missedWordIds = existing.missedWordIds ?? []
  let activatedWordIds = existing.activatedWordIds ?? []
  if (!correct) {
    // record the miss (the "was" behind "no longer miss")
    missedWordIds = addUnique(missedWordIds, wordId)
  } else if (isProduction && missedWordIds.includes(wordId)) {
    // produced correctly a word you previously missed → activated
    activatedWordIds = addUnique(activatedWordIds, wordId)
  }

  const updated: VocabularyClusterMastery = {
    ...existing,
    totalWordCount: totalWordCount || existing.totalWordCount,
    score: ema(existing.score, correct ? 100 : 0),
    missedWordIds,
    activatedWordIds,
  }

  return {
    ...fp,
    vocabularyMastery: { ...fp.vocabularyMastery, [clusterId]: updated },
    updatedAt: new Date().toISOString(),
  }
}

export interface VocabCoverage {
  /** words you no longer miss, in clusters still warm enough to count */
  activated: number
  /** words you've missed at least once, in those clusters */
  missed: number
  /** total words across all touched clusters */
  total: number
}

/**
 * Pure: the honest lexical-coverage meter. Activated words count only from
 * clusters with `score ≥ floor`, so the number drops as a cluster cools.
 */
export function vocabCoverage(
  fp: MistakeFingerprint,
  opts: { scoreFloor?: number } = {},
): VocabCoverage {
  const floor = opts.scoreFloor ?? COVERAGE_SCORE_FLOOR
  let activated = 0
  let missed = 0
  let total = 0
  for (const c of Object.values(fp.vocabularyMastery ?? {})) {
    total += c.totalWordCount ?? 0
    if (c.score >= floor) {
      activated += (c.activatedWordIds ?? []).length
      missed += (c.missedWordIds ?? []).length
    }
  }
  return { activated, missed, total }
}
