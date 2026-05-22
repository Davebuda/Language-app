import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── Mock Supabase client ──────────────────────────────────────────────────────
// Follow the project's vi.mock pattern (see webllm-health.test.ts).
// We capture the insert mock so we can assert on call args.

const mockInsert = vi.fn().mockResolvedValue({ error: null })

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    from: (_table: string) => ({
      insert: mockInsert,
    }),
  }),
}))

// crypto.subtle is available in jsdom but we need TextEncoder too — both are global in jsdom.

// ── Import under test (after mock is in place) ────────────────────────────────
import { logConceptExposure } from '@/lib/logEvents'

// ── Helpers ───────────────────────────────────────────────────────────────────

function flush(): Promise<void> {
  // Allow the fire-and-forget void promise to settle.
  return new Promise((resolve) => setTimeout(resolve, 0))
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('logConceptExposure', () => {
  beforeEach(() => {
    mockInsert.mockClear()
    mockInsert.mockResolvedValue({ error: null })
  })

  it('writes one row per unique conceptId', async () => {
    logConceptExposure('user-abc', ['v2-word-order', 'noun-gender', 'common-prepositions'])
    await flush()

    expect(mockInsert).toHaveBeenCalledTimes(1)
    const rows: Array<{ concept_id: string }> = mockInsert.mock.calls[0][0]
    expect(rows).toHaveLength(3)
    expect(rows.map((r) => r.concept_id)).toEqual(
      expect.arrayContaining(['v2-word-order', 'noun-gender', 'common-prepositions']),
    )
  })

  it('deduplicates conceptIds before insert', async () => {
    logConceptExposure('user-abc', ['v2-word-order', 'v2-word-order', 'noun-gender'])
    await flush()

    expect(mockInsert).toHaveBeenCalledTimes(1)
    const rows: Array<{ concept_id: string }> = mockInsert.mock.calls[0][0]
    expect(rows).toHaveLength(2)
    const ids = rows.map((r) => r.concept_id)
    expect(ids).toContain('v2-word-order')
    expect(ids).toContain('noun-gender')
  })

  it('silently skips when conceptIds is empty — does not call insert', async () => {
    logConceptExposure('user-abc', [])
    await flush()

    expect(mockInsert).not.toHaveBeenCalled()
  })

  it('uses event_type concept_exposure on every row', async () => {
    logConceptExposure('user-abc', ['present-tense-regular', 'question-formation'])
    await flush()

    const rows: Array<{ event_type: string }> = mockInsert.mock.calls[0][0]
    for (const row of rows) {
      expect(row.event_type).toBe('concept_exposure')
    }
  })

  it('sets correct_bool to true on every row', async () => {
    logConceptExposure('user-abc', ['word-formation'])
    await flush()

    const rows: Array<{ correct_bool: boolean }> = mockInsert.mock.calls[0][0]
    for (const row of rows) {
      expect(row.correct_bool).toBe(true)
    }
  })

  it('does not throw when Supabase returns an error', async () => {
    mockInsert.mockResolvedValueOnce({ error: { message: 'connection refused' } })

    // Should not throw; fire-and-forget pattern absorbs the error.
    await expect(
      (async () => {
        logConceptExposure('user-abc', ['noun-gender'])
        await flush()
      })(),
    ).resolves.toBeUndefined()
  })
})
