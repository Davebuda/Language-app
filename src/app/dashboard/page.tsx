'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Bell, Menu, Play, Waves } from 'lucide-react'
import { motion } from 'framer-motion'
import { useFingerprint } from '@/hooks/useFingerprint'
import { useFingerprintStore } from '@/stores/fingerprint-store'
import { useAuth } from '@/hooks/useAuth'
import { generateSession } from '@/engine/scheduler'
import type { SchedulerOutput } from '@/engine/scheduler'
import { BottomNav } from '@/components/layout/BottomNav'
import { GuestBanner } from '@/components/layout/GuestBanner'
import { getStreak } from '@/lib/streak'
import { MOCK_SENTENCE_IDS } from '@/lib/mock-sentences'
import { getConceptColor } from '@/lib/concept-colors'
import type { ConceptGraph } from '@/types/concepts'
import conceptGraphJson from '@content/concepts/a1-graph.json'

const conceptGraph = conceptGraphJson as ConceptGraph

const SECONDARY_MODES = [
  { id: 'conversation', href: '/conversation', label: 'Speak', emoji: '💬' },
  { id: 'reading', href: '/reading', label: 'Read', emoji: '📖' },
  { id: 'journal', href: '/journal', label: 'Write', emoji: '✍️' },
] as const

function todayFormatted(): string {
  return new Date().toLocaleDateString('nb-NO', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })
}

export default function DashboardPage() {
  useFingerprint()
  const router = useRouter()
  const { fingerprint, status } = useFingerprintStore()
  const { user } = useAuth()
  const [plan, setPlan] = useState<SchedulerOutput | null>(null)
  const [showLevelUp, setShowLevelUp] = useState(false)
  const streak = getStreak()

  // Show level-up celebration when A1→A2 transition is detected
  useEffect(() => {
    try {
      if (localStorage.getItem('norskcoach_levelup_pending') === '1') {
        localStorage.removeItem('norskcoach_levelup_pending')
        setShowLevelUp(true)
        setTimeout(() => setShowLevelUp(false), 4000)
      }
    } catch { /* ignore */ }
  }, [fingerprint?.currentLevel])

  const displayName =
    user?.user_metadata?.full_name ?? user?.email?.split('@')[0] ?? 'Gjest'

  useEffect(() => {
    if (!localStorage.getItem('norskcoach_onboarded')) {
      localStorage.setItem('norskcoach_onboarded', 'true')
    }
  }, [])

  useEffect(() => {
    if (status === 'loading' || !fingerprint) return
    const output = generateSession({
      fingerprint,
      graph: conceptGraph,
      availableSentenceIds: MOCK_SENTENCE_IDS,
    })
    setPlan(output)
  }, [fingerprint, status])

  const primaryConcept = conceptGraph.concepts.find(
    (concept) => concept.id === (plan?.primaryFocus ?? 'noun-gender'),
  )
  const sessionTitle = primaryConcept?.label ?? 'Norwegian Foundations'
  const estimatedMin = plan
    ? Math.max(1, Math.ceil((plan.session.items.length * 45) / 60))
    : 18
  const remediation =
    plan?.session.items.filter((item) => item.purpose === 'remediation').length ?? 0
  const review =
    plan?.session.items.filter((item) => item.purpose === 'review').length ?? 0
  const newMaterial =
    plan?.session.items.filter((item) => item.purpose === 'new-material').length ?? 0

  const masteryTiles = useMemo(
    () =>
      conceptGraph.concepts.slice(0, 16).map((concept, index) => {
        const mastery = fingerprint?.conceptMastery[concept.id]
        const score = mastery ? Math.round(mastery.decayedScore) : 0
        const prereqsMet = concept.prerequisites.every((prerequisite) =>
          !!fingerprint?.conceptMastery[prerequisite],
        )
        const locked = !mastery && concept.prerequisites.length > 0 && !prereqsMet

        return {
          id: concept.id,
          label: concept.label,
          index: index + 1,
          score,
          locked,
          color: getConceptColor(concept.id, index),
        }
      }),
    [fingerprint],
  )

  return (
    <div className="flex min-h-dvh flex-col bg-transparent">
      <main className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-4 px-5 pb-6 pt-5">
        <div className="flex items-start justify-between gap-4">
          <button
            type="button"
            className="flex h-10 w-10 items-center justify-center rounded-[0.9rem] border border-nc-border bg-white text-nc-text"
            aria-label="Menu"
          >
            <Menu size={18} />
          </button>

          <div className="flex-1">
            <div className="text-[11px] font-medium tracking-[0.08em] text-nc-text-dim">
              {todayFormatted()}
            </div>
            <h1 className="mt-1 text-[2rem] font-display font-semibold text-nc-text">
              God kveld, {displayName}! 👋
            </h1>
            <p className="mt-1 text-sm text-nc-text-muted">Klar for å lære i dag?</p>
          </div>

          <button
            type="button"
            className="flex h-10 w-10 items-center justify-center rounded-[0.9rem] border border-nc-border bg-white text-nc-text"
            aria-label="Notifications"
          >
            <Bell size={17} />
          </button>
        </div>

        {!user ? <GuestBanner /> : null}

        {/* Level-up celebration */}
        {showLevelUp && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="rounded-[18px] p-4 text-center"
            style={{ background: '#181526', boxShadow: '0 8px 32px rgba(24,21,38,0.22)' }}
          >
            <div className="text-2xl mb-1">🎉</div>
            <div className="text-[17px] font-extrabold" style={{ color: '#C8FF00' }}>Nivå opp! Du er nå A2</div>
            <div className="text-[12px] mt-1" style={{ color: 'rgba(255,255,255,0.55)' }}>
              Du har mestret alle A1-konsepter. Neste nivå er låst opp.
            </div>
          </motion.div>
        )}

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="nc-panel-dark p-5"
        >
          <div className="relative z-[1] grid gap-4 md:grid-cols-[1fr_132px] md:items-end">
            <div>
              <div className="nc-label-light">{"Today's session"}</div>
              <div className="mt-2 text-[1.75rem] font-display font-semibold text-white">
                {sessionTitle}
              </div>
              <p className="mt-2 text-sm text-white/55">Estimated time: {estimatedMin} min</p>
              <button
                onClick={() => router.push('/session')}
                className="nc-button-primary mt-5 inline-flex items-center gap-2 px-4 py-3 text-sm font-medium"
              >
                <Play size={15} />
                Start session
              </button>
            </div>

            <div className="relative hidden h-28 overflow-hidden rounded-[1rem] border border-white/8 bg-white/5 md:block">
              <div className="absolute inset-0 opacity-60">
                <div className="nc-pattern-orbits absolute inset-0" />
              </div>
              <div className="absolute inset-x-[-20%] bottom-[-8%] h-[55%] bg-[radial-gradient(circle_at_50%_50%,rgba(185,176,255,0.45),transparent_55%)]" />
            </div>
          </div>

          <div className="relative z-[1] mt-5 flex flex-wrap gap-2">
            {remediation > 0 ? (
              <span className="rounded-[0.7rem] border border-[#ffbba3]/20 bg-[#ffbba3]/10 px-3 py-1.5 text-[11px] font-medium text-[#ffcab9]">
                {remediation} repairs
              </span>
            ) : null}
            {review > 0 ? (
              <span className="rounded-[0.7rem] border border-white/10 bg-white/8 px-3 py-1.5 text-[11px] font-medium text-white/60">
                {review} review
              </span>
            ) : null}
            {newMaterial > 0 ? (
              <span className="rounded-[0.7rem] border border-white/10 bg-white/8 px-3 py-1.5 text-[11px] font-medium text-white/60">
                {newMaterial} new
              </span>
            ) : null}
          </div>
        </motion.div>

        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'day streak', value: String(streak), accent: 'text-[#ff9a78]', icon: '🔥' },
            {
              label: 'accuracy',
              value: `${Math.round(masteryTiles.reduce((sum, tile) => sum + tile.score, 0) / Math.max(masteryTiles.length, 1))}%`,
              accent: 'text-nc-violet',
              icon: '↗',
            },
            {
              label: 'concepts',
              value: String(
                Object.values(fingerprint?.conceptMastery ?? {}).filter(
                  (entry) => entry.attemptCount > 0,
                ).length,
              ),
              accent: 'text-[#9cc36b]',
              icon: '◌',
            },
          ].map((stat) => (
            <div key={stat.label} className="nc-panel px-3 py-3">
              <div className="flex items-center gap-2">
                <span className={`text-sm ${stat.accent}`}>{stat.icon}</span>
                <span className={`text-[1.6rem] font-display font-semibold ${stat.accent}`}>
                  {stat.value}
                </span>
              </div>
              <div className="mt-1 text-[10px] font-medium text-nc-text-dim">
                {stat.label}
              </div>
            </div>
          ))}
        </div>

        <div className="nc-panel p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="nc-label">Concept mastery</div>
              <div className="mt-1 text-sm text-nc-text-muted">
                AI - {masteryTiles.length} concepts
              </div>
            </div>
            <Link href="/progress" className="text-[12px] font-medium text-nc-text-dim">
              View all
            </Link>
          </div>

          <div className="mt-4 grid grid-cols-4 gap-2">
            {masteryTiles.map((tile) => (
              <div
                key={tile.id}
                className="rounded-[0.8rem] border px-2.5 py-2"
                style={{
                  borderColor: tile.locked ? 'rgba(23,23,29,0.07)' : `${tile.color}33`,
                  backgroundColor: tile.locked ? 'rgba(23,23,29,0.02)' : `${tile.color}20`,
                }}
              >
                <div className="text-[12px] font-medium text-nc-text">{tile.index}</div>
                <div className="mt-1 text-[10px] leading-4 text-nc-text-dim">
                  {tile.locked ? 'Locked' : `${tile.score}%`}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="nc-panel-dark p-4">
          <div className="relative z-[1] flex items-center justify-between gap-3">
            <div>
              <div className="text-sm font-medium text-white">Quick practice</div>
              <div className="mt-1 text-[13px] text-white/52">Listen and repeat common phrases</div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-white/45">5 min boost</span>
              <button
                type="button"
                className="flex h-9 w-9 items-center justify-center rounded-[0.85rem] border border-white/10 bg-white/8 text-white"
              >
                <Play size={14} />
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          {SECONDARY_MODES.map((mode) => (
            <Link
              key={mode.id}
              href={mode.href}
              className="nc-panel flex flex-col gap-2 px-3 py-3"
            >
              <span className="text-lg">{mode.emoji}</span>
              <span className="text-[13px] font-medium text-nc-text">{mode.label}</span>
            </Link>
          ))}
        </div>

        <div className="rounded-[1rem] border border-[rgba(214,255,90,0.35)] bg-[linear-gradient(135deg,rgba(214,255,90,0.50)_0%,rgba(251,247,241,0.92)_72%)] px-4 py-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-[13px] font-medium text-nc-text">Keep going!</div>
              <p className="mt-1 text-sm text-nc-text-muted">
                Your next session is ready.
              </p>
            </div>
            <Waves size={24} className="text-[rgba(23,23,29,0.32)]" />
          </div>
          <button
            onClick={() => router.push('/session')}
            className="nc-button-lime mt-4 px-4 py-3 text-sm font-medium"
          >
            Continue learning
          </button>
        </div>
      </main>

      <BottomNav active="home" />
    </div>
  )
}
