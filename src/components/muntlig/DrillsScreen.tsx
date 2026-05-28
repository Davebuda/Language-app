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
  index: number
}

function DrillSetCard({ drillSet, onSelect, index }: DrillSetCardProps) {
  const isEven = index % 2 === 0

  return (
    <motion.button
      onClick={() => onSelect(drillSet)}
      aria-label={`Velg øvelse: ${drillSet.targetSound}`}
      className={
        isEven
          ? 'w-full overflow-hidden rounded-[0.65rem] border border-[var(--nc-border)] bg-[var(--nc-card)] p-4 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--nc-signal)]'
          : 'w-full overflow-hidden rounded-[0.65rem] border border-[rgba(17,21,24,0.06)] bg-[var(--nc-cream)] p-4 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--nc-signal)]'
      }
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
      transition={{ duration: 0.15 }}
    >
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className={`text-[9px] font-bold uppercase tracking-[0.12em] ${isEven ? 'text-[var(--nc-text-dim)]' : 'text-[var(--nc-cream-dim)]'}`}>
            {drillSet.targetSound}
          </span>
          <span className={`text-[0.72rem] tabular-nums ${isEven ? 'text-[var(--nc-text-dim)]' : 'text-[var(--nc-cream-dim)]'}`}>
            {drillSet.words.length} ord
          </span>
        </div>
        <p className={`text-pretty text-[0.84rem] leading-[1.5] ${isEven ? 'text-[var(--nc-text-muted)]' : 'text-[var(--nc-cream-muted)]'}`}>
          {drillSet.description}
        </p>
        {/* Preview phoneme chips */}
        <div className="flex flex-wrap gap-1.5">
          {drillSet.words.slice(0, 3).map((w) => (
            <span
              key={w.norwegian}
              className={`rounded-full px-2.5 py-0.5 text-[0.6875rem] font-semibold ${isEven ? 'text-[var(--nc-text)]' : 'text-[var(--nc-cream-text)]'}`}
              style={
                isEven
                  ? { background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.10)' }
                  : { background: 'rgba(17,21,24,0.06)', border: '1px solid rgba(17,21,24,0.10)' }
              }
            >
              {w.norwegian}
            </span>
          ))}
          {drillSet.words.length > 3 && (
            <span
              className={`rounded-full px-2.5 py-0.5 text-[0.6875rem] ${isEven ? 'text-[var(--nc-text-dim)]' : 'text-[var(--nc-cream-dim)]'}`}
              style={
                isEven
                  ? { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }
                  : { background: 'rgba(17,21,24,0.04)', border: '1px solid rgba(17,21,24,0.07)' }
              }
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
    <div className="nc-gradient-page nc-secondary-flow flex min-h-dvh flex-col">
      <main className="nc-mobile-shell nc-flow-shell">
        <AnimatePresence mode="wait">

          {/* ── Set selection ── */}
          {screenPhase === 'selection' ? (
            <motion.div
              key="selection"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col gap-3"
            >
              {/* Lime hero */}
              <div className="nc-signal-panel p-3">
                <div className="text-[9px] font-bold uppercase tracking-[0.12em] text-[rgba(10,18,6,0.48)]">Muntlig</div>
                <h1 className="mt-1 text-balance text-[1.35rem] font-extrabold leading-none text-[var(--nc-signal-fg)]">
                  Uttaleøvelser
                </h1>
                <p className="mt-1 text-[0.78rem] leading-[1.5] text-[rgba(10,18,6,0.62)]">
                  Velg en lydtype og øv deg på ord som er vanskelige for engelsktalende.
                </p>

                {/* Feature chips — dark inset on lime */}
                <div className="mt-2.5 flex flex-wrap gap-1.5">
                  {['Målrettet', 'Heuristikk', 'Fingeravtrykk'].map((chip) => (
                    <span
                      key={chip}
                      className="rounded-full bg-[rgba(6,16,23,0.12)] px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.08em] text-[rgba(6,16,23,0.62)]"
                    >
                      {chip}
                    </span>
                  ))}
                </div>
              </div>

              {/* Count strip — cream */}
              <div className="flex items-center justify-between rounded-[0.5rem] border border-[rgba(17,21,24,0.06)] bg-[var(--nc-cream)] px-3 py-2">
                <span className="text-[9px] font-bold uppercase tracking-[0.12em] text-[var(--nc-cream-dim)]">Lydgrupper</span>
                <span className="text-[0.82rem] font-bold tabular-nums text-[var(--nc-cream-text)]">{DRILL_SETS.length} sett</span>
              </div>

              {/* Drill set cards — dark/cream alternation */}
              <div className="flex flex-col gap-2">
                {DRILL_SETS.map((drillSet, i) => (
                  <motion.div
                    key={drillSet.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.22, delay: i * 0.06 }}
                  >
                    <DrillSetCard
                      drillSet={drillSet}
                      onSelect={handleSelectDrillSet}
                      index={i}
                    />
                  </motion.div>
                ))}
              </div>
            </motion.div>
          ) : null}

          {/* ── Drilling ── */}
          {screenPhase === 'drilling' && activeDrillSet && activeDrillSet.words[currentWordIndex] ? (
            <motion.div
              key={`drilling-${activeDrillSet.id}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col gap-3"
            >
              {/* Drill header — lime */}
              <div className="nc-signal-panel p-3">
                <div className="text-[9px] font-bold uppercase tracking-[0.12em] text-[rgba(10,18,6,0.48)]">Uttaleøvelse</div>
                <div className="mt-1 flex items-center justify-between gap-2">
                  <span className="text-[0.9375rem] font-extrabold leading-none text-[var(--nc-signal-fg)]">
                    {activeDrillSet.targetSound}
                  </span>
                  <span className="rounded-full bg-[rgba(6,16,23,0.90)] px-2.5 py-0.5 text-[10px] font-bold tabular-nums text-white">
                    {currentWordIndex + 1} / {activeDrillSet.words.length}
                  </span>
                </div>
                <p className="mt-1 text-[0.75rem] leading-[1.4] text-[rgba(10,18,6,0.58)]">
                  {activeDrillSet.description}
                </p>
                {/* Progress bar */}
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[rgba(6,16,23,0.14)]">
                  <motion.div
                    className="h-full origin-left rounded-full bg-[rgba(6,16,23,0.82)]"
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: currentWordIndex / activeDrillSet.words.length }}
                    transition={{ duration: 0.4, ease: 'easeOut' }}
                  />
                </div>
              </div>

              <DrillExercise
                word={activeDrillSet.words[currentWordIndex]}
                index={currentWordIndex}
                total={activeDrillSet.words.length}
                onComplete={handleWordComplete}
              />
            </motion.div>
          ) : null}

          {/* ── Completion ── */}
          {screenPhase === 'complete' && activeDrillSet ? (
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
                <div className="text-[9px] font-bold uppercase tracking-[0.12em] text-[rgba(10,18,6,0.48)]">Øvelse fullført</div>
                <h2 className="mt-2 text-balance text-[1.75rem] font-extrabold leading-[0.96] text-[var(--nc-signal-fg)]">
                  {passedCount === totalCount ? 'Perfekt!' : 'Bra jobbet!'}
                </h2>

                {/* Score inset — dark on lime */}
                <div className="mt-4 rounded-[0.5rem] bg-[rgba(6,16,23,0.94)] p-4 text-white">
                  <div
                    className="text-[2.75rem] font-extrabold tabular-nums leading-none"
                    style={{
                      color: passedCount >= Math.ceil(totalCount / 2)
                        ? 'var(--nc-signal)'
                        : 'var(--nc-red)',
                    }}
                  >
                    {passedCount}/{totalCount}
                  </div>
                  <p className="mt-1.5 text-[0.78rem] text-[rgba(255,255,255,0.55)]">
                    ord riktig uttalt
                  </p>

                  {/* Per-word breakdown */}
                  <div className="mt-3 flex w-full gap-1.5">
                    {scores.map((score, i) => (
                      <div
                        key={i}
                        className="h-1.5 flex-1 rounded-full"
                        style={{
                          background: score >= 0.7
                            ? 'var(--nc-signal)'
                            : 'rgba(255,106,85,0.65)',
                        }}
                        title={`Ord ${i + 1}: ${Math.round(score * 100)}%`}
                        aria-label={`Ord ${i + 1}: ${Math.round(score * 100)} prosent`}
                      />
                    ))}
                  </div>
                </div>

                <p className="mt-3 text-pretty text-[0.8125rem] text-[rgba(10,18,6,0.62)]">
                  {passedCount === totalCount
                    ? 'Fremragende! Fremgangen er registrert i fingeravtrykket ditt.'
                    : passedCount >= Math.ceil(totalCount / 2)
                      ? 'Bra fremgang. Gjenta øvelsen for å bygge muskelminne.'
                      : 'Disse lydene er vanskelige — prøv igjen etter litt hvile.'}
                </p>
              </div>

              <div className="flex w-full flex-col gap-2">
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
                  className="nc-button-dark w-full rounded-[var(--radius)] py-3 text-[0.875rem] font-semibold"
                >
                  Tilbake til dashboard
                </button>
              </div>
            </motion.div>
          ) : null}

        </AnimatePresence>
      </main>

      <BottomNav active="home" />
    </div>
  )
}
