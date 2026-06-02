// Deterministic Tier-1 grader for the read→recite→WRITE step.
//
// This is the AI-down-proof floor of the WRITE grade. It CANNOT judge grammar
// (that is Tier-2 / reviewWriting). It checks only what can be observed
// mechanically: effort (length), on-topic engagement (content-word overlap with
// the passage), and presence of the target structure the exercise is teaching.
//
// Outcome → caller behaviour (decided 2026-06-02):
//   'pass'              → recordProductionFromSurface. Reduced weight (0.5) when
//                         AI is down / errors unverified; full weight only when
//                         Tier-2 confirms the writing is clean. Never lowers mastery.
//   'structure-missing' → repairFromSurface on `missingStructureTag` (a real,
//                         deterministically-observable miss of the target structure).
//   'too-short' | 'off-topic' → NO brick. A non-attempt is neither production nor
//                         an error; re-prompt the learner ("skriv litt mer").
//
// Pure + framework-free so it is unit-testable and reusable by the content layer.

import type { CEFRLevel } from '@/types/fingerprint'
import type { ErrorTag } from '@/types/taxonomy'

export type ReadRespondOutcome = 'pass' | 'too-short' | 'off-topic' | 'structure-missing'

export interface ReadRespondChecklistItem {
  label: string
  ok: boolean
}

export interface ReadRespondGrade {
  outcome: ReadRespondOutcome
  wordCount: number
  sentenceCount: number
  /** Count of distinct passage content-words the learner reused (on-topic signal). */
  onTopicOverlap: number
  hasTargetStructure: boolean
  /** Set only when outcome === 'structure-missing'; the tag the caller logs. */
  missingStructureTag?: ErrorTag
  /** Human-readable PASS conditions, for the live UI checklist preview. */
  checklist: ReadRespondChecklistItem[]
}

interface LevelThresholds {
  minWords: number
  minSentences: number
  minOverlap: number
}

// Effort + on-topic floors per level. Only B1 is used in v1; the rest are
// defined so later levels need no grader change, only content.
const THRESHOLDS: Record<CEFRLevel, LevelThresholds> = {
  A1: { minWords: 8, minSentences: 1, minOverlap: 1 },
  A2: { minWords: 20, minSentences: 2, minOverlap: 2 },
  B1: { minWords: 30, minSentences: 4, minOverlap: 3 },
  B2: { minWords: 70, minSentences: 8, minOverlap: 4 },
}

export interface GradeReadRespondParams {
  text: string
  level: CEFRLevel
  /** Curated content words from the passage (lowercased), for on-topic overlap. */
  passageContentWords: string[]
  /** Structure markers the WRITE prompt targets, e.g. ['fordi', 'selv om', 'hvis']. */
  targetConnectors: string[]
  /** Tag to log when the target structure is absent (passage/linguist decides it). */
  targetStructureTag: ErrorTag
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[.,!?;:«»"'()/\-–—%…]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 0)
}

function countSentences(text: string): number {
  return text
    .split(/[.!?]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0).length
}

/** Whole-word / whole-phrase, case-insensitive presence of any connector. */
function containsAnyConnector(text: string, connectors: string[]): boolean {
  const haystack = ` ${text.toLowerCase().replace(/\s+/g, ' ')} `
  return connectors.some((c) => {
    const needle = c.toLowerCase().trim()
    if (!needle) return false
    // Bound by non-letters so "når" doesn't match inside "spørrenår" etc.
    const escaped = needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    return new RegExp(`(?:^|[^a-zæøå])${escaped}(?:[^a-zæøå]|$)`, 'i').test(haystack)
  })
}

export function gradeReadRespond(params: GradeReadRespondParams): ReadRespondGrade {
  const { text, level, passageContentWords, targetConnectors, targetStructureTag } = params
  const t = THRESHOLDS[level]

  const tokens = tokenize(text)
  const wordCount = tokens.length
  const sentenceCount = countSentences(text)

  const passageSet = new Set(passageContentWords.map((w) => w.toLowerCase()))
  const onTopicOverlap = new Set(tokens.filter((tok) => passageSet.has(tok))).size

  const hasTargetStructure =
    targetConnectors.length === 0 ? true : containsAnyConnector(text, targetConnectors)

  const checklist: ReadRespondChecklistItem[] = [
    { label: `Minst ${t.minWords} ord`, ok: wordCount >= t.minWords },
    { label: `Minst ${t.minSentences} setninger`, ok: sentenceCount >= t.minSentences },
    { label: 'Knyttet til teksten', ok: onTopicOverlap >= t.minOverlap },
    ...(targetConnectors.length > 0
      ? [{ label: `Bruk en bindestruktur (f.eks. «${targetConnectors[0]}»)`, ok: hasTargetStructure }]
      : []),
  ]

  // Decision order: effort floor → on-topic → target structure → pass.
  let outcome: ReadRespondOutcome
  let missingStructureTag: ErrorTag | undefined
  if (wordCount < t.minWords || sentenceCount < t.minSentences) {
    outcome = 'too-short'
  } else if (onTopicOverlap < t.minOverlap) {
    outcome = 'off-topic'
  } else if (!hasTargetStructure) {
    outcome = 'structure-missing'
    missingStructureTag = targetStructureTag
  } else {
    outcome = 'pass'
  }

  return {
    outcome,
    wordCount,
    sentenceCount,
    onTopicOverlap,
    hasTargetStructure,
    missingStructureTag,
    checklist,
  }
}
