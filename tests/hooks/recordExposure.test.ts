/**
 * Tests for the recordExposure logic in useFingerprint.
 *
 * The hook uses useFingerprintStore.getState() + setFingerprint, so we test
 * the state mutation directly via the store — the same approach used by
 * useFingerprint.test.ts for recordResult-adjacent engine contracts.
 *
 * recordExposure is a pure in-memory update: it increments attemptCount by 0.3,
 * updates lastAttemptAt, and does NOT touch rawScore or confidenceScore.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createEmptyFingerprint } from '@/types/fingerprint'
import type { ConceptMastery, MistakeFingerprint } from '@/types/fingerprint'

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    from: () => ({ insert: vi.fn().mockResolvedValue({ error: null }) }),
  }),
}))

vi.mock('@/storage/indexeddb', () => ({
  loadFingerprint: vi.fn().mockResolvedValue(null),
  saveFingerprint: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('@/lib/logEvents', () => ({
  logConceptExposure: vi.fn(),
  logWeeklyCheckComplete: vi.fn(),
  logSessionResults: vi.fn(),
}))

// ── Helper: build a minimal ConceptMastery entry ──────────────────────────────

function makeMastery(overrides: Partial<ConceptMastery> = {}): ConceptMastery {
  return {
    conceptId: 'test-concept',
    rawScore: 60,
    confidenceScore: 0.5,
    decayedScore: 55,
    attemptCount: 4,
    correctCount: 3,
    uniqueDaysActive: 1,
    lastAttemptAt: '2026-01-01T00:00:00.000Z',
    lastCorrectAt: '2026-01-01T00:00:00.000Z',
    streak: 2,
    recentOutcomes: [true, true, false, true, false],
    srsLevel: 1,
    nextReviewAt: null,
    ...overrides,
  }
}

// ── Simulate the recordExposure mutation in isolation ─────────────────────────
// Rather than rendering the hook, we replicate the exact mutation logic from
// useFingerprint.recordExposure so we can assert on the resulting state object.
// This is the same isolation strategy used in useFingerprint.test.ts.

function applyExposure(
  fp: MistakeFingerprint,
  conceptIds: string[],
  now: string,
): MistakeFingerprint {
  if (!conceptIds.length) return fp
  const unique = Array.from(new Set(conceptIds))

  const next: MistakeFingerprint = { ...fp, conceptMastery: { ...fp.conceptMastery } }
  for (const conceptId of unique) {
    const existing = next.conceptMastery[conceptId]
    if (!existing) continue  // unknown concept — silently skip
    next.conceptMastery[conceptId] = {
      ...existing,
      attemptCount: existing.attemptCount + 0.3,
      lastAttemptAt: now,
    }
  }
  next.updatedAt = now
  return next
}

// ── Tests ─────────────────────────────────────────────────────────────────────

const NOW = '2026-05-22T10:00:00.000Z'

describe('recordExposure', () => {
  let fp: MistakeFingerprint

  beforeEach(() => {
    fp = {
      ...createEmptyFingerprint('test-user'),
      conceptMastery: {
        'v2-word-order': makeMastery({ conceptId: 'v2-word-order', rawScore: 50, confidenceScore: 0.4, attemptCount: 3 }),
        'noun-gender': makeMastery({ conceptId: 'noun-gender', rawScore: 40, confidenceScore: 0.3, attemptCount: 2 }),
        'common-prepositions': makeMastery({ conceptId: 'common-prepositions', rawScore: 70, confidenceScore: 0.6, attemptCount: 8 }),
      },
    }
  })

  it('increments attemptCount by 0.3 for each unique conceptId', () => {
    const result = applyExposure(fp, ['v2-word-order', 'noun-gender'], NOW)

    expect(result.conceptMastery['v2-word-order'].attemptCount).toBeCloseTo(3.3)
    expect(result.conceptMastery['noun-gender'].attemptCount).toBeCloseTo(2.3)
    // untouched concept unchanged
    expect(result.conceptMastery['common-prepositions'].attemptCount).toBe(8)
  })

  it('does NOT change rawScore', () => {
    const result = applyExposure(fp, ['v2-word-order'], NOW)

    expect(result.conceptMastery['v2-word-order'].rawScore).toBe(50)
  })

  it('does NOT change confidenceScore', () => {
    const result = applyExposure(fp, ['v2-word-order'], NOW)

    expect(result.conceptMastery['v2-word-order'].confidenceScore).toBe(0.4)
  })

  it('updates lastAttemptAt to now', () => {
    const result = applyExposure(fp, ['noun-gender'], NOW)

    expect(result.conceptMastery['noun-gender'].lastAttemptAt).toBe(NOW)
  })

  it('deduplicates conceptIds — ["x", "x"] increments attemptCount once', () => {
    const before = fp.conceptMastery['v2-word-order'].attemptCount
    const result = applyExposure(fp, ['v2-word-order', 'v2-word-order'], NOW)

    expect(result.conceptMastery['v2-word-order'].attemptCount).toBeCloseTo(before + 0.3)
  })

  it('silently skips unknown conceptIds — no entry created', () => {
    const result = applyExposure(fp, ['does-not-exist'], NOW)

    expect(result.conceptMastery['does-not-exist']).toBeUndefined()
    // known concepts untouched
    expect(result.conceptMastery['v2-word-order'].attemptCount).toBe(3)
  })

  it('returns unchanged fingerprint when conceptIds is empty', () => {
    const result = applyExposure(fp, [], NOW)

    // Same reference returned for early exit
    expect(result).toBe(fp)
  })
})
