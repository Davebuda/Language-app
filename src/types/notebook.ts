// Client-side type file — do NOT call Date.now() or new Date() in module scope.
// All time values are produced inside factory functions so that module import has
// no side effects and tests can run without a real clock.

export type NotebookItemType = 'word' | 'phrase' | 'sentence' | 'rule' | 'note'

export type NotebookSource = 'okt' | 'journal' | 'reading' | 'conversation' | 'manual'

export type ReviewStatus = 'new' | 'learning' | 'known' | 'starred' | 'archived'

export interface NotebookItem {
  id: string
  userId: string
  type: NotebookItemType
  norwegian: string
  english?: string
  explanation?: string
  grammarNote?: string
  source: NotebookSource
  sourceSentence?: string
  conceptId?: string
  tags: string[]
  learnerNote?: string
  reviewStatus: ReviewStatus
  /** corpus-backed (true) vs AI-suggested (false) */
  verified: boolean
  /** Hybrid "practice this" intent — user or engine has marked this item for økt injection */
  promoted: boolean
  srsLevel: number
  nextReviewAt: string | null
  createdAt: string
  updatedAt: string
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

/**
 * Create a new NotebookItem with sane defaults. `id` must be supplied by the
 * caller (crypto.randomUUID() or equivalent) so this function stays pure and
 * testable without a DOM environment.
 */
export function createNotebookItem(input: {
  id: string
  userId: string
  type: NotebookItemType
  norwegian: string
  english?: string
  explanation?: string
  grammarNote?: string
  source: NotebookSource
  sourceSentence?: string
  conceptId?: string
  tags?: string[]
  learnerNote?: string
  reviewStatus?: ReviewStatus
  verified?: boolean
  promoted?: boolean
  srsLevel?: number
  nextReviewAt?: string | null
}): NotebookItem {
  const now = new Date().toISOString()
  return {
    tags: [],
    reviewStatus: 'new',
    verified: false,
    promoted: false,
    srsLevel: 0,
    nextReviewAt: null,
    ...input,
    // Ensure these are always set to now when creating fresh; callers cannot
    // accidentally override timestamps via the spread above because we re-assign
    // them after the spread.
    createdAt: now,
    updatedAt: now,
  }
}

// ---------------------------------------------------------------------------
// Normalizer
// ---------------------------------------------------------------------------

/**
 * Backfill a loaded NotebookItem so every field added after it was last saved
 * is present. Stored values always win over defaults (spread order mirrors
 * normalizeFingerprint). Both IndexedDB and Supabase load paths must call this.
 *
 * Shallow by design: fills missing top-level keys only; never mutates existing
 * nested data.
 */
export function normalizeNotebookItem(raw: NotebookItem): NotebookItem {
  const defaults: Omit<NotebookItem, 'id' | 'userId' | 'type' | 'norwegian' | 'source' | 'createdAt' | 'updatedAt'> = {
    tags: [],
    reviewStatus: 'new',
    verified: false,
    promoted: false,
    srsLevel: 0,
    nextReviewAt: null,
  }
  return { ...defaults, ...raw }
}
