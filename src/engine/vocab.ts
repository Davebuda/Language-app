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
//  - Per-word SRS (Option B, shipped 2026-06-16): each answered word also gets a
//    spaced-review schedule (`vocabWordSrs[wordId]`) so the bøyningsdrill can SPACE
//    words instead of re-showing them by clock seed. Per-word DECAY is still not
//    modelled (cluster EMA carries the warmth signal); only the review interval is.

import type { MistakeFingerprint, VocabularyClusterMastery, VocabWordSrs } from '@/types/fingerprint'
import { SRS_LADDER_DAYS } from './fingerprint'

const VOCAB_ALPHA = 0.3 // fixed EMA learning rate for the cluster score (v1)
const START_SCORE = 50
const COVERAGE_SCORE_FLOOR = 50 // a cluster must stay this warm for its activated words to count

// A drilled word never returns within this many days (user requirement: "not in 2
// days"). The SRS ladder's rung-0 is 1 day, so we floor the vocab interval at 2.
const VOCAB_MIN_INTERVAL_DAYS = 2

function vocabNextReviewAt(srsLevel: number): string {
  const ladder = SRS_LADDER_DAYS[Math.min(srsLevel, SRS_LADDER_DAYS.length - 1)] ?? 1
  const days = Math.max(VOCAB_MIN_INTERVAL_DAYS, ladder)
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d.toISOString()
}

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

  // Per-word SRS: correct → climb the ladder; wrong → reset to rung 0. Either way the
  // word is now scheduled ≥2 days out, so the drill won't re-show it within days.
  const prevWordSrs = (fp.vocabWordSrs ?? {})[wordId]
  const nextSrsLevel = correct ? Math.min((prevWordSrs?.srsLevel ?? 0) + 1, SRS_LADDER_DAYS.length - 1) : 0
  const wordSrs: VocabWordSrs = {
    srsLevel: nextSrsLevel,
    nextReviewAt: vocabNextReviewAt(nextSrsLevel),
    lastSeenAt: new Date().toISOString(),
  }

  return {
    ...fp,
    vocabularyMastery: { ...fp.vocabularyMastery, [clusterId]: updated },
    vocabWordSrs: { ...(fp.vocabWordSrs ?? {}), [wordId]: wordSrs },
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
