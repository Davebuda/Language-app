'use client'

import { useMemo } from 'react'
import { useFingerprintStore } from '@/stores/fingerprint-store'
import { getConceptPhase, isMastered } from '@/engine'
import { getGraphForLevel } from '@/lib/concept-graph-loader'

export function ProgressReassuranceStrip() {
  const { fingerprint, status } = useFingerprintStore()

  const activeGraph = getGraphForLevel(fingerprint?.currentLevel ?? 'A1')

  const stats = useMemo(() => {
    if (!fingerprint) return null

    const practisedCount = Object.values(fingerprint.conceptMastery).filter(
      (m) => m.attemptCount > 0,
    ).length

    const speakingMins = Math.round(fingerprint.speakingMinutesTotal ?? 0)

    const masteredIds = new Set(
      activeGraph.concepts
        .filter((c) =>
          isMastered(
            fingerprint.conceptMastery[c.id],
            c.masteryThreshold,
            c.minAttempts,
            c.minDays,
          ),
        )
        .map((c) => c.id),
    )

    const strongestConcept = activeGraph.concepts
      .map((c) => {
        const mastery = fingerprint.conceptMastery[c.id]
        const phase = getConceptPhase(mastery, c.prerequisites, masteredIds)
        return {
          label: c.label,
          phase,
          decayedScore: mastery?.decayedScore ?? 0,
        }
      })
      .filter((c) => c.phase === 'consolidation' || c.phase === 'maintenance')
      .sort((a, b) => b.decayedScore - a.decayedScore)[0] ?? null

    return {
      practisedCount,
      speakingMins,
      strongestConcept: strongestConcept
        ? { label: strongestConcept.label, phase: strongestConcept.phase }
        : null,
    }
  }, [fingerprint, activeGraph])

  if (status === 'loading') return null

  if (!fingerprint || fingerprint.totalSessionsCompleted === 0) {
    return (
      <p className="text-xs text-[var(--nc-text-dim)]">
        Start your first session to see your progress here.
      </p>
    )
  }

  if (!stats) return null

  return (
    <div role="region" aria-label="Din fremgang" className="flex flex-wrap gap-2">
      <span className="rounded-full border border-[var(--nc-border)] px-3 py-1 text-xs text-[var(--nc-text-muted)]">
        {stats.practisedCount} emner øvd
      </span>
      {stats.speakingMins > 0 && (
        <span className="rounded-full border border-[var(--nc-border)] px-3 py-1 text-xs text-[var(--nc-text-muted)]">
          {stats.speakingMins} min snakket
        </span>
      )}
      {stats.strongestConcept && (
        <span className="rounded-full border border-[var(--nc-border)] px-3 py-1 text-xs text-[var(--nc-text-muted)]">
          {stats.strongestConcept.label} · {stats.strongestConcept.phase}
        </span>
      )}
    </div>
  )
}
