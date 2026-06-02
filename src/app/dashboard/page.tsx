'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowRight } from 'lucide-react'
import { useFingerprint } from '@/hooks/useFingerprint'
import { useFingerprintStore } from '@/stores/fingerprint-store'
import { useAuth } from '@/hooks/useAuth'
import { generateSession, type SchedulerOutput } from '@/engine/scheduler'
import { getConceptPhase, isMastered } from '@/engine'
import type { ConceptPhase } from '@/engine'
import { BottomNav } from '@/components/layout/BottomNav'
import { LaneTrackRow } from '@/components/dashboard/LaneTrackRow'
import { AIStatusBadge } from '@/components/ai/AIStatusBadge'
import { getStreak } from '@/lib/streak'
import { SEED_SENTENCES, SEED_SENTENCE_IDS } from '@/lib/seed-pool'
import { SEED_PASSAGES, SEED_PASSAGE_IDS } from '@/lib/passage-pool'
import { getConceptColor } from '@/lib/concept-colors'
import { getGraphForLevel } from '@/lib/concept-graph-loader'
import { getCoachRecommendation } from '@/lib/coach-recommendation'
import { CORE_LANES, getCompletedLanes, type LaneId } from '@/lib/lane-completion'
import { summarizeWeeklyProgress } from '@/lib/weekly-progress'
import { ProductionWall } from '@/components/dashboard/ProductionWall'
import { deriveProductionWallView } from '@/lib/production-wall'

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
      availablePassageIds: SEED_PASSAGE_IDS,
      passages: SEED_PASSAGES,
    })
    setPlan(output)
  }, [fingerprint, status, activeGraph])

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
      reading: (levelLabel === 'B1' || levelLabel === 'B2')
        ? 'Les → si → skriv · én passasje'
        : (textsAtLevel > 0 ? `${textsAtLevel} tekster på ${levelLabel}-nivå` : 'Tekster tilgjengelig'),
      listen: 'Lytt og svar',
      drills: 'Uttaleøvelser',
      shadow: 'Skyggelesing',
      uke: 'Ukens repetisjon',
    } satisfies Record<LaneId, string>
  }, [plan, fingerprint, activeGraph, levelLabel, dayOfWeek])

  // At B1/B2 the read→recite→write module (/skriv) replaces the reading lane:
  // the "Les" lane becomes "Les og skriv" → /skriv. A1/A2 keep plain reading
  // (/reading), where their reading texts live. Distinct from the journal lane,
  // which keeps its own "Skriv" label.
  const skrivReplacesReading = levelLabel === 'B1' || levelLabel === 'B2'

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
    uke: true,
  }), [fingerprint?.weeklyFocus, focusSet.size])

  const uncompletedLanes = CORE_LANES
    .filter((laneId) => !completedLanes.has(laneId) && recommendation?.laneId !== laneId)
  const doneLanes = CORE_LANES.filter((laneId) => completedLanes.has(laneId))
  const completedCount = doneLanes.length
  const completionPct = Math.round((completedCount / CORE_LANES.length) * 100)
  const progressEntries = useMemo(() => {
    if (!fingerprint) return []
    return summarizeWeeklyProgress(fingerprint, activeGraph)
  }, [fingerprint, activeGraph])

  // Production wall view — all-levels, level-aware lens. Null pre-hydration.
  const wallView = useMemo(
    () => (fingerprint ? deriveProductionWallView(fingerprint, progressEntries) : null),
    [fingerprint, progressEntries],
  )

  const statTiles = [
    { label: 'Rekke', value: String(streak), tone: 'text-white' },
    { label: 'Min talt', value: String(speakingMins), tone: 'text-[var(--nc-teal)]' },
    {
      label: 'Treff',
      value: (fingerprint?.totalSessionsCompleted ?? 0) > 0 && attemptedMastery.length > 0 ? `${accuracy}%` : '—',
      tone: 'text-[var(--nc-signal)]',
    },
  ] as const

  const focusPreview = progressEntries.length > 0
    ? progressEntries.slice(0, 5).map((entry) => ({
      id: entry.conceptId,
      label: entry.label,
      meta: (() => {
        const deltaStr = entry.deltaDecayed > 0 ? `+${entry.deltaDecayed}` : `${entry.deltaDecayed}`
        const attemptsStr = entry.attemptsThisWeek > 0 ? `${entry.attemptsThisWeek} forsøk` : 'Ingen nye forsøk'
        return `${deltaStr} · ${attemptsStr}`
      })(),
      stat: entry.deltaDecayed > 0 ? `+${entry.deltaDecayed}` : `${entry.deltaDecayed}`,
      tone: entry.deltaDecayed > 0 ? 'text-[var(--nc-signal-fg)]' : 'text-[var(--nc-cream-dim)]',
      color: undefined,
    }))
    : activeConcepts.slice(0, 5).map((concept) => ({
      id: concept.id,
      label: concept.label,
      meta: concept.phase,
      stat: `${concept.score}%`,
      tone: 'text-[var(--nc-cream-text)]',
      color: concept.color,
    }))

  const heroSubtitle = plan
    ? `${plan.session.items.length} oppgaver · ca. ${Math.max(1, Math.ceil((plan.session.items.length * 45) / 60))} min`
    : '25 oppgaver · ca. 19 min'

  const focusDescription = recommendation?.reason ?? 'Systemet prioriterer dette nå fordi det gir mest læring med minst friksjon.'

  return (
    <div className="nc-gradient-page flex min-h-dvh flex-col">
      <main className="nc-mobile-shell flex w-full flex-1 flex-col gap-[6px] px-1.5 pb-32 pt-3">

        {/* ── Header: 3 dark boxes ── */}
        <div className="flex items-stretch gap-[6px]">
          <div className="flex flex-1 items-center gap-2 rounded-lg bg-[var(--nc-card)] border border-[var(--nc-border)] px-2.5 py-2">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-[0.35rem] bg-[linear-gradient(135deg,var(--nc-signal)_0%,#A8E010_100%)] text-[13px] font-extrabold text-[var(--nc-signal-fg)]">
              {displayName.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <div className="text-[0.82rem] font-bold leading-tight text-[var(--nc-text)]">{displayName}</div>
              <div className="mt-px flex items-center gap-1.5">
                <span className="text-[9px] font-medium uppercase tracking-[0.08em] text-[var(--nc-text-dim)]">{today || 'I dag'}</span>
                <span className="rounded-[0.2rem] border border-[rgba(200,255,32,0.18)] bg-[var(--nc-signal-tint)] px-1.5 py-px text-[8px] font-bold uppercase tracking-[0.08em] text-[var(--nc-signal)]">{levelLabel}</span>
              </div>
            </div>
          </div>
          <div className="flex flex-col items-center justify-center rounded-lg bg-[var(--nc-card)] border border-[var(--nc-border)] px-3 py-1.5 min-w-[48px]">
            <div className="text-[1.05rem] font-extrabold tabular-nums leading-none text-[var(--nc-text)]">{streak}</div>
            <div className="mt-0.5 text-[7px] font-bold uppercase tracking-[0.1em] text-[var(--nc-text-dim)]">Rekke</div>
          </div>
          <div className="flex flex-col items-center justify-center rounded-lg bg-[var(--nc-card)] border border-[var(--nc-border)] px-2.5 py-1.5 min-w-[44px]">
            <AIStatusBadge />
          </div>
        </div>

        {/* ── Production wall (lead block; all-levels, level-aware lens) ── */}
        {wallView ? <ProductionWall view={wallView} /> : null}

        {/* B2 vocab track entry — conjugation drill (Slice 3.3) */}
        {fingerprint?.currentLevel === 'B2' ? (
          <Link
            href="/ord"
            aria-label="Åpne bøyningsdrill"
            className="flex items-center justify-between rounded-lg bg-[var(--nc-card)] border border-[var(--nc-border)] px-3 py-2.5"
          >
            <div>
              <div className="text-[9px] font-bold uppercase tracking-[0.12em] text-[var(--nc-signal-dim,#9ec01a)]">B2 · ordforråd</div>
              <div className="mt-0.5 text-[0.9rem] font-bold text-[var(--nc-text)]">Bøyningsdrill</div>
              <div className="mt-px text-[0.72rem] text-[var(--nc-text-muted)]">Skriv riktige verbformer · hverdagsverb</div>
            </div>
            <ArrowRight size={15} aria-hidden="true" className="text-[var(--nc-text-dim)]" />
          </Link>
        ) : null}

        {/* ── Hero Card (Lime) ── */}
        <div className="relative overflow-hidden rounded-[0.65rem] bg-[linear-gradient(135deg,#C8FF20_0%,#B8EF10_100%)] p-2.5 text-[var(--nc-signal-fg)]">
          <div className="text-[9px] font-bold uppercase tracking-[0.12em] text-[rgba(10,18,6,0.48)]">Anbefalt</div>
          <h1 className="mt-1.5 text-balance text-[1.25rem] font-extrabold leading-none">Start dagens økt</h1>
          <div className="mt-1 text-[0.72rem] text-[rgba(10,18,6,0.6)]">{heroSubtitle}</div>

          <div className="relative z-[1] mt-2">
            <div className="rounded-[0.35rem] bg-[rgba(255,255,255,0.22)] p-2">
              <div className="text-[9px] font-bold uppercase tracking-[0.12em] text-[rgba(10,18,6,0.4)]">Fokus</div>
              <div className="mt-1.5 text-[0.78rem] leading-[1.4] text-[rgba(10,18,6,0.72)]">{focusDescription}</div>
            </div>
          </div>

          <div className="relative z-[1] mt-2 flex justify-end gap-2">
            <Link href="/session" className="inline-flex items-center gap-1.5 rounded-[0.35rem] bg-[rgba(10,18,6,0.90)] px-3.5 py-2 text-[0.78rem] font-semibold text-white">
              Start økt <ArrowRight size={13} aria-hidden="true" />
            </Link>
          </div>
        </div>

        {/* ── Stat Strip (Cream) ── */}
        <div className="grid grid-cols-3 overflow-hidden rounded-lg bg-[var(--nc-cream)] border border-[rgba(17,21,24,0.06)]">
          {statTiles.map((stat, i) => (
            <div key={stat.label} className={`relative px-2 py-2.5 text-center${i > 0 ? ' before:absolute before:left-0 before:top-[20%] before:h-[60%] before:w-px before:bg-[rgba(17,21,24,0.08)]' : ''}`}>
              <div className={`text-[1.15rem] font-extrabold tabular-nums ${stat.label === 'Rekke' ? 'text-[var(--nc-cream-text)]' : stat.label === 'Min talt' ? 'text-[#1A8CB0]' : 'text-[#5A8A00]'}`}>
                {stat.value}
              </div>
              <div className="mt-0.5 text-[8px] font-bold uppercase tracking-[0.1em] text-[var(--nc-cream-dim)]">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* ── Week Bar (Dark) ── */}
        <div className="flex items-center justify-between rounded-lg bg-[var(--nc-card)] border border-[var(--nc-border)] px-2 py-2">
          <div className="flex items-center gap-2">
            <span className="text-[9px] font-bold uppercase tracking-[0.1em] text-[var(--nc-text-dim)]">Uke</span>
            <span className="text-[0.82rem] font-bold text-[var(--nc-text)]">{completedCount} av {CORE_LANES.length}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative h-1 w-20 overflow-visible rounded-full bg-[rgba(255,255,255,0.08)]">
              <div className="h-full rounded-full bg-[var(--nc-signal)] shadow-[0_0_8px_rgba(200,255,32,0.3)]" style={{ width: `${completionPct}%` }} />
            </div>
            <div className="size-3 rounded-full bg-[var(--nc-signal)] shadow-[0_0_10px_rgba(200,255,32,0.5),0_0_24px_rgba(200,255,32,0.25)]" />
          </div>
        </div>

        <AnimatePresence>
          {showLevelUp ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: -4 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="rounded-lg border border-[var(--nc-green-border)] bg-[var(--nc-green-tint)] p-3"
            >
              <div className="text-[1rem] font-bold text-[var(--nc-green)]">Nivå opp. Du er nå {levelLabel}.</div>
              <div className="mt-1 text-[0.84rem] text-[var(--nc-text-muted)]">Alle konsepter er mestret. Neste lag er låst opp.</div>
            </motion.div>
          ) : null}
        </AnimatePresence>

        {!user ? (
          <div className="nc-glass-cream flex items-center justify-between gap-3 rounded-lg p-2">
            <div>
              <div className="nc-label text-[var(--nc-cream-dim)]">Gjestemodus</div>
              <p className="mt-0.5 text-[0.82rem] leading-5 text-[var(--nc-cream-muted)]">Logg inn bare når du vil synkronisere.</p>
            </div>
            <Link href="/login" className="whitespace-nowrap rounded-full bg-[rgba(17,24,32,0.94)] px-4 py-2 text-sm font-semibold text-white">Logg inn</Link>
          </div>
        ) : null}

        {/* B2 interim note now lives inside <ProductionWall> (interim slot) — no duplicate banner. */}

        {/* ── Lane Panel (Cream) ── */}
        <div className="rounded-lg bg-[var(--nc-cream)] border border-[rgba(17,21,24,0.06)] px-2 py-2.5">
          <div className="flex items-center justify-between px-1 pb-1.5">
            <span className="text-[0.82rem] font-bold text-[var(--nc-cream-text)]">Neste valg</span>
            <span className="text-[0.68rem] tabular-nums text-[var(--nc-cream-dim)]">{completedCount}/{CORE_LANES.length}</span>
          </div>

          <div className="flex flex-col">
            {uncompletedLanes.map((laneId) => (
              <LaneTrackRow
                key={laneId}
                laneId={laneId}
                hint={laneHints[laneId]}
                done={false}
                focusBadge={laneFocusMap[laneId]}
                href={laneId === 'reading' && skrivReplacesReading ? '/skriv' : undefined}
                label={laneId === 'reading' && skrivReplacesReading ? 'Les og skriv' : undefined}
              />
            ))}
            {doneLanes.map((laneId) => (
              <LaneTrackRow
                key={laneId}
                laneId={laneId}
                hint={laneHints[laneId]}
                done={true}
                href={laneId === 'reading' && skrivReplacesReading ? '/skriv' : undefined}
                label={laneId === 'reading' && skrivReplacesReading ? 'Les og skriv' : undefined}
              />
            ))}
          </div>

          {completedCount > 0 ? (
            <div className="mt-1.5 flex items-center gap-1.5 px-1 text-[0.68rem] text-[var(--nc-cream-dim)]">
              <span className="flex size-3.5 items-center justify-center rounded-full bg-[rgba(60,180,100,0.12)] text-[8px] text-[#3CB464]">✓</span>
              {completedCount} fullført i dag
            </div>
          ) : null}
        </div>

        {/* ── Week Overview (Dark) ── */}
        <div className="overflow-hidden rounded-lg bg-[var(--nc-card)] border border-[var(--nc-border)]">
          <div className="flex items-center justify-between border-b border-[var(--nc-border)] px-2 py-2">
            <span className="text-[9px] font-bold uppercase tracking-[0.12em] text-[var(--nc-text-dim)]">Ukeoversikt</span>
            <span className="rounded-full bg-[var(--nc-signal)] px-2 py-px text-[8px] font-bold uppercase tracking-[0.08em] text-[var(--nc-signal-fg)]">Denne uka</span>
          </div>
          <div className="grid grid-cols-2">
            <div className="p-2">
              <div className="mb-1.5 text-[9px] font-bold uppercase tracking-[0.1em] text-[var(--nc-text-dim)]">Fokus</div>
              {focusPreview.slice(0, 3).map((item) => (
                <div key={item.id} className="flex items-center justify-between py-1">
                  <span className="text-[0.76rem] font-medium text-[var(--nc-text)]">{item.label}</span>
                  <span className={`text-[0.72rem] font-bold tabular-nums ${item.stat.startsWith('+') ? 'text-[var(--nc-signal)]' : item.stat.startsWith('-') ? 'text-[var(--nc-red)]' : 'text-[var(--nc-text-muted)]'}`}>{item.stat}</span>
                </div>
              ))}
              {focusPreview.length === 0 ? (
                <div className="py-1 text-[0.72rem] text-[var(--nc-text-dim)]">Bygges fra øktene</div>
              ) : null}
            </div>
            <div className="border-l border-[var(--nc-border)] p-2">
              <div className="mb-1.5 text-[9px] font-bold uppercase tracking-[0.1em] text-[var(--nc-text-dim)]">Sjekk</div>
              <div className="flex items-center justify-between py-1">
                <span className="text-[0.76rem] text-[var(--nc-text)]">Ukesjekk</span>
                <span className="text-[0.68rem] text-[var(--nc-text-muted)]">{dayOfWeek === 6 || dayOfWeek === 0 ? 'Klar nå' : 'Lørdag'}</span>
              </div>
              <div className="flex items-center justify-between py-1">
                <span className="text-[0.76rem] text-[var(--nc-text)]">Tema</span>
                <span className="text-[0.68rem] text-[var(--nc-text-muted)]">Konseptdrevet</span>
              </div>
              <Link href="/uke" className="mt-1.5 inline-flex items-center gap-1 text-[0.72rem] font-semibold text-[var(--nc-text-muted)]">
                Gå til sjekken
                <span className="flex size-6 items-center justify-center rounded-full border border-[var(--nc-signal-border)] text-[11px] text-[var(--nc-signal)]">→</span>
              </Link>
            </div>
          </div>
        </div>

      </main>

      <BottomNav active="home" />
    </div>
  )
}
