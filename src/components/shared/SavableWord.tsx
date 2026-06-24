'use client'

import * as React from 'react'
import { WordPopup } from '@/components/shared/WordPopup'
import { useNotebook } from '@/hooks/useNotebook'
import {
  resolveWordExplanation,
  type WordExplanation,
} from '@/lib/word-explanation'
import { wordState } from '@/lib/word-state'
import type { NotebookItemType, NotebookSource } from '@/types/notebook'

/**
 * The SINGLE integration point that makes a corrected/read word clickable AND
 * saveable. Every correction/reading surface composes this one component so the
 * surfaces stay one-liners:
 *
 *   <SavableWord text="huset" source="reading" conceptId="noun-gender">huset</SavableWord>
 *
 * It composes the three already-built pieces:
 *  - resolveWordExplanation (verified-first / AI-marked / honest-empty content),
 *  - WordPopup (the clickable popup that renders that content + a Save button),
 *  - useNotebook (the IndexedDB-first, guest-capable notebook persistence).
 *
 * Honesty (AI-01 + the deterministic-recall decision): the item's `english` is
 * the corpus-verified gloss ONLY — when no verified english exists we save the
 * item reference-only (english omitted) rather than fabricating a translation.
 */
export interface SavableWordProps {
  /** The word/phrase the popup explains and saves. */
  text: string
  /** Which surface the save originated from. */
  source: NotebookSource
  /** Notebook item kind. Defaults to 'word'. */
  type?: NotebookItemType
  /** Taxonomy error tag (e.g. 'noun-gender'), if this came from a correction. */
  errorTag?: string
  /** Concept-graph node id, if known. */
  conceptId?: string
  /** AI 'why' from a correction, if any — shown labelled, never as verified truth. */
  aiExplanation?: string
  /** The sentence this word/phrase was seen in, for later context. */
  sourceSentence?: string
  /**
   * Render the word-state tint with the on-dark palette (for correction
   * surfaces like conversation/repair). Defaults to the cream/paper palette.
   */
  onDark?: boolean
  /** The clickable trigger — the word as it appears in the surface. */
  children: React.ReactNode
}

export function SavableWord({
  text,
  source,
  type = 'word',
  errorTag,
  conceptId,
  aiExplanation,
  sourceSentence,
  onDark = false,
  children,
}: SavableWordProps) {
  const { items, saveItem } = useNotebook()
  const [saved, setSaved] = React.useState(false)

  // LingQ-style word-state tint, derived purely from the learner's notebook.
  // A just-saved word flips to 'saved' immediately via the local `saved` flag,
  // before the store round-trip lands the item in `items` (keeps the saved-✓
  // and the tint coherent in the same render).
  const state = wordState(text, items)
  const effectiveState = saved && state === 'unknown' ? 'saved' : state
  const stateClass = `nc-word--${effectiveState}${onDark ? ' nc-word--on-dark' : ''}`

  // Verified-first / AI-marked / honest-empty content for the popup.
  const explanation: WordExplanation = React.useMemo(
    () => resolveWordExplanation({ text, errorTag, conceptId, aiExplanation }),
    [text, errorTag, conceptId, aiExplanation],
  )

  const handleSave = React.useCallback(() => {
    // Idempotent: WordPopup keeps its Save button rendered, so guard re-clicks
    // from landing a duplicate notebook item.
    if (saved) return

    // `english` is the corpus-verified gloss ONLY. If none exists, omit it —
    // never fabricate a translation (the deterministic-recall + AI-01 decision).
    const english = explanation.verified?.english
    // The human-readable explanation: prefer the verified corpus rule, fall back
    // to the AI 'why' (which the popup itself marks as a suggestion).
    const itemExplanation = explanation.verified?.rule ?? aiExplanation

    saveItem({
      type,
      norwegian: text,
      ...(english !== undefined ? { english } : {}),
      ...(itemExplanation !== undefined ? { explanation: itemExplanation } : {}),
      ...(conceptId !== undefined ? { conceptId } : {}),
      source,
      ...(sourceSentence !== undefined ? { sourceSentence } : {}),
      // Corpus-backed (true) vs AI-suggested/none (false) — drives promotability.
      verified: explanation.source === 'corpus',
    })
    setSaved(true)
  }, [
    saved,
    explanation,
    aiExplanation,
    saveItem,
    type,
    text,
    conceptId,
    source,
    sourceSentence,
  ])

  // WordPopup has no `saved` prop and `onSave` is fire-only (no success channel),
  // so saved-state lives here: once saved we reflect it inside the trigger
  // children, which WordPopup renders inside its clickable button.
  const trigger = saved ? (
    <span className={`nc-word-saved ${stateClass} inline-flex items-center gap-1`}>
      {children}
      <span aria-hidden="true">✓</span>
      <span className="sr-only">Lagret i notatboka</span>
    </span>
  ) : (
    <span className={stateClass}>{children}</span>
  )

  return (
    <WordPopup word={text} explanation={explanation} onSave={handleSave}>
      {trigger}
    </WordPopup>
  )
}
