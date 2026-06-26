'use client'

import { useEffect, useMemo, useState, type ElementType } from 'react'
import Link from 'next/link'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowRight, BookMarked, MessageSquareText, NotebookPen, Theater, BookOpenText, Sparkles } from 'lucide-react'
import { useFingerprint } from '@/hooks/useFingerprint'
import { useFingerprintStore } from '@/stores/fingerprint-store'
import { useAuth } from '@/hooks/useAuth'
import { generateSession, type SchedulerOutput } from '@/engine/scheduler'
import { getConceptPhase, isMastered, runDiagnosis } from '@/engine'
import type { ConceptPhase } from '@/engine'
import { BottomNav } from '@/components/layout/BottomNav'
import { AIStatusBadge } from '@/components/ai/AIStatusBadge'
import { getStreak } from '@/lib/streak'
import { SEED_SENTENCES, SEED_SENTENCE_IDS } from '@/lib/seed-pool'
import { SEED_PASSAGES, SEED_PASSAGE_IDS } from '@/lib/passage-pool'
import { getConceptColor } from '@/lib/concept-colors'
import { getGraphForLevel, getCumulativeConcepts } from '@/lib/concept-graph-loader'
import { deriveAccuracyDisplay } from '@/lib/dashboard-stats'
import { getCoachRecommendation, getCoachPlan, type CoachRecommendation } from '@/lib/coach-recommendation'
import { useKariLine } from '@/hooks/useKariLine'
import type { CoachContext } from '@/ai/types'
import { getCompletedLanes, ALL_LANES, type LaneId } from '@/lib/lane-completion'
import { summarizeWeeklyProgress } from '@/lib/weekly-progress'
import { ProductionWall } from '@/components/dashboard/ProductionWall'
import { deriveProductionWallView, deriveDiagnosisHighlight, type BreakerVerdict } from '@/lib/production-wall'
import { deriveBreakerStory } from '@/lib/breaker-story'
import { NotebookDrawer } from '@/components/notebook/NotebookDrawer'
import { useDashboardV3 } from '@/lib/dashboard-flag'
import { DashboardV3 } from '@/components/dashboard/v3/DashboardV3'

// Icon per prescribed-plan lane (the "Dagens plan" cards). Lucide only.
const PLAN_ICON: Record<string, ElementType> = {
  conversation: MessageSquareText,
  journal: NotebookPen,
  roleplay: Theater,
  reading: BookOpenText,
  'weekly-check': Sparkles,
}

// Flag-gated dashboard variant. The V3 flag is false on the server AND on the
// first client render (hydration-safe), so SSR + first paint always match the
// current dashboard; it swaps to DashboardV3 only after mount when the
// `norskcoach-dash-v3` localStorage flag is on. Off by default → live unchanged.
export default function DashboardPage() {
  const v3 = useDashboardV3()
  return v3 ? <DashboardV3 /> : <DashboardLegacy />
}

function DashboardLegacy() {
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

  // At B1/B2 the read→recite→write module (/skriv) replaces plain reading, so a
  // prescribed "reading" card routes there instead of /reading (which only holds
  // A1/A2 texts).
  const skrivReplacesReading = levelLabel === 'B1' || levelLabel === 'B2'

  // Direction B (vision audit 2026-06-26): the home shows the coach's PRESCRIBED
  // SHORT plan — the top non-session lanes with their "why this" reason — not a
  // full menu. The session is already the hero (command card above), so it is
  // dropped here; the full speaking/writing catalogue lives one tap away on the
  // Snakk hub. getCoachPlan shares its ranking with the command card's
  // recommendation, so the two never disagree.
  const planCards = useMemo(() => {
    if (!fingerprint) return [] as CoachRecommendation[]
    return getCoachPlan(fingerprint, activeGraph, plan, 3)
      .filter((card) => card.laneId !== 'session' && card.laneId !== 'celebration')
      .slice(0, 2)
      .map((card) =>
        card.laneId === 'reading' && skrivReplacesReading
          ? { ...card, href: '/skriv', title: 'Les og skriv' }
          : card,
      )
  }, [fingerprint, activeGraph, plan, skrivReplacesReading])

  // Honest "done today" count across every tracked practice lane (core + muntlig).
  const doneToday = ALL_LANES.filter((laneId) => completedLanes.has(laneId)).length
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

  // Tier-2 Slice B — one Kari voice. The coach whisper renders the deterministic
  // focusDescription INSTANTLY (no AI call blocks the home), then, if AI is up, swaps
  // in a warm Kari-voiced rephrasing of the SAME honest focus + reason. Cached per
  // focus-concept-per-day, so repeat home loads are instant with no flash and the home
  // calls the AI at most once per focus change. Display-only — never moves mastery.
  const focusConceptId = topDiagnosis?.rootCauseConceptId ?? fingerprint?.weeklyFocus[0]
  const focusConceptLabel = activeGraph.concepts.find((c) => c.id === focusConceptId)?.label
  const dashboardCoachCtx: CoachContext | null = fingerprint
    ? { kind: 'dashboard-focus', level: levelLabel, focusLabel: focusConceptLabel, reasoning: focusDescription }
    : null
  const coachLine = useKariLine(dashboardCoachCtx, focusDescription, `dashboard_${focusConceptId ?? 'none'}`)

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
          <ProductionWall view={wallView} sessionMeta={heroSubtitle} coachReason={coachLine} diagnosis={diagnosisHighlight} breaker={breakerVerdict} fixedLabels={fixedLabels} />
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

        {/* ── Dagens plan (Direction B): the coach's PRESCRIBED short list — the
            top non-session lanes with their "why this" reason — not a full menu.
            The session is the hero (command card above); the complete
            speaking/writing catalogue lives one tap away on the Snakk hub, linked
            below. This stops the home from being a second copy of that menu. ── */}
        <div className="mt-2 flex items-baseline justify-between px-1">
          <h2 className="text-[9px] font-extrabold uppercase tracking-[0.14em] text-[var(--nc-text-dim)]">Dagens plan</h2>
          <span className="text-[9.5px] font-bold tabular-nums text-[var(--nc-text-dim)]">{doneToday} gjort i dag</span>
        </div>
        {planCards.length > 0 ? (
          <div className="flex flex-col gap-1.5">
            {planCards.map((card) => {
              const Icon = PLAN_ICON[card.laneId] ?? Sparkles
              return (
                <Link
                  key={card.laneId}
                  href={card.href}
                  aria-label={`Åpne ${card.title}`}
                  className="flex items-center gap-3 rounded-[0.625rem] bg-[var(--nc-cream)] border border-[rgba(17,21,24,0.08)] px-3 py-[11px] transition-colors hover:bg-[rgba(240,241,236,0.85)]"
                >
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-[0.5rem] bg-[var(--nc-cream-text)] text-white">
                    <Icon size={15} aria-hidden="true" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[0.86rem] font-bold leading-tight text-[var(--nc-cream-text)]">{card.title}</span>
                    <span className="mt-0.5 block text-[0.7rem] leading-snug text-[var(--nc-cream-muted)]">
                      {card.reason ?? card.subtitle}
                    </span>
                  </span>
                  <ArrowRight size={15} aria-hidden="true" className="shrink-0 text-[var(--nc-cream-dim)]" />
                </Link>
              )
            })}
          </div>
        ) : (
          <div className="rounded-[0.625rem] bg-[var(--nc-cream)] border border-[rgba(17,21,24,0.08)] px-3 py-3 text-center">
            <p className="text-[0.82rem] font-semibold text-[var(--nc-cream-text)]">Du er ajour for i dag.</p>
            <p className="mt-0.5 text-[0.7rem] text-[var(--nc-cream-muted)]">Vil du øve mer? Alt ligger i Snakk.</p>
          </div>
        )}

        {/* All practice surfaces (speaking, writing, listening) live on the Snakk
            hub — one nav tap away. The home links there instead of re-listing them. */}
        <Link
          href="/snakk"
          className="flex items-center justify-between gap-2 rounded-[0.625rem] bg-[var(--nc-card)] border border-[var(--nc-border)] px-3 py-[11px] transition-colors hover:border-[var(--nc-border-strong)]"
        >
          <span className="min-w-0">
            <span className="block text-[0.84rem] font-bold text-[var(--nc-text)]">Alle øvelser</span>
            <span className="mt-px block text-[0.68rem] text-[var(--nc-text-muted)]">Snakk, lytt, skygg, rollespill og skriv</span>
          </span>
          <ArrowRight size={14} aria-hidden="true" className="shrink-0 text-[var(--nc-text-dim)]" />
        </Link>

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
