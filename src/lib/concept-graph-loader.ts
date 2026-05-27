import type { ConceptGraph } from '@/types/concepts'
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

export { a1Graph, a2Graph, b1Graph, b2Graph }
