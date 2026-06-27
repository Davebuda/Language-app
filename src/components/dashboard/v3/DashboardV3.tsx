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
 *   I DAG         — cream command card (objective title · diagnosis focus row ·
 *                   dark stats zone with progress ring + 3 stats · lime act)
 *   §VERKTØY      — compact "§" header + 3-col grid of 6 rail GlassTiles
 *   Snakk rail    — system-glass "7th tool" CTA → /conversation (labelled AI)
 *   §DAGENS PLAN  — compact header + single-hue "Instrument" recipe bar (4b)
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

  // BreakerStory — the active sentence-breaker gates the cream card's focus row
  // + "Se hele bildet". (The retired "Fikset" proof lives in /progress now — the
  // cream command card follows the mockup, which leads with the active focus.)
  const breakerVerdict = useMemo<BreakerVerdict | null>(() => {
    if (!fingerprint) return null
    const { active } = deriveBreakerStory(fingerprint, getCumulativeConcepts(levelLabel))
    const top = active[0]
    return top
      ? { label: top.label, thisWeek: top.thisWeek, priorWeek: top.priorWeek, trend: top.trend }
      : null
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

  // Sparkbars + ring for the command card
  const weekBars = wallView?.weekBars ?? []
  const sparkMax = Math.max(1, ...weekBars.map((b) => b.value))
  // Progress ring fill — today's production vs the strongest day this week.
  // Honest: a REAL ratio, never a fabricated daily goal (Rule 8). 264 ≈ 2πr (r=42).
  const ringFill = wallView ? Math.min(1, wallView.heroCount / sparkMax) : 0

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

        {/* ══ I DAG — cream command card (mockup direction) ══════════════════
            Cream shell → objective title → diagnosis focus row → dark stats
            zone (progress ring + 3 REAL stats) → inset lime act. All values
            real; the ring is today-vs-strongest-day, not a fabricated goal. */}
        <div
          style={{
            borderRadius: 16,
            overflow: 'hidden',
            flexShrink: 0,
            background: 'var(--v3-cream)',
            color: 'var(--v3-ink)',
            boxShadow: '0 18px 40px -24px rgba(0,0,0,.9)',
          }}
        >
          <div style={{ padding: '14px 15px' }}>
            {/* Kicker + level chip */}
            <div className="flex items-center justify-between" style={{ gap: 8, marginBottom: 8 }}>
              <span
                style={{
                  fontFamily: 'var(--v3-mono)',
                  fontSize: 9,
                  letterSpacing: '.13em',
                  textTransform: 'uppercase',
                  color: 'var(--v3-ink-3)',
                  fontWeight: 500,
                }}
              >
                {wallView?.objectiveKicker ?? 'Dagens mål'}
              </span>
              <span
                style={{
                  fontFamily: 'var(--v3-mono)',
                  fontSize: 9,
                  fontWeight: 600,
                  color: 'var(--v3-ink)',
                  border: '1px solid var(--v3-cream-2)',
                  background: '#fff',
                  padding: '2px 8px',
                  borderRadius: 999,
                  flexShrink: 0,
                }}
              >
                {levelDisplay}
              </span>
            </div>

            {/* Objective title */}
            <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--v3-ink)', letterSpacing: '-.025em', lineHeight: 1.05 }}>
              {wallView?.objectiveTitle ?? 'Bygg setninger'}
            </div>

            {/* Focus row — diagnosis focus chip + confidence + see-all (gated on real diagnosis) */}
            {diagnosisHighlight || breakerVerdict ? (
              <div className="flex items-center" style={{ gap: 10, marginTop: 9, flexWrap: 'wrap' }}>
                {remediationFocusLabel ? (
                  <span
                    className="inline-flex items-center"
                    style={{
                      fontFamily: 'var(--v3-mono)',
                      fontSize: 9,
                      fontWeight: 600,
                      letterSpacing: '.06em',
                      textTransform: 'uppercase',
                      color: '#2c3a06',
                      background: 'var(--v3-lime)',
                      padding: '3px 9px',
                      borderRadius: 6,
                    }}
                  >
                    Fokus · {remediationFocusLabel}
                  </span>
                ) : null}
                {diagnosisHighlight ? (
                  <span
                    className="inline-flex items-center"
                    style={{
                      gap: 5,
                      fontFamily: 'var(--v3-mono)',
                      fontSize: 9,
                      fontWeight: 500,
                      letterSpacing: '.04em',
                      textTransform: 'uppercase',
                      color: diagnosisHighlight.confidenceTier === 'strong' ? '#0E8C73' : '#9a6a12',
                    }}
                  >
                    <span
                      aria-hidden="true"
                      style={{
                        width: 5,
                        height: 5,
                        borderRadius: '50%',
                        background: diagnosisHighlight.confidenceTier === 'strong' ? 'var(--v3-teal)' : 'var(--v3-amber)',
                      }}
                    />
                    {diagnosisHighlight.confidenceTier === 'strong' ? 'Sikker diagnose' : 'Tidlig signal'}
                  </span>
                ) : null}
                <Link
                  href="/progress"
                  className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--v3-cyan)]"
                  style={{ fontSize: 9.5, fontWeight: 600, color: '#0E8FA3', whiteSpace: 'nowrap', textDecoration: 'none', marginLeft: 'auto' }}
                >
                  Se hele bildet ›
                </Link>
              </div>
            ) : null}

            {/* Dark stats zone — progress ring + 3 real stats */}
            <div
              style={{
                background: 'linear-gradient(180deg,#171d1f,#0f1416)',
                border: '1px solid rgba(255,255,255,.09)',
                borderRadius: 12,
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,.06)',
                marginTop: 13,
                padding: 13,
              }}
            >
              <div className="flex items-center" style={{ gap: 14 }}>
                {/* Ring — today's production vs strongest day this week */}
                <div style={{ position: 'relative', flexShrink: 0, width: 62, height: 62 }}>
                  <svg width="62" height="62" viewBox="0 0 100 100" aria-hidden="true">
                    <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(255,255,255,.1)" strokeWidth="9" />
                    <circle
                      cx="50"
                      cy="50"
                      r="42"
                      fill="none"
                      stroke="url(#v3ring)"
                      strokeWidth="9"
                      strokeLinecap="round"
                      strokeDasharray={`${(ringFill * 264).toFixed(1)} 264`}
                      transform="rotate(-90 50 50)"
                      style={{ filter: 'drop-shadow(0 0 5px rgba(0,194,224,.6))', transition: 'stroke-dasharray .6s ease' }}
                    />
                    <defs>
                      <linearGradient id="v3ring" x1="0" y1="0" x2="1" y2="1">
                        <stop offset="0" stopColor="#00C2E0" />
                        <stop offset="1" stopColor="#C8FF20" />
                      </linearGradient>
                    </defs>
                  </svg>
                  <div className="flex flex-col items-center justify-center" style={{ position: 'absolute', inset: 0 }}>
                    <b className="tabular-nums" style={{ fontFamily: 'var(--v3-mono)', fontSize: 19, fontWeight: 600, color: '#fff', lineHeight: 1 }}>
                      {wallView?.heroCount ?? '—'}
                    </b>
                    <small style={{ fontFamily: 'var(--v3-mono)', fontSize: 7, color: 'var(--v3-on-dark-3)', marginTop: 2 }}>i dag</small>
                  </div>
                </div>
                <div style={{ fontSize: 12, color: 'var(--v3-on-dark-2)', lineHeight: 1.35 }}>
                  <b style={{ color: '#fff', fontWeight: 700 }}>
                    {wallView ? `${wallView.heroCount} ${wallView.heroUnit}` : 'Ingen data ennå'}
                  </b>
                  {wallView && sparkMax > wallView.heroCount ? ` · sterkeste dag ${sparkMax}` : ''}
                </div>
              </div>

              {/* 3 real stats */}
              <div className="flex" style={{ marginTop: 12, paddingTop: 11, borderTop: '1px solid rgba(255,255,255,.08)' }}>
                <StatCell label="Rekke dgr" value={streak > 0 ? streak : '—'} />
                <span aria-hidden="true" style={{ width: 1, alignSelf: 'stretch', background: 'rgba(255,255,255,.1)', margin: '2px 0' }} />
                <StatCell label="Min talt" value={speakingMins > 0 ? speakingMins : '—'} />
                <span aria-hidden="true" style={{ width: 1, alignSelf: 'stretch', background: 'rgba(255,255,255,.1)', margin: '2px 0' }} />
                <StatCell label="Treff" value={accuracyDisplay} accent />
              </div>
            </div>
          </div>

          {/* Act half — the ONE prescribed action (inset lime pill) */}
          <Link
            href="/session"
            aria-label={`Start dagens økt${sessionMeta ? ` — ${sessionMeta}` : ''}`}
            className="flex items-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--v3-ink)]"
            style={{
              gap: 10,
              margin: '0 13px 14px',
              borderRadius: 12,
              background: 'var(--v3-lime)',
              padding: '12px 13px',
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

        {/* ══ Snakk med Kari — system-glass rail (V1) → /conversation ══════════
            Sits directly under the §Verktøy grid as a wide "7th tool": the same
            dark-glass + cyan tint + glow + hairline recipe as the tiles, so it
            belongs. Labelled AI (Kari is an AI). Animated equalizer honours
            prefers-reduced-motion (globals.css). */}
        <Link
          href="/conversation"
          aria-label="Snakk med Kari — øv norsk i en samtale med en AI"
          className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--v3-cyan)]"
          style={{
            position: 'relative',
            overflow: 'hidden',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            height: 60,
            padding: '0 13px',
            flexShrink: 0,
            borderRadius: 13,
            background: 'linear-gradient(180deg,#14191b 0%,#12171a 46%,#0d434d 100%)',
            border: '1px solid rgba(255,255,255,.13)',
            boxShadow: '0 10px 22px -16px rgba(0,0,0,.7)',
            textDecoration: 'none',
          }}
        >
          {/* Cyan bloom — left light source */}
          <span
            aria-hidden="true"
            style={{
              position: 'absolute',
              inset: 0,
              pointerEvents: 'none',
              background: 'radial-gradient(120px 90px at 14% 50%,var(--v3-cyan-glow),transparent 70%)',
            }}
          />
          {/* Top hairline */}
          <span
            aria-hidden="true"
            style={{
              position: 'absolute',
              top: 0,
              left: 12,
              right: 12,
              height: 1,
              pointerEvents: 'none',
              background: 'linear-gradient(90deg,transparent,var(--v3-cyan),transparent)',
              opacity: 0.55,
            }}
          />
          {/* Lit mic — the light source */}
          <span
            aria-hidden="true"
            className="flex items-center justify-center"
            style={{ position: 'relative', zIndex: 1, width: 30, height: 30, flexShrink: 0 }}
          >
            <Mic
              size={26}
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
                  fontSize: 7,
                  letterSpacing: '.1em',
                  color: '#001316',
                  background: 'var(--v3-cyan)',
                  padding: '1px 6px',
                  borderRadius: 4,
                  fontWeight: 600,
                }}
              >
                AI
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
          {/* Right group — animated equalizer + honest speaking-minutes gate */}
          <span className="flex items-center" style={{ position: 'relative', zIndex: 1, marginLeft: 'auto', gap: 9, flexShrink: 0 }}>
            <span aria-hidden="true" className="flex items-center" style={{ gap: 2.5, height: 18 }}>
              {[0, 0.18, 0.36, 0.1].map((delay, i) => (
                <span
                  key={i}
                  className="v3-kari-eq"
                  style={{
                    width: 2.5,
                    height: 16,
                    borderRadius: 2,
                    background: 'var(--v3-cyan)',
                    transformOrigin: 'center',
                    transform: 'scaleY(.35)',
                    animation: `v3kariEq 1.2s ease-in-out ${delay}s infinite`,
                  }}
                />
              ))}
            </span>
            {speakingMins > 0 ? (
              <span style={{ fontFamily: 'var(--v3-mono)', fontSize: 9, fontWeight: 500, color: 'var(--v3-on-dark-3)', whiteSpace: 'nowrap' }}>
                {speakingMins} min
              </span>
            ) : null}
          </span>
        </Link>

        {/* ══ §DAGENS PLAN — single-hue "Instrument" recipe bar (4b) ════════════
            One proportional bar: bright lime lead chip (the diagnosed moat lane)
            fading to lime-tinted dark glass. Segment width = real lane count, so
            it doubles as the distribution. The GRUNNÅRSAK cause marker rides the
            lead chip and the diagnosis focus stays in the recipe line — the moat
            signal survives the compaction; secondary per-lane scheduling tags
            (SRS/level/daily) are dropped from this dense bar by design. */}
        <div style={{ flexShrink: 0 }}>
          <Led title="Dagens plan" meta={plan ? `${sessionItems.length} oppg` : undefined} />
          {plan ? (
            <div
              className="flex"
              style={{ gap: 2, borderRadius: 11, overflow: 'hidden', marginTop: 5 }}
              role="list"
              aria-label="Dagens øktfordeling"
            >
              {[
                { key: 'rem', label: 'Remediering', count: remCount, step: 0, cause: Boolean(diagnosisHighlight) },
                { key: 'rev', label: 'Repetisjon', count: revCount, step: 1, cause: false },
                { key: 'new', label: 'Nytt', count: newCount, step: 2, cause: false },
                { key: 'int', label: 'Fletting', count: intCount, step: 3, cause: false },
              ]
                .filter((lane) => lane.count > 0)
                .map((lane) => {
                  const tone = RECIPE_STEPS[lane.step]
                  return (
                    <div
                      key={lane.key}
                      role="listitem"
                      aria-label={`${lane.label}: ${lane.count} oppgaver`}
                      className="flex flex-col justify-between"
                      style={{
                        flex: `${lane.count} 1 0`,
                        minWidth: 0,
                        minHeight: 60,
                        padding: '9px 8px',
                        background: tone.bg,
                        overflow: 'hidden',
                      }}
                    >
                      <div style={{ minWidth: 0 }}>
                        <div
                          style={{
                            fontFamily: 'var(--v3-mono)',
                            fontSize: 8,
                            fontWeight: 700,
                            letterSpacing: '.03em',
                            textTransform: 'uppercase',
                            lineHeight: 1.1,
                            color: tone.label,
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                        >
                          {lane.label}
                        </div>
                        {lane.cause ? (
                          <div
                            style={{
                              fontFamily: 'var(--v3-mono)',
                              fontSize: 7,
                              fontWeight: 600,
                              letterSpacing: '.04em',
                              textTransform: 'uppercase',
                              marginTop: 2,
                              color: tone.meta,
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                            }}
                          >
                            Grunnårsak
                          </div>
                        ) : null}
                      </div>
                      <div style={{ fontFamily: 'var(--v3-mono)', fontSize: 17, fontWeight: 600, lineHeight: 1, color: tone.count }}>
                        {lane.count}
                      </div>
                    </div>
                  )
                })}
            </div>
          ) : (
            <div
              style={{ height: 60, marginTop: 5, borderRadius: 11, background: 'var(--v3-raised)', border: '1px solid var(--v3-line)' }}
              aria-hidden="true"
            />
          )}
          <div style={{ fontFamily: 'var(--v3-mono)', fontSize: 8, color: 'var(--v3-on-dark-3)', marginTop: 8, letterSpacing: '.04em' }}>
            Resept{' '}
            <b style={{ color: 'var(--v3-on-dark-2)', fontWeight: 600 }}>
              {remPct} / {revPct} / {newPct} / {intPct}
            </b>
            {remediationFocusLabel ? ` · leder med ${remediationFocusLabel}` : ''}
          </div>
        </div>

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
// §DAGENS PLAN — single-hue "Instrument" recipe-bar steps (direction 4b):
// a bright lime lead chip (the diagnosed moat lane) fading to lime-tinted dark
// glass across the rest, so the section keeps colour but stops competing with
// the full-saturation original. Index = lane role (0 rem · 1 rev · 2 new · 3 int)
// so the colour stays role-stable even when an empty lane is dropped. Mixed
// values are pre-computed (lime over #12171a) — no runtime color-mix dependency.
const RECIPE_STEPS = [
  { bg: 'var(--v3-lime)', label: '#3c4a08', count: 'var(--v3-ink)', meta: '#55670f' },
  { bg: '#41531c', label: '#C7E095', count: '#E6F5C0', meta: '#A0B975' },
  { bg: '#2f3c1b', label: '#B0CB80', count: '#D4EAA1', meta: '#8BA367' },
  { bg: '#222c1b', label: '#95AE6A', count: '#B9D088', meta: '#778A50' },
] as const

// Command-card dark-zone stat cell. `value` is a number or "—"; `accent` tints
// the value cyan (used for Treff). Sits on the dark stats zone, not the cream.
interface StatCellProps {
  label: string
  value: number | string
  accent?: boolean
}

function StatCell({ label, value, accent = false }: StatCellProps) {
  return (
    <div style={{ flex: 1, textAlign: 'center' }}>
      <div
        className="tabular-nums"
        style={{ fontFamily: 'var(--v3-mono)', fontSize: 15, fontWeight: 600, color: accent ? 'var(--v3-cyan)' : '#fff', lineHeight: 1 }}
      >
        {value}
      </div>
      <div
        style={{
          fontFamily: 'var(--v3-mono)',
          fontSize: 7.5,
          color: 'var(--v3-on-dark-3)',
          textTransform: 'uppercase',
          letterSpacing: '.05em',
          marginTop: 3,
        }}
      >
        {label}
      </div>
    </div>
  )
}
