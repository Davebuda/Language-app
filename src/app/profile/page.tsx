'use client'

import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { ArrowRight, LogOut } from 'lucide-react'
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
  A1: 'A1 - Nybegynner',
  A2: 'A2 - Grunnleggende',
  B1: 'B1 - Selvstendig',
  B2: 'B2 - Viderekommen',
}

export default function ProfilePage() {
  const router = useRouter()
  const { user, signOut, loading: authLoading } = useAuth()
  useFingerprint()
  const { fingerprint } = useFingerprintStore()
  const streak = getStreak()

  const masteredCount = conceptGraph.concepts.filter((concept) => {
    const mastery = fingerprint?.conceptMastery[concept.id]
    return isMastered(
      mastery,
      concept.masteryThreshold,
      concept.minAttempts,
      concept.minDays,
    )
  }).length

  const totalConcepts = conceptGraph.concepts.length
  const topErrors = (fingerprint?.errorPatterns ?? [])
    .slice(0, 3)
    .map((pattern) => ({ tag: pattern.errorTags[0], frequency: pattern.frequency }))

  const weakConcepts = Object.entries(fingerprint?.conceptMastery ?? {})
    .filter(([, mastery]) => mastery.attemptCount >= 3)
    .sort(([, left], [, right]) => left.decayedScore - right.decayedScore)
    .slice(0, 3)
    .map(([id, mastery]) => ({
      id,
      label: conceptGraph.concepts.find((concept) => concept.id === id)?.label ?? id,
      score: mastery.decayedScore,
    }))

  const displayName =
    user?.user_metadata?.full_name ?? user?.email?.split('@')[0] ?? 'Gjest'
  const initials = displayName.slice(0, 2).toUpperCase()

  return (
    <div className="flex min-h-dvh flex-col bg-transparent">
      <main className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-4 px-5 pb-6 pt-5">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="nc-panel p-5"
        >
          <div className="flex items-start gap-4">
            <div className="relative flex h-16 w-16 items-center justify-center overflow-hidden rounded-[1rem] bg-nc-dark text-lg font-display font-semibold text-white shadow-[0_14px_28px_rgba(24,21,38,0.18)]">
              <div className="nc-pattern-orbits absolute inset-0 opacity-35" />
              <span className="relative z-[1]">{initials}</span>
            </div>

            <div className="min-w-0 flex-1">
              <div className="nc-label">Profil</div>
              <div className="mt-2 text-[1.55rem] font-display font-semibold tracking-[-0.03em] text-nc-text">
                {displayName}
              </div>
              {user?.email ? (
                <div className="truncate text-sm text-nc-text-muted">{user.email}</div>
              ) : null}

              {!user && !authLoading ? (
                <button
                  onClick={() => router.push('/login')}
                  className="mt-3 inline-flex items-center gap-2 rounded-[0.8rem] border border-nc-violet/18 bg-nc-violet/10 px-3 py-2 text-xs font-medium text-nc-violet"
                >
                  Logg inn for å synkronisere
                  <ArrowRight size={14} />
                </button>
              ) : null}
            </div>
          </div>
        </motion.div>

        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Nivå', value: fingerprint?.currentLevel ?? 'A1', tone: 'text-nc-violet' },
            { label: 'Streak', value: String(streak), tone: 'text-nc-coral' },
            {
              label: 'Økter',
              value: String(fingerprint?.totalSessionsCompleted ?? 0),
              tone: 'text-nc-text',
            },
          ].map((stat) => (
            <div key={stat.label} className="nc-panel px-3 py-4 text-center">
              <div className={`text-[1.8rem] font-display font-semibold tracking-[-0.03em] ${stat.tone}`}>
                {stat.value}
              </div>
              <div className="mt-1 text-[10px] font-medium tracking-[0.08em] text-nc-text-dim">
                {stat.label}
              </div>
            </div>
          ))}
        </div>

        <div className="nc-panel p-4">
          <div className="nc-label">Nåværende nivå</div>
          <div className="mt-2 text-lg font-display font-semibold text-nc-text">
            {LEVEL_LABELS[fingerprint?.currentLevel ?? 'A1']}
          </div>
          <div className="mt-4 h-2 w-full overflow-hidden rounded-[0.4rem] bg-[rgba(24,21,38,0.08)]">
            <div
              className="h-full rounded-[0.4rem] bg-[linear-gradient(90deg,#B7A7FF_0%,#C8FF00_100%)]"
              style={{
                width: `${totalConcepts > 0 ? (masteredCount / totalConcepts) * 100 : 0}%`,
              }}
            />
          </div>
          <div className="mt-2 text-sm text-nc-text-muted">
            {masteredCount} av {totalConcepts} konsepter mestret
          </div>
        </div>

        {weakConcepts.length > 0 ? (
          <div className="nc-panel p-4">
            <div className="nc-label">Svake punkter</div>
            <div className="mt-4 flex flex-col gap-3">
              {weakConcepts.map((concept) => (
                <div key={concept.id} className="flex items-center justify-between gap-3">
                  <span className="text-sm font-medium text-nc-text">{concept.label}</span>
                  <span className="rounded-[0.7rem] bg-nc-apricot/26 px-3 py-1.5 text-xs font-medium text-nc-coral">
                    {Math.round(concept.score)}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {topErrors.length > 0 ? (
          <div className="nc-panel p-4">
            <div className="nc-label">Tilbakevendende feil</div>
            <div className="mt-4 flex flex-wrap gap-2">
              {topErrors.map((error) => (
                <span
                  key={error.tag}
                  className="rounded-[0.72rem] border border-nc-border bg-white px-3 py-2 text-xs font-medium text-nc-text"
                >
                  {error.tag} · {error.frequency}x
                </span>
              ))}
            </div>
          </div>
        ) : null}

        {user ? (
          <button
            onClick={signOut}
            className="nc-button-dark inline-flex items-center justify-center gap-2 px-4 py-4 text-sm font-medium"
          >
            <LogOut size={15} />
            Logg ut
          </button>
        ) : null}
      </main>

      <BottomNav active="profile" />
    </div>
  )
}
