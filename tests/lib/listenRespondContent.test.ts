import { describe, it, expect } from 'vitest'
import { LISTEN_RESPOND_QUESTIONS } from '@/lib/listenRespondContent'
import { ALL_ERROR_TAGS } from '@/types/taxonomy'
import a1GraphJson from '@content/concepts/a1-graph.json'
import a2GraphJson from '@content/concepts/a2-graph.json'
import b1GraphJson from '@content/concepts/b1-graph.json'
import type { ConceptGraph } from '@/types/concepts'

const a1Graph = a1GraphJson as ConceptGraph
const a2Graph = a2GraphJson as ConceptGraph
const b1Graph = b1GraphJson as ConceptGraph

const ALL_CONCEPT_IDS = new Set([
  ...a1Graph.concepts.map((c) => c.id),
  ...a2Graph.concepts.map((c) => c.id),
  ...b1Graph.concepts.map((c) => c.id),
])

describe('LISTEN_RESPOND_QUESTIONS — concept-tag validity', () => {
  it.each(LISTEN_RESPOND_QUESTIONS)(
    'question $id has a conceptId that exists in a1/a2 graph',
    (question) => {
      expect(
        ALL_CONCEPT_IDS.has(question.conceptId),
        `Question "${question.id}" has conceptId "${question.conceptId}" which is not in a1-graph.json or a2-graph.json`,
      ).toBe(true)
    },
  )

  it.each(LISTEN_RESPOND_QUESTIONS)(
    'question $id has an errorTag that exists in the taxonomy',
    (question) => {
      expect(
        ALL_ERROR_TAGS.includes(question.errorTag),
        `Question "${question.id}" has errorTag "${question.errorTag}" which is not in the canonical 17-tag error taxonomy`,
      ).toBe(true)
    },
  )

  it('every question has unique id', () => {
    const ids = LISTEN_RESPOND_QUESTIONS.map((q) => q.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('every question has at least one expectedKeyword', () => {
    for (const q of LISTEN_RESPOND_QUESTIONS) {
      expect(q.expectedKeywords.length).toBeGreaterThan(0)
    }
  })

  it('no question routes to the legacy "speaking-production" catch-all', () => {
    // Pipeline-honesty regression guard. Stream 5.5 audit closed the bug where
    // every recordResult write used 'speaking-production' instead of the real
    // concept the question exposes. This test prevents the catch-all from
    // sneaking back via copy-paste.
    for (const q of LISTEN_RESPOND_QUESTIONS) {
      expect(q.conceptId).not.toBe('speaking-production')
    }
  })
})
