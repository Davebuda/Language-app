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
  const { fingerprint, recordResult } = useFingerprint()
  const { status } = useFingerprintStore()
  const { user } = useAuth()

  // Pick 5 sentences once per mount — stable via useMemo with no deps
  // (re-selecting only when fingerprint level is first known)
  const [levelKnown, setLevelKnown] = useState(false)

  useEffect(() => {
    if (status !== 'loading') setLevelKnown(true)
  }, [status])

  const sentences = useMemo<Sentence[]>(() => {
    if (!levelKnown) return []
    const level = fingerprint?.currentLevel ?? 'A1'

    // Prefer sentences matching the learner's level; cascade to next-lower level if empty
    const levelMatch = candidateSentences.filter((s) => s.cefrLevel === level)
    const pool = levelMatch.length > 0 ? levelMatch : candidateSentences.filter(s => {
      const fallbacks: Record<string, string[]> = { B2: ['B1','A2'], B1: ['A2'], A2: ['A1'], A1: [] }
      return (fallbacks[level] || []).includes(s.cefrLevel)
    })
    const sessionPool = pool.length > 0 ? pool : candidateSentences

    return shuffleCopy(sessionPool).slice(0, SESSION_SIZE)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [levelKnown])

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
      errorTag: correct ? undefined : 'listening-recognition',
    }

    recordResult(result)
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
      <div className="nc-gradient-page flex flex-col min-h-dvh">
        <main className="relative z-10 mx-auto flex w-full max-w-lg flex-1 flex-col justify-center gap-4 px-5 pb-24 pt-5">
          <div className="flex flex-col items-center gap-3">
            <motion.div
              className="size-8 rounded-full border-2 border-[var(--nc-red)] border-t-transparent"
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 0.8, ease: 'linear' }}
              aria-label="Laster…"
            />
            <p className="text-pretty text-[0.8125rem] text-[var(--nc-text-muted)]">Laster setninger…</p>
          </div>
        </main>
        <BottomNav active="home" />
      </div>
    )
  }

  return (
    <div className="nc-gradient-page flex flex-col min-h-dvh">
      <main className="relative z-10 mx-auto flex w-full max-w-lg flex-1 flex-col px-5 pb-24 pt-5">
        <AnimatePresence mode="wait">

          {/* ── Exercise phase ── */}
          {phase === 'exercise' && sentences[currentIndex] && (
            <motion.div
              key={`exercise-${currentIndex}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col gap-4 pt-4"
            >
              {/* Page header */}
              <div className="mb-2">
                <h1 className="text-balance text-[1.375rem] font-extrabold text-[var(--nc-text)]">
                  Uttalelab
                </h1>
                <p className="text-pretty mt-0.5 text-[0.8125rem] text-[var(--nc-text-muted)]">
                  Lytt til norske setninger og gjenta dem. Appen sjekker hvilke ord du fikk med deg.
                </p>
              </div>

              {/* Feature chips */}
              <div className="flex flex-wrap gap-2">
                {['Skygging', 'Selvavspilling', 'Ordgjenkjenning'].map((chip) => (
                  <span
                    key={chip}
                    className="nc-glass rounded-full px-3 py-1 text-[0.6875rem] font-semibold text-[var(--nc-text-dim)]"
                  >
                    {chip}
                  </span>
                ))}
              </div>

              <ShadowingExercise
                sentence={sentences[currentIndex]}
                index={currentIndex}
                total={sentences.length}
                onComplete={handleSentenceComplete}
              />
            </motion.div>
          )}

          {/* ── Completion screen ── */}
          {phase === 'complete' && (
            <motion.div
              key="complete"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="flex flex-1 flex-col items-center justify-center gap-6 py-12"
            >
              <div className="nc-glass-elevated w-full p-8 text-center flex flex-col items-center gap-5">
                <div className="nc-label">Skygging fullført</div>

                <h2 className="text-balance text-[1.75rem] font-extrabold text-[var(--nc-text)]">
                  Bra jobbet!
                </h2>

                {/* Accuracy ring */}
                <div className="flex flex-col items-center gap-1">
                  <span
                    className="text-[3rem] font-extrabold tabular-nums leading-none"
                    style={{ color: averageScore >= 70 ? 'var(--nc-green)' : 'var(--nc-red)' }}
                  >
                    {averageScore}%
                  </span>
                  <p className="text-pretty text-[0.8125rem] text-[var(--nc-text-muted)]">gjennomsnittlig nøyaktighet</p>
                </div>

                {/* Per-sentence breakdown */}
                <div className="flex w-full gap-1.5">
                  {scores.map((score, i) => (
                    <div
                      key={i}
                      className="flex-1 rounded-full h-2"
                      style={{
                        background: score >= 0.7
                          ? 'var(--nc-green)'
                          : 'rgba(220,38,38,0.55)',
                      }}
                      title={`Setning ${i + 1}: ${Math.round(score * 100)}%`}
                      aria-label={`Setning ${i + 1}: ${Math.round(score * 100)} prosent`}
                    />
                  ))}
                </div>

                <p className="text-pretty text-[0.875rem] text-[var(--nc-text-muted)]">
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
          )}
        </AnimatePresence>
      </main>

      <BottomNav active="home" />
    </div>
  )
}
