'use client'

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
  const firstPrereq = allConcepts.find((c) => c.id === concept.prerequisites[0])
  return firstPrereq ? `Krever: ${firstPrereq.label}` : 'Låst'
}

export default function ProgressPage() {
  useFingerprint()
  const { fingerprint } = useFingerprintStore()

  const masteredIds = new Set(
    conceptGraph.concepts
      .filter((c) => {
        const m = fingerprint?.conceptMastery[c.id]
        return isMastered(m, c.masteryThreshold, c.minAttempts, c.minDays)
      })
      .map((c) => c.id)
  )

  const mastered: ConceptNode[] = []
  const inProgress: ConceptNode[] = []
  const locked: ConceptNode[] = []

  conceptGraph.concepts.forEach((c) => {
    const hasData = !!fingerprint?.conceptMastery[c.id]
    const prereqsMet = c.prerequisites.every((p) => masteredIds.has(p))
    if (masteredIds.has(c.id)) {
      mastered.push(c)
    } else if (hasData || prereqsMet) {
      // hasData = actively practiced; prereqsMet = unlocked (ready to start)
      inProgress.push(c)
    } else {
      locked.push(c)
    }
  })

  const totalCount = conceptGraph.concepts.length

  return (
    <div className="flex min-h-dvh flex-col bg-nc-bg">
      <main className="mx-auto flex w-full max-w-lg flex-1 flex-col px-5 pb-4 pt-5">
        <h1 className="mb-1 text-[22px] font-extrabold text-white">Konsepter</h1>
        <p className="mb-5 text-[12px] text-white/30">
          A1 — {mastered.length} av {totalCount} mestret
        </p>

        {mastered.length > 0 && (
          <section className="mb-5">
            <div className="mb-2 text-[10px] font-bold uppercase tracking-widest text-white/30">
              🟢 Mestret
            </div>
            <div className="flex flex-col gap-2">
              {mastered.map((c, i) => (
                <ConceptProgressRow
                  key={c.id}
                  color={getConceptColor(c.id, i)}
                  name={c.label}
                  score={Math.round(fingerprint?.conceptMastery[c.id]?.decayedScore ?? 0)}
                />
              ))}
            </div>
          </section>
        )}

        {inProgress.length > 0 && (
          <section className="mb-5">
            <div className="mb-2 text-[10px] font-bold uppercase tracking-widest text-white/30">
              🔶 I gang
            </div>
            <div className="flex flex-col gap-2">
              {inProgress.map((c, i) => (
                <ConceptProgressRow
                  key={c.id}
                  color={getConceptColor(c.id, mastered.length + i)}
                  name={c.label}
                  score={Math.round(fingerprint?.conceptMastery[c.id]?.decayedScore ?? 0)}
                />
              ))}
            </div>
          </section>
        )}

        {locked.length > 0 && (
          <section className="mb-5">
            <div className="mb-2 text-[10px] font-bold uppercase tracking-widest text-white/30">
              🔒 Låst
            </div>
            <div className="flex flex-col gap-2">
              {locked.map((c) => (
                <ConceptProgressRow
                  key={c.id}
                  color="rgba(255,255,255,0.15)"
                  name={c.label}
                  score={0}
                  locked
                  prereqLabel={getPrereqLabel(c, conceptGraph.concepts)}
                />
              ))}
            </div>
          </section>
        )}
      </main>

      <BottomNav active="progress" />
    </div>
  )
}
