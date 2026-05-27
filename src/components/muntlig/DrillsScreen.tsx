'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { BottomNav } from '@/components/layout/BottomNav'
import { DrillExercise } from '@/components/muntlig/DrillExercise'
import { useFingerprint } from '@/hooks/useFingerprint'
import { DRILL_SETS } from '@/lib/drillContent'
import type { DrillSet } from '@/lib/drillContent'
import { markLaneDone } from '@/lib/lane-completion'
import type { ExerciseResult } from '@/types/session'
import { useAuth } from '@/hooks/useAuth'
import { logExerciseResult } from '@/lib/logEvents'

// ── Drill-set selection card ──────────────────────────────────────────────────

interface DrillSetCardProps {
  drillSet: DrillSet
  onSelect: (drillSet: DrillSet) => void
}

function DrillSetCard({ drillSet, onSelect }: DrillSetCardProps) {
  return (
    <motion.button
      onClick={() => onSelect(drillSet)}
      aria-label={`Velg øvelse: ${drillSet.targetSound}`}
      className="nc-glass w-full rounded-xl p-5 text-left transition-colors hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--nc-red)]"
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
      transition={{ duration: 0.15 }}
    >
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="nc-label">{drillSet.targetSound}</span>
          <span className="text-[0.6875rem] text-[var(--nc-text-dim)]">
            {drillSet.words.length} ord
          </span>
        </div>
        <p className="text-pretty text-[0.875rem] text-[var(--nc-text-muted)]">
          {drillSet.description}
        </p>
        {/* Preview phoneme chips */}
        <div className="flex flex-wrap gap-1.5 mt-1">
          {drillSet.words.slice(0, 3).map((w) => (
            <span
              key={w.norwegian}
              className="rounded-full px-2.5 py-0.5 text-[0.6875rem] font-semibold text-[var(--nc-text)]"
              style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)' }}
            >
              {w.norwegian}
            </span>
          ))}
          {drillSet.words.length > 3 && (
            <span
              className="rounded-full px-2.5 py-0.5 text-[0.6875rem] text-[var(--nc-text-dim)]"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}
            >
              +{drillSet.words.length - 3}
            </span>
          )}
        </div>
      </div>
    </motion.button>
  )
}

// ── Main DrillsScreen ────────────────────────────────────────────────────────

type ScreenPhase = 'selection' | 'drilling' | 'complete'

export function DrillsScreen() {
  const router = useRouter()
  const { recordResult } = useFingerprint()
  const { user } = useAuth()

  const [screenPhase, setScreenPhase] = useState<ScreenPhase>('selection')
  const [activeDrillSet, setActiveDrillSet] = useState<DrillSet | null>(null)
  const [currentWordIndex, setCurrentWordIndex] = useState(0)
  const [scores, setScores] = useState<number[]>([])

  function handleSelectDrillSet(drillSet: DrillSet) {
    setActiveDrillSet(drillSet)
    setCurrentWordIndex(0)
    setScores([])
    setScreenPhase('drilling')
  }

  function handleWordComplete(matchScore: number, transcript: string) {
    if (!activeDrillSet) return

    const word = activeDrillSet.words[currentWordIndex]
    if (!word) return

    const correct = matchScore >= 0.7

    const result: ExerciseResult = {
      sessionId: `drill-${activeDrillSet.id}`,
      itemId: `${activeDrillSet.id}-${word.norwegian}`,
      correct,
      userAnswer: transcript,
      correctAnswer: word.norwegian,
      timeTakenSeconds: 0,
      conceptId: activeDrillSet.conceptId ?? 'pronunciation',
      sentenceId: undefined,
      errorTag: correct ? undefined : 'listening-recognition',
    }

    recordResult(result)
    if (user?.id) {
      logExerciseResult(user.id, result)
    }
    setScores((prev) => [...prev, matchScore])

    const nextIndex = currentWordIndex + 1
    if (nextIndex >= activeDrillSet.words.length) {
      markLaneDone('drills')
      setScreenPhase('complete')
    } else {
      setCurrentWordIndex(nextIndex)
    }
  }

  function handleTryAnother() {
    setActiveDrillSet(null)
    setCurrentWordIndex(0)
    setScores([])
    setScreenPhase('selection')
  }

  const passedCount = scores.filter((s) => s >= 0.7).length
  const totalCount = scores.length

  return (
    <div className="nc-gradient-page flex flex-col min-h-dvh">
      <main className="relative z-10 mx-auto flex w-full max-w-lg flex-1 flex-col px-5 pb-24 pt-5">
        <AnimatePresence mode="wait">

          {/* ── Set selection ── */}
          {screenPhase === 'selection' && (
            <motion.div
              key="selection"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col gap-4 pt-4"
            >
              {/* Page header */}
              <div className="mb-2">
                <h1 className="text-balance text-[1.375rem] font-extrabold text-[var(--nc-text)]">
                  Uttaleøvelser
                </h1>
                <p className="text-pretty mt-0.5 text-[0.8125rem] text-[var(--nc-text-muted)]">
                  Velg en lydtype og øv deg på ord som er vanskelige for engelsktalende.
                </p>
              </div>

              {/* Feature chips */}
              <div className="flex flex-wrap gap-2">
                {['Målrettet', 'Heuristikk', 'Fingeravtrykk'].map((chip) => (
                  <span
                    key={chip}
                    className="nc-glass rounded-full px-3 py-1 text-[0.6875rem] font-semibold text-[var(--nc-text-dim)]"
                  >
                    {chip}
                  </span>
                ))}
              </div>

              {/* Drill set cards */}
              <div className="flex flex-col gap-3">
                {DRILL_SETS.map((drillSet, i) => (
                  <motion.div
                    key={drillSet.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.22, delay: i * 0.06 }}
                  >
                    <DrillSetCard
                      drillSet={drillSet}
                      onSelect={handleSelectDrillSet}
                    />
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}

          {/* ── Drilling ── */}
          {screenPhase === 'drilling' && activeDrillSet && activeDrillSet.words[currentWordIndex] && (
            <motion.div
              key={`drilling-${activeDrillSet.id}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col gap-4 pt-4"
            >
              {/* Drill header */}
              <div className="mb-2">
                <h1 className="text-balance text-[1.375rem] font-extrabold text-[var(--nc-text)]">
                  {activeDrillSet.targetSound}
                </h1>
                <p className="text-pretty mt-0.5 text-[0.8125rem] text-[var(--nc-text-muted)]">
                  {activeDrillSet.description}
                </p>
              </div>

              <DrillExercise
                word={activeDrillSet.words[currentWordIndex]}
                index={currentWordIndex}
                total={activeDrillSet.words.length}
                onComplete={handleWordComplete}
              />
            </motion.div>
          )}

          {/* ── Completion ── */}
          {screenPhase === 'complete' && activeDrillSet && (
            <motion.div
              key="complete"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="flex flex-1 flex-col items-center justify-center gap-6 py-12"
            >
              <div className="nc-glass-elevated w-full p-8 text-center flex flex-col items-center gap-5">
                <div className="nc-label">Øvelse fullført</div>

                <h2 className="text-balance text-[1.75rem] font-extrabold text-[var(--nc-text)]">
                  {passedCount === totalCount ? 'Perfekt!' : 'Bra jobbet!'}
                </h2>

                {/* Pass / fail count */}
                <div className="flex flex-col items-center gap-1">
                  <span
                    className="text-[3rem] font-extrabold tabular-nums leading-none"
                    style={{
                      color: passedCount >= Math.ceil(totalCount / 2)
                        ? 'var(--nc-green)'
                        : 'var(--nc-red)',
                    }}
                  >
                    {passedCount}/{totalCount}
                  </span>
                  <p className="text-pretty text-[0.8125rem] text-[var(--nc-text-muted)]">
                    ord riktig uttalt
                  </p>
                </div>

                {/* Per-word breakdown */}
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
                      title={`Ord ${i + 1}: ${Math.round(score * 100)}%`}
                      aria-label={`Ord ${i + 1}: ${Math.round(score * 100)} prosent`}
                    />
                  ))}
                </div>

                <p className="text-pretty text-[0.875rem] text-[var(--nc-text-muted)]">
                  {passedCount === totalCount
                    ? 'Fremragende! Fremgangen er registrert i fingeravtrykket ditt.'
                    : passedCount >= Math.ceil(totalCount / 2)
                      ? 'Bra fremgang. Gjenta øvelsen for å bygge muskelminne.'
                      : 'Disse lydene er vanskelige — prøv igjen etter litt hvile.'}
                </p>
              </div>

              <div className="flex w-full flex-col gap-3">
                <button
                  onClick={handleTryAnother}
                  aria-label="Prøv et annet sett"
                  className="nc-button-primary w-full py-3.5 text-[0.875rem] font-bold"
                >
                  Prøv et annet sett
                </button>

                <button
                  onClick={() => router.push('/dashboard')}
                  aria-label="Tilbake til dashboard"
                  className="nc-button-dark w-full py-3 text-[0.875rem] font-semibold"
                >
                  Tilbake til dashboard
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <BottomNav active="home" />
    </div>
  )
}
