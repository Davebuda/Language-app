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

const LEVEL_ORDER: CEFRLevel[] = ['A1', 'A2', 'B1', 'B2']

/** True when a sentence's CEFR level is at or below the requested ceiling. */
function atOrBelowLevel(sentenceLevel: string, maxLevel: CEFRLevel): boolean {
  const si = LEVEL_ORDER.indexOf(sentenceLevel as CEFRLevel)
  const mi = LEVEL_ORDER.indexOf(maxLevel)
  return si >= 0 && si <= mi
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
    // CEFR ceiling (load-bearing): with the p6 multi-skill Q-matrix, a foundational
    // concept (e.g. A1 `personal-pronouns`) is now ALSO tagged on higher-level
    // sentences a learner exercises it in (e.g. a B1 sentence). Those higher-level
    // sentences must NOT enter a lower-level learner's pool — an A1 learner never
    // sees B1 content. Filter each concept's sentences to cefrLevel <= the requested
    // level (the same ceiling filterSentencesByLevel applies in the scheduler).
    // Remediate-at-level is unaffected: it selects via the scheduler's own pool,
    // where a B2 learner's ceiling is B2 and the enriched B2 sentences pass.
    const keep = sids.filter((sid) => sentences[sid] && atOrBelowLevel(sentences[sid].cefrLevel, level))
    if (keep.length === 0) continue
    filteredSentenceIds[conceptId] = keep
    for (const sid of keep) filteredSentences[sid] = sentences[sid]
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
