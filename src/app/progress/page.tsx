'use client'

import { useFingerprint } from '@/hooks/useFingerprint'
import { useFingerprintStore } from '@/stores/fingerprint-store'
import { isMastered, getConceptPhase } from '@/engine'
import type { ConceptPhase } from '@/engine'
import { BottomNav } from '@/components/layout/BottomNav'
import { ConceptProgressRow } from '@/components/progress/ConceptProgressRow'
import { getConceptColor } from '@/lib/concept-colors'
import { getGraphForLevel } from '@/lib/concept-graph-loader'
import type { ConceptNode } from '@/types/concepts'

const PHASE_META: Record<ConceptPhase, { label: string; badgeTone: string; description: string }> = {
  maintenance: {
    label: 'Vedlikehold',
    badgeTone: 'bg-[var(--nc-green-tint)] border-[var(--nc-green-border)] text-[var(--nc-green)]',
    description: 'Sterk — holdes med repetisjoner',
  },
  consolidation: {
    label: 'Befestning',
    badgeTone: 'bg-[var(--nc-red-tint)] border-[var(--nc-red-border)] text-[var(--nc-red)]',
    description: 'Nesten mestret — blir solid',
  },
  practice: {
    label: 'Øving',
    badgeTone: 'bg-[rgba(249,115,22,0.08)] border-[rgba(249,115,22,0.22)] text-[#F97316]',
    description: 'Aktiv trening pågår',
  },
  intro: {
    label: 'Introduksjon',
    badgeTone: 'bg-[var(--nc-card-soft)] border-[var(--nc-border)] text-[var(--nc-text-muted)]',
    description: 'Nettopp startet — første eksponering',
  },
  locked: {
    label: 'Låst',
    badgeTone: 'bg-transparent border-[var(--nc-border)] text-[var(--nc-text-dim)] opacity-60',
    description: 'Forkunnskaper ikke fullført',
  },
}

const PHASE_ORDER: ConceptPhase[] = ['maintenance', 'consolidation', 'practice', 'intro', 'locked']

const PHASE_BAR_COLORS: Record<ConceptPhase, string> = {
  maintenance: 'var(--nc-green)',
  consolidation: 'var(--nc-red)',
  practice: '#F97316',
  intro: 'var(--nc-text-muted)',
  locked: 'var(--nc-border)',
}

function getPrereqLabel(concept: ConceptNode, allConcepts: ConceptNode[]): string {
  const firstPrereq = allConcepts.find(
    (candidate) => candidate.id === concept.prerequisites[0],
  )
  return firstPrereq ? `Trenger ${firstPrereq.label}` : 'Låst'
}

export default function ProgressPage() {
  useFingerprint()
  const { fingerprint, status } = useFingerprintStore()
  const conceptGraph = getGraphForLevel(fingerprint?.currentLevel ?? 'A1')
  const levelLabel = fingerprint?.currentLevel ?? 'A1'

  if (status === 'loading') {
    return (
      <div className="nc-gradient-page flex flex-col min-h-dvh">
        <main className="relative z-10 mx-auto flex w-full max-w-lg flex-1 flex-col gap-4 px-5 pb-24 pt-5">
          <div className="h-8 w-48 animate-pulse rounded-lg bg-white/5" />
          <div className="h-4 w-64 animate-pulse rounded bg-white/5" />
        </main>
        <BottomNav active="progress" />
      </div>
    )
  }

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
      <main className="relative z-10 mx-auto flex w-full max-w-lg flex-1 flex-col gap-4 px-5 pb-24 pt-5">
        <div>
          <h1 className="text-balance text-[1.375rem] font-extrabold text-[var(--nc-text)]">
            Fremgang
          </h1>
          <p className="text-pretty mt-0.5 text-[0.8125rem] text-[var(--nc-text-muted)]">
            {levelLabel} — {masteredCount} av {totalCount} konsepter i befestning eller vedlikehold
          </p>
        </div>

        {/* Phase distribution bar */}
        {totalCount > 0 && (
          <div className="nc-glass-elevated p-4">
            <div className="flex h-3 w-full overflow-hidden rounded-full">
              {PHASE_ORDER.map((phase) => {
                const count = byPhase[phase].length
                if (count === 0) return null
                const pct = (count / totalCount) * 100
                return (
                  <div
                    key={phase}
                    style={{ width: `${pct}%`, backgroundColor: PHASE_BAR_COLORS[phase] }}
                    className="h-full first:rounded-l-full last:rounded-r-full"
                  />
                )
              })}
            </div>
            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1">
              {PHASE_ORDER.map((phase) => {
                const count = byPhase[phase].length
                if (count === 0) return null
                return (
                  <div key={phase} className="flex items-center gap-1.5">
                    <div className="size-2 rounded-full" style={{ backgroundColor: PHASE_BAR_COLORS[phase] }} />
                    <span className="text-[0.6875rem] text-[var(--nc-text-muted)]">
                      {PHASE_META[phase].label} <span className="tabular-nums font-semibold">{count}</span>
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Weekly sprint history */}
        {fingerprint && fingerprint.weeklySprintHistory.length > 0 && (
          <div className="nc-glass-elevated p-4">
            <div className="text-[0.6875rem] font-semibold uppercase tracking-[0.08em] text-[var(--nc-text-dim)] mb-3">
              Ukentlig historikk
            </div>
            <div className="flex flex-col gap-2">
              {fingerprint.weeklySprintHistory.slice(0, 4).map((week, i) => {
                const weekDate = new Date(week.weekStartedAt)
                const weekLabel = `${weekDate.getDate()}.${weekDate.getMonth() + 1}`
                const graduatedCount = Object.values(week.focusOutcomes).filter((o) => o.graduated).length
                const focusCount = week.focus.length
                return (
                  <div key={i} className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="tabular-nums text-[0.75rem] font-semibold text-[var(--nc-text-muted)] w-10 shrink-0">
                        {weekLabel}
                      </span>
                      <span className={`text-[0.6875rem] ${week.status === 'abandoned' ? 'text-[var(--nc-text-dim)]' : 'text-[var(--nc-text-muted)]'}`}>
                        {week.status === 'abandoned' ? 'Avbrutt' : `${graduatedCount}/${focusCount} mestret`}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {week.checkResult ? (
                        <span className="tabular-nums rounded-full bg-[var(--nc-red-tint)] px-2 py-0.5 text-[0.625rem] font-semibold text-[var(--nc-red)]">
                          {Math.round(week.checkResult.score)}%
                        </span>
                      ) : (
                        <span className="text-[0.625rem] text-[var(--nc-text-dim)]">
                          Ingen sjekk
                        </span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

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
