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

  const displayName = user?.user_metadata?.full_name
    ?? user?.email?.split('@')[0]
    ?? 'Gjest'

  useEffect(() => {
    if (typeof window !== 'undefined' && !localStorage.getItem('norskcoach_onboarded')) {
      router.replace('/onboarding')
    }
  }, [router])

  useEffect(() => {
    if (status === 'loading' || !fingerprint) return
    const output = generateSession({
      fingerprint,
      graph: conceptGraph,
      availableSentenceIds: MOCK_SENTENCE_IDS,
    })
    setPlan(output)
  }, [fingerprint, status])

  const topConcepts = conceptGraph.concepts.slice(0, 8).map((c, i) => {
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
  }).slice(0, 5)

  const remediation = plan?.session.items.filter((i) => i.purpose === 'remediation').length ?? 0
  const review = plan?.session.items.filter((i) => i.purpose === 'review').length ?? 0
  const newMaterial = plan?.session.items.filter((i) => i.purpose === 'new-material').length ?? 0
  const estimatedMin = plan
    ? Math.max(1, Math.ceil((plan.session.items.length * 45) / 60))
    : 12

  const primaryConceptId = plan?.primaryFocus ?? 'noun-gender'
  const primaryConcept = conceptGraph.concepts.find((c) => c.id === primaryConceptId)
  const sessionTitle = primaryConcept?.label ?? 'Grunnleggende norsk'

  return (
    <div className="flex min-h-dvh flex-col bg-nc-bg">
      <main className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-4 px-5 pb-4 pt-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[11px] font-medium capitalize text-white/30">{todayFormatted()}</div>
            <h1 className="text-[20px] font-extrabold text-white">Hei, {displayName}! 👋</h1>
          </div>
          <Link href="/profile">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-nc-green text-sm font-bold text-[#0d0d14]">
              {displayName.slice(0, 1).toUpperCase()}
            </div>
          </Link>
        </div>

        {/* Guest banner */}
        <GuestBanner />

        {/* Today's session card */}
        {!plan ? (
          <div className="h-24 animate-pulse rounded-2xl bg-nc-card border border-nc-border" />
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="rounded-2xl bg-nc-card border border-nc-border p-4"
          >
            <div className="mb-1 text-[10px] uppercase tracking-widest text-white/30">
              I dag · ~{estimatedMin} min
            </div>
            <div className="mb-3 text-[16px] font-extrabold text-white">{sessionTitle}</div>
            <div className="flex flex-wrap gap-2">
              {remediation > 0 && (
                <span className="rounded-full bg-nc-green/15 border border-nc-green/25 px-3 py-1 text-[10px] font-semibold text-nc-green">
                  {remediation} reparasjoner
                </span>
              )}
              {review > 0 && (
                <span className="rounded-full bg-white/6 px-3 py-1 text-[10px] font-semibold text-white/50">
                  {review} repetisjon
                </span>
              )}
              {newMaterial > 0 && (
                <span className="rounded-full bg-white/6 px-3 py-1 text-[10px] font-semibold text-white/50">
                  {newMaterial} nytt
                </span>
              )}
            </div>
          </motion.div>
        )}

        {/* Coach insight — from diagnosis engine */}
        {plan?.diagnosisResults && plan.diagnosisResults.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
            className="rounded-2xl border border-nc-green/15 bg-nc-green/5 p-4"
          >
            <div className="mb-1.5 text-[10px] font-bold uppercase tracking-widest text-nc-green/60">
              🎯 Trener-innsikt
            </div>
            <p className="text-[13px] leading-relaxed text-white/70">
              {plan.diagnosisResults[0].reasoning}
            </p>
            <div className="mt-2 flex items-center gap-1.5">
              <div className="h-1 flex-1 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-nc-green/60"
                  style={{ width: `${Math.round(plan.diagnosisResults[0].confidence * 100)}%` }}
                />
              </div>
              <span className="text-[10px] font-semibold text-white/30">
                {Math.round(plan.diagnosisResults[0].confidence * 100)}% sikker
              </span>
            </div>
          </motion.div>
        )}

        {/* Concept progress */}
        <div>
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wide text-white/50">
              Konseptfremgang
            </span>
            <Link href="/progress" className="text-[11px] font-semibold text-nc-green">
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

        {/* Streak */}
        <div className="flex items-center gap-3 rounded-xl bg-nc-card border border-nc-border px-4 py-3">
          <span className="text-xl">🔥</span>
          <span className="text-[22px] font-black text-nc-green">{streak}</span>
          <span className="text-[12px] text-white/40">dagers streak</span>
        </div>

        {/* CTA */}
        <button
          onClick={() => router.push('/session')}
          className="w-full rounded-xl bg-nc-green py-4 text-sm font-extrabold text-[#0d0d14] transition-transform active:scale-[0.98]"
        >
          Start dagens økt →
        </button>
      </main>

      <BottomNav active="home" />
    </div>
  )
}
