import { describe, it, expect } from 'vitest'
import {
  createNotebookItem,
  normalizeNotebookItem,
  type NotebookItem,
} from './notebook'

// ---------------------------------------------------------------------------
// normalizeNotebookItem
// ---------------------------------------------------------------------------

describe('normalizeNotebookItem — schema migration on load', () => {
  // Simulate a legacy item that predates the `tags`, `srsLevel`, and `promoted`
  // fields (the fields most likely to be added after initial save).
  function legacyItem(over: Partial<NotebookItem> = {}): NotebookItem {
    return {
      id: 'legacy-id',
      userId: 'user-1',
      type: 'word',
      norwegian: 'hund',
      source: 'manual',
      reviewStatus: 'new',
      verified: false,
      // Deliberately omit: tags, promoted, srsLevel, nextReviewAt
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
      ...over,
    } as unknown as NotebookItem
  }

  it('backfills missing tags to []', () => {
    const item = normalizeNotebookItem(legacyItem())
    expect(item.tags).toEqual([])
  })

  it('backfills missing srsLevel to 0', () => {
    const item = normalizeNotebookItem(legacyItem())
    expect(item.srsLevel).toBe(0)
  })

  it('backfills missing promoted to false', () => {
    const item = normalizeNotebookItem(legacyItem())
    expect(item.promoted).toBe(false)
  })

  it('backfills missing nextReviewAt to null', () => {
    const item = normalizeNotebookItem(legacyItem())
    expect(item.nextReviewAt).toBeNull()
  })

  it('does not drop present fields — stored values win over defaults', () => {
    const item = normalizeNotebookItem(
      legacyItem({
        norwegian: 'katt',
        english: 'cat',
        reviewStatus: 'starred',
        verified: true,
      }),
    )
    expect(item.norwegian).toBe('katt')
    expect(item.english).toBe('cat')
    expect(item.reviewStatus).toBe('starred')
    expect(item.verified).toBe(true)
  })

  it('does not clobber tags when already present', () => {
    const item = normalizeNotebookItem(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      { ...(legacyItem() as any), tags: ['animal', 'A1'] } as NotebookItem,
    )
    expect(item.tags).toEqual(['animal', 'A1'])
  })

  it('does not clobber srsLevel when already non-zero', () => {
    const item = normalizeNotebookItem(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      { ...(legacyItem() as any), srsLevel: 3 } as NotebookItem,
    )
    expect(item.srsLevel).toBe(3)
  })

  it('does not clobber promoted when already true', () => {
    const item = normalizeNotebookItem(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      { ...(legacyItem() as any), promoted: true } as NotebookItem,
    )
    expect(item.promoted).toBe(true)
  })

  it('a fully current item round-trips unchanged in shape', () => {
    const full: NotebookItem = {
      id: 'full-id',
      userId: 'user-2',
      type: 'phrase',
      norwegian: 'god morgen',
      english: 'good morning',
      source: 'conversation',
      tags: ['greeting'],
      reviewStatus: 'learning',
      verified: true,
      promoted: false,
      srsLevel: 2,
      nextReviewAt: '2026-07-01T00:00:00.000Z',
      createdAt: '2026-06-01T00:00:00.000Z',
      updatedAt: '2026-06-20T00:00:00.000Z',
    }
    expect(normalizeNotebookItem(full)).toEqual(full)
  })
})

// ---------------------------------------------------------------------------
// createNotebookItem
// ---------------------------------------------------------------------------

describe('createNotebookItem — factory', () => {
  it('produces a valid item with required fields', () => {
    const item = createNotebookItem({
      id: 'test-id',
      userId: 'user-3',
      type: 'word',
      norwegian: 'bil',
      source: 'okt',
    })
    expect(item.id).toBe('test-id')
    expect(item.userId).toBe('user-3')
    expect(item.type).toBe('word')
    expect(item.norwegian).toBe('bil')
    expect(item.source).toBe('okt')
  })

  it('fills sane defaults when optional fields are omitted', () => {
    const item = createNotebookItem({
      id: 'defaults-id',
      userId: 'user-4',
      type: 'sentence',
      norwegian: 'Jeg liker kaffe.',
      source: 'journal',
    })
    expect(item.tags).toEqual([])
    expect(item.reviewStatus).toBe('new')
    expect(item.verified).toBe(false)
    expect(item.promoted).toBe(false)
    expect(item.srsLevel).toBe(0)
    expect(item.nextReviewAt).toBeNull()
  })

  it('sets createdAt and updatedAt to an ISO string', () => {
    const before = Date.now()
    const item = createNotebookItem({
      id: 'ts-id',
      userId: 'user-5',
      type: 'note',
      norwegian: 'minne',
      source: 'manual',
    })
    const after = Date.now()
    const createdMs = new Date(item.createdAt).getTime()
    expect(createdMs).toBeGreaterThanOrEqual(before)
    expect(createdMs).toBeLessThanOrEqual(after)
    expect(item.createdAt).toBe(item.updatedAt)
  })

  it('respects explicitly supplied optional fields', () => {
    const item = createNotebookItem({
      id: 'opt-id',
      userId: 'user-6',
      type: 'rule',
      norwegian: 'V2-regelen',
      source: 'reading',
      english: 'The V2 rule',
      tags: ['grammar', 'word-order'],
      reviewStatus: 'starred',
      verified: true,
      promoted: true,
      srsLevel: 4,
    })
    expect(item.english).toBe('The V2 rule')
    expect(item.tags).toEqual(['grammar', 'word-order'])
    expect(item.reviewStatus).toBe('starred')
    expect(item.verified).toBe(true)
    expect(item.promoted).toBe(true)
    expect(item.srsLevel).toBe(4)
  })
})
