import { describe, it, expect } from 'vitest'
import { SEED_READING_PASSAGES, SEED_READING_PASSAGE_IDS } from '@/lib/reading-loader'

// Pipeline-honesty guard (Rule 8): the B2 read→recite→write passages must be
// reachable through the same pool /skriv reads, correctly leveled, concept-keyed,
// and internally consistent (recite indices in range, sentences reconstruct
// paragraphs) — otherwise "B2 skriv shipped" is a false claim.
describe('B2 reading passages are wired into the live reading pool', () => {
  const EXPECT: Record<string, string> = {
    'b2-rp-001': 'complex-argumentation',
    'b2-rp-002': 'text-cohesion',
    'b2-rp-003': 'advanced-passive',
  }

  it('all 3 B2 passages load into the pool at B2 level', () => {
    for (const id of Object.keys(EXPECT)) {
      const p = SEED_READING_PASSAGES[id]
      expect(p, `${id} missing from pool`).toBeDefined()
      expect(p.cefrLevel).toBe('B2')
    }
  })

  it('each B2 passage is indexed by its primary concept for scheduling', () => {
    for (const [id, concept] of Object.entries(EXPECT)) {
      expect(SEED_READING_PASSAGE_IDS[concept] ?? [], `${concept} not keyed to ${id}`).toContain(id)
    }
  })

  it('recite targets are valid indices and sentences reconstruct the paragraphs', () => {
    for (const id of Object.keys(EXPECT)) {
      const p = SEED_READING_PASSAGES[id]
      expect(p.reciteTargetIndices.length).toBeGreaterThan(0)
      for (const i of p.reciteTargetIndices) {
        expect(i).toBeGreaterThanOrEqual(0)
        expect(i).toBeLessThan(p.sentences.length)
        expect(p.sentences[i].length).toBeGreaterThan(0)
      }
      const fromPara = p.paragraphs.join(' ').replace(/\s+/g, ' ').trim()
      const fromSent = p.sentences.join(' ').replace(/\s+/g, ' ').trim()
      expect(fromSent).toBe(fromPara)
    }
  })

  it('B1 passages still load (no regression from adding B2)', () => {
    expect(SEED_READING_PASSAGES['b1-rp-001']?.cefrLevel).toBe('B1')
  })
})
