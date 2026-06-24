'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowRight, BookMarked, Ear, AudioLines, Music, Check } from 'lucide-react'
import { useFingerprint } from '@/hooks/useFingerprint'
import { useFingerprintStore } from '@/stores/fingerprint-store'
import { useAuth } from '@/hooks/useAuth'
import { generateSession, type SchedulerOutput } from '@/engine/scheduler'
import { getConceptPhase, isMastered, runDiagnosis } from '@/engine'
import type { ConceptPhase } from '@/engine'
import { BottomNav } from '@/components/layout/BottomNav'
import { LaneTrackRow } from '@/components/dashboard/LaneTrackRow'
import { AIStatusBadge } from '@/components/ai/AIStatusBadge'
import { getStreak } from '@/lib/streak'
import { SEED_SENTENCES, SEED_SENTENCE_IDS } from '@/lib/seed-pool'
import { SEED_PASSAGES, SEED_PASSAGE_IDS } from '@/lib/passage-pool'
import { getConceptColor } from '@/lib/concept-colors'
import { getGraphForLevel, getCumulativeConcepts } from '@/lib/concept-graph-loader'
import { deriveAccuracyDisplay } from '@/lib/dashboard-stats'
import { getCoachRecommendation } from '@/lib/coach-recommendation'
import { CORE_LANES, MUNTLIG_LANES, getCompletedLanes, type LaneId } from '@/lib/lane-completion'
import { summarizeWeeklyProgress } from '@/lib/weekly-progress'
import { ProductionWall } from '@/components/dashboard/ProductionWall'
import { deriveProductionWallView, deriveDiagnosisHighlight, type BreakerVerdict } from '@/lib/production-wall'
import { deriveBreakerStory } from '@/lib/breaker-story'
import { NotebookDrawer } from '@/components/notebook/NotebookDrawer'

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

// Muntlig tiles (the 3-tile grid): icon + display name + route per speaking lane.
// Lucide icons only — Ear (listen), AudioLines (pronunciation drills), Music (shadowing).
type MuntligLaneId = 'listen' | 'drills' | 'shadow'
const MUNTLIG_TILE_CONFIG: Record<MuntligLaneId, { Icon: typeof Ear; name: string; href: string }> = {
  listen: { Icon: Ear, name: 'Lytt og svar', href: '/listen' },
  drills: { Icon: AudioLines, name: 'Uttale', href: '/drills' },
  shadow: { Icon: Music, name: 'Skygging', href: '/shadow' },
}

export default function DashboardPage() {
  useFingerprint()
  const { fingerprint, status } = useFingerprintStore()
  const { user } = useAuth()
  const [plan, setPlan] = useState<SchedulerOutput | null>(null)
  const [showLevelUp, setShowLevelUp] = useState(false)
  // Quick-access notebook drawer (recent saves), opened from the Notatboka row.
  const [notebookOpen, setNotebookOpen] = useState(false)
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
  // Displayed level chip: show "–" while the fingerprint is still hydrating so a
  // returning B1/B2 learner never sees a wrong "A1" flash before their real level
  // loads (matches /profile's guard). levelLabel above stays 'A1'-default for LOGIC
  // (graph/lanes/reading), which must not become "–".
  const levelDisplay = fingerprint?.currentLevel ?? (status === 'loading' ? '–' : 'A1')

  const recommendation = useMemo(() => {
    if (!fingerprint) return null
    return getCoachRecommendation(fingerprint, activeGraph, plan)
  }, [fingerprint, activeGraph, plan])

  // F018/F020: accuracy is a practice stat, gated on a real completed session so
  // it never shows a diagnostic-only number that vanishes on refresh. See
  // deriveAccuracyDisplay for the full rationale.
  const accuracyDisplay = deriveAccuracyDisplay(fingerprint)
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
          score: mastery ? Math.round(mastery.decayedScore ?? 0) : 0,
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
      ord: 'Skriv riktige verbformer',
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
    ord: false,
  }), [fingerprint?.weeklyFocus, focusSet.size])

  // The conjugation drill (/ord) is a tracked daily lane at ALL levels: it draws
  // from a fixed everyday-verb pool (irregular-first) — foundational, not B2-only —
  // so every learner sees it in "Øving · dagens plan" and it counts toward daily
  // completion. (The intro framing was de-B2'd to match.)
  const coreLanes: LaneId[] = [...CORE_LANES, 'ord']
  // The coach-recommended lane leads the list with the lime "Anbefalt" treatment —
  // but only when it's a real practice lane (not 'session', which is the hero CTA)
  // and not already done. Null otherwise → the list is just uncompleted → done.
  const recommendedLaneId: LaneId | null =
    recommendation && recommendation.laneId !== 'session'
      ? coreLanes.find((laneId) => laneId === recommendation.laneId && !completedLanes.has(laneId)) ?? null
      : null
  const uncompletedLanes = coreLanes
    .filter((laneId) => !completedLanes.has(laneId) && laneId !== recommendedLaneId)
  const doneLanes = coreLanes.filter((laneId) => completedLanes.has(laneId))
  const completedCount = doneLanes.length
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
      value: accuracyDisplay,
      tone: 'text-[var(--nc-signal)]',
    },
  ] as const

  const focusPreview = progressEntries.length > 0
    ? progressEntries.slice(0, 5).map((entry) => {
      // No attempts this week → any score delta is pure decay drift, not earned
      // change. Showing "-50" to a learner who practiced nothing this week is a
      // false claim that they got worse. Render a neutral state instead; only
      // show a signed delta once there is real activity to attribute it to.
      const noAttempts = entry.attemptsThisWeek <= 0
      const deltaStr = entry.deltaDecayed > 0 ? `+${entry.deltaDecayed}` : `${entry.deltaDecayed}`
      return {
        id: entry.conceptId,
        label: entry.label,
        meta: noAttempts ? 'Ingen nye forsøk' : `${deltaStr} · ${entry.attemptsThisWeek} forsøk`,
        stat: noAttempts ? '—' : deltaStr,
        tone: 'text-[var(--nc-cream-dim)]',
        color: undefined,
      }
    })
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

  // Surface the engine's actual root-cause diagnosis as the coach line — the moat
  // made visible. runDiagnosis is otherwise consumed only by the scheduler for
  // targeting; its plain-language `reasoning` (now Norwegian) was computed every
  // session and discarded at the UI layer (engine-knows / UI-hides gap). The top
  // result is the highest-confidence rule; rules 1–4 give cross-concept root-cause
  // insight once error data accumulates, the fallback gives an honest weakest-area
  // line earlier. Falls back to the scheduler reason when no diagnosis fires.
  const topDiagnosis = fingerprint ? (runDiagnosis(fingerprint)[0] ?? null) : null
  const focusDescription = topDiagnosis?.reasoning
    ?? recommendation?.reason
    ?? 'Systemet prioriterer dette nå fordi det gir mest læring med minst friksjon.'

  // Structured diagnosis highlight (focus dimension + affected concepts +
  // confidence) — the rest of runDiagnosis()[0], beside the reasoning whisper.
  // Null until a rule fires, so a cold-start guest sees nothing fabricated.
  // Cumulative lookup (A1…current) so a cross-level affected concept (e.g. the
  // A1 'indefinite-articles' surfacing in a B1 gender diagnosis) resolves to its
  // Norwegian label instead of a humanized English-ish slug. Mirrors diagnosis.ts.
  const diagnosisHighlight = topDiagnosis
    ? deriveDiagnosisHighlight(
        topDiagnosis,
        (id) => getCumulativeConcepts(levelLabel).find((concept) => concept.id === id)?.label,
      )
    : null

  // Lead breaker-verdict — the moat at the top of the home. READ-ONLY derived
  // from the error log (mirrors how /progress calls deriveBreakerStory: cumulative
  // concepts so a cross-level breaker resolves to its Norwegian label). active[0]
  // is the most-active current sentence-breaker; null when there is none (honest
  // cold-start — the verdict block then renders nothing). No mastery writes here.
  const { breakerVerdict, fixedLabels } = useMemo<{ breakerVerdict: BreakerVerdict | null; fixedLabels: string[] }>(() => {
    if (!fingerprint) return { breakerVerdict: null, fixedLabels: [] }
    const { active, retired } = deriveBreakerStory(fingerprint, getCumulativeConcepts(levelLabel))
    const top = active[0]
    return {
      breakerVerdict: top
        ? { label: top.label, thisWeek: top.thisWeek, priorWeek: top.priorWeek, trend: top.trend }
        : null,
      // Retired ("Fikset") breakers → the cream proof chip in the command card
      // (real past struggle, now mastered). Up to 2 so the chip stays one line.
      fixedLabels: retired.slice(0, 2).map((row) => row.label),
    }
  }, [fingerprint, levelLabel])

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
                <span className="rounded-[0.2rem] border border-[color-mix(in_srgb,var(--nc-signal)_18%,transparent)] bg-[var(--nc-signal-tint)] px-1.5 py-px text-[8px] font-bold uppercase tracking-[0.08em] text-[var(--nc-signal)]">{levelDisplay}</span>
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

        {/* ── "I dag" command card — merged production meter + start-økt CTA
            (lead block; all-levels, level-aware lens). Replaces the standalone
            lime hero below. ── */}
        {wallView ? (
          <ProductionWall view={wallView} sessionMeta={heroSubtitle} coachReason={focusDescription} diagnosis={diagnosisHighlight} breaker={breakerVerdict} fixedLabels={fixedLabels} />
        ) : null}

        {/* B2 conjugation drill (/ord) is now a tracked daily lane in "Neste valg"
            below (Slice 3.5) — the standalone entry card was removed to avoid a
            duplicate /ord link. Hero CTA + coach reason live in the "I dag" card above. */}

        {/* Contextual notices stay visible — a level-up celebration and the guest
            nudge are not menu clutter. */}
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

        {/* ── Everything below the command card is now always visible (no collapse).
            The dashboard hero stays the single prescribed action; the rest is laid
            out with varied surfaces (cream lanes → cream muntlig tiles → dark
            Notatboka → cream stat strip + dark week overview) so it reads as a map,
            not a menu of competing doors. Økt + samtale stay one-tap via BottomNav. ── */}

        {/* ── Øving · dagens plan (Cream lane list) ── */}
        <div className="mt-2 flex items-baseline justify-between px-1">
          <h2 className="text-[9px] font-extrabold uppercase tracking-[0.14em] text-[var(--nc-text-dim)]">Øving · dagens plan</h2>
          <span className="text-[9.5px] font-bold tabular-nums text-[var(--nc-text-dim)]">{completedCount} / {coreLanes.length} i dag</span>
        </div>
        <div className="rounded-[0.625rem] bg-[var(--nc-cream)] border border-[rgba(17,21,24,0.08)] p-[5px_6px]">
          <div className="flex flex-col">
            {recommendedLaneId ? (
              <LaneTrackRow
                key={recommendedLaneId}
                laneId={recommendedLaneId}
                hint={laneHints[recommendedLaneId]}
                done={false}
                recommended
                href={recommendedLaneId === 'reading' && skrivReplacesReading ? '/skriv' : undefined}
                label={recommendedLaneId === 'reading' && skrivReplacesReading ? 'Les og skriv' : undefined}
              />
            ) : null}
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
        </div>

        {/* ── Muntlig · snakk mer norsk (3 cream tiles) — Lytt / Uttale / Skygging.
            Built + fingerprint-wired lanes (audit R-01); the North Star is "speak
            more Norwegian". Supplementary, so NOT folded into the daily denominator. ── */}
        <div className="mt-2 flex items-baseline justify-between px-1">
          <h2 className="text-[9px] font-extrabold uppercase tracking-[0.14em] text-[var(--nc-text-dim)]">Muntlig · snakk mer norsk</h2>
        </div>
        <div className="grid grid-cols-3 gap-1.5">
          {MUNTLIG_LANES.map((laneId) => {
            const tile = MUNTLIG_TILE_CONFIG[laneId as MuntligLaneId]
            const TileIcon = tile.Icon
            const muntligDone = completedLanes.has(laneId)
            return (
              <Link
                key={laneId}
                href={tile.href}
                aria-label={`Åpne ${tile.name}`}
                className="relative flex flex-col items-center gap-[7px] rounded-[0.625rem] bg-[var(--nc-cream)] border border-[rgba(17,21,24,0.08)] px-2 py-[11px] text-center transition-colors hover:bg-[rgba(240,241,236,0.8)]"
              >
                {muntligDone ? (
                  <span className="absolute right-1.5 top-1.5 flex size-3.5 items-center justify-center rounded-full bg-[rgba(60,180,100,0.12)] text-[var(--nc-green-solid)]">
                    <Check size={9} aria-hidden="true" />
                  </span>
                ) : null}
                <span className="flex size-8 items-center justify-center rounded-[0.5rem] bg-[rgba(17,21,24,0.06)] text-[var(--nc-cream-text)]">
                  <TileIcon size={15} aria-hidden="true" />
                </span>
                <span className="text-[0.74rem] font-bold text-[var(--nc-cream-text)]">{tile.name}</span>
                <span className="text-[0.62rem] leading-tight text-[var(--nc-cream-muted)]">{laneHints[laneId]}</span>
              </Link>
            )
          })}
        </div>

        {/* ── Notatboka (Dark row, breaks the cream run) — opens the saved-words
            drawer. The full notebook lives at /vocab; this is quick-access. ── */}
        <button
          type="button"
          onClick={() => setNotebookOpen(true)}
          aria-haspopup="dialog"
          aria-expanded={notebookOpen}
          className="mt-2 flex w-full items-center gap-2.5 rounded-[0.625rem] bg-[var(--nc-card)] border border-[var(--nc-border)] px-3 py-[11px] text-left transition-colors hover:border-[var(--nc-border-strong)]"
        >
          <span className="flex size-[30px] shrink-0 items-center justify-center rounded-[0.5rem] bg-[var(--nc-cream)] text-[var(--nc-cream-text)]">
            <BookMarked size={14} aria-hidden="true" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[0.84rem] font-bold text-[var(--nc-text)]">Notatboka</span>
            <span className="mt-px block truncate text-[0.68rem] text-[var(--nc-text-muted)]">Det du har lagret underveis</span>
          </span>
          <ArrowRight size={14} aria-hidden="true" className="shrink-0 text-[var(--nc-text-dim)]" />
        </button>

        {/* ── Status (Cream stat strip + Dark week overview) ── */}
        <div className="mt-2 flex items-baseline justify-between px-1">
          <h2 className="text-[9px] font-extrabold uppercase tracking-[0.14em] text-[var(--nc-text-dim)]">Status</h2>
        </div>

        {/* Stat Strip (Cream) */}
        <div className="grid grid-cols-3 overflow-hidden rounded-[0.625rem] bg-[var(--nc-cream)] border border-[rgba(17,21,24,0.08)]">
          {statTiles.map((stat, i) => (
            <div key={stat.label} className={`relative px-2 py-[11px] text-center${i > 0 ? ' before:absolute before:left-0 before:top-[22%] before:h-[56%] before:w-px before:bg-[rgba(17,21,24,0.08)]' : ''}`}>
              <div className={`text-[1.2rem] font-extrabold tabular-nums leading-none ${stat.label === 'Rekke' ? 'text-[var(--nc-cream-text)]' : stat.label === 'Min talt' ? 'text-[var(--nc-teal-deep)]' : 'text-[var(--nc-signal-ink)]'}`}>
                {stat.value}
              </div>
              <div className="mt-1 text-[8px] font-bold uppercase tracking-[0.1em] text-[var(--nc-cream-dim)]">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Week Overview (Dark) */}
        <div className="overflow-hidden rounded-[0.625rem] bg-[var(--nc-card)] border border-[var(--nc-border)]">
          <div className="flex items-center justify-between border-b border-[var(--nc-border)] px-3 py-[9px]">
            <span className="text-[9px] font-extrabold uppercase tracking-[0.12em] text-[var(--nc-text-dim)]">Ukeoversikt</span>
            <span className="rounded-full bg-[var(--nc-signal)] px-2 py-px text-[8px] font-extrabold uppercase tracking-[0.06em] text-[var(--nc-signal-fg)]">Denne uka</span>
          </div>
          <div className="grid grid-cols-2">
            <div className="p-[10px_11px]">
              <div className="mb-1.5 text-[9px] font-extrabold uppercase tracking-[0.1em] text-[var(--nc-text-dim)]">Fokus</div>
              {focusPreview.slice(0, 3).map((item) => (
                <div key={item.id} className="flex items-center justify-between py-[3px]">
                  <span className="text-[0.76rem] text-[var(--nc-text)]">{item.label}</span>
                  <span className={`text-[0.72rem] font-extrabold tabular-nums ${item.stat.startsWith('+') ? 'text-[var(--nc-signal)]' : item.stat.startsWith('-') ? 'text-[var(--nc-red)]' : 'text-[var(--nc-text-muted)]'}`}>{item.stat}</span>
                </div>
              ))}
              {focusPreview.length === 0 ? (
                <div className="py-[3px] text-[0.72rem] text-[var(--nc-text-dim)]">Bygges fra øktene</div>
              ) : null}
            </div>
            <div className="border-l border-[var(--nc-border)] p-[10px_11px]">
              <div className="mb-1.5 text-[9px] font-extrabold uppercase tracking-[0.1em] text-[var(--nc-text-dim)]">Sjekk</div>
              <div className="flex items-center justify-between py-[3px]">
                <span className="text-[0.76rem] text-[var(--nc-text)]">Ukesjekk</span>
                <span className="text-[0.72rem] font-semibold text-[var(--nc-text-muted)]">{dayOfWeek === 6 || dayOfWeek === 0 ? 'Klar nå' : 'Lørdag'}</span>
              </div>
              <div className="flex items-center justify-between py-[3px]">
                <span className="text-[0.76rem] text-[var(--nc-text)]">Tema</span>
                <span className="text-[0.72rem] font-semibold text-[var(--nc-text-muted)]">Konseptdrevet</span>
              </div>
              <Link href="/uke" className="mt-1.5 inline-flex items-center gap-1 text-[0.72rem] font-semibold text-[var(--nc-text-muted)]">
                Gå til sjekken
                <span className="flex size-6 items-center justify-center rounded-full border border-[var(--nc-signal-border)] text-[11px] text-[var(--nc-signal)]">→</span>
              </Link>
            </div>
          </div>
        </div>

      </main>

      <NotebookDrawer open={notebookOpen} onClose={() => setNotebookOpen(false)} />

      <BottomNav active="home" />
    </div>
  )
}
