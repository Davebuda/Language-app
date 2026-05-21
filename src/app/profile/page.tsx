'use client'

import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { ArrowRight, LogOut } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useFingerprint } from '@/hooks/useFingerprint'
import { useFingerprintStore } from '@/stores/fingerprint-store'
import { saveFingerprint } from '@/storage/indexeddb'
import { isMastered } from '@/engine'
import { getStreak } from '@/lib/streak'
import { BottomNav } from '@/components/layout/BottomNav'
import type { InputProductionPreference } from '@/types/fingerprint'
import type { ConceptGraph } from '@/types/concepts'
import a1GraphJson from '@content/concepts/a1-graph.json'
import a2GraphJson from '@content/concepts/a2-graph.json'

const PREFERENCE_OPTIONS: { value: InputProductionPreference; label: string; desc: string }[] = [
  { value: 'input_heavy', label: 'Input-heavy', desc: 'More reading & listening' },
  { value: 'balanced', label: 'Balanced', desc: 'Mix of both' },
  { value: 'production_heavy', label: 'Production', desc: 'More writing & speaking' },
]

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
  const { fingerprint, setFingerprint, status } = useFingerprintStore()
  const conceptGraph = (fingerprint?.currentLevel === 'A2' ? a2GraphJson : a1GraphJson) as ConceptGraph
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
    <div className="nc-gradient-page flex flex-col min-h-dvh">
      <main className="relative z-10 mx-auto flex w-full max-w-lg flex-1 flex-col gap-4 px-5 pb-6 pt-5">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="nc-glass-elevated p-5"
        >
          <div className="flex items-start gap-4">
            <div className="flex size-16 items-center justify-center overflow-hidden rounded-[1rem] bg-[var(--nc-dark)] text-lg font-display font-semibold text-white">
              <span>{initials}</span>
            </div>

            <div className="min-w-0 flex-1">
              <div className="nc-label">Profil</div>
              <div className="mt-2 text-[1.55rem] font-display font-semibold tracking-[-0.03em] text-[var(--nc-text)]">
                {displayName}
              </div>
              {user?.email ? (
                <div className="truncate text-sm text-[var(--nc-text-muted)]">{user.email}</div>
              ) : null}

              {!user && !authLoading ? (
                <button
                  onClick={() => router.push('/login')}
                  className="mt-3 inline-flex items-center gap-2 rounded-[0.8rem] border border-[var(--nc-red-border)] bg-[var(--nc-red-tint)] px-3 py-2 text-xs font-medium text-[var(--nc-red)]"
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
            { label: 'Nivå', value: status === 'loading' ? '–' : (fingerprint?.currentLevel ?? 'A1'), tone: 'text-[var(--nc-red)]' },
            { label: 'Streak', value: String(streak), tone: 'text-[var(--nc-text)]' },
            {
              label: 'Økter',
              value: String(fingerprint?.totalSessionsCompleted ?? 0),
              tone: 'text-[var(--nc-text)]',
            },
          ].map((stat) => (
            <div key={stat.label} className="nc-glass px-3 py-4 text-center">
              <div className={`text-[1.8rem] font-display font-semibold tracking-[-0.03em] ${stat.tone}`}>
                {stat.value}
              </div>
              <div className="mt-1 text-[10px] font-medium tracking-[0.08em] text-[var(--nc-text-dim)]">
                {stat.label}
              </div>
            </div>
          ))}
        </div>

        <div className="nc-glass-cream p-4">
          <div className="nc-label">Nåværende nivå</div>
          <div className="mt-2 text-lg font-display font-semibold text-[var(--nc-text)]">
            {status === 'loading' ? '–' : (LEVEL_LABELS[fingerprint?.currentLevel ?? 'A1'] ?? 'A1')}
          </div>
          <div className="mt-4 h-2 w-full overflow-hidden rounded-[0.4rem] bg-[var(--nc-border)]">
            <div
              className="h-full rounded-[0.4rem] bg-[var(--nc-red)]"
              style={{
                width: `${totalConcepts > 0 ? (masteredCount / totalConcepts) * 100 : 0}%`,
              }}
            />
          </div>
          <div className="mt-2 text-sm text-[var(--nc-text-muted)]">
            {masteredCount} av {totalConcepts} konsepter mestret
          </div>
        </div>

        {weakConcepts.length > 0 ? (
          <div className="nc-glass p-4">
            <div className="nc-label">Svake punkter</div>
            <div className="mt-4 flex flex-col gap-3">
              {weakConcepts.map((concept) => (
                <div key={concept.id} className="flex items-center justify-between gap-3">
                  <span className="text-sm font-medium text-[var(--nc-text)]">{concept.label}</span>
                  <span className="rounded-[0.7rem] bg-[var(--nc-red-tint)] px-3 py-1.5 text-xs font-medium text-[var(--nc-red)]">
                    {Math.round(concept.score)}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {topErrors.length > 0 ? (
          <div className="nc-glass p-4">
            <div className="nc-label">Tilbakevendende feil</div>
            <div className="mt-4 flex flex-wrap gap-2">
              {topErrors.map((error) => (
                <span
                  key={error.tag}
                  className="nc-glass rounded-[0.72rem] px-3 py-2 text-xs font-medium text-[var(--nc-text)]"
                >
                  {error.tag} · {error.frequency}x
                </span>
              ))}
            </div>
          </div>
        ) : null}

        {/* Input/production preference */}
        <div className="nc-glass p-4">
          <div className="nc-label">Session style</div>
          <p className="mt-1 text-[12px] text-[var(--nc-text-dim)]">
            Biases which exercise types appear in your sessions.
          </p>
          <div className="mt-4 grid grid-cols-3 gap-2">
            {PREFERENCE_OPTIONS.map((opt) => {
              const current = fingerprint?.inputProductionPreference ?? 'balanced'
              const isActive = current === opt.value
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    if (!fingerprint) return
                    const updated = { ...fingerprint, inputProductionPreference: opt.value, updatedAt: new Date().toISOString() }
                    setFingerprint(updated)
                    saveFingerprint(updated).catch(console.warn)
                  }}
                  className="flex flex-col gap-1 rounded-[0.875rem] border px-3 py-2.5 text-left transition-colors"
                  style={{
                    background: isActive ? 'rgba(220,38,38,0.14)' : 'rgba(255,255,255,0.05)',
                    borderColor: isActive ? 'rgba(220,38,38,0.40)' : 'rgba(255,255,255,0.09)',
                  }}
                >
                  <span
                    className="text-[12px] font-bold"
                    style={{ color: isActive ? 'var(--nc-red)' : 'var(--nc-text)' }}
                  >
                    {opt.label}
                  </span>
                  <span
                    className="text-[10px] leading-snug"
                    style={{ color: isActive ? 'var(--nc-text-muted)' : 'var(--nc-text-dim)' }}
                  >
                    {opt.desc}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        {user ? (
          <button
            onClick={signOut}
            className="inline-flex items-center justify-center gap-2 rounded-[var(--radius)] border border-[var(--nc-red)] px-4 py-3 text-sm font-medium text-[var(--nc-red)] transition-colors hover:bg-[var(--nc-red-tint)]"
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
