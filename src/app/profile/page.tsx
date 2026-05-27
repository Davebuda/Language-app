'use client'

import { useRouter } from 'next/navigation'
import { ArrowRight, LogOut } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useFingerprint } from '@/hooks/useFingerprint'
import { useFingerprintStore } from '@/stores/fingerprint-store'
import { useAIStatusStore } from '@/stores/ai-status-store'
import { saveFingerprint } from '@/storage/indexeddb'
import { isMastered } from '@/engine'
import { getStreak } from '@/lib/streak'
import { BottomNav } from '@/components/layout/BottomNav'
import type { InputProductionPreference } from '@/types/fingerprint'
import { getGraphForLevel } from '@/lib/concept-graph-loader'

const PREFERENCE_OPTIONS: { value: InputProductionPreference; label: string; desc: string }[] = [
  { value: 'input_heavy', label: 'Lytting og lesing', desc: 'Mer input og forståelse' },
  { value: 'balanced', label: 'Balansert', desc: 'Blanding av begge' },
  { value: 'production_heavy', label: 'Produksjon', desc: 'Mer skriving og tale' },
]

const LEVEL_LABELS: Record<string, string> = {
  A1: 'A1 · Nybegynner',
  A2: 'A2 · Grunnleggende',
  B1: 'B1 · Selvstendig',
  B2: 'B2 · Viderekommen',
}

export default function ProfilePage() {
  const router = useRouter()
  const { user, signOut, loading: authLoading } = useAuth()
  useFingerprint()
  const { fingerprint, setFingerprint, status } = useFingerprintStore()
  const conceptGraph = getGraphForLevel(fingerprint?.currentLevel ?? 'A1')
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

  const displayName = user?.user_metadata?.full_name ?? user?.email?.split('@')[0] ?? 'Gjest'
  const initials = displayName.slice(0, 2).toUpperCase()

  return (
    <div className="nc-gradient-page flex min-h-dvh flex-col">
      <main className="nc-mobile-shell relative z-10 flex w-full flex-1 flex-col gap-3 px-4 pb-28 pt-4">
        <section className="nc-glass-cream p-5">
          <div className="flex items-start gap-4">
            <div className="flex size-16 items-center justify-center overflow-hidden rounded-[1rem] bg-[rgba(6,16,23,0.94)] text-lg font-display font-semibold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
              <span>{initials}</span>
            </div>

            <div className="min-w-0 flex-1">
              <div className="nc-label text-[var(--nc-cream-dim)]">Profil</div>
              <div className="mt-2 text-[1.7rem] font-display font-semibold tracking-[-0.03em] text-[var(--nc-cream-text)]">
                {displayName}
              </div>
              {user?.email ? (
                <div className="truncate text-sm text-[var(--nc-cream-muted)]">{user.email}</div>
              ) : null}

              {!user && !authLoading ? (
                <button
                  onClick={() => router.push('/login')}
                  className="mt-3 inline-flex items-center gap-2 rounded-[0.9rem] bg-[rgba(6,16,23,0.92)] px-3 py-2 text-xs font-medium text-white"
                >
                  Logg inn for å synkronisere
                  <ArrowRight size={14} />
                </button>
              ) : null}
            </div>
          </div>

          <div className="mt-5 rounded-[1.3rem] bg-[rgba(6,16,23,0.94)] p-4 text-white">
            <div className="grid grid-cols-3 gap-3">
              {[
                {
                  label: 'Nivå',
                  value: fingerprint?.currentLevel ?? (status === 'loading' ? '–' : 'A1'),
                  tone: 'text-[var(--nc-signal)]',
                },
                { label: 'Rekke', value: String(streak), tone: 'text-white' },
                {
                  label: 'Økter',
                  value: String(fingerprint?.totalSessionsCompleted ?? 0),
                  tone: 'text-white',
                },
              ].map((stat) => (
                <div key={stat.label} className="rounded-[1rem] border border-white/8 bg-white/5 px-3 py-4 text-center">
                  <div className={`text-[1.8rem] font-display font-semibold tracking-[-0.03em] ${stat.tone}`}>
                    {stat.value}
                  </div>
                  <div className="mt-1 text-[10px] font-medium uppercase tracking-[0.08em] text-white/42">
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="nc-glass-cream p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="nc-label text-[var(--nc-cream-dim)]">Nåværende nivå</div>
              <div className="mt-2 text-lg font-display font-semibold text-[var(--nc-cream-text)]">
                {fingerprint?.currentLevel
                  ? (LEVEL_LABELS[fingerprint.currentLevel] ?? fingerprint.currentLevel)
                  : (status === 'loading' ? '–' : 'A1')}
              </div>
            </div>
            <span className="rounded-full bg-[var(--nc-signal)] px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--nc-signal-fg)]">
              Live
            </span>
          </div>
          <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-[rgba(6,16,23,0.08)]">
            <div
              className="h-full rounded-full bg-[var(--nc-signal)]"
              style={{
                width: `${totalConcepts > 0 ? (masteredCount / totalConcepts) * 100 : 0}%`,
              }}
            />
          </div>
          <div className="mt-2 text-sm text-[var(--nc-cream-muted)]">
            {masteredCount} av {totalConcepts} konsepter mestret
          </div>
        </section>

        {weakConcepts.length > 0 ? (
          <section className="nc-glass p-4">
            <div className="nc-label">Trenger mer trening</div>
            <div className="mt-4 space-y-3">
              {weakConcepts.map((concept) => (
                <div
                  key={concept.id}
                  className="flex items-center justify-between gap-3 rounded-[1rem] border border-white/8 bg-white/5 px-3 py-3"
                >
                  <span className="text-sm font-medium text-[var(--nc-text)]">{concept.label}</span>
                  <span className="rounded-full bg-[var(--nc-red-tint)] px-3 py-1.5 text-xs font-medium text-[var(--nc-red)]">
                    {Math.round(concept.score)}%
                  </span>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        {topErrors.length > 0 ? (
          <section className="nc-glass-cream p-4">
            <div className="nc-label text-[var(--nc-cream-dim)]">Tilbakevendende feil</div>
            <div className="mt-4 flex flex-wrap gap-2">
              {topErrors.map((error) => (
                <span
                  key={error.tag}
                  className="rounded-full border border-[rgba(6,16,23,0.10)] bg-white/60 px-3 py-2 text-xs font-medium text-[var(--nc-cream-text)]"
                >
                  {error.tag} · {error.frequency}x
                </span>
              ))}
            </div>
          </section>
        ) : null}

        <AIStatusSection />

        <section className="nc-glass-cream p-4">
          <div className="nc-label text-[var(--nc-cream-dim)]">Øktstil</div>
          <p className="mt-1 text-[12px] text-[var(--nc-cream-muted)]">
            Påvirker hvilke øvelsestyper som vises oftere i planene dine.
          </p>
          <div className="mt-4 grid gap-2">
            {PREFERENCE_OPTIONS.map((opt) => {
              const current = fingerprint?.inputProductionPreference ?? 'balanced'
              const isActive = current === opt.value
              return (
                <button
                  key={opt.value}
                  type="button"
                  aria-pressed={isActive}
                  onClick={() => {
                    if (!fingerprint) return
                    const updated = {
                      ...fingerprint,
                      inputProductionPreference: opt.value,
                      updatedAt: new Date().toISOString(),
                    }
                    setFingerprint(updated)
                    saveFingerprint(updated).catch(console.warn)
                  }}
                  className="rounded-[1rem] border px-4 py-3 text-left transition-colors"
                  style={{
                    background: isActive
                      ? 'linear-gradient(135deg, rgba(215,255,92,0.92) 0%, rgba(199,244,93,0.88) 100%)'
                      : 'rgba(255,255,255,0.52)',
                    borderColor: isActive ? 'rgba(215,255,92,0.42)' : 'rgba(6,16,23,0.10)',
                    color: isActive ? 'var(--nc-signal-fg)' : 'var(--nc-cream-text)',
                    boxShadow: isActive ? '0 14px 30px rgba(183,243,0,0.16)' : 'none',
                  }}
                >
                  <div className="text-[13px] font-bold">{opt.label}</div>
                  <div
                    className="mt-1 text-[11px] leading-snug"
                    style={{ color: isActive ? 'rgba(8,17,13,0.72)' : 'var(--nc-cream-muted)' }}
                  >
                    {opt.desc}
                  </div>
                </button>
              )
            })}
          </div>
        </section>

        {user ? (
          <button
            onClick={signOut}
            className="nc-glass inline-flex items-center justify-center gap-2 rounded-[1rem] px-4 py-3 text-sm font-medium text-[var(--nc-text)]"
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

function AIStatusSection() {
  const { state, aiMode } = useAIStatusStore()

  const modeInfo = {
    webllm: {
      label: 'Lokal AI',
      desc: 'Modellen kjører i nettleseren. Dataene dine blir på enheten når lokal modus er aktiv.',
      badge: 'Lokal',
      tone: 'signal',
    },
    server: {
      label: 'Sky-AI',
      desc: 'Svarene leveres via server for raskere respons og bredere modellstøtte.',
      badge: 'Sky',
      tone: 'teal',
    },
    none: {
      label: 'Maler',
      desc: 'AI er ikke tilgjengelig akkurat nå. Appen faller tilbake til faste forklaringer og regler.',
      badge: 'Fallback',
      tone: 'muted',
    },
  } as const

  const info = modeInfo[aiMode]
  const toneStyles = {
    signal: {
      badgeBg: 'rgba(215,255,92,0.24)',
      badgeColor: 'var(--nc-signal-fg)',
      headingColor: 'var(--nc-text)',
    },
    teal: {
      badgeBg: 'rgba(109,229,255,0.14)',
      badgeColor: 'var(--nc-teal)',
      headingColor: 'var(--nc-text)',
    },
    muted: {
      badgeBg: 'rgba(255,255,255,0.08)',
      badgeColor: 'var(--nc-text-dim)',
      headingColor: 'var(--nc-text)',
    },
  } as const
  const tone = toneStyles[info.tone]

  return (
    <section className="nc-glass p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="nc-label">AI-status</div>
          <div className="mt-2 text-sm font-semibold" style={{ color: tone.headingColor }}>
            {info.label}
            {state === 'loading' ? (
              <span className="ml-2 text-[11px] font-normal text-[var(--nc-text-dim)]">
                Laster modell…
              </span>
            ) : null}
          </div>
          <p className="mt-2 text-[12px] leading-6 text-[var(--nc-text-muted)]">
            {info.desc}
          </p>
        </div>
        <span
          className="rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.08em]"
          style={{ background: tone.badgeBg, color: tone.badgeColor }}
        >
          {info.badge}
        </span>
      </div>
    </section>
  )
}
