'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { AnimatePresence, motion } from 'framer-motion'
import {
  ArrowRight,
  CalendarCheck2,
  Target,
  TrendingUp,
  WandSparkles,
} from 'lucide-react'
import { useFingerprint } from '@/hooks/useFingerprint'
import { useFingerprintStore } from '@/stores/fingerprint-store'
import { useAuth } from '@/hooks/useAuth'
import { generateSession, type SchedulerOutput } from '@/engine/scheduler'
import { getConceptPhase, isMastered } from '@/engine'
import type { ConceptPhase } from '@/engine'
import { BottomNav } from '@/components/layout/BottomNav'
import { LevelBadge } from '@/components/dashboard/LevelSelector'
import { WeekTimeline } from '@/components/dashboard/WeekTimeline'
import { CoachHeroCard } from '@/components/dashboard/CoachHeroCard'
import { LaneTrackRow } from '@/components/dashboard/LaneTrackRow'
import { AIStatusBadge } from '@/components/ai/AIStatusBadge'
import { getStreak } from '@/lib/streak'
import { SEED_SENTENCES, SEED_SENTENCE_IDS } from '@/lib/seed-pool'
import { getConceptColor } from '@/lib/concept-colors'
import { getGraphForLevel } from '@/lib/concept-graph-loader'
import { getCoachRecommendation } from '@/lib/coach-recommendation'
import { CORE_LANES, getCompletedLanes, type LaneId } from '@/lib/lane-completion'
import { summarizeWeeklyProgress } from '@/lib/weekly-progress'

const CONCEPT_TO_TOPIC: Record<string, string> = {
  'v2-word-order': 'daglig rutine',
  'present-tense-regular': 'daglig rutine',
  negation: 'daglig rutine',
  'days-of-week': 'daglig rutine',
  'common-questions': 'daglig rutine',
  'noun-gender': 'mat og drikke',
  'indefinite-articles': 'mat og drikke',
  'basic-numbers': 'mat og drikke',
  'personal-pronouns': 'familie',
  'adjective-agreement': 'Norge',
  'common-prepositions': 'Norge',
  'preterite-regular': 'Norge',
  'common-modal-verbs': 'jobb',
}

const JOURNAL_PROMPTS = [
  'Beskriv din ideelle norske helg',
  'Hva liker du best med vinteren?',
  'Skriv om et sted du vil besøke i Norge',
  'Beskriv deg selv på norsk',
  'Hva er din favorittmat, og hvorfor?',
]

const READING_TEXT_COUNTS: Record<string, number> = { A1: 2, A2: 2, B1: 0, B2: 0 }

export default function DashboardPage() {
  useFingerprint()
  const { fingerprint, status } = useFingerprintStore()
  const { user } = useAuth()
  const [plan, setPlan] = useState<SchedulerOutput | null>(null)
  const [showLevelUp, setShowLevelUp] = useState(false)
  const [streak, setStreak] = useState(0)
  const [today, setToday] = useState('')
  const [completedLanes, setCompletedLanes] = useState<Set<LaneId>>(new Set())
  const [dayOfWeek, setDayOfWeek] = useState(-1)

  useEffect(() => {
    setStreak(getStreak())
    setToday(new Date().toLocaleDateString('nb-NO', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    }))
    setCompletedLanes(getCompletedLanes())
    setDayOfWeek(new Date().getDay())
  }, [])

  useEffect(() => {
    try {
      if (localStorage.getItem('norskcoach_levelup_pending') === '1') {
        localStorage.removeItem('norskcoach_levelup_pending')
        setShowLevelUp(true)
        setTimeout(() => setShowLevelUp(false), 4000)
      }
    } catch {
      // ignore
    }
  }, [fingerprint?.currentLevel])

  useEffect(() => {
    if (!localStorage.getItem('norskcoach_onboarded')) {
      localStorage.setItem('norskcoach_onboarded', 'true')
    }
  }, [])

  const activeGraph = getGraphForLevel(fingerprint?.currentLevel ?? 'A1')

  useEffect(() => {
    if (status === 'loading' || !fingerprint) return
    const output = generateSession({
      fingerprint,
      graph: activeGraph,
      availableSentenceIds: SEED_SENTENCE_IDS,
      sentences: SEED_SENTENCES,
    })
    setPlan(output)
  }, [fingerprint, status, activeGraph])

  const showRecalibrationSuggestion = (() => {
    if (!fingerprint) return false
    const lastSession = fingerprint.lastSessionAt
    if (!lastSession) return false
    const daysSince = (Date.now() - new Date(lastSession).getTime()) / 86_400_000
    return daysSince > 7
  })()

  const displayName = user?.user_metadata?.full_name ?? user?.email?.split('@')[0] ?? 'Gjest'
  const levelLabel = fingerprint?.currentLevel ?? 'A1'

  const recommendation = useMemo(() => {
    if (!fingerprint) return null
    return getCoachRecommendation(fingerprint, activeGraph, plan)
  }, [fingerprint, activeGraph, plan])

  const attemptedMastery = Object.values(fingerprint?.conceptMastery ?? {}).filter(
    (mastery) => mastery.attemptCount > 0,
  )
  const accuracy = attemptedMastery.length > 0
    ? Math.round(
      attemptedMastery.reduce((sum, mastery) => sum + mastery.decayedScore, 0) /
      attemptedMastery.length,
    )
    : 0
  const speakingMins = Math.round(fingerprint?.speakingMinutesTotal ?? 0)

  const activeConcepts = useMemo(() => {
    const masteredIds = new Set(
      activeGraph.concepts
        .filter((concept) => isMastered(
          fingerprint?.conceptMastery[concept.id],
          concept.masteryThreshold,
          concept.minAttempts,
          concept.minDays,
        ))
        .map((concept) => concept.id),
    )

    return activeGraph.concepts
      .map((concept, index) => {
        const mastery = fingerprint?.conceptMastery[concept.id]
        const phase = getConceptPhase(mastery, concept.prerequisites, masteredIds)
        return {
          id: concept.id,
          label: concept.label,
          phase,
          score: mastery ? Math.round(mastery.decayedScore) : 0,
          color: getConceptColor(concept.id, index),
        }
      })
      .filter((concept) => concept.phase !== 'locked')
      .sort((left, right) => {
        const order: Record<ConceptPhase, number> = {
          practice: 0,
          consolidation: 1,
          intro: 2,
          maintenance: 3,
          locked: 4,
        }
        return order[left.phase] - order[right.phase]
      })
      .slice(0, 5)
  }, [fingerprint, activeGraph])

  const laneHints = useMemo(() => {
    const focusConcept = fingerprint?.weeklyFocus[0]
    const focusLabel = activeGraph.concepts.find((concept) => concept.id === focusConcept)?.label
    const topic = focusConcept ? (CONCEPT_TO_TOPIC[focusConcept] ?? 'daglig rutine') : 'daglig rutine'
    const textsAtLevel = READING_TEXT_COUNTS[levelLabel] ?? 0

    return {
      session: plan
        ? `${plan.session.items.length} oppgaver · ca. ${Math.max(1, Math.ceil((plan.session.items.length * 45) / 60))} min`
        : 'Anbefalt økt',
      conversation: `Samtale med Kari · ${topic}`,
      journal: dayOfWeek >= 0
        ? (JOURNAL_PROMPTS[dayOfWeek % JOURNAL_PROMPTS.length].length > 36
          ? `${JOURNAL_PROMPTS[dayOfWeek % JOURNAL_PROMPTS.length].slice(0, 36)}…`
          : JOURNAL_PROMPTS[dayOfWeek % JOURNAL_PROMPTS.length])
        : 'Skriv i journalen',
      roleplay: focusLabel ? `Anbefalt for ${focusLabel}` : '3 scenarier tilgjengelig',
      reading: textsAtLevel > 0 ? `${textsAtLevel} tekster på ${levelLabel}-nivå` : 'Tekster tilgjengelig',
      listen: 'Ikke eksponert på dashbordet',
      drills: 'Ikke eksponert på dashbordet',
      shadow: 'Ikke eksponert på dashbordet',
    } satisfies Record<LaneId, string>
  }, [plan, fingerprint, activeGraph, levelLabel, dayOfWeek])

  const focusSet = new Set(fingerprint?.weeklyFocus ?? [])
  const laneFocusMap: Record<LaneId, boolean> = useMemo(() => ({
    session: true,
    conversation: (fingerprint?.weeklyFocus ?? []).some((conceptId) => CONCEPT_TO_TOPIC[conceptId]),
    journal: focusSet.size > 0,
    roleplay: focusSet.size > 0,
    reading: focusSet.size > 0,
    listen: false,
    drills: false,
    shadow: false,
  }), [fingerprint?.weeklyFocus, focusSet.size])

  const uncompletedLanes = CORE_LANES
    .filter((laneId) => !completedLanes.has(laneId) && recommendation?.laneId !== laneId)
  const doneLanes = CORE_LANES.filter((laneId) => completedLanes.has(laneId))
  const completedCount = doneLanes.length
  const completionPct = Math.round((completedCount / CORE_LANES.length) * 100)
  const remainingCount = CORE_LANES.length - completedCount

  const progressEntries = useMemo(() => {
    if (!fingerprint) return []
    return summarizeWeeklyProgress(fingerprint, activeGraph)
  }, [fingerprint, activeGraph])

  const statTiles = [
    { label: 'Rekke', value: String(streak), tone: 'text-white' },
    { label: 'Min talt', value: String(speakingMins), tone: 'text-[var(--nc-teal)]' },
    {
      label: 'Treff',
      value: (fingerprint?.totalSessionsCompleted ?? 0) > 0 && attemptedMastery.length > 0 ? `${accuracy}%` : '—',
      tone: 'text-[var(--nc-signal)]',
    },
  ] as const

  const weeklyCheckLabel = dayOfWeek === 6 || dayOfWeek === 0
    ? 'Tilgjengelig nå'
    : dayOfWeek >= 0
      ? 'Åpner lørdag'
      : 'Laster…'

  const focusPreview = progressEntries.length > 0
    ? progressEntries.slice(0, 3).map((entry) => ({
      id: entry.conceptId,
      label: entry.label,
      meta: entry.attemptsThisWeek > 0 ? `${entry.attemptsThisWeek} forsøk` : 'Ingen nye forsøk',
      stat: entry.deltaDecayed > 0 ? `+${entry.deltaDecayed}` : `${entry.deltaDecayed}`,
      tone: entry.deltaDecayed > 0 ? 'text-[var(--nc-signal-fg)]' : 'text-[var(--nc-cream-dim)]',
      color: undefined,
    }))
    : activeConcepts.slice(0, 3).map((concept) => ({
      id: concept.id,
      label: concept.label,
      meta: concept.phase,
      stat: `${concept.score}%`,
      tone: 'text-[var(--nc-cream-text)]',
      color: concept.color,
    }))

  return (
    <div className="nc-gradient-page flex min-h-dvh flex-col">
      <main className="nc-mobile-shell flex w-full flex-1 flex-col gap-3 px-4 pb-32 pt-3">
        <section className="nc-glass-cream p-5">
          <div className="flex flex-col gap-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="nc-label text-[var(--nc-cream-dim)]">{today || 'I dag'}</div>
                <div className="mt-2 flex items-center gap-2">
                  <h1 className="text-balance font-display text-[2.2rem] font-bold leading-[0.92] text-[var(--nc-cream-text)]">
                    Hei, {displayName}
                  </h1>
                  <LevelBadge />
                </div>
                <p className="mt-3 max-w-[18rem] text-[0.95rem] leading-6 text-[var(--nc-cream-muted)]">
                  AI-systemet velger neste beste grep og holder alle live flater rundt samme læringsmål.
                </p>
              </div>
              <div className="flex flex-col items-end gap-2">
                <span className="inline-flex items-center gap-2 rounded-full bg-[rgba(215,255,92,0.18)] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--nc-signal-fg)]">
                  <WandSparkles size={12} />
                  AI coach
                </span>
                <AIStatusBadge />
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <span className="rounded-full border border-[rgba(17,24,32,0.08)] bg-[rgba(255,255,255,0.54)] px-3 py-1.5 text-[0.72rem] font-semibold text-[var(--nc-cream-muted)]">
                {CORE_LANES.length} live flater
              </span>
              <span className="rounded-full border border-[rgba(17,24,32,0.08)] bg-[rgba(255,255,255,0.54)] px-3 py-1.5 text-[0.72rem] font-semibold text-[var(--nc-cream-muted)]">
                Mobile first
              </span>
              <span className="rounded-full border border-[rgba(17,24,32,0.08)] bg-[rgba(255,255,255,0.54)] px-3 py-1.5 text-[0.72rem] font-semibold text-[var(--nc-cream-muted)]">
                Ingen stubs
              </span>
            </div>

            <div className="nc-glass-dark rounded-[1.5rem] p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--nc-text-dim)]">
                    Ukesystem
                  </div>
                  <div className="mt-1 text-[1.35rem] font-semibold text-[var(--nc-text)]">
                    {completedCount} av {CORE_LANES.length} ferdig
                  </div>
                </div>
                {fingerprint ? <WeekTimeline fingerprint={fingerprint} /> : null}
              </div>

              <div className="mt-4 grid grid-cols-3 gap-3">
                {statTiles.map((stat) => (
                  <div key={stat.label} className="rounded-[1rem] border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.04)] px-3 py-4 text-center">
                    <div className={`text-[1.65rem] font-display font-bold leading-none ${stat.tone}`}>
                      {stat.value}
                    </div>
                    <div className="mt-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--nc-text-dim)]">
                      {stat.label}
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-4 rounded-[1rem] bg-[rgba(255,255,255,0.04)] p-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--nc-text-dim)]">
                      Dagens progresjon
                    </div>
                    <div className="mt-1 text-sm font-medium text-[var(--nc-text)]">
                      {remainingCount > 0 ? `${remainingCount} flater igjen i dag` : 'Alt er lukket for i dag'}
                    </div>
                  </div>
                  <div className="nc-chip-signal rounded-full px-3 py-1.5 text-[11px] font-semibold">
                    {completionPct}%
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <AnimatePresence>
          {showLevelUp ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: -4 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="rounded-[1.25rem] border border-[var(--nc-green-border)] bg-[var(--nc-green-tint)] p-4"
            >
              <div className="text-[1rem] font-bold text-[var(--nc-green)]">
                Nivå opp. Du er nå A2.
              </div>
              <div className="mt-1 text-[0.88rem] text-[var(--nc-cream-muted)]">
                Alle A1-konsepter er mestret. Neste lag er låst opp.
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>

        {!user ? (
          <div className="nc-glass-cream flex items-center justify-between gap-3 p-4">
            <div>
              <div className="nc-label text-[var(--nc-cream-dim)]">Gjestemodus</div>
              <p className="mt-1 text-[0.88rem] leading-6 text-[var(--nc-cream-muted)]">
                Logg inn bare når du vil synkronisere.
              </p>
            </div>
            <Link
              href="/login"
              className="rounded-full bg-[rgba(17,24,32,0.94)] px-4 py-2.5 text-sm font-semibold text-white"
            >
              Logg inn
            </Link>
          </div>
        ) : null}

        {fingerprint?.currentLevel === 'B2' ? (
          <div className="nc-glass rounded-[1.2rem] px-4 py-4 text-[0.9rem] leading-6 text-[var(--nc-text-muted)]">
            B2-innhold er under utvikling. Foreløpig trener du på B1-materiale med høyere intensitet.
          </div>
        ) : null}

        {recommendation ? <CoachHeroCard recommendation={recommendation} /> : null}

        <section className="flex flex-col gap-3">
          <div className="flex items-end justify-between gap-3">
            <div>
              <div className="nc-label">Today stack</div>
              <h2 className="mt-1 text-[1.45rem] font-bold text-[var(--nc-cream-text)]">
                Dette kan du gjøre nå
              </h2>
            </div>
            <div className="rounded-full bg-[rgba(17,24,32,0.08)] px-3 py-1.5 text-[0.74rem] font-semibold text-[var(--nc-cream-muted)]">
              {completedCount} fullført · {remainingCount} igjen
            </div>
          </div>

          <div className="grid gap-3">
            {uncompletedLanes.map((laneId) => (
              <LaneTrackRow
                key={laneId}
                laneId={laneId}
                hint={laneHints[laneId]}
                done={false}
                focusBadge={laneFocusMap[laneId]}
              />
            ))}

            {doneLanes.map((laneId) => (
              <LaneTrackRow
                key={laneId}
                laneId={laneId}
                hint={laneHints[laneId]}
                done={true}
              />
            ))}
          </div>
        </section>

        <section className="nc-glass-cream p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="nc-label text-[var(--nc-cream-dim)]">Focus map</div>
              <h2 className="mt-1 text-[1.35rem] font-bold text-[var(--nc-cream-text)]">
                Ukens fokus
              </h2>
            </div>
            <div className="rounded-full bg-[rgba(17,24,32,0.08)] px-3 py-1.5 text-[0.74rem] font-semibold text-[var(--nc-cream-muted)]">
              {progressEntries.length > 0 ? 'Denne uka' : 'Aktive konsepter'}
            </div>
          </div>

          <div className="mt-4 grid gap-3">
            {focusPreview.length > 0 ? (
              focusPreview.map((item) => (
                <div
                  key={item.id}
                  className="rounded-[1rem] border border-[rgba(17,24,32,0.08)] bg-white/58 px-3 py-3"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="truncate text-[0.95rem] font-semibold text-[var(--nc-cream-text)]">
                        {item.label}
                      </div>
                      <div className="mt-1 text-[0.78rem] uppercase tracking-[0.08em] text-[var(--nc-cream-dim)]">
                        {item.meta}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {item.color ? (
                        <span
                          className="h-2.5 w-2.5 rounded-full"
                          style={{ background: item.color }}
                          aria-hidden="true"
                        />
                      ) : null}
                      <span className={`text-[0.9rem] font-semibold ${item.tone}`}>
                        {item.stat}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-[0.9rem] text-[var(--nc-cream-dim)]">
                Bygger ukens fokus fra de første øktene dine.
              </p>
            )}
          </div>

          <Link
            href="/progress"
            className="mt-4 inline-flex items-center gap-2 text-[0.86rem] font-semibold text-[var(--nc-signal-fg)]"
          >
            Se full fremgang
            <ArrowRight size={14} />
          </Link>
        </section>

        <section className="nc-glass p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--nc-text-dim)]">
                Weekly checkpoint
              </div>
              <h2 className="mt-2 text-[1.45rem] font-bold text-[var(--nc-text)]">
                Ukens sjekk
              </h2>
              <p className="mt-2 text-[0.9rem] leading-6 text-[var(--nc-text-muted)]">
                Systemet validerer ukens fokuskonsepter på lørdag, så planen faktisk holder seg ærlig.
              </p>
            </div>
            <span className="nc-chip-signal rounded-full px-3 py-1.5 text-[0.74rem] font-semibold">
              {weeklyCheckLabel}
            </span>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="rounded-[1rem] border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.04)] p-3">
              <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--nc-text-dim)]">
                <Target size={12} className="text-[var(--nc-signal)]" />
                Ukens tema
              </div>
              <div className="mt-2 text-[0.95rem] font-semibold text-[var(--nc-text)]">
                {(fingerprint?.weeklyFocus.length ?? 0) > 0 ? 'Konseptdrevet plan' : 'Bygges nå'}
              </div>
            </div>
            <div className="rounded-[1rem] border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.04)] p-3">
              <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--nc-text-dim)]">
                <CalendarCheck2 size={12} className="text-[var(--nc-teal)]" />
                Neste åpning
              </div>
              <div className="mt-2 text-[0.95rem] font-semibold text-[var(--nc-text)]">
                {dayOfWeek === 6 || dayOfWeek === 0 ? 'Klar nå' : 'Lørdag'}
              </div>
            </div>
          </div>

          {showRecalibrationSuggestion ? (
            <motion.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-4 rounded-[1rem] border border-[var(--nc-red-border)] bg-[var(--nc-red-tint)] p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-[0.92rem] font-semibold text-[var(--nc-red)]">
                    Lenge siden sist?
                  </div>
                  <p className="mt-1 text-[0.84rem] leading-6 text-[var(--nc-text-muted)]">
                    Ta ukens sjekk før du går videre.
                  </p>
                </div>
                <Link
                  href="/uke"
                  className="nc-button-primary shrink-0 rounded-full px-3 py-2 text-[0.82rem]"
                >
                  Åpne
                </Link>
              </div>
            </motion.div>
          ) : null}

          <div className="mt-4 flex items-center justify-between gap-3">
            <div className="inline-flex items-center gap-2 rounded-full bg-[rgba(255,255,255,0.04)] px-3 py-1.5 text-[0.8rem] text-[var(--nc-text-muted)]">
              <TrendingUp size={13} className="text-[var(--nc-signal)]" />
              Sprintbasert progresjon
            </div>
            <Link
              href="/uke"
              className="inline-flex items-center gap-2 text-[0.86rem] font-semibold text-[var(--nc-text)]"
            >
              Gå til sjekken
              <ArrowRight size={14} />
            </Link>
          </div>
        </section>
      </main>

      <BottomNav active="home" />
    </div>
  )
}
