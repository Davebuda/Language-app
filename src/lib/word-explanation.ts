// Verified-first, AI-marked, honest-empty resolver for the clickable-word popup
// (Task 2.3). PURE + deterministic: same input → same output, no I/O, no AI call.
//
// Contract (see docs/plan-corrections-and-notebook.md §2.3 + CLAUDE.md AI-01):
//  - `verified.rule`   — derived deterministically from errorTag / conceptId using
//                        EXISTING corpus data (concept graphs + ERROR_TAG_LABELS).
//  - `verified.english`— ONLY a direct, unambiguous corpus gloss (a VocabWord.gloss
//                        exact-match). There is NO general NB→EN dictionary, by design;
//                        if no exact gloss exists we OMIT english — never guess, never
//                        call AI for a translation.
//  - `aiSuggested`     — passed-in AI text, verbatim, to be shown clearly MARKED as a
//                        suggestion ("forslag"). Never promoted into `verified`.
//  - `source`          — 'corpus' if any verified field is set; else 'ai' if aiSuggested
//                        set; else 'none' (the honest empty state).

import { getCumulativeConcepts } from '@/lib/concept-graph-loader'
import { ERROR_TAG_LABELS } from '@/lib/error-tag-labels'
import { VOCAB_WORDS } from '@/lib/vocab-loader'
import type { ConceptNode } from '@/types/concepts'
import type { VocabWord } from '@/types/vocab'

export interface WordExplanation {
  norwegian: string
  /** Corpus-backed only — never AI-derived. */
  verified?: { english?: string; rule?: string }
  /** Passed-in AI text, shown clearly MARKED as a suggestion. */
  aiSuggested?: string
  source: 'corpus' | 'ai' | 'none'
}

export interface ResolveWordInput {
  /** The word or phrase. */
  text: string
  /** e.g. 'noun-gender' — a taxonomy ErrorTag (typed as string for AI-origin safety). */
  errorTag?: string
  /** A concept-graph node id, e.g. 'noun-gender'. */
  conceptId?: string
  /** AI 'why' string from a correction, if any. Shown labelled, never verified. */
  aiExplanation?: string
}

/**
 * Corpus dependencies, injectable so tests can assert each path deterministically
 * (the live B2 vocab currently ships every gloss as null — see vocab-loader).
 * Production callers pass nothing and get the live corpus.
 */
export interface ResolveWordDeps {
  concepts?: ConceptNode[]
  vocabWords?: VocabWord[]
  errorTagLabels?: Partial<Record<string, string>>
}

function normalize(s: string): string {
  return s.trim().toLowerCase()
}

/**
 * Deterministic short rule for the popup: prefer the concept's human label
 * (richest, level-aware), else the error-tag label. Both are existing corpus
 * content — no fabrication. Returns undefined when neither resolves.
 */
function resolveRule(
  conceptId: string | undefined,
  errorTag: string | undefined,
  concepts: ConceptNode[],
  errorTagLabels: Partial<Record<string, string>>,
): string | undefined {
  if (conceptId) {
    const node = concepts.find((c) => c.id === conceptId)
    if (node) return node.label
  }
  if (errorTag) {
    const label = errorTagLabels[errorTag]
    if (label) return label
  }
  return undefined
}

/**
 * A direct, unambiguous EN gloss for `text` IF — and only if — a corpus VocabWord
 * exact-matches (by lemma or infinitive) AND carries a non-null gloss. Otherwise
 * undefined: there is no general NB→EN dictionary and we never guess.
 */
function resolveEnglish(text: string, vocabWords: VocabWord[]): string | undefined {
  const key = normalize(text)
  if (!key) return undefined
  for (const w of vocabWords) {
    if (w.gloss == null) continue
    if (normalize(w.lemma) === key || normalize(w.infinitive) === key) {
      return w.gloss
    }
  }
  return undefined
}

export function resolveWordExplanation(
  input: ResolveWordInput,
  deps: ResolveWordDeps = {},
): WordExplanation {
  const text = input.text
  const concepts = deps.concepts ?? getCumulativeConcepts('B2')
  const vocabWords = deps.vocabWords ?? VOCAB_WORDS
  const errorTagLabels = deps.errorTagLabels ?? ERROR_TAG_LABELS

  const rule = resolveRule(input.conceptId, input.errorTag, concepts, errorTagLabels)
  const english = resolveEnglish(text, vocabWords)

  const verified: { english?: string; rule?: string } = {}
  if (rule !== undefined) verified.rule = rule
  if (english !== undefined) verified.english = english
  const hasVerified = verified.rule !== undefined || verified.english !== undefined

  const aiSuggested =
    input.aiExplanation && input.aiExplanation.trim().length > 0
      ? input.aiExplanation
      : undefined

  const source: WordExplanation['source'] = hasVerified
    ? 'corpus'
    : aiSuggested
      ? 'ai'
      : 'none'

  const result: WordExplanation = { norwegian: text, source }
  if (hasVerified) result.verified = verified
  if (aiSuggested !== undefined) result.aiSuggested = aiSuggested
  return result
}
