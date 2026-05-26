import type { ConceptGraph } from '@/types/concepts'
import a1GraphJson from '@content/concepts/a1-graph.json'
import a2GraphJson from '@content/concepts/a2-graph.json'
import b1GraphJson from '@content/concepts/b1-graph.json'

const a1Graph = a1GraphJson as ConceptGraph
const a2Graph = a2GraphJson as ConceptGraph
const b1Graph = b1GraphJson as ConceptGraph

export function getGraphForLevel(level: string): ConceptGraph {
  switch (level) {
    case 'B1': return b1Graph
    case 'A2': return a2Graph
    default: return a1Graph
  }
}

export { a1Graph, a2Graph, b1Graph }
