import { describe, it, expect } from 'vitest'
import { SEED_READING_PASSAGES, SEED_READING_PASSAGE_IDS } from '@/lib/reading-loader'
import { ALL_ERROR_TAGS } from '@/types/taxonomy'

describe('reading-loader (B1+B2 seed content)', () => {
  const passages = Object.values(SEED_READING_PASSAGES)

  it('loads the seeded B1 and B2 passages', () => {
    const b1 = passages.filter((p) => p.cefrLevel === 'B1')
    const b2 = passages.filter((p) => p.cefrLevel === 'B2')
    expect(b1.length).toBe(6)
    expect(b2.length).toBe(3)
    // no below-B1 content yet (A1/A2 hit the honest gate, not silent substitution)
    expect(passages.every((p) => p.cefrLevel === 'B1' || p.cefrLevel === 'B2')).toBe(true)
  })

  it('keys passages by primaryConceptId', () => {
    for (const p of passages) {
      expect(SEED_READING_PASSAGE_IDS[p.primaryConceptId]).toContain(p.id)
    }
  })

  it('every passage satisfies the read→recite→write contract', () => {
    for (const p of passages) {
      // READ
      expect(p.paragraphs.length).toBeGreaterThanOrEqual(4)
      expect(p.sentences.length).toBeGreaterThan(0)
      // RECITE — indices in range, non-empty, bounded (not the whole passage)
      expect(p.reciteTargetIndices.length).toBeGreaterThan(0)
      expect(p.reciteTargetIndices.length).toBeLessThan(p.sentences.length)
      for (const i of p.reciteTargetIndices) {
        expect(i).toBeGreaterThanOrEqual(0)
        expect(i).toBeLessThan(p.sentences.length)
      }
      // WRITE
      expect(p.writePrompt.trim().length).toBeGreaterThan(0)
      expect(p.targetConnectors.length).toBeGreaterThan(0)
      expect(ALL_ERROR_TAGS).toContain(p.targetStructureTag)
      expect(p.passageContentWords.length).toBeGreaterThanOrEqual(8)
      // content words must actually appear in the body (on-topic overlap relies on it)
      const body = p.paragraphs.join(' ').toLowerCase()
      for (const w of p.passageContentWords) {
        expect(body).toContain(w.toLowerCase())
      }
    }
  })
})
