'use client'

import { useFingerprint } from '@/hooks/useFingerprint'
import { useFingerprintStore } from '@/stores/fingerprint-store'
import { isMastered, getConceptPhase } from '@/engine'
import type { ConceptPhase } from '@/engine'
import { BottomNav } from '@/components/layout/BottomNav'
import { ConceptProgressRow } from '@/components/progress/ConceptProgressRow'
import { getConceptColor } from '@/lib/concept-colors'
import type { ConceptGraph, ConceptNode } from '@/types/concepts'
import conceptGraphJson from '@content/concepts/a1-graph.json'

const conceptGraph = conceptGraphJson as ConceptGraph

const PHASE_META: Record<ConceptPhase, { label: string; badgeTone: string; description: string }> = {
  maintenance: {
    label: 'Maintenance',
    badgeTone: 'bg-[var(--nc-green-tint)] border-[var(--nc-green-border)] text-[var(--nc-green)]',
    description: 'Strong — held at spaced intervals',
  },
  consolidation: {
    label: 'Consolidating',
    badgeTone: 'bg-[var(--nc-red-tint)] border-[var(--nc-red-border)] text-[var(--nc-red)]',
    description: 'Solidifying — nearly mastered',
  },
  practice: {
    label: 'Practice',
    badgeTone: 'bg-[rgba(249,115,22,0.08)] border-[rgba(249,115,22,0.22)] text-[#F97316]',
    description: 'Active drilling in progress',
  },
  intro: {
    label: 'Intro',
    badgeTone: 'bg-[var(--nc-card-soft)] border-[var(--nc-border)] text-[var(--nc-text-muted)]',
    description: 'Just started — first exposures',
  },
  locked: {
    label: 'Locked',
    badgeTone: 'bg-transparent border-[var(--nc-border)] text-[var(--nc-text-dim)] opacity-60',
    description: 'Prerequisites not yet cleared',
  },
}

const PHASE_ORDER: ConceptPhase[] = ['maintenance', 'consolidation', 'practice', 'intro', 'locked']

function getPrereqLabel(concept: ConceptNode, allConcepts: ConceptNode[]): string {
  const firstPrereq = allConcepts.find(
    (candidate) => candidate.id === concept.prerequisites[0],
  )
  return firstPrereq ? `Needs ${firstPrereq.label}` : 'Locked'
}

export default function ProgressPage() {
  useFingerprint()
  const { fingerprint } = useFingerprintStore()

  const masteredIds = new Set(
    conceptGraph.concepts
      .filter((concept) => {
        const mastery = fingerprint?.conceptMastery[concept.id]
        return isMastered(
          mastery,
          concept.masteryThreshold,
          concept.minAttempts,
          concept.minDays,
        )
      })
      .map((concept) => concept.id),
  )

  // Group concepts by phase
  const byPhase: Record<ConceptPhase, ConceptNode[]> = {
    maintenance: [],
    consolidation: [],
    practice: [],
    intro: [],
    locked: [],
  }

  conceptGraph.concepts.forEach((concept) => {
    const mastery = fingerprint?.conceptMastery[concept.id]
    const phase = getConceptPhase(mastery, concept.prerequisites, masteredIds)
    byPhase[phase].push(concept)
  })

  const totalCount = conceptGraph.concepts.length
  const masteredCount = byPhase.maintenance.length + byPhase.consolidation.length

  return (
    <div className="nc-gradient-page flex flex-col min-h-dvh">
      <main className="relative z-10 mx-auto flex w-full max-w-lg flex-1 flex-col gap-4 px-5 pb-6 pt-5">
        <div>
          <div className="nc-label">Concepts</div>
          <h1 className="mt-2 text-[2rem] font-display font-semibold text-[var(--nc-text)]">
            Progress
          </h1>
          <p className="mt-1 text-sm text-[var(--nc-text-muted)]">
            A1 — {masteredCount} of {totalCount} in maintenance or consolidation
          </p>
        </div>

        {PHASE_ORDER.map((phase, phaseIndex) => {
          const concepts = byPhase[phase]
          if (!concepts.length) return null
          const meta = PHASE_META[phase]

          // Running index for consistent colour assignment
          const startIndex = PHASE_ORDER.slice(0, phaseIndex)
            .reduce((sum, p) => sum + byPhase[p].length, 0)

          return (
            <section key={phase}>
              <div className="nc-glass flex items-center justify-between gap-3 px-4 py-3 mb-2">
                <div>
                  <div className="text-[13px] font-medium text-[var(--nc-text)]">{meta.label}</div>
                  <div className="mt-0.5 text-[11px] text-[var(--nc-text-dim)]">{meta.description}</div>
                </div>
                <div className={`rounded-[var(--radius)] border px-3 py-1 text-[10px] font-medium uppercase tracking-[0.12em] ${meta.badgeTone}`}>
                  {concepts.length}
                </div>
              </div>
              <div className="flex flex-col gap-1">
                {concepts.map((concept, i) => (
                  <ConceptProgressRow
                    key={concept.id}
                    color={phase === 'locked' ? 'var(--nc-border)' : getConceptColor(concept.id, startIndex + i)}
                    name={concept.label}
                    score={Math.round(fingerprint?.conceptMastery[concept.id]?.decayedScore ?? 0)}
                    locked={phase === 'locked'}
                    prereqLabel={phase === 'locked' ? getPrereqLabel(concept, conceptGraph.concepts) : undefined}
                  />
                ))}
              </div>
            </section>
          )
        })}
      </main>

      <BottomNav active="progress" />
    </div>
  )
}
