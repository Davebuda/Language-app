'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { useFingerprint } from '@/hooks/useFingerprint'
import { useFingerprintStore } from '@/stores/fingerprint-store'
import { useAuth } from '@/hooks/useAuth'
import { generateSession } from '@/engine/scheduler'
import type { SchedulerOutput } from '@/engine/scheduler'
import { BottomNav } from '@/components/layout/BottomNav'
import { GuestBanner } from '@/components/layout/GuestBanner'
import { ConceptProgressRow } from '@/components/progress/ConceptProgressRow'
import { getStreak } from '@/lib/streak'
import { MOCK_SENTENCE_IDS } from '@/lib/mock-sentences'
import { getConceptColor } from '@/lib/concept-colors'
import type { ConceptGraph } from '@/types/concepts'
import conceptGraphJson from '@content/concepts/a1-graph.json'

const LEARNING_MODES = [
  {
    id: 'conversation',
    href: '/conversation',
    label: 'Samtale',
    desc: 'AI-tutor, norsk',
    emoji: '💬',
    bg: 'rgba(167,139,250,0.07)',
    border: 'rgba(167,139,250,0.18)',
    iconBg: 'rgba(167,139,250,0.14)',
    labelColor: '#A78BFA',
  },
  {
    id: 'reading',
    href: '/reading',
    label: 'Les',
    desc: '4 tekster klare',
    emoji: '📖',
    bg: 'rgba(168,213,186,0.07)',
    border: 'rgba(168,213,186,0.18)',
    iconBg: 'rgba(168,213,186,0.14)',
    labelColor: '#4A9E72',
  },
  {
    id: 'journal',
    href: '/journal',
    label: 'Skriv',
    desc: 'Journal + AI-analyse',
    emoji: '✍️',
    bg: 'rgba(200,255,0,0.07)',
    border: 'rgba(200,255,0,0.20)',
    iconBg: 'rgba(200,255,0,0.14)',
    labelColor: '#111118',
  },
  {
    id: 'shadow',
    href: '/shadow',
    label: 'Uttale',
    desc: 'Snart tilgjengelig',
    emoji: '🎙️',
    bg: 'rgba(17,17,24,0.03)',
    border: 'rgba(17,17,24,0.07)',
    iconBg: 'rgba(17,17,24,0.06)',
    labelColor: 'rgba(17,17,24,0.30)',
  },
] as const

const conceptGraph = conceptGraphJson as ConceptGraph

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
  const streak = getStreak()

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

  const topConcepts = conceptGraph.concepts
    .slice(0, 8)
    .map((c, i) => {
      const mastery = fingerprint?.conceptMastery[c.id]
      return {
        id: c.id,
        label: c.label,
        score: mastery ? Math.round(mastery.decayedScore) : 0,
        color: getConceptColor(c.id, i),
        locked:
          !mastery &&
          c.prerequisites.length > 0 &&
          !c.prerequisites.every((p) => !!fingerprint?.conceptMastery[p]),
      }
    })
    .slice(0, 5)

  const remediation =
    plan?.session.items.filter((i) => i.purpose === 'remediation').length ?? 0
  const review =
    plan?.session.items.filter((i) => i.purpose === 'review').length ?? 0
  const newMaterial =
    plan?.session.items.filter((i) => i.purpose === 'new-material').length ?? 0
  const estimatedMin = plan
    ? Math.max(1, Math.ceil((plan.session.items.length * 45) / 60))
    : 12

  const primaryConceptId = plan?.primaryFocus ?? 'noun-gender'
  const primaryConcept = conceptGraph.concepts.find(
    (c) => c.id === primaryConceptId,
  )
  const sessionTitle = primaryConcept?.label ?? 'Grunnleggende norsk'

  return (
    <div className="flex min-h-dvh flex-col bg-nc-bg">
      <main className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-4 px-5 pb-4 pt-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[11px] font-semibold capitalize uppercase tracking-[0.10em] text-nc-text-dim">
              {todayFormatted()}
            </div>
            <h1 className="text-[24px] font-extrabold text-nc-text">
              Hei, {displayName}! 👋
            </h1>
          </div>
          <Link href="/profile" aria-label="Profil">
            <div
              className="flex h-10 w-10 items-center justify-center rounded-full bg-nc-dark text-sm font-bold text-nc-green"
              style={{ boxShadow: '0 4px 14px rgba(17,17,24,0.20)' }}
            >
              {displayName.slice(0, 1).toUpperCase()}
            </div>
          </Link>
        </div>

        {/* Guest banner */}
        <GuestBanner />

        {/* Today's session card — dark hero card */}
        {!plan ? (
          <div className="h-24 animate-pulse rounded-[20px] bg-nc-card border border-nc-border" />
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="rounded-[20px] bg-nc-dark p-5 relative overflow-hidden"
          >
            <div className="mb-1 text-[10px] uppercase tracking-[0.12em] font-bold"
              style={{ color: 'rgba(200,255,0,0.55)' }}>
              I dag · ~{estimatedMin} min
            </div>
            <div className="mb-3 text-[18px] font-extrabold text-white">
              {sessionTitle}
            </div>
            <div className="flex flex-wrap gap-2">
              {remediation > 0 && (
                <span
                  className="rounded-full px-3 py-1.5 text-[10px] font-bold border"
                  style={{
                    background: 'rgba(244,132,95,0.20)',
                    borderColor: 'rgba(244,132,95,0.40)',
                    color: '#F4845F',
                  }}
                >
                  {remediation} reparasjoner
                </span>
              )}
              {review > 0 && (
                <span
                  className="rounded-full px-3 py-1.5 text-[10px] font-bold border"
                  style={{
                    background: 'rgba(255,255,255,0.08)',
                    borderColor: 'rgba(255,255,255,0.14)',
                    color: 'rgba(255,255,255,0.50)',
                  }}
                >
                  {review} repetisjon
                </span>
              )}
              {newMaterial > 0 && (
                <span
                  className="rounded-full px-3 py-1.5 text-[10px] font-bold border"
                  style={{
                    background: 'rgba(255,255,255,0.08)',
                    borderColor: 'rgba(255,255,255,0.14)',
                    color: 'rgba(255,255,255,0.50)',
                  }}
                >
                  {newMaterial} nytt
                </span>
              )}
            </div>
          </motion.div>
        )}

        {/* Coach insight — white card with lime left border */}
        {plan?.diagnosisResults && plan.diagnosisResults.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
            className="rounded-[16px] bg-nc-card border border-nc-border p-4"
            style={{
              borderLeft: '3px solid rgba(200,255,0,0.50)',
              boxShadow: '0 2px 12px rgba(17,17,24,0.06)',
            }}
          >
            <div className="mb-1 text-[9px] font-bold uppercase tracking-[0.12em] text-nc-text-dim">
              🎯 Trener-innsikt
            </div>
            <p className="text-[13px] leading-relaxed text-nc-text-muted">
              {plan.diagnosisResults[0].reasoning}
            </p>
            <div className="mt-2 flex items-center gap-1.5">
              <div
                className="h-1 flex-1 overflow-hidden rounded-full"
                style={{ background: 'rgba(17,17,24,0.08)' }}
              >
                <div
                  className="h-full rounded-full bg-nc-green"
                  style={{
                    width: `${Math.round(plan.diagnosisResults[0].confidence * 100)}%`,
                    opacity: 0.7,
                  }}
                />
              </div>
              <span className="text-[10px] font-semibold text-nc-text-dim">
                {Math.round(plan.diagnosisResults[0].confidence * 100)}% sikker
              </span>
            </div>
          </motion.div>
        )}

        {/* Concept progress */}
        <div>
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wide text-nc-text-dim">
              Konseptfremgang
            </span>
            <Link href="/progress" className="text-[11px] font-semibold text-nc-coral">
              Se alle →
            </Link>
          </div>
          <div className="flex flex-col gap-2">
            {topConcepts.map((c) => (
              <ConceptProgressRow
                key={c.id}
                color={c.color}
                name={c.label}
                score={c.score}
                locked={c.locked}
                prereqLabel={c.locked ? 'Låst' : undefined}
              />
            ))}
          </div>
        </div>

        {/* Learning modes grid */}
        <div>
          <div className="mb-2 text-[11px] font-bold uppercase tracking-wide text-nc-text-dim">
            Læringsverktøy
          </div>
          <div className="grid grid-cols-2 gap-2">
            {LEARNING_MODES.map(({ id, href, label, desc, emoji, bg, border, iconBg, labelColor }, i) => (
              <motion.div
                key={id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 * i }}
              >
                <Link
                  href={href}
                  aria-label={label}
                  className="flex flex-col gap-3 rounded-[18px] p-4 transition-transform active:scale-[0.97]"
                  style={{
                    background: bg,
                    border: `1px solid ${border}`,
                    boxShadow: '0 2px 10px rgba(17,17,24,0.05)',
                  }}
                >
                  <div
                    className="flex h-9 w-9 items-center justify-center rounded-[11px] text-lg"
                    style={{ background: iconBg }}
                  >
                    {emoji}
                  </div>
                  <div>
                    <div className="text-[14px] font-extrabold" style={{ color: labelColor }}>
                      {label}
                    </div>
                    <div className="mt-0.5 text-[11px] text-nc-text-dim">{desc}</div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Streak */}
        <div
          className="flex items-center gap-3 rounded-[16px] bg-nc-card border border-nc-border px-4 py-3"
          style={{ boxShadow: '0 2px 12px rgba(17,17,24,0.05)' }}
        >
          <span className="text-xl">🔥</span>
          <span className="text-[26px] font-black text-nc-coral tracking-tight">{streak}</span>
          <span className="text-[12px] text-nc-text-muted">dagers streak</span>
        </div>

        {/* CTA */}
        <button
          onClick={() => router.push('/session')}
          aria-label="Start dagens økt"
          className="w-full rounded-full py-4 text-sm font-extrabold transition-transform active:scale-[0.98]"
          style={{
            background: '#111118',
            color: '#C8FF00',
            boxShadow: '0 6px 24px rgba(17,17,24,0.18)',
          }}
        >
          Start dagens økt →
        </button>
      </main>

      <BottomNav active="home" />
    </div>
  )
}
