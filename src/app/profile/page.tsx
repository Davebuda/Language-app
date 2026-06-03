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
import { formatNextReview } from '@/lib/srs-format'
import { ERROR_TAG_LABELS } from '@/lib/error-tag-labels'
import { GRAMMAR_EXPLAINERS } from '@/lib/grammar-explainers'
import { errorTagToGrammarConceptId } from '@/lib/error-tag-to-concept'

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
    .filter((pattern) => pattern.errorTags[0])
    .slice(0, 3)
    .map((pattern) => ({ tag: pattern.errorTags[0], frequency: pattern.frequency }))

  const weakConcepts = Object.entries(fingerprint?.conceptMastery ?? {})
    .filter(([, mastery]) => mastery.attemptCount >= 3)
    .sort(([, left], [, right]) => (left.decayedScore ?? 0) - (right.decayedScore ?? 0))
    .slice(0, 3)
    .map(([id, mastery]) => ({
      id,
      label: conceptGraph.concepts.find((concept) => concept.id === id)?.label ?? id,
      score: mastery.decayedScore ?? 0,
      nextReview: formatNextReview(mastery.nextReviewAt),
    }))

  const displayName = user?.user_metadata?.full_name ?? user?.email?.split('@')[0] ?? 'Gjest'
  const initials = displayName.slice(0, 2).toUpperCase()

  const levelLabel = fingerprint?.currentLevel ?? (status === 'loading' ? '–' : 'A1')

  return (
    <div className="nc-gradient-page nc-secondary-flow flex min-h-dvh flex-col">
      <main className="nc-mobile-shell nc-flow-shell">

        {/* ── Identity header (Dark) ── */}
        <div className="flex items-stretch gap-[6px]">
          <div className="flex flex-1 items-center gap-2.5 rounded-lg bg-[var(--nc-card)] border border-[var(--nc-border)] px-2.5 py-2">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-[0.7rem] bg-[linear-gradient(135deg,var(--nc-signal)_0%,#A8E010_100%)] text-[1rem] font-display font-extrabold text-[var(--nc-signal-fg)]">
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[9px] font-bold uppercase tracking-[0.12em] text-[var(--nc-text-dim)]">Profil</div>
              <div className="mt-1 text-[1.1rem] font-display font-extrabold leading-tight tracking-[-0.03em] text-[var(--nc-text)]">
                {displayName}
              </div>
              {user?.email ? (
                <div className="mt-px truncate text-[0.72rem] text-[var(--nc-text-muted)]">{user.email}</div>
              ) : null}
            </div>
          </div>
          <div className="flex flex-col items-center justify-center rounded-lg bg-[var(--nc-card)] border border-[var(--nc-border)] px-3 py-2 min-w-[52px]">
            <span className="rounded-[0.25rem] border border-[rgba(200,255,32,0.18)] bg-[var(--nc-signal-tint)] px-1.5 py-px text-[9px] font-bold uppercase tracking-[0.08em] text-[var(--nc-signal)]">{levelLabel}</span>
            <div className="mt-1.5 text-[7px] font-bold uppercase tracking-[0.1em] text-[var(--nc-text-dim)]">Nivå</div>
          </div>
        </div>

        {/* ── Stat Strip (Cream) — mirrors dashboard pattern ── */}
        <div className="grid grid-cols-3 overflow-hidden rounded-lg bg-[var(--nc-cream)] border border-[rgba(17,21,24,0.06)]">
          {([
            { label: 'Rekke', value: String(streak), numTone: 'text-[var(--nc-cream-text)]' },
            { label: 'Mestret', value: String(masteredCount), numTone: 'text-[#5A8A00]' },
            { label: 'Økter', value: String(fingerprint?.totalSessionsCompleted ?? 0), numTone: 'text-[var(--nc-cream-text)]' },
          ] as const).map((stat, i) => (
            <div key={stat.label} className={`relative px-2 py-2.5 text-center${i > 0 ? ' before:absolute before:left-0 before:top-[20%] before:h-[60%] before:w-px before:bg-[rgba(17,21,24,0.08)]' : ''}`}>
              <div className={`text-[1.25rem] font-extrabold tabular-nums leading-none ${stat.numTone}`}>
                {stat.value}
              </div>
              <div className="mt-0.5 text-[8px] font-bold uppercase tracking-[0.1em] text-[var(--nc-cream-dim)]">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* ── Level / Mastery Hero (Lime) ── */}
        <section className="nc-signal-panel p-2.5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-[9px] font-bold uppercase tracking-[0.12em] text-[rgba(10,18,6,0.48)]">Nåværende nivå</div>
              <div className="mt-1.5 text-balance text-[1.2rem] font-display font-extrabold leading-none text-[var(--nc-signal-fg)]">
                {fingerprint?.currentLevel
                  ? (LEVEL_LABELS[fingerprint.currentLevel] ?? fingerprint.currentLevel)
                  : (status === 'loading' ? '–' : 'A1')}
              </div>
            </div>
            <span className="rounded-full bg-[rgba(6,16,23,0.9)] px-3 py-1.5 text-[9px] font-bold uppercase tracking-[0.08em] text-white">
              Live
            </span>
          </div>
          <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-[rgba(6,16,23,0.14)]">
            <div
              className="h-full rounded-full bg-[rgba(6,16,23,0.9)]"
              style={{
                width: `${totalConcepts > 0 ? (masteredCount / totalConcepts) * 100 : 0}%`,
              }}
            />
          </div>
          <div className="mt-1.5 text-[0.72rem] text-[rgba(8,17,13,0.72)]">
            {masteredCount} av {totalConcepts} konsepter mestret
          </div>

          {!user && !authLoading ? (
            <button
              onClick={() => router.push('/login')}
              className="mt-3 inline-flex items-center gap-2 rounded-lg bg-[rgba(10,18,6,0.90)] px-3.5 py-2 text-[0.78rem] font-semibold text-white"
            >
              Logg inn for å synkronisere
              <ArrowRight size={14} aria-hidden="true" />
            </button>
          ) : null}
        </section>

        {/* ── Weak concepts (Cream) ── */}
        {weakConcepts.length > 0 ? (
          <section className="nc-glass-cream p-2.5">
            {/* These are ordered by decayedScore, which falls with time since
                practice — so the honest frame is "due for review", not "you are
                weak at this". A concept you mastered then left for weeks belongs
                here without it being a failure. */}
            <div className="nc-label">Klar for repetisjon</div>
            <div className="mt-2 flex flex-col gap-1">
              {weakConcepts.map((concept) => (
                <div
                  key={concept.id}
                  className="rounded-lg border border-[rgba(17,21,24,0.07)] bg-[rgba(255,255,255,0.5)] px-3 py-2"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-[0.82rem] font-medium text-[var(--nc-cream-text)]">{concept.label}</span>
                    <span className="rounded-full bg-[rgba(17,21,24,0.07)] px-3 py-1 text-[0.72rem] font-bold text-[var(--nc-cream-muted)]">
                      {Math.round(concept.score)}%
                    </span>
                  </div>
                  {concept.nextReview ? (
                    <div className="mt-1 text-[0.68rem] text-[var(--nc-cream-muted)]">
                      Neste repetisjon: {concept.nextReview}
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          </section>
        ) : null}

        {/* ── Recurring errors (Dark) ── */}
        {topErrors.length > 0 ? (
          <section className="nc-glass p-2.5">
            <div className="nc-label">Tilbakevendende feil</div>
            <div className="mt-2 flex flex-col gap-1.5">
              {topErrors.map((error) => {
                const label = ERROR_TAG_LABELS[error.tag] ?? error.tag
                const grammarConceptId = errorTagToGrammarConceptId(error.tag)
                const rule = grammarConceptId ? GRAMMAR_EXPLAINERS[grammarConceptId]?.shortRule : undefined
                return (
                  <div
                    key={error.tag}
                    className="rounded-lg border border-[var(--nc-border)] bg-[rgba(255,255,255,0.06)] px-3 py-2"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-[0.82rem] font-medium text-[var(--nc-text)]">{label}</span>
                      <span className="rounded-full bg-[rgba(255,255,255,0.08)] px-2.5 py-0.5 text-[0.7rem] font-bold text-[var(--nc-text-muted)]">
                        {error.frequency}x
                      </span>
                    </div>
                    {rule ? (
                      <p className="mt-1 text-[0.7rem] leading-snug text-[var(--nc-text-muted)]">{rule}</p>
                    ) : null}
                  </div>
                )
              })}
            </div>
          </section>
        ) : null}

        <AIStatusSection />

        {/* ── Session style (Dark) ── */}
        <section className="nc-glass p-2.5">
          <div className="nc-label">Øktstil</div>
          <p className="mt-1 text-[0.72rem] text-[var(--nc-text-muted)]">
            Påvirker hvilke øvelsestyper som vises oftere i planene dine.
          </p>
          <div className="mt-2 grid gap-1.5">
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
                  className="rounded-lg border px-3 py-2 text-left transition-colors"
                  style={{
                    background: isActive
                      ? 'linear-gradient(135deg, rgba(215,255,92,0.92) 0%, rgba(199,244,93,0.88) 100%)'
                      : 'linear-gradient(180deg, rgba(248,250,246,0.08) 0%, rgba(248,250,246,0.04) 100%)',
                    borderColor: isActive ? 'rgba(215,255,92,0.42)' : 'rgba(255,255,255,0.10)',
                    color: isActive ? 'var(--nc-signal-fg)' : 'var(--nc-text)',
                    boxShadow: isActive ? '0 18px 36px rgba(183,243,0,0.16)' : '0 18px 34px rgba(0,0,0,0.18)',
                  }}
                >
                  <div className="text-[0.82rem] font-bold">{opt.label}</div>
                  <div
                    className="mt-1 text-[0.72rem] leading-snug"
                    style={{ color: isActive ? 'rgba(8,17,13,0.72)' : 'var(--nc-text-muted)' }}
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
            className="nc-glass inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-[0.82rem] font-medium text-[var(--nc-text-muted)]"
          >
            <LogOut size={14} aria-hidden="true" />
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
      badgeBg: 'var(--nc-signal-tint)',
      badgeBorder: 'var(--nc-signal-border)',
      badgeColor: 'var(--nc-signal)',
      headingColor: 'var(--nc-text)',
    },
    teal: {
      badgeBg: 'var(--nc-teal-tint)',
      badgeBorder: 'var(--nc-teal-border)',
      badgeColor: 'var(--nc-teal)',
      headingColor: 'var(--nc-text)',
    },
    muted: {
      badgeBg: 'rgba(255,255,255,0.06)',
      badgeBorder: 'rgba(255,255,255,0.10)',
      badgeColor: 'var(--nc-text-dim)',
      headingColor: 'var(--nc-text)',
    },
  } as const
  const tone = toneStyles[info.tone]

  return (
    <section className="nc-glass p-2.5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="nc-label">AI-status</div>
          <div className="mt-1.5 text-[0.88rem] font-bold" style={{ color: tone.headingColor }}>
            {info.label}
            {state === 'loading' ? (
              <span className="ml-2 text-[0.72rem] font-normal text-[var(--nc-text-dim)]">
                Laster modell…
              </span>
            ) : null}
          </div>
          <p className="mt-1 text-[0.72rem] leading-5 text-[var(--nc-text-muted)]">
            {info.desc}
          </p>
        </div>
        <span
          className="shrink-0 rounded-full border px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.08em]"
          style={{ background: tone.badgeBg, borderColor: tone.badgeBorder, color: tone.badgeColor }}
        >
          {info.badge}
        </span>
      </div>
    </section>
  )
}
