'use client'

import type { ReactNode } from 'react'
import { useFingerprint } from '@/hooks/useFingerprint'
import { useFingerprintStore } from '@/stores/fingerprint-store'
import { isMastered } from '@/engine'
import { BottomNav } from '@/components/layout/BottomNav'
import { ConceptProgressRow } from '@/components/progress/ConceptProgressRow'
import { getConceptColor } from '@/lib/concept-colors'
import type { ConceptGraph, ConceptNode } from '@/types/concepts'
import conceptGraphJson from '@content/concepts/a1-graph.json'

const conceptGraph = conceptGraphJson as ConceptGraph

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

  const mastered: ConceptNode[] = []
  const inProgress: ConceptNode[] = []
  const locked: ConceptNode[] = []

  conceptGraph.concepts.forEach((concept) => {
    const hasData = !!fingerprint?.conceptMastery[concept.id]
    const prereqsMet = concept.prerequisites.every((prerequisite) =>
      masteredIds.has(prerequisite),
    )

    if (masteredIds.has(concept.id)) {
      mastered.push(concept)
    } else if (hasData || prereqsMet) {
      inProgress.push(concept)
    } else {
      locked.push(concept)
    }
  })

  const totalCount = conceptGraph.concepts.length

  return (
    <div className="flex min-h-dvh flex-col bg-transparent">
      <main className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-4 px-5 pb-6 pt-5">
        <div className="nc-panel p-5">
          <div className="nc-label">Concepts</div>
          <h1 className="mt-2 text-[2rem] font-display font-semibold text-nc-text">
            Progress
          </h1>
          <p className="mt-2 text-sm text-nc-text-muted">
            A1 - {mastered.length} of {totalCount} mastered
          </p>
        </div>

        <ProgressGroup
          title="Mastered"
          concepts={mastered}
          countTone="bg-[rgba(214,255,90,0.24)] text-nc-text"
          renderRow={(concept, index) => (
            <ConceptProgressRow
              key={concept.id}
              color={getConceptColor(concept.id, index)}
              name={concept.label}
              score={Math.round(fingerprint?.conceptMastery[concept.id]?.decayedScore ?? 0)}
            />
          )}
        />

        <ProgressGroup
          title="In progress"
          concepts={inProgress}
          countTone="bg-nc-violet/18 text-nc-violet"
          renderRow={(concept, index) => (
            <ConceptProgressRow
              key={concept.id}
              color={getConceptColor(concept.id, mastered.length + index)}
              name={concept.label}
              score={Math.round(fingerprint?.conceptMastery[concept.id]?.decayedScore ?? 0)}
            />
          )}
        />

        <ProgressGroup
          title="Locked"
          concepts={locked}
          countTone="bg-[rgba(23,23,29,0.05)] text-nc-text-dim"
          renderRow={(concept) => (
            <ConceptProgressRow
              key={concept.id}
              color="rgba(23,23,29,0.18)"
              name={concept.label}
              score={0}
              locked
              prereqLabel={getPrereqLabel(concept, conceptGraph.concepts)}
            />
          )}
        />
      </main>

      <BottomNav active="progress" />
    </div>
  )
}

function ProgressGroup({
  title,
  concepts,
  countTone,
  renderRow,
}: {
  title: string
  concepts: ConceptNode[]
  countTone: string
  renderRow: (concept: ConceptNode, index: number) => ReactNode
}) {
  if (!concepts.length) return null

  return (
    <section className="nc-panel p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="text-[13px] font-medium text-nc-text">{title}</div>
        <div className={`rounded-[0.75rem] px-3 py-1 text-[10px] font-medium uppercase tracking-[0.12em] ${countTone}`}>
          {concepts.length}
        </div>
      </div>
      <div className="mt-4 flex flex-col gap-2">
        {concepts.map((concept, index) => renderRow(concept, index))}
      </div>
    </section>
  )
}
