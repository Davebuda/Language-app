'use client'

/**
 * DashboardV3 — V3 Liquid-Glass dashboard shell.
 *
 * Pure re-presentation of the SAME engine view-models the current
 * dashboard/page.tsx uses. All hook calls, memos, and honesty locks are
 * identical to the existing dashboard — no new data sources, no raw
 * fingerprint field reads (normalized view-models only).
 *
 * Visual contract (matched faithfully at 375px):
 *   .omc/frontend/dashboard-v3-compact/dashboard-R1.html
 *
 * Sections (top → bottom, one mobile viewport):
 *   Identity row  — avatar · name · mono level/streak · lime AI pill
 *   I DAG         — merged dark command card (Fanget lime pill · bright-lime
 *                   hero count · white FIKSET pill · lime "Start dagens økt" act)
 *   §VERKTØY      — compact "§" header + 2-col grid of 6 rail GlassTiles
 *   §DAGENS PLAN  — compact header + recipe distribution bar + 4 numbered lanes
 *   STATUS        — cream 3-col strip (Rekke / Min talt / Treff)
 *   Snakk rail    — cyan glass CTA → /conversation
 *   BottomNav     — unchanged existing component
 *
 * Layout tokens from .dash-v3 in globals.css; wraps the root element in
 * className="dash-v3" so all --v3-* properties apply.
 *
 * Flag-gated: dashboard/page.tsx conditionally renders this component behind
 * the `norskcoach-dash-v3` flag. No engine or existing-file edits here.
 */

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import {
  GraduationCap, Mic, BookOpen, Headphones, PenLine, Notebook, ArrowRight,
} from 'lucide-react'
import { useFingerprint } from '@/hooks/useFingerprint'
import { useFingerprintStore } from '@/stores/fingerprint-store'
import { useAuth } from '@/hooks/useAuth'
import { generateSession, type SchedulerOutput } from '@/engine/scheduler'
import { runDiagnosis } from '@/engine'
import { BottomNav } from '@/components/layout/BottomNav'
import { AIStatusBadge } from '@/components/ai/AIStatusBadge'
import { GlassTile } from '@/components/ui/GlassTile'
import { getStreak } from '@/lib/streak'
import { SEED_SENTENCES, SEED_SENTENCE_IDS } from '@/lib/seed-pool'
import { SEED_PASSAGES, SEED_PASSAGE_IDS } from '@/lib/passage-pool'
import { getGraphForLevel, getCumulativeConcepts } from '@/lib/concept-graph-loader'
import { deriveAccuracyDisplay } from '@/lib/dashboard-stats'
import { getCoachRecommendation } from '@/lib/coach-recommendation'
import { useKariLine } from '@/hooks/useKariLine'
import type { CoachContext } from '@/ai/types'
import { summarizeWeeklyProgress } from '@/lib/weekly-progress'
import { deriveProductionWallView, deriveDiagnosisHighlight, type BreakerVerdict } from '@/lib/production-wall'
import { deriveBreakerStory } from '@/lib/breaker-story'

// ── Component ─────────────────────────────────────────────────────────────────

export function DashboardV3() {
  // ── Data hooks — identical to dashboard/page.tsx ──────────────────────────
  useFingerprint()
  const { fingerprint, status } = useFingerprintStore()
  const { user } = useAuth()
  const [plan, setPlan] = useState<SchedulerOutput | null>(null)
  const [streak, setStreak] = useState(0)

  useEffect(() => {
    setStreak(getStreak())
  }, [])

  const activeGraph = getGraphForLevel(fingerprint?.currentLevel ?? 'A1')

  // Generate session once the fingerprint is loaded — identical to page.tsx
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

  // ── Derived display values — identical to dashboard/page.tsx ─────────────
  const displayName = user?.user_metadata?.full_name ?? user?.email?.split('@')[0] ?? 'Gjest'
  const levelLabel  = fingerprint?.currentLevel ?? 'A1'
  // Displayed level chip: "–" while loading so a returning learner never sees a wrong flash
  const levelDisplay = fingerprint?.currentLevel ?? (status === 'loading' ? '–' : 'A1')
  const speakingMins = Math.round(fingerprint?.speakingMinutesTotal ?? 0)
  const accuracyDisplay = deriveAccuracyDisplay(fingerprint)
  const skrivReplacesReading = levelLabel === 'B1' || levelLabel === 'B2'

  const recommendation = useMemo(() => {
    if (!fingerprint) return null
    return getCoachRecommendation(fingerprint, activeGraph, plan)
  }, [fingerprint, activeGraph, plan])

  const progressEntries = useMemo(() => {
    if (!fingerprint) return []
    return summarizeWeeklyProgress(fingerprint, activeGraph)
  }, [fingerprint, activeGraph])

  // Production wall view — null pre-hydration (honest cold-start)
  const wallView = useMemo(
    () => (fingerprint ? deriveProductionWallView(fingerprint, progressEntries) : null),
    [fingerprint, progressEntries],
  )

  // ── Diagnosis — identical to dashboard/page.tsx ───────────────────────────
  const topDiagnosis = fingerprint ? (runDiagnosis(fingerprint)[0] ?? null) : null
  const focusDescription = topDiagnosis?.reasoning
    ?? recommendation?.reason
    ?? 'Systemet prioriterer dette nå fordi det gir mest læring med minst friksjon.'

  const focusConceptId    = topDiagnosis?.rootCauseConceptId ?? fingerprint?.weeklyFocus[0]
  const focusConceptLabel = activeGraph.concepts.find((c) => c.id === focusConceptId)?.label
  const dashboardCoachCtx: CoachContext | null = fingerprint
    ? { kind: 'dashboard-focus', level: levelLabel, focusLabel: focusConceptLabel, reasoning: focusDescription }
    : null
  // Kari voice: deterministic focusDescription rendered instantly, optionally
  // swapped for a Kari-voiced rephrasing. Cache key prefixed "v3" so this
  // component gets its own cache entry independent of the existing dashboard.
  const coachLine = useKariLine(
    dashboardCoachCtx,
    focusDescription,
    `dashboard_v3_${focusConceptId ?? 'none'}`,
  )

  // Structured diagnosis highlight (focus dimension, affected concepts, confidence)
  const diagnosisHighlight = topDiagnosis
    ? deriveDiagnosisHighlight(
        topDiagnosis,
        (id) => getCumulativeConcepts(levelLabel).find((c) => c.id === id)?.label,
      )
    : null

  // BreakerStory — identical derivation to dashboard/page.tsx
  const { breakerVerdict, fixedLabels } = useMemo<{
    breakerVerdict: BreakerVerdict | null
    fixedLabels: string[]
  }>(() => {
    if (!fingerprint) return { breakerVerdict: null, fixedLabels: [] }
    const { active, retired } = deriveBreakerStory(fingerprint, getCumulativeConcepts(levelLabel))
    const top = active[0]
    return {
      breakerVerdict: top
        ? { label: top.label, thisWeek: top.thisWeek, priorWeek: top.priorWeek, trend: top.trend }
        : null,
      // Retired ("Fikset") breakers — real past struggle, now mastered. Up to 2.
      fixedLabels: retired.slice(0, 2).map((row) => row.label),
    }
  }, [fingerprint, levelLabel])

  // ── Session recipe — derived from actual plan item purposes (honest) ───────
  const sessionItems = plan?.session.items ?? []
  const totalItems   = Math.max(1, sessionItems.length)
  const remCount = sessionItems.filter((i) => i.purpose === 'remediation').length
  const revCount = sessionItems.filter((i) => i.purpose === 'review').length
  const newCount = sessionItems.filter((i) => i.purpose === 'new-material' || i.purpose === 'new-vocab').length
  const intCount = sessionItems.filter((i) => i.purpose === 'interleaving').length
  const sessionDuration = plan ? Math.max(1, Math.ceil((sessionItems.length * 45) / 60)) : 0

  // Recipe % for the distribution bar — falls back to 40/30/20/10 pre-plan
  const remPct = plan ? Math.round((remCount / totalItems) * 100) : 40
  const revPct = plan ? Math.round((revCount / totalItems) * 100) : 30
  const newPct = plan ? Math.round((newCount / totalItems) * 100) : 20
  const intPct = plan ? Math.max(0, 100 - remPct - revPct - newPct) : 10

  // ── Derived labels ─────────────────────────────────────────────────────────
  // Focus label for lane 1 "Leder med" and the Snakk rail subtitle
  const remediationFocusLabel = diagnosisHighlight?.affectedLabels[0] ?? null
  // Lær tile: live item count when plan is available
  const lerSubtitle = plan ? `Dagens økt · ${sessionItems.length} oppg` : 'Laster...'

  // Sparkbars for the command card
  const weekBars = wallView?.weekBars ?? []
  const sparkMax = Math.max(1, ...weekBars.map((b) => b.value))

  // Honest session meta — only when a plan exists
  const sessionMeta = plan ? `${sessionItems.length} oppgaver · ca. ${sessionDuration} min` : ''

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div
      className="dash-v3 flex min-h-dvh flex-col"
      style={{
        background: 'var(--v3-bg)',
        color: 'var(--v3-on-dark)',
        WebkitFontSmoothing: 'antialiased',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      }}
    >
      <main className="flex flex-1 flex-col" style={{ gap: 7, padding: '9px 12px 96px' }}>

        {/* ══ Identity row ═══════════════════════════════════════════════════ */}
        <div className="flex items-center" style={{ gap: 9, height: 34, flexShrink: 0 }}>
          {/* Avatar — dark glass badge, lime-lit initial */}
          <div
            className="flex shrink-0 items-center justify-center"
            style={{
              width: 30,
              height: 30,
              borderRadius: 9,
              background: 'linear-gradient(150deg,#1d2620,#0f1512)',
              border: '1px solid rgba(255,255,255,.09)',
              fontWeight: 700,
              fontSize: 15,
              color: 'var(--v3-lime-lit)',
              boxShadow: 'inset 0 1px 1px rgba(255,255,255,.12)',
            }}
          >
            {displayName.charAt(0).toUpperCase()}
          </div>
          <div className="flex flex-col" style={{ gap: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 600, lineHeight: 1, color: 'var(--v3-on-dark)' }}>
              {displayName}
            </div>
            <div
              style={{
                fontFamily: 'var(--v3-mono)',
                fontSize: 9,
                letterSpacing: '.07em',
                color: 'var(--v3-on-dark-3)',
              }}
            >
              {levelDisplay}
              {streak > 0 ? (
                <>
                  {' · DAG '}{streak}{' PÅ RAD '}
                  <b style={{ color: 'var(--v3-amber)', fontWeight: 500 }}>●</b>
                </>
              ) : null}
            </div>
          </div>

          {/* AI status — real AIStatusBadge inside R1's lime pill */}
          <div
            className="shrink-0"
            style={{
              marginLeft: 'auto',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              fontFamily: 'var(--v3-mono)',
              fontSize: 9.5,
              fontWeight: 600,
              letterSpacing: '.12em',
              color: 'var(--v3-cyan)',
              padding: '5px 11px',
              border: '1px solid rgba(0,194,224,.42)',
              borderRadius: 999,
              background: 'rgba(0,194,224,.09)',
            }}
          >
            <span
              aria-hidden="true"
              style={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                background: 'var(--v3-cyan)',
                boxShadow: '0 0 7px var(--v3-cyan)',
                display: 'inline-block',
                flexShrink: 0,
              }}
            />
            <AIStatusBadge />
          </div>
        </div>

        {/* ══ I DAG — merged dark command card ═══════════════════════════════ */}
        <div
          style={{
            position: 'relative',
            borderRadius: 16,
            overflow: 'hidden',
            flexShrink: 0,
            background: 'linear-gradient(180deg,#13181a,#0d1112)',
            border: '1px solid var(--v3-line-2)',
            boxShadow: '0 16px 32px -18px rgba(0,0,0,.85)',
          }}
        >
          <div style={{ padding: '11px 13px 12px' }}>
            {/* Kicker + level chip */}
            <div className="flex items-center justify-between" style={{ gap: 8, marginBottom: 9 }}>
              <span
                style={{
                  fontFamily: 'var(--v3-mono)',
                  fontSize: 9,
                  letterSpacing: '.13em',
                  textTransform: 'uppercase',
                  color: '#aee632',
                  fontWeight: 600,
                }}
              >
                {wallView?.objectiveKicker ?? 'Dagens mål'}
              </span>
              <span
                style={{
                  fontFamily: 'var(--v3-mono)',
                  fontSize: 8,
                  letterSpacing: '.06em',
                  color: 'var(--v3-lime)',
                  border: '1px solid rgba(200,255,32,.42)',
                  background: 'rgba(200,255,32,.10)',
                  padding: '2px 7px',
                  borderRadius: 6,
                  flexShrink: 0,
                }}
              >
                {levelDisplay}
              </span>
            </div>

            {/* Fanget pill + "Se hele bildet" — gated on a real breaker (cold-start hides) */}
            {breakerVerdict ? (
              <div className="flex items-center" style={{ gap: 10, marginBottom: 6, flexWrap: 'wrap' }}>
                <span
                  className="inline-flex items-center"
                  style={{
                    gap: 6,
                    fontSize: 11.5,
                    fontWeight: 700,
                    color: 'var(--v3-coral)',
                    background: 'rgba(255,106,85,.12)',
                    border: '1px solid rgba(255,106,85,.42)',
                    padding: '5px 11px',
                    borderRadius: 8,
                  }}
                >
                  <span
                    aria-hidden="true"
                    style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--v3-coral)', boxShadow: '0 0 6px var(--v3-coral)' }}
                  />
                  Fanget · {breakerVerdict.label}
                </span>
                <Link
                  href="/progress"
                  className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--v3-cyan)]"
                  style={{ fontSize: 9.5, fontWeight: 600, color: '#27d6f0', whiteSpace: 'nowrap', textDecoration: 'none' }}
                >
                  Se hele bildet ›
                </Link>
              </div>
            ) : null}

            {/* Signal line — gated on a structured diagnosis highlight */}
            {diagnosisHighlight ? (
              <div
                style={{
                  fontFamily: 'var(--v3-mono)',
                  fontSize: 8.5,
                  letterSpacing: '.07em',
                  textTransform: 'uppercase',
                  color: 'var(--v3-on-dark-3)',
                  marginBottom: 10,
                }}
              >
                <span
                  style={{
                    color: diagnosisHighlight.confidenceTier === 'strong' ? 'var(--v3-teal)' : 'var(--v3-amber)',
                    fontWeight: 600,
                  }}
                >
                  {diagnosisHighlight.confidenceTier === 'strong' ? 'Sikker diagnose' : 'Tidlig signal'}
                </span>
                {' · Fokus: '}{diagnosisHighlight.focusLabel}
              </div>
            ) : null}

            {/* Hero count + week sparkbars */}
            <div className="flex" style={{ alignItems: 'flex-end', gap: 10 }}>
              <span
                className="tabular-nums"
                style={{ fontSize: 42, fontWeight: 800, lineHeight: '.78', letterSpacing: '-.03em', color: 'var(--v3-lime)' }}
              >
                {wallView?.heroCount ?? '—'}
              </span>
              <span style={{ fontSize: 11, color: 'var(--v3-on-dark-2)', paddingBottom: 4 }}>
                {wallView?.heroUnit ?? 'produsert'}<br />denne uka
              </span>
              {weekBars.length > 0 ? (
                <div
                  aria-hidden="true"
                  className="flex"
                  style={{ marginLeft: 'auto', alignItems: 'flex-end', gap: 3, height: 26, paddingBottom: 4 }}
                >
                  {weekBars.map((bar, i) => (
                    <span
                      key={i}
                      style={{
                        width: 6,
                        height: `${Math.max(3, Math.round((bar.value / sparkMax) * 25))}px`,
                        borderRadius: '2px 2px 0 0',
                        background: bar.live ? 'var(--v3-lime)' : 'rgba(200,255,32,.2)',
                        boxShadow: bar.live ? '0 0 6px var(--v3-lime-glow)' : undefined,
                        display: 'block',
                      }}
                    />
                  ))}
                </div>
              ) : null}
              <span
                style={{
                  marginLeft: weekBars.length > 0 ? undefined : 'auto',
                  fontFamily: 'var(--v3-mono)',
                  fontSize: 8,
                  letterSpacing: '.06em',
                  textTransform: 'uppercase',
                  color: 'var(--v3-on-dark-3)',
                  paddingBottom: 4,
                }}
              >
                uka
              </span>
            </div>

            {/* FIKSET proof pill — gated on real retired breakers */}
            {fixedLabels.length > 0 ? (
              <div
                className="flex items-center"
                style={{ gap: 9, marginTop: 11, background: 'var(--v3-cream)', borderRadius: 9, padding: '7px 11px' }}
              >
                <span
                  className="inline-flex items-center"
                  style={{
                    gap: 5,
                    fontFamily: 'var(--v3-mono)',
                    fontSize: 8,
                    letterSpacing: '.1em',
                    textTransform: 'uppercase',
                    color: '#177c5e',
                    fontWeight: 600,
                    flexShrink: 0,
                  }}
                >
                  <span
                    aria-hidden="true"
                    style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--v3-teal)', boxShadow: '0 0 6px var(--v3-teal-glow)' }}
                  />
                  Fikset
                </span>
                <span
                  style={{ fontSize: 11, fontWeight: 700, color: 'var(--v3-ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
                >
                  {fixedLabels.join(' · ')}
                </span>
              </div>
            ) : null}
          </div>

          {/* Act half — the ONE prescribed action */}
          <Link
            href="/session"
            aria-label={`Start dagens økt${sessionMeta ? ` — ${sessionMeta}` : ''}`}
            className="flex items-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--v3-ink)]"
            style={{
              gap: 10,
              background: 'linear-gradient(135deg,#C8FF20,#B8EF10)',
              padding: '11px 13px',
              textDecoration: 'none',
            }}
          >
            <span className="flex flex-col text-left" style={{ minWidth: 0 }}>
              <span
                style={{
                  fontFamily: 'var(--v3-mono)',
                  fontSize: 9,
                  letterSpacing: '.01em',
                  color: 'rgba(10,18,6,.62)',
                  marginBottom: 3,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {coachLine}
              </span>
              <strong style={{ fontSize: 18, fontWeight: 800, color: 'var(--v3-ink)', lineHeight: 1, letterSpacing: '-.025em' }}>
                Start dagens økt
              </strong>
              {sessionMeta ? (
                <span style={{ fontSize: 9, fontWeight: 700, color: 'rgba(10,18,6,.6)', marginTop: 3 }}>
                  {sessionMeta}
                </span>
              ) : null}
            </span>
            <span
              aria-hidden="true"
              className="flex shrink-0 items-center justify-center"
              style={{ marginLeft: 'auto', width: 34, height: 34, borderRadius: '50%', background: 'rgba(10,18,6,.92)' }}
            >
              <ArrowRight size={17} color="#fff" strokeWidth={2} />
            </span>
          </Link>
        </div>

        {/* ══ §VERKTØY — 3-col grid of clean glowing glass tiles ════════════ */}
        {/* Approved direction (clean-tiles iteration): one nice box per tile — a
            big backlit glyph sunk into the back glass, white label on top, a
            single accent bloom + top hairline. E-density 3-col so all 6 fit in
            two rows within the one-viewport frame. Each its own accent
            (Lær=lime … Notatboka=violet). */}
        <Led title="Verktøy" meta="6 øvelser" />
        <div className="grid" style={{ gridTemplateColumns: '1fr 1fr 1fr', gap: 8, flexShrink: 0 }}>
          <GlassTile accent="lime" icon={GraduationCap} title="Lær" subtitle={lerSubtitle} href="/session" size="grid" />
          <GlassTile accent="cyan" icon={Mic} title="Snakk" subtitle="Kari · øv høyt" href="/snakk" size="grid" />
          <GlassTile
            accent="teal"
            icon={BookOpen}
            title="Les"
            subtitle="Tekster på nivå"
            href={skrivReplacesReading ? '/skriv' : '/reading'}
            size="grid"
          />
          <GlassTile accent="amber" icon={Headphones} title="Lytt" subtitle="Hør og svar" href="/listen" size="grid" />
          <GlassTile accent="coral" icon={PenLine} title="Skriv" subtitle="Journal · rettet" href="/journal" size="grid" />
          <GlassTile accent="violet" icon={Notebook} title="Notatboka" subtitle="Ord du har lagret" href="/vocab" size="grid" />
        </div>

        {/* ══ §DAGENS PLAN — recipe bar + 4 numbered lanes ══════════════════ */}
        <div style={{ flexShrink: 0 }}>
          <Led title="Dagens plan" meta={plan ? `${sessionItems.length} oppg` : undefined} />
          {/* Recipe distribution bar */}
          <div
            className="flex overflow-hidden"
            style={{ height: 6, borderRadius: 3, margin: '5px 0 6px', gap: 1.5 }}
            aria-hidden="true"
          >
            {plan ? (
              <>
                <span style={{ width: `${remPct}%`, background: 'var(--v3-lime)', display: 'block' }} />
                <span style={{ width: `${revPct}%`, background: 'var(--v3-amber)', display: 'block' }} />
                <span style={{ width: `${newPct}%`, background: 'var(--v3-cyan)', display: 'block' }} />
                <span style={{ width: `${intPct}%`, background: 'var(--v3-coral)', display: 'block' }} />
              </>
            ) : (
              <span style={{ width: '100%', background: 'var(--v3-line-2)', display: 'block' }} />
            )}
          </div>
          {/* Lanes */}
          <div className="flex flex-col" style={{ gap: 4 }}>
            <PlanLane
              number="01"
              lane="lead"
              isLead={Boolean(diagnosisHighlight)}
              title="Remediering"
              titleTail={remediationFocusLabel ? ` · ${remediationFocusLabel}` : ''}
              rec={diagnosisHighlight ? 'Anbefalt' : undefined}
              meta={`${remCount}${diagnosisHighlight ? ' · GRUNNÅRSAK' : ''}`}
            />
            <PlanLane number="02" lane="l2" title="Repetisjon" titleTail=" · SRS" meta={`${revCount} · FORFALLER`} />
            <PlanLane number="03" lane="l3" title="Nytt materiale" titleTail="" meta={`${newCount} · ${levelLabel}`} />
            <PlanLane number="04" lane="l4" title="Fletting" titleTail="" meta={`${intCount} · DAGLIG`} />
          </div>
        </div>

        {/* ══ STATUS — cream 3-col strip ════════════════════════════════════ */}
        <div className="flex overflow-hidden" style={{ background: 'var(--v3-cream)', borderRadius: 11, flexShrink: 0 }}>
          <StatusCell label="Rekke" value={streak > 0 ? streak : '—'} unit={streak > 0 ? 'dgr' : undefined} first />
          <StatusCell label="Min talt" value={speakingMins > 0 ? speakingMins : '—'} unit={speakingMins > 0 ? 'min' : undefined} />
          <StatusCell label="Treff" value={accuracyDisplay} />
        </div>

        {/* ══ Snakk med Kari — cyan glass rail → /conversation ══════════════ */}
        <Link
          href="/conversation"
          aria-label="Snakk med Kari — øv norsk i en samtale"
          className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--v3-cyan)]"
          style={{
            position: 'relative',
            height: 56,
            borderRadius: 14,
            overflow: 'hidden',
            display: 'flex',
            alignItems: 'center',
            gap: 11,
            padding: '0 13px',
            flexShrink: 0,
            marginTop: 2,
            background: 'linear-gradient(160deg,#10262b,#0c1a1e 60%,#091316)',
            border: '1px solid rgba(255,255,255,.08)',
            boxShadow: '0 14px 26px -16px rgba(0,0,0,.82),inset 0 1px 1px rgba(255,255,255,.12),inset 0 -12px 20px -16px rgba(0,0,0,.56)',
            textDecoration: 'none',
          }}
        >
          {/* Cyan bloom */}
          <span
            aria-hidden="true"
            style={{
              position: 'absolute',
              inset: 0,
              mixBlendMode: 'screen',
              background: 'radial-gradient(46% 70% at 16% 50%,var(--v3-cyan-glow) 0%,transparent 64%)',
              pointerEvents: 'none',
            }}
          />
          {/* Top gloss */}
          <span
            aria-hidden="true"
            style={{
              position: 'absolute',
              inset: 0,
              pointerEvents: 'none',
              background: 'linear-gradient(180deg,rgba(255,255,255,.16),transparent 50%)',
              WebkitMaskImage: 'radial-gradient(120% 100% at 50% -28%,#000 42%,transparent 70%)',
              maskImage: 'radial-gradient(120% 100% at 50% -28%,#000 42%,transparent 70%)',
            }}
          />
          {/* Lit mic — the only light source for this rail */}
          <span
            aria-hidden="true"
            className="flex items-center justify-center"
            style={{ position: 'relative', zIndex: 1, width: 28, height: 28, flexShrink: 0 }}
          >
            <Mic
              size={25}
              color="var(--v3-cyan)"
              strokeWidth={1.5}
              style={{ filter: 'drop-shadow(0 0 6px var(--v3-cyan)) drop-shadow(0 0 18px var(--v3-cyan-glow))' }}
            />
          </span>
          {/* Text */}
          <span className="min-w-0" style={{ position: 'relative', zIndex: 1, flex: '0 1 auto' }}>
            <span className="flex items-center" style={{ gap: 7, marginBottom: 2 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--v3-cyan-lit)' }}>Snakk med Kari</span>
              <span
                style={{
                  fontFamily: 'var(--v3-mono)',
                  fontSize: 7.5,
                  letterSpacing: '.1em',
                  color: '#001316',
                  background: 'var(--v3-cyan)',
                  padding: '1px 5px',
                  borderRadius: 4,
                  fontWeight: 600,
                }}
              >
                LIVE
              </span>
            </span>
            <span
              style={{
                display: 'block',
                fontFamily: 'var(--v3-mono)',
                fontSize: 8,
                color: '#cfd6cd',
                opacity: 0.78,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {remediationFocusLabel
                ? `Øv ${remediationFocusLabel} høyt — i en samtale`
                : 'Øv norsk høyt — i en samtale'}
            </span>
          </span>
          {/* Speaking minutes — only when > 0 (honest gate) */}
          {speakingMins > 0 ? (
            <span
              style={{ position: 'relative', zIndex: 1, marginLeft: 'auto', textAlign: 'right', flexShrink: 0 }}
            >
              <span className="tabular-nums" style={{ display: 'block', fontSize: 18, fontWeight: 700, color: 'var(--v3-on-dark)', lineHeight: 1 }}>
                {speakingMins}
              </span>
              <span
                style={{ fontFamily: 'var(--v3-mono)', fontSize: 7.5, letterSpacing: '.06em', textTransform: 'uppercase', color: 'var(--v3-on-dark-3)' }}
              >
                min talt
              </span>
            </span>
          ) : null}
        </Link>

      </main>

      {/* ── BottomNav — unchanged existing component (active="home") ─────── */}
      <BottomNav active="home" />
    </div>
  )
}

// ── Private subcomponents (file-local; not exported) ─────────────────────────

// Compact "§ TITLE ──── meta" section header (R1 .led).
function Led({ title, meta }: { title: string; meta?: string }) {
  return (
    <div className="flex items-center" style={{ gap: 7, height: 12, flexShrink: 0 }}>
      <span style={{ color: 'var(--v3-lime)', fontFamily: 'var(--v3-mono)', fontSize: 10, lineHeight: 1 }}>§</span>
      <span
        style={{
          fontFamily: 'var(--v3-mono)',
          fontSize: 9.5,
          letterSpacing: '.1em',
          textTransform: 'uppercase',
          color: 'var(--v3-on-dark-2)',
          whiteSpace: 'nowrap',
        }}
      >
        {title}
      </span>
      <span style={{ flex: 1, height: 1, background: 'var(--v3-line)' }} />
      {meta ? (
        <span
          style={{
            fontFamily: 'var(--v3-mono)',
            fontSize: 9,
            letterSpacing: '.06em',
            textTransform: 'uppercase',
            color: 'var(--v3-on-dark-3)',
            whiteSpace: 'nowrap',
          }}
        >
          {meta}
        </span>
      ) : null}
    </div>
  )
}

// §DAGENS PLAN lane row (R1 .lane). Dot color is keyed off `lane`.
const LANE_DOT: Record<'lead' | 'l2' | 'l3' | 'l4', { background: string; boxShadow: string }> = {
  lead: { background: 'var(--v3-lime)', boxShadow: '0 0 6px var(--v3-lime)' },
  l2:   { background: 'var(--v3-amber)', boxShadow: '0 0 6px var(--v3-amber-glow)' },
  l3:   { background: 'var(--v3-cyan)', boxShadow: '0 0 6px var(--v3-cyan-glow)' },
  l4:   { background: 'var(--v3-coral)', boxShadow: '0 0 6px var(--v3-coral-glow)' },
}

interface PlanLaneProps {
  number: string
  lane: 'lead' | 'l2' | 'l3' | 'l4'
  /** Lead lane: apply the lime-tinted lead surface (honest — only when diagnosed) */
  isLead?: boolean
  title: string
  titleTail: string
  /** "Anbefalt" pill — only on the lead lane when a diagnosis is present */
  rec?: string
  meta: string
}

function PlanLane({ number, lane, isLead = false, title, titleTail, rec, meta }: PlanLaneProps) {
  return (
    <div
      className="flex items-center"
      style={{
        gap: 8,
        height: 29,
        background: isLead ? 'linear-gradient(90deg,rgba(200,255,32,.08),var(--v3-raised) 40%)' : 'var(--v3-raised)',
        border: isLead ? '1px solid rgba(200,255,32,.32)' : '1px solid var(--v3-line)',
        borderRadius: 9,
        padding: '0 9px',
        position: 'relative',
      }}
    >
      <span style={{ fontFamily: 'var(--v3-mono)', fontSize: 10, color: 'var(--v3-on-dark-3)', width: 15, flexShrink: 0 }}>
        {number}
      </span>
      <span
        aria-hidden="true"
        style={{ width: 6, height: 6, borderRadius: '50%', flexShrink: 0, ...LANE_DOT[lane] }}
      />
      <span
        style={{
          fontSize: 11,
          fontWeight: 500,
          color: 'var(--v3-on-dark)',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          minWidth: 0,
          flex: 1,
        }}
      >
        <b style={{ fontWeight: 600 }}>{title}</b>{titleTail}
      </span>
      {rec ? (
        <span
          style={{
            fontFamily: 'var(--v3-mono)',
            fontSize: 7.5,
            letterSpacing: '.06em',
            textTransform: 'uppercase',
            color: 'var(--v3-ink)',
            background: 'var(--v3-lime)',
            padding: '2px 5px',
            borderRadius: 5,
            flexShrink: 0,
            fontWeight: 600,
          }}
        >
          {rec}
        </span>
      ) : null}
      <span
        style={{
          fontFamily: 'var(--v3-mono)',
          fontSize: 8,
          letterSpacing: '.05em',
          color: 'var(--v3-on-dark-3)',
          textTransform: 'uppercase',
          whiteSpace: 'nowrap',
          flexShrink: 0,
        }}
      >
        {meta}
      </span>
    </div>
  )
}

// STATUS strip cell (R1 .cell). `value` is a number or "—"; `unit` shown as a small suffix.
interface StatusCellProps {
  label: string
  value: number | string
  unit?: string
  first?: boolean
}

function StatusCell({ label, value, unit, first = false }: StatusCellProps) {
  return (
    <div
      className="flex flex-col"
      style={{
        flex: 1,
        padding: '6px 8px',
        gap: 2,
        borderLeft: first ? undefined : '1px solid var(--v3-cream-2)',
      }}
    >
      <span
        style={{
          fontFamily: 'var(--v3-mono)',
          fontSize: 7.5,
          letterSpacing: '.08em',
          textTransform: 'uppercase',
          color: 'var(--v3-ink-3)',
        }}
      >
        {label}
      </span>
      <span className="tabular-nums" style={{ fontSize: 16, fontWeight: 700, color: 'var(--v3-ink)', lineHeight: 1 }}>
        {value}
        {unit ? <small style={{ fontSize: 9, fontWeight: 600, color: 'var(--v3-ink-3)' }}> {unit}</small> : null}
      </span>
    </div>
  )
}
