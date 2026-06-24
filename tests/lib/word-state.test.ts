import { describe, it, expect } from 'vitest'
import { wordState } from '@/lib/word-state'
import { createNotebookItem, type NotebookItem, type ReviewStatus } from '@/types/notebook'

// Minimal item factory for the matching tests — only `norwegian` + `reviewStatus`
// drive wordState, the rest are defaults.
function item(norwegian: string, reviewStatus: ReviewStatus = 'new'): NotebookItem {
  return createNotebookItem({
    id: `id-${norwegian}-${reviewStatus}`,
    userId: 'u1',
    type: 'word',
    norwegian,
    source: 'reading',
    reviewStatus,
  })
}

describe('wordState (pure reader/notebook colour derivation)', () => {
  it('returns unknown when no item matches', () => {
    expect(wordState('huset', [item('katten')])).toBe('unknown')
  })

  it('returns unknown for an empty notebook', () => {
    expect(wordState('huset', [])).toBe('unknown')
  })

  it('returns saved when a matching item exists and is not known', () => {
    expect(wordState('huset', [item('huset')])).toBe('saved')
  })

  it('returns known when the matching item is marked known', () => {
    expect(wordState('huset', [item('huset', 'known')])).toBe('known')
  })

  it('matches case-insensitively and trimmed', () => {
    expect(wordState('  Huset ', [item('huset')])).toBe('saved')
    expect(wordState('HUSET', [item('Huset', 'known')])).toBe('known')
  })

  it('known wins over saved when both a known and a non-known item match', () => {
    expect(wordState('huset', [item('huset', 'new'), item('huset', 'known')])).toBe('known')
    // order-independent
    expect(wordState('huset', [item('huset', 'known'), item('huset', 'new')])).toBe('known')
  })

  it('treats a starred (not-known) match as saved', () => {
    expect(wordState('huset', [item('huset', 'starred')])).toBe('saved')
  })

  it('treats an archived match as saved (state is about existence, not visibility)', () => {
    expect(wordState('huset', [item('huset', 'archived')])).toBe('saved')
  })

  it('returns unknown for an empty/whitespace-only word', () => {
    expect(wordState('   ', [item('huset')])).toBe('unknown')
    expect(wordState('', [item('huset')])).toBe('unknown')
  })
})
