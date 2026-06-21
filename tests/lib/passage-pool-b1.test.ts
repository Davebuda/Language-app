import { describe, it, expect } from 'vitest'
import { SEED_PASSAGES, SEED_PASSAGE_IDS } from '@/lib/passage-pool'

// Pipeline-honesty guard (Rule 8): the B1 cloze passages must be reachable
// through the same pool the scheduler/useSession read, correctly leveled and
// keyed by their primary concept — otherwise "B1 cloze shipped" is a false claim.
describe('B1 cloze passages are wired into the live passage pool', () => {
  const B1_IDS = [
    'cz-b1-past-perfect-job',
    'cz-b1-modal-verbs-tickets',
    'cz-b1-prepositions-cabin',
    'cz-b1-possessive-reflexive-job',
    'cz-b1-discourse-derfor-rain',
  ]

  it('all 5 B1 passages load into SEED_PASSAGES at B1 level', () => {
    for (const id of B1_IDS) {
      const p = SEED_PASSAGES[id]
      expect(p, `${id} missing from pool`).toBeDefined()
      expect(p.cefrLevel).toBe('B1')
      expect(p.segments.some((s) => s.kind === 'gap')).toBe(true)
    }
  })

  it('each B1 passage is indexed by its primary concept for scheduling', () => {
    const expectations: Record<string, string> = {
      'cz-b1-past-perfect-job': 'past-perfect',
      'cz-b1-modal-verbs-tickets': 'common-modal-verbs',
      'cz-b1-prepositions-cabin': 'common-prepositions',
      'cz-b1-possessive-reflexive-job': 'possessive-pronouns',
      'cz-b1-discourse-derfor-rain': 'discourse-markers',
    }
    for (const [id, concept] of Object.entries(expectations)) {
      expect(SEED_PASSAGE_IDS[concept] ?? [], `${concept} not keyed to ${id}`).toContain(id)
    }
  })

  it('every B1 gap carries a concept id and a non-empty answer (per-gap diagnosis)', () => {
    for (const id of B1_IDS) {
      for (const seg of SEED_PASSAGES[id].segments) {
        if (seg.kind === 'gap') {
          expect(seg.conceptId).toBeTruthy()
          expect(seg.answer.length).toBeGreaterThan(0)
        }
      }
    }
  })
})
