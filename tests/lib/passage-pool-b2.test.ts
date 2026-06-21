import { describe, it, expect } from 'vitest'
import { SEED_PASSAGES, SEED_PASSAGE_IDS } from '@/lib/passage-pool'

// Pipeline-honesty guard (Rule 8): the B2 cloze passages must be reachable
// through the same pool the scheduler/useSession read, correctly leveled and
// keyed by their primary concept — otherwise "B2 cloze shipped" is a false claim.
describe('B2 cloze passages are wired into the live passage pool', () => {
  const EXPECT: Record<string, string> = {
    'cz-b2-advanced-passive-report': 'advanced-passive',
    'cz-b2-reported-speech-director': 'reported-speech-advanced',
    'cz-b2-text-cohesion-project': 'text-cohesion',
    'cz-b2-professional-register-letter': 'professional-norwegian',
    'cz-b2-conditional-counterfactual': 'subjunctive-mood',
  }

  it('all 5 B2 passages load into SEED_PASSAGES at B2 level', () => {
    for (const id of Object.keys(EXPECT)) {
      const p = SEED_PASSAGES[id]
      expect(p, `${id} missing from pool`).toBeDefined()
      expect(p.cefrLevel).toBe('B2')
      expect(p.segments.some((s) => s.kind === 'gap')).toBe(true)
    }
  })

  it('each B2 passage is indexed by its primary concept for scheduling', () => {
    for (const [id, concept] of Object.entries(EXPECT)) {
      expect(SEED_PASSAGE_IDS[concept] ?? [], `${concept} not keyed to ${id}`).toContain(id)
    }
  })

  it('every B2 gap carries a concept id and a non-empty answer (per-gap diagnosis)', () => {
    for (const id of Object.keys(EXPECT)) {
      for (const seg of SEED_PASSAGES[id].segments) {
        if (seg.kind === 'gap') {
          expect(seg.conceptId).toBeTruthy()
          expect(seg.answer.length).toBeGreaterThan(0)
        }
      }
    }
  })
})
