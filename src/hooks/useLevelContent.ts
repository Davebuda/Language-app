'use client'

import { useMemo } from 'react'
import { useFingerprintStore } from '@/stores/fingerprint-store'
import { getGraphForLevel } from '@/lib/concept-graph-loader'
import type { CEFRLevel } from '@/types/fingerprint'
import type { ConceptGraph } from '@/types/concepts'

export interface LevelContent {
  level: CEFRLevel
  effectiveLevel: CEFRLevel
  graph: ConceptGraph
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

export function useLevelContent(): LevelContent {
  const fingerprint = useFingerprintStore((s) => s.fingerprint)
  const level: CEFRLevel = fingerprint?.currentLevel ?? 'A1'

  return useMemo(() => {
    const readiness = LEVEL_READINESS[level]
    const effectiveLevel = readiness.fallback ?? level
    const graph = getGraphForLevel(level)

    return {
      level,
      effectiveLevel,
      graph,
      isComplete: readiness.complete,
      fallbackMessage: FALLBACK_MESSAGES[level] || null,
    }
  }, [level])
}
