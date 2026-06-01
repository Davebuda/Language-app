import type { ConceptGraph, ConceptNode } from '@/types/concepts'
import type { CEFRLevel } from '@/types/fingerprint'
import a1GraphJson from '@content/concepts/a1-graph.json'
import a2GraphJson from '@content/concepts/a2-graph.json'
import b1GraphJson from '@content/concepts/b1-graph.json'
import b2GraphJson from '@content/concepts/b2-graph.json'

const a1Graph = a1GraphJson as ConceptGraph
const a2Graph = a2GraphJson as ConceptGraph
const b1Graph = b1GraphJson as ConceptGraph
const b2Graph = b2GraphJson as ConceptGraph

export function getGraphForLevel(level: CEFRLevel): ConceptGraph {
  switch (level) {
    case 'A1': return a1Graph
    case 'A2': return a2Graph
    case 'B1': return b1Graph
    case 'B2': return b2Graph
    default: {
      void (level satisfies never)
      return a1Graph
    }
  }
}

const LEVEL_ORDER: CEFRLevel[] = ['A1', 'A2', 'B1', 'B2']

/**
 * Returns the deduped UNION of concepts from A1 up through `level`
 * (A1; A1+A2; A1+A2+B1; A1+A2+B1+B2). Use this ONLY for prerequisite
 * resolution / masteredIds construction so that a B1/B2 concept whose
 * prerequisites live at lower levels (e.g. b1 `past-perfect` requires A2
 * `perfect-tense`) can resolve its prereqs — a single-level graph from
 * getGraphForLevel cannot. NEW accessor — does NOT replace getGraphForLevel.
 *
 * Do NOT pass the result into any SEEDING path (seedInitialMastery /
 * level-up seeding): seeding a higher-level user must not seed lower-level
 * roots. This is read-time graph composition only — no data migration.
 */
export function getCumulativeConcepts(level: CEFRLevel): ConceptNode[] {
  const maxIdx = LEVEL_ORDER.indexOf(level)
  const upTo = maxIdx >= 0 ? LEVEL_ORDER.slice(0, maxIdx + 1) : ['A1' as CEFRLevel]
  const seen = new Set<string>()
  const out: ConceptNode[] = []
  for (const lvl of upTo) {
    for (const c of getGraphForLevel(lvl).concepts) {
      if (seen.has(c.id)) continue
      seen.add(c.id)
      out.push(c)
    }
  }
  return out
}

export { a1Graph, a2Graph, b1Graph, b2Graph }
