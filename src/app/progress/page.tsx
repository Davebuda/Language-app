'use client'

import { useFingerprint } from '@/hooks/useFingerprint'
import { useFingerprintStore } from '@/stores/fingerprint-store'
import { isMastered, getConceptPhase } from '@/engine'
import type { ConceptPhase } from '@/engine'
import { BottomNav } from '@/components/layout/BottomNav'
import { ConceptProgressRow } from '@/components/progress/ConceptProgressRow'
import { formatNextReview } from '@/lib/srs-format'
import { WeeklyTrajectory } from '@/components/progress/WeeklyTrajectory'
import { getConceptColor } from '@/lib/concept-colors'
import { getGraphForLevel, getCumulativeConcepts } from '@/lib/concept-graph-loader'
import { deriveBreakerStory } from '@/lib/breaker-story'
import { BreakerStoryPanel } from '@/components/progress/BreakerStoryPanel'
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
      <div className="nc-gradient-page nc-secondary-flow flex flex-col min-h-dvh">
        <main className="nc-mobile-shell nc-flow-shell">
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

  // The breaker story (T1.3): what's breaking the learner's sentences, shrinking,
  // and what they've fixed — derived from the real error log + mastery, cross-level
  // labelled (a breaker can be an A1 prereq surfacing at B1). Honest empty state.
  const breakerStory = fingerprint
    ? deriveBreakerStory(fingerprint, getCumulativeConcepts(levelLabel))
    : { active: [], retired: [] }

  return (
    <div className="nc-gradient-page nc-secondary-flow flex min-h-dvh flex-col">
      <main className="nc-mobile-shell nc-flow-shell">
        <div className="nc-signal-panel p-3">
          <div className="nc-label">Læringsgraf</div>
          <h1 className="mt-1 text-balance text-[1.15rem] font-extrabold text-[var(--nc-signal-fg)]">
            Fremgang
          </h1>
          <p className="text-pretty mt-1 text-[0.78rem] leading-5 text-[rgba(8,17,13,0.72)]">
            {levelLabel} — {masteredCount} av {totalCount} konsepter ligger i befestning eller vedlikehold.
          </p>
        </div>

        {/* ── Breaker story (T1.3) — what breaks the learner's sentences, it
            shrinking, and what they've fixed. The core promise made visible. ── */}
        <BreakerStoryPanel story={breakerStory} />

        {/* Phase distribution bar — cream panel for contrast after lime hero */}
        {totalCount > 0 && (
          <div className="nc-glass-cream p-3">
            <div className="text-[9px] font-bold uppercase tracking-[0.12em] text-[var(--nc-cream-dim)] mb-2">Fasefordeling</div>
            <div className="flex h-2.5 w-full overflow-hidden rounded-full">
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
            <div className="mt-2.5 flex flex-wrap gap-x-3 gap-y-1">
              {PHASE_ORDER.map((phase) => {
                const count = byPhase[phase].length
                if (count === 0) return null
                return (
                  <div key={phase} className="flex items-center gap-1.5">
                    <div className="size-2 rounded-full" style={{ backgroundColor: PHASE_BAR_COLORS[phase] }} />
                    <span className="text-[0.6875rem] text-[var(--nc-cream-muted)]">
                      {PHASE_META[phase].label} <span className="tabular-nums font-bold text-[var(--nc-cream-text)]">{count}</span>
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Weekly trajectory chart */}
        {fingerprint?.weeklySprintHistory && fingerprint.weeklySprintHistory.length > 0 && (
          <WeeklyTrajectory history={fingerprint.weeklySprintHistory} />
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
              {/* Phase header — cream strip for dark↔cream alternation */}
              <div className="nc-glass-cream mb-1 flex items-center justify-between gap-3 px-3 py-2">
                <div className="flex items-center gap-2">
                  <div className={`size-2 rounded-full shrink-0`} style={{ backgroundColor: PHASE_BAR_COLORS[phase] }} />
                  <div>
                    <div className="text-[0.78rem] font-bold text-[var(--nc-cream-text)]">{meta.label}</div>
                    <div className="text-[0.6875rem] text-[var(--nc-cream-muted)]">{meta.description}</div>
                  </div>
                </div>
                <div className={`rounded-[0.3rem] border px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.12em] shrink-0 ${meta.badgeTone}`}>
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
                    nextReview={phase === 'locked' ? undefined : formatNextReview(fingerprint?.conceptMastery[concept.id]?.nextReviewAt)}
                    variant="dark"
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
