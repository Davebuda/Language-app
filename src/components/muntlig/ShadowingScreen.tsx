'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { BottomNav } from '@/components/layout/BottomNav'
import { ShadowingExercise } from '@/components/muntlig/ShadowingExercise'
import { useFingerprint } from '@/hooks/useFingerprint'
import { useFingerprintStore } from '@/stores/fingerprint-store'
import type { Sentence } from '@/types/content'
import { markLaneDone } from '@/lib/lane-completion'
import type { ExerciseResult } from '@/types/session'
import { useAuth } from '@/hooks/useAuth'
import { logExerciseResult } from '@/lib/logEvents'

const SESSION_SIZE = 5

// Stable shuffle using Fisher-Yates so sentences differ each visit
// but remain predictable within a render pass.
function shuffleCopy<T>(arr: T[]): T[] {
  const copy = [...arr]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

interface ShadowingScreenProps {
  candidateSentences: Sentence[]
}

export function ShadowingScreen({ candidateSentences }: ShadowingScreenProps) {
  const router = useRouter()
  const { fingerprint, recordResult, recordSpeakingProduction } = useFingerprint()
  const { status } = useFingerprintStore()
  const { user } = useAuth()

  // Pick 5 sentences once per mount — stable via useMemo with no deps
  // (re-selecting only when fingerprint level is first known)
  const [levelKnown, setLevelKnown] = useState(false)

  useEffect(() => {
    if (status !== 'loading') setLevelKnown(true)
  }, [status])

  const currentLevel = fingerprint?.currentLevel ?? 'A1'

  // Pick 5 sentences AND track which level they actually came from, so the UI can
  // honestly disclose below-level content instead of substituting silently
  // (Operating Rule 6 — mirrors /listen + /roleplay). Cascade only to a concrete
  // lower level that has shadowable content; never a silent any-level mix.
  const { sentences, servedLevel } = useMemo<{ sentences: Sentence[]; servedLevel: string | null }>(() => {
    if (!levelKnown) return { sentences: [], servedLevel: null }
    const order = ['A1', 'A2', 'B1', 'B2']
    const idx = order.indexOf(currentLevel)
    for (let i = idx; i >= 0; i--) {
      const pool = candidateSentences.filter((s) => s.cefrLevel === order[i])
      if (pool.length > 0) {
        return { sentences: shuffleCopy(pool).slice(0, SESSION_SIZE), servedLevel: order[i] }
      }
    }
    return { sentences: [], servedLevel: null }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [levelKnown])

  const isBelowLevel = servedLevel !== null && servedLevel !== currentLevel

  const [currentIndex, setCurrentIndex] = useState(0)
  const [scores, setScores] = useState<number[]>([])
  const [phase, setPhase] = useState<'exercise' | 'complete'>('exercise')

  function handleSentenceComplete(matchScore: number, transcript: string) {
    const sentence = sentences[currentIndex]
    if (!sentence) return

    const conceptId = sentence.conceptIds[0] ?? 'pronunciation'
    const correct = matchScore >= 0.7

    const result: ExerciseResult = {
      sessionId: 'shadow-session',
      itemId: sentence.id,
      correct,
      userAnswer: transcript,
      correctAnswer: sentence.norwegian,
      timeTakenSeconds: 0,
      conceptId,
      sentenceId: sentence.id,
      // A low shadowing match is a recitation/pronunciation miss, NOT a
      // listening-recognition failure — the heuristic word-match score is not
      // an honest judge of a specific error category (Rule 8). Tagging it
      // 'listening-recognition' poisoned listening diagnosis + productionGap.
      // Leave errorTag undefined: mastery still updates from correct/incorrect,
      // but we no longer fabricate a listening error the learner didn't make.
      errorTag: undefined,
    }

    recordResult(result)
    // Shadowing IS spoken Norwegian — credit the speaking-minutes metric (this
    // was previously missing). Recitation, not free production: minutes only,
    // no production brick (produced:false), no mastery beyond recordResult above.
    recordSpeakingProduction({ minutes: 0.1, produced: false })
    if (user?.id) {
      logExerciseResult(user.id, result)
    }
    setScores((prev) => [...prev, matchScore])

    const nextIndex = currentIndex + 1
    if (nextIndex >= sentences.length) {
      markLaneDone('shadow')
      setPhase('complete')
    } else {
      setCurrentIndex(nextIndex)
    }
  }

  const averageScore =
    scores.length > 0
      ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 100)
      : 0

  // Loading state while fingerprint bootstraps
  if (!levelKnown || sentences.length === 0) {
    return (
      <div className="nc-gradient-page nc-secondary-flow flex min-h-dvh flex-col">
        <main className="nc-mobile-shell nc-flow-shell justify-center">
          <div className="flex flex-col items-center gap-3">
            <motion.div
              className="size-7 rounded-full border-2 border-[var(--nc-signal)] border-t-transparent"
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 0.8, ease: 'linear' }}
              aria-label="Laster…"
            />
            <p className="text-[0.8125rem] text-[var(--nc-text-muted)]">Laster setninger…</p>
          </div>
        </main>
        <BottomNav active="snakk" />
      </div>
    )
  }

  return (
    <div className="nc-gradient-page nc-secondary-flow flex min-h-dvh flex-col">
      <main className="nc-mobile-shell nc-flow-shell">
        <AnimatePresence mode="wait">

          {/* ── Exercise phase ── */}
          {phase === 'exercise' && sentences[currentIndex] ? (
            <motion.div
              key={`exercise-${currentIndex}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col gap-3"
            >
              {/* Lime hero header */}
              <div className="nc-signal-panel p-3">
                <div className="text-[9px] font-bold uppercase tracking-[0.12em] text-[rgba(10,18,6,0.48)]">Muntlig</div>
                <h1 className="mt-1 text-balance text-[1.35rem] font-extrabold leading-none text-[var(--nc-signal-fg)]">
                  Uttalelab
                </h1>
                <p className="mt-1 text-[0.78rem] leading-[1.5] text-[rgba(10,18,6,0.62)]">
                  Lytt til norske setninger og gjenta dem. Appen sjekker hvilke ord du fikk med deg.
                </p>

                {/* Feature chips — dark inset on lime */}
                <div className="mt-2.5 flex flex-wrap gap-1.5">
                  {['Skygging', 'Selvavspilling', 'Ordgjenkjenning'].map((chip) => (
                    <span
                      key={chip}
                      className="rounded-full bg-[rgba(6,16,23,0.12)] px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.08em] text-[rgba(6,16,23,0.62)]"
                    >
                      {chip}
                    </span>
                  ))}
                </div>
              </div>

              {/* Progress strip — cream */}
              <div className="flex items-center justify-between rounded-[0.5rem] border border-[rgba(17,21,24,0.06)] bg-[var(--nc-cream)] px-3 py-2">
                <span className="text-[9px] font-bold uppercase tracking-[0.12em] text-[var(--nc-cream-dim)]">Fremgang</span>
                <div className="flex items-center gap-2">
                  <div className="h-1 w-16 overflow-hidden rounded-full bg-[rgba(17,21,24,0.10)]">
                    <div
                      className="h-full rounded-full bg-[var(--nc-signal-ink)] shadow-[0_0_6px_rgba(90,138,0,0.3)]"
                      style={{ width: `${(currentIndex / sentences.length) * 100}%`, transition: 'width 0.4s ease' }}
                    />
                  </div>
                  <span className="text-[0.78rem] font-bold tabular-nums text-[var(--nc-cream-text)]">
                    {currentIndex + 1} / {sentences.length}
                  </span>
                </div>
              </div>

              {/* Honest below-level disclosure (Rule 6 — no silent substitution) */}
              {isBelowLevel ? (
                <div className="rounded-[0.5rem] border border-[var(--nc-border)] bg-[rgba(255,255,255,0.04)] px-3 py-2 text-[10px] leading-snug text-[var(--nc-text-dim)]">
                  Skyggeøvelser på {servedLevel}-nivå — egne {currentLevel}-øvelser kommer.
                </div>
              ) : null}

              <ShadowingExercise
                sentence={sentences[currentIndex]}
                index={currentIndex}
                total={sentences.length}
                onComplete={handleSentenceComplete}
              />
            </motion.div>
          ) : null}

          {/* ── Completion screen ── */}
          {phase === 'complete' ? (
            <motion.div
              key="complete"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="flex flex-1 flex-col justify-center gap-3"
            >
              {/* Lime completion panel */}
              <div className="nc-signal-panel p-4 text-center">
                <div className="text-[9px] font-bold uppercase tracking-[0.12em] text-[rgba(10,18,6,0.48)]">Skygging fullført</div>
                <h2 className="mt-2 text-balance text-[1.75rem] font-extrabold leading-[0.96] text-[var(--nc-signal-fg)]">
                  Bra jobbet!
                </h2>

                {/* Score inset — dark on lime */}
                <div className="mt-4 rounded-[0.5rem] bg-[rgba(6,16,23,0.94)] p-4 text-white">
                  <div
                    className="text-[2.75rem] font-extrabold tabular-nums leading-none"
                    style={{ color: averageScore >= 70 ? 'var(--nc-signal)' : 'var(--nc-red)' }}
                  >
                    {averageScore}%
                  </div>
                  <p className="mt-1.5 text-[0.78rem] text-[rgba(255,255,255,0.55)]">gjennomsnittlig nøyaktighet</p>

                  {/* Per-sentence bar */}
                  <div className="mt-3 flex w-full gap-1.5">
                    {scores.map((score, i) => (
                      <div
                        key={i}
                        className="h-1.5 flex-1 rounded-full"
                        style={{
                          background: score >= 0.7 ? 'var(--nc-signal)' : 'rgba(255,106,85,0.65)',
                        }}
                        title={`Setning ${i + 1}: ${Math.round(score * 100)}%`}
                        aria-label={`Setning ${i + 1}: ${Math.round(score * 100)} prosent`}
                      />
                    ))}
                  </div>
                </div>

                <p className="mt-3 text-pretty text-[0.8125rem] text-[rgba(10,18,6,0.62)]">
                  {averageScore >= 70
                    ? 'Fremgangen din er registrert. Fortsett å øve for å bygge flyt.'
                    : 'Øvelse gjør mester. Prøv igjen i morgen for å se fremgang.'}
                </p>
              </div>

              <button
                onClick={() => router.push('/dashboard')}
                aria-label="Tilbake til dashboard"
                className="nc-button-primary w-full py-3.5 text-[0.875rem] font-bold"
              >
                Tilbake til dashboard
              </button>
            </motion.div>
          ) : null}

        </AnimatePresence>
      </main>

      <BottomNav active="snakk" />
    </div>
  )
}
