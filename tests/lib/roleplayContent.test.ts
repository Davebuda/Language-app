import { describe, it, expect } from 'vitest'
import { ROLEPLAY_SCENARIOS } from '@/lib/roleplayContent'
import { ALL_ERROR_TAGS } from '@/types/taxonomy'
import a1GraphJson from '@content/concepts/a1-graph.json'
import a2GraphJson from '@content/concepts/a2-graph.json'
import type { ConceptGraph } from '@/types/concepts'

const a1Graph = a1GraphJson as ConceptGraph
const a2Graph = a2GraphJson as ConceptGraph

const ALL_CONCEPT_IDS = new Set([
  ...a1Graph.concepts.map((c) => c.id),
  ...a2Graph.concepts.map((c) => c.id),
])

// Flatten all turns across all scenarios so it.each can iterate them with descriptive labels.
const ALL_TURNS = ROLEPLAY_SCENARIOS.flatMap((scenario) =>
  scenario.turns.map((turn) => ({
    scenarioId: scenario.id,
    turnId: turn.id,
    label: `${scenario.id}.${turn.id}`,
    targetConceptId: turn.targetConceptId,
    errorTag: turn.errorTag,
    expectedKeywords: turn.expectedKeywords,
    modelAnswer: turn.modelAnswer,
  })),
)

describe('ROLEPLAY_SCENARIOS — concept-tag validity', () => {
  it.each(ALL_TURNS)(
    'turn $label has a targetConceptId that exists in a1/a2 graph',
    (turn) => {
      expect(
        ALL_CONCEPT_IDS.has(turn.targetConceptId),
        `Turn "${turn.label}" has targetConceptId "${turn.targetConceptId}" which is not in a1-graph.json or a2-graph.json`,
      ).toBe(true)
    },
  )

  it.each(ALL_TURNS)(
    'turn $label has an errorTag that exists in the taxonomy',
    (turn) => {
      expect(
        ALL_ERROR_TAGS.includes(turn.errorTag),
        `Turn "${turn.label}" has errorTag "${turn.errorTag}" which is not in the canonical taxonomy`,
      ).toBe(true)
    },
  )

  it('every scenario has unique id', () => {
    const ids = ROLEPLAY_SCENARIOS.map((s) => s.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('every turn within a scenario has unique id', () => {
    for (const scenario of ROLEPLAY_SCENARIOS) {
      const turnIds = scenario.turns.map((t) => t.id)
      expect(
        new Set(turnIds).size,
        `Scenario "${scenario.id}" has duplicate turn ids`,
      ).toBe(turnIds.length)
    }
  })

  it('every turn has at least one expectedKeyword and a non-empty modelAnswer', () => {
    for (const turn of ALL_TURNS) {
      expect(turn.expectedKeywords.length, `Turn ${turn.label}`).toBeGreaterThan(0)
      expect(turn.modelAnswer.length, `Turn ${turn.label}`).toBeGreaterThan(0)
    }
  })

  it('no turn routes to the legacy "speaking-production" catch-all', () => {
    // Pipeline-honesty regression guard. The 2026-05-22 holistic audit closed the bug
    // where every roleplay recordResult write used 'speaking-production' instead of the
    // real concept the turn exposes. This test prevents the catch-all from regressing
    // via copy-paste when new turns or scenarios are authored.
    for (const turn of ALL_TURNS) {
      expect(
        turn.targetConceptId,
        `Turn "${turn.label}" reverted to the catch-all 'speaking-production'`,
      ).not.toBe('speaking-production')
    }
  })
})
