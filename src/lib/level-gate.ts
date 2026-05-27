import type { CEFRLevel } from '@/types/fingerprint'
import type { ConceptGraph } from '@/types/concepts'
import type { Sentence } from '@/types/content'
import { getGraphForLevel } from './concept-graph-loader'
import { loadContentSentences } from './content-loader'

export interface LevelContentConfig {
  level: CEFRLevel
  effectiveLevel: CEFRLevel
  graph: ConceptGraph
  sentences: Record<string, Sentence>
  availableSentenceIds: Record<string, string[]>
  isComplete: boolean
  fallbackMessage: string | null
}

const LEVEL_READINESS: Record<CEFRLevel, { complete: boolean; fallback: CEFRLevel | null }> = {
  A1: { complete: true, fallback: null },
  A2: { complete: true, fallback: null },
  B1: { complete: true, fallback: null },
  B2: { complete: true, fallback: null },
}

const FALLBACK_MESSAGES: Record<CEFRLevel, string> = {
  A1: '',
  A2: '',
  B1: '',
  B2: '',
}

export function getLevelContentConfig(level: CEFRLevel): LevelContentConfig {
  const readiness = LEVEL_READINESS[level]
  const effectiveLevel = readiness.fallback ?? level
  const graph = getGraphForLevel(level)
  const { sentences, availableSentenceIds } = loadContentSentences()

  const graphConceptIds = new Set(graph.concepts.map(c => c.id))
  const filteredSentenceIds: Record<string, string[]> = {}
  const filteredSentences: Record<string, Sentence> = {}

  for (const [conceptId, sids] of Object.entries(availableSentenceIds)) {
    if (!graphConceptIds.has(conceptId)) continue
    filteredSentenceIds[conceptId] = sids
    for (const sid of sids) {
      if (sentences[sid]) filteredSentences[sid] = sentences[sid]
    }
  }

  return {
    level,
    effectiveLevel,
    graph,
    sentences: filteredSentences,
    availableSentenceIds: filteredSentenceIds,
    isComplete: readiness.complete,
    fallbackMessage: FALLBACK_MESSAGES[level] || null,
  }
}
