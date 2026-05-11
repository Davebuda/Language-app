'use client'

import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { useAuth } from '@/hooks/useAuth'
import { useFingerprint } from '@/hooks/useFingerprint'
import { useFingerprintStore } from '@/stores/fingerprint-store'
import { isMastered } from '@/engine'
import { getStreak } from '@/lib/streak'
import { BottomNav } from '@/components/layout/BottomNav'
import type { ConceptGraph } from '@/types/concepts'
import conceptGraphJson from '@content/concepts/a1-graph.json'

const conceptGraph = conceptGraphJson as ConceptGraph

const LEVEL_LABELS: Record<string, string> = {
  A1: 'A1 — Nybegynner',
  A2: 'A2 — Grunnleggende',
  B1: 'B1 — Selvstendig',
  B2: 'B2 — Viderekommen',
}

export default function ProfilePage() {
  const router = useRouter()
  const { user, signOut, loading: authLoading } = useAuth()
  useFingerprint()
  const { fingerprint } = useFingerprintStore()
  const streak = getStreak()

  const masteredCount = conceptGraph.concepts.filter((c) => {
    const m = fingerprint?.conceptMastery[c.id]
    return isMastered(m, c.masteryThreshold, c.minAttempts, c.minDays)
  }).length

  const totalConcepts = conceptGraph.concepts.length

  const topErrors = (fingerprint?.errorPatterns ?? [])
    .slice(0, 3)
    .map((p) => ({ tag: p.errorTags[0], frequency: p.frequency }))

  const weakConcepts = Object.entries(fingerprint?.conceptMastery ?? {})
    .filter(([, m]) => m.attemptCount >= 3)
    .sort(([, a], [, b]) => a.decayedScore - b.decayedScore)
    .slice(0, 3)
    .map(([id, m]) => ({
      id,
      label: conceptGraph.concepts.find((c) => c.id === id)?.label ?? id,
      score: m.decayedScore,
    }))

  const displayName = user?.user_metadata?.full_name
    ?? user?.email?.split('@')[0]
    ?? 'Gjest'

  const initials = displayName.slice(0, 2).toUpperCase()

  return (
    <div className="flex min-h-dvh flex-col bg-nc-bg">
      <main className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-4 px-5 pb-4 pt-5">

        {/* Avatar + name */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-4"
        >
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-nc-green text-lg font-black text-[#0d0d14]">
            {initials}
          </div>
          <div>
            <div className="text-[18px] font-extrabold text-white">{displayName}</div>
            {user?.email && (
              <div className="text-[12px] text-white/40">{user.email}</div>
            )}
            {!user && !authLoading && (
              <button
                onClick={() => router.push('/login')}
                className="mt-1 text-[12px] font-semibold text-nc-green"
              >
                Logg inn for å synkronisere →
              </button>
            )}
          </div>
        </motion.div>

        {/* Level + stats row */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Nivå', value: fingerprint?.currentLevel ?? 'A1' },
            { label: 'Streak', value: `${streak}🔥` },
            { label: 'Øvelser', value: fingerprint?.totalSessionsCompleted ?? 0 },
          ].map((stat) => (
            <div
              key={stat.label}
              className="rounded-xl border border-nc-border bg-nc-card px-3 py-3 text-center"
            >
              <div className="text-[20px] font-black text-white">{stat.value}</div>
              <div className="mt-0.5 text-[10px] font-semibold uppercase tracking-widest text-white/30">
                {stat.label}
              </div>
            </div>
          ))}
        </div>

        {/* Level description */}
        <div className="rounded-xl border border-nc-border bg-nc-card px-4 py-3">
          <div className="mb-1 text-[10px] font-bold uppercase tracking-widest text-white/30">
            Nåværende nivå
          </div>
          <div className="text-[15px] font-bold text-white">
            {LEVEL_LABELS[fingerprint?.currentLevel ?? 'A1']}
          </div>
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-nc-green transition-all duration-500"
              style={{ width: `${totalConcepts > 0 ? (masteredCount / totalConcepts) * 100 : 0}%` }}
            />
          </div>
          <div className="mt-1 text-[11px] text-white/30">
            {masteredCount} av {totalConcepts} konsepter mestret
          </div>
        </div>

        {/* Weak spots */}
        {weakConcepts.length > 0 && (
          <div className="rounded-xl border border-nc-border bg-nc-card px-4 py-3">
            <div className="mb-2 text-[10px] font-bold uppercase tracking-widest text-white/30">
              Svake punkter
            </div>
            <div className="flex flex-col gap-2">
              {weakConcepts.map((c) => (
                <div key={c.id} className="flex items-center justify-between">
                  <span className="text-[13px] text-white/80">{c.label}</span>
                  <span className="text-[12px] font-bold text-nc-green">{c.score}%</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Error patterns */}
        {topErrors.length > 0 && (
          <div className="rounded-xl border border-nc-border bg-nc-card px-4 py-3">
            <div className="mb-2 text-[10px] font-bold uppercase tracking-widest text-white/30">
              Tilbakevendende feil
            </div>
            <div className="flex flex-wrap gap-2">
              {topErrors.map((e) => (
                <span
                  key={e.tag}
                  className="rounded-full border border-nc-repair-border bg-nc-repair-bg px-3 py-1 text-[11px] font-semibold text-nc-green"
                >
                  {e.tag} · {e.frequency}×
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Sign out */}
        {user && (
          <button
            onClick={signOut}
            className="mt-2 w-full rounded-xl border border-white/10 py-3 text-sm font-semibold text-white/40 transition-colors hover:border-white/20 hover:text-white/60"
          >
            Logg ut
          </button>
        )}
      </main>

      <BottomNav active="profile" />
    </div>
  )
}
