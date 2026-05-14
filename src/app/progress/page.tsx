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

const PHASE_META: Record<ConceptPhase, { label: string; countTone: string; description: string }> = {
  maintenance: {
    label: 'Maintenance',
    countTone: 'bg-[rgba(214,255,90,0.24)] text-nc-text',
    description: 'Strong — held at spaced intervals',
  },
  consolidation: {
    label: 'Consolidation',
    countTone: 'bg-nc-violet/18 text-nc-violet',
    description: 'Solidifying — nearly mastered',
  },
  practice: {
    label: 'Practice',
    countTone: 'bg-nc-apricot/20 text-nc-coral',
    description: 'Active drilling in progress',
  },
  intro: {
    label: 'Intro',
    countTone: 'bg-[rgba(23,23,29,0.06)] text-nc-text-muted',
    description: 'Just started — first exposures',
  },
  locked: {
    label: 'Locked',
    countTone: 'bg-[rgba(23,23,29,0.05)] text-nc-text-dim',
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
    <div className="flex min-h-dvh flex-col bg-transparent">
      <main className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-4 px-5 pb-6 pt-5">
        <div className="nc-panel p-5">
          <div className="nc-label">Concepts</div>
          <h1 className="mt-2 text-[2rem] font-display font-semibold text-nc-text">
            Progress
          </h1>
          <p className="mt-2 text-sm text-nc-text-muted">
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
            <section key={phase} className="nc-panel p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-[13px] font-medium text-nc-text">{meta.label}</div>
                  <div className="mt-0.5 text-[11px] text-nc-text-dim">{meta.description}</div>
                </div>
                <div className={`rounded-[0.75rem] px-3 py-1 text-[10px] font-medium uppercase tracking-[0.12em] ${meta.countTone}`}>
                  {concepts.length}
                </div>
              </div>
              <div className="mt-4 flex flex-col gap-2">
                {concepts.map((concept, i) => (
                  <ConceptProgressRow
                    key={concept.id}
                    color={phase === 'locked' ? 'rgba(23,23,29,0.18)' : getConceptColor(concept.id, startIndex + i)}
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
