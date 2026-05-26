'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { AnimatePresence, motion } from 'framer-motion'
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
import { getStreak } from '@/lib/streak'
import { SEED_SENTENCES, SEED_SENTENCE_IDS } from '@/lib/seed-pool'
import { getConceptColor } from '@/lib/concept-colors'
import { getGraphForLevel } from '@/lib/concept-graph-loader'
import { getCoachRecommendation } from '@/lib/coach-recommendation'
import { getCompletedLanes, type LaneId } from '@/lib/lane-completion'
import { summarizeWeeklyProgress } from '@/lib/weekly-progress'

const CONCEPT_TO_TOPIC: Record<string, string> = {
  'v2-word-order':         'daglig rutine',
  'present-tense-regular': 'daglig rutine',
  'negation':              'daglig rutine',
  'days-of-week':          'daglig rutine',
  'common-questions':      'daglig rutine',
  'noun-gender':           'mat og drikke',
  'indefinite-articles':   'mat og drikke',
  'basic-numbers':         'mat og drikke',
  'personal-pronouns':     'familie',
  'adjective-agreement':   'Norge',
  'common-prepositions':   'Norge',
  'preterite-regular':     'Norge',
  'common-modal-verbs':    'jobb',
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
  const router = useRouter()
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
      weekday: 'long', day: 'numeric', month: 'long',
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
    } catch { /* ignore */ }
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
    (m) => m.attemptCount > 0,
  )
  const accuracy = attemptedMastery.length > 0
    ? Math.round(attemptedMastery.reduce((s, m) => s + m.decayedScore, 0) / attemptedMastery.length)
    : 0
  const speakingMins = Math.round(fingerprint?.speakingMinutesTotal ?? 0)

  const activeConcepts = useMemo(() => {
    const masteredIds = new Set(
      activeGraph.concepts
        .filter((c) => isMastered(
          fingerprint?.conceptMastery[c.id],
          c.masteryThreshold,
          c.minAttempts,
          c.minDays,
        ))
        .map((c) => c.id),
    )
    return activeGraph.concepts
      .map((c, i) => {
        const mastery = fingerprint?.conceptMastery[c.id]
        const phase = getConceptPhase(mastery, c.prerequisites, masteredIds)
        return {
          id: c.id, label: c.label, phase,
          score: mastery ? Math.round(mastery.decayedScore) : 0,
          color: getConceptColor(c.id, i),
        }
      })
      .filter((c) => c.phase !== 'locked')
      .sort((a, b) => {
        const order: Record<ConceptPhase, number> = {
          practice: 0, consolidation: 1, intro: 2, maintenance: 3, locked: 4,
        }
        return order[a.phase] - order[b.phase]
      })
      .slice(0, 5)
  }, [fingerprint, activeGraph])

  const laneHints = useMemo(() => {
    const focusConcept = fingerprint?.weeklyFocus[0]
    const focusLabel = activeGraph.concepts.find((c) => c.id === focusConcept)?.label
    const topic = focusConcept ? (CONCEPT_TO_TOPIC[focusConcept] ?? 'daglig rutine') : 'daglig rutine'
    const prompt = JOURNAL_PROMPTS[new Date().getDay() % JOURNAL_PROMPTS.length]
    const textsAtLevel = READING_TEXT_COUNTS[levelLabel] ?? 0

    return {
      session: plan ? `${plan.session.items.length} oppgaver · ca. ${Math.max(1, Math.ceil((plan.session.items.length * 45) / 60))} min` : 'Anbefalt økt',
      conversation: `Samtale med Kari · ${topic}`,
      journal: dayOfWeek >= 0 ? (JOURNAL_PROMPTS[dayOfWeek % JOURNAL_PROMPTS.length].length > 35 ? JOURNAL_PROMPTS[dayOfWeek % JOURNAL_PROMPTS.length].slice(0, 35) + '…' : JOURNAL_PROMPTS[dayOfWeek % JOURNAL_PROMPTS.length]) : 'Skriv i journalen',
      roleplay: focusLabel ? `Anbefalt for ${focusLabel}` : '3 scenarier tilgjengelig',
      reading: textsAtLevel > 0 ? `${textsAtLevel} tekster på ${levelLabel}-nivå` : 'Tekster tilgjengelig',
    } satisfies Record<LaneId, string>
  }, [plan, fingerprint, activeGraph, levelLabel, dayOfWeek])

  const focusSet = new Set(fingerprint?.weeklyFocus ?? [])

  const laneFocusMap: Record<LaneId, boolean> = useMemo(() => ({
    session: true,
    conversation: (fingerprint?.weeklyFocus ?? []).some((cid) => CONCEPT_TO_TOPIC[cid]),
    journal: focusSet.size > 0,
    roleplay: focusSet.size > 0,
    reading: false,
  }), [fingerprint?.weeklyFocus, focusSet.size])

  const uncompletedLanes = (['session', 'conversation', 'journal', 'roleplay', 'reading'] as LaneId[])
    .filter((l) => !completedLanes.has(l) && recommendation?.laneId !== l)
  const doneLanes = (['session', 'conversation', 'journal', 'roleplay', 'reading'] as LaneId[])
    .filter((l) => completedLanes.has(l))

  const progressEntries = useMemo(() => {
    if (!fingerprint) return []
    return summarizeWeeklyProgress(fingerprint, activeGraph)
  }, [fingerprint, activeGraph])

  return (
    <div className="nc-gradient-page flex min-h-dvh flex-col">

      {/* ── STICKY HEADER — greeting + timeline + vitals ── */}
      <div className="sticky top-0 z-10 border-b border-[rgba(0,220,180,0.08)] bg-[rgba(8,14,16,0.78)] backdrop-blur-xl">
        <div className="mx-auto w-full max-w-lg px-5 pb-3 pt-5">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--nc-text-dim)]">
                {today}
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-2.5">
                <h1 className="text-balance font-display text-[1.75rem] font-bold leading-tight tracking-tight text-[var(--nc-text)]">
                  God kveld, {displayName}!
                </h1>
                <LevelBadge />
              </div>
            </div>
            {fingerprint && <WeekTimeline fingerprint={fingerprint} />}
          </div>

          {/* Vitals bar — streak de-emphasized */}
          <div className="mt-3 grid grid-cols-4 divide-x divide-[rgba(255,255,255,0.07)]">
            {[
              { label: 'rekke',        value: String(streak),       color: 'var(--nc-text-dim)' },
              { label: 'min talt',     value: String(speakingMins), color: 'var(--nc-text-muted)' },
              { label: 'treffprosent', value: (fingerprint?.totalSessionsCompleted ?? 0) > 0 && attemptedMastery.length > 0 ? `${accuracy}%` : '—', color: 'var(--nc-green)' },
              { label: 'økter',        value: String(fingerprint?.totalSessionsCompleted ?? 0), color: 'var(--nc-text-dim)' },
            ].map((v) => (
              <div key={v.label} className="flex flex-col items-center py-2">
                <span
                  className="font-display tabular-nums text-[1.3rem] font-bold leading-none"
                  style={{ color: v.color }}
                >
                  {v.value}
                </span>
                <span className="mt-1 text-[9px] font-semibold uppercase tracking-[0.08em] text-[var(--nc-text-dim)]">
                  {v.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <main className="relative mx-auto flex w-full max-w-lg flex-1 flex-col gap-3 px-5 pb-6 pt-4">

        {/* ── Level-up toast ── */}
        <AnimatePresence>
          {showLevelUp && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -6 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="nc-glass-elevated p-4 text-center"
            >
              <div className="text-[17px] font-extrabold text-[var(--nc-green)]">
                Nivå opp! Du er nå A2
              </div>
              <div className="mt-1 text-[12px] text-[var(--nc-text-dim)]">
                Du har mestret alle A1-konsepter. Neste nivå er låst opp.
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Guest banner ── */}
        {!user && (
          <div className="nc-surface flex items-center justify-between gap-3 px-4 py-2.5">
            <p className="text-[12px] text-[#111110]/60">
              Logg inn for å synkronisere fremgangen din
            </p>
            <Link
              href="/login"
              className="nc-button-primary shrink-0 px-3 py-1.5 text-[12px] font-bold"
            >
              Logg inn
            </Link>
          </div>
        )}

        {/* ── B1/B2 graph notice ── */}
        <AnimatePresence>
          {(fingerprint?.currentLevel === 'B1' || fingerprint?.currentLevel === 'B2') && (
            <motion.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="nc-glass px-4 py-3"
            >
              <p className="text-[12px] leading-6 text-[var(--nc-text-muted)] text-pretty">
                <span className="font-semibold text-[var(--nc-text)]">
                  {fingerprint.currentLevel}-innhold er under utvikling.
                </span>{' '}
                Du øver på A2-materiale med høyere intensitet inntil det er klart.
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── COACH HERO CARD — the single recommendation ── */}
        {recommendation && <CoachHeroCard recommendation={recommendation} />}

        {/* ── LANE TRACKS — uncompleted first ── */}
        {uncompletedLanes.length > 0 && (
          <div className="flex flex-col gap-2">
            <div className="px-1 text-[9px] font-bold uppercase tracking-[0.08em] text-[var(--nc-text-dim)]">
              Andre baner
            </div>
            {uncompletedLanes.map((laneId) => (
              <LaneTrackRow
                key={laneId}
                laneId={laneId}
                hint={laneHints[laneId]}
                done={false}
                focusBadge={laneFocusMap[laneId]}
              />
            ))}
          </div>
        )}

        {/* ── Completed lanes ── */}
        {doneLanes.length > 0 && (
          <div className="flex flex-col gap-2">
            <div className="px-1 text-[9px] font-bold uppercase tracking-[0.08em] text-[var(--nc-text-dim)]">
              Fullført i dag
            </div>
            {doneLanes.map((laneId) => (
              <LaneTrackRow
                key={laneId}
                laneId={laneId}
                hint={laneHints[laneId]}
                done={true}
              />
            ))}
          </div>
        )}

        {/* ── Weekly check (contextual) ── */}
        {recommendation?.laneId !== 'weekly-check' && (
          <div className="flex items-center justify-between gap-3 rounded-[var(--radius)] border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)] px-4 py-3">
            <div>
              <div className="text-[12px] font-bold text-[var(--nc-text)]">📋 Ukens sjekk</div>
              <div className="mt-0.5 text-[10px] text-[var(--nc-text-dim)]">
                {dayOfWeek === 6 || dayOfWeek === 0 ? 'Tilgjengelig nå' : 'Tilgjengelig lørdag'}
              </div>
            </div>
            <Link
              href="/uke"
              className="text-[10px] font-semibold text-[var(--nc-teal)] hover:underline"
              aria-label="Gå til ukens sjekk"
            >
              {dayOfWeek === 6 || dayOfWeek === 0 ? 'Start →' : 'lør →'}
            </Link>
          </div>
        )}

        {/* ── Recalibration banner ── */}
        <AnimatePresence>
          {showRecalibrationSuggestion && (
            <motion.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="nc-glass flex items-center justify-between gap-3 border-l-4 border-l-[var(--nc-red)] px-4 py-3"
            >
              <div>
                <p className="text-[13px] font-semibold text-[var(--nc-text)]">Lenge siden sist?</p>
                <p className="mt-0.5 text-[11px] text-[var(--nc-text-dim)] text-pretty">
                  Din ukentlige sjekk venter — ta den for å oppdatere profilen din.
                </p>
              </div>
              <motion.button
                onClick={() => router.push('/uke')}
                whileTap={{ scale: 0.97 }}
                aria-label="Gå til ukentlig sjekk"
                className="nc-button-primary shrink-0 px-3 py-2 text-[12px] font-bold"
              >
                Sjekk
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Focus concepts ── */}
        {progressEntries.length > 0 && (
          <div className="mt-1">
            <div className="mb-2 px-1 text-[9px] font-bold uppercase tracking-[0.08em] text-[var(--nc-text-dim)]">
              Ukens fokus
            </div>
            <div className="flex flex-wrap gap-1.5">
              {progressEntries.map((entry) => {
                const deltaLabel = entry.deltaDecayed > 0 ? `+${entry.deltaDecayed}` : entry.deltaDecayed < 0 ? `−${Math.abs(entry.deltaDecayed)}` : '±0'
                const deltaColor = entry.deltaDecayed > 0 ? 'var(--nc-teal)' : 'var(--nc-text-dim)'
                return (
                  <span
                    key={entry.conceptId}
                    className="rounded-full border border-[rgba(255,255,255,0.07)] bg-[rgba(255,255,255,0.04)] px-2.5 py-1 text-[11px]"
                  >
                    <span className="font-medium text-[var(--nc-text)]">{entry.label}</span>
                    {' '}
                    <span className="tabular-nums font-semibold" style={{ color: deltaColor }}>{deltaLabel}</span>
                    {entry.attemptsThisWeek > 0 && (
                      <span className="text-[var(--nc-text-dim)]"> · {entry.attemptsThisWeek} forsøk</span>
                    )}
                  </span>
                )
              })}
            </div>
          </div>
        )}

        {/* ── Concepts in focus (fallback when no weekly sprint) ── */}
        {progressEntries.length === 0 && activeConcepts.length > 0 && (
          <div className="flex items-center justify-between gap-3 px-1">
            <div className="flex min-w-0 items-center gap-2">
              <div
                className="size-2 shrink-0 rounded-full"
                style={{ background: activeConcepts[0]?.color ?? 'var(--nc-text-dim)' }}
                aria-hidden="true"
              />
              <span className="truncate text-[12px] text-[var(--nc-text-muted)]">
                {activeConcepts.length === 1 ? '1 konsept i fokus' : `${activeConcepts.length} konsepter i fokus`}
                {activeConcepts[0] &&
                  ` — ${activeConcepts[0].label}${activeConcepts.length > 1 ? ` +${activeConcepts.length - 1}` : ''}`}
              </span>
            </div>
            <Link
              href="/progress"
              aria-label="Se alle konsepter"
              className="shrink-0 text-[11px] font-semibold text-[var(--nc-text-dim)] hover:text-[var(--nc-text)]"
            >
              Se alle →
            </Link>
          </div>
        )}

      </main>
      <BottomNav active="home" />
    </div>
  )
}
