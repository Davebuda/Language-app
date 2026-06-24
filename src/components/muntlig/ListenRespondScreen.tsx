'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { BottomNav } from '@/components/layout/BottomNav'
import { ListenRespondExercise } from '@/components/muntlig/ListenRespondExercise'
import { useFingerprint } from '@/hooks/useFingerprint'
import { useFingerprintStore } from '@/stores/fingerprint-store'
import { getListenQuestions, getListenContentLevel } from '@/lib/listenRespondContent'
import type { ListenRespondQuestion } from '@/lib/listenRespondContent'
import { markLaneDone } from '@/lib/lane-completion'
import { saveFingerprint } from '@/storage/indexeddb'
import type { ExerciseResult } from '@/types/session'
import { useAuth } from '@/hooks/useAuth'
import { logExerciseResult } from '@/lib/logEvents'

// ── Question selection card ───────────────────────────────────────────────────

interface QuestionCardProps {
  question: ListenRespondQuestion
  onSelect: (question: ListenRespondQuestion) => void
  index: number
}

function QuestionCard({ question, onSelect, index }: QuestionCardProps) {
  const isEven = index % 2 === 0

  return (
    <motion.button
      onClick={() => onSelect(question)}
      aria-label={`Velg spørsmål: ${question.question}`}
      className={
        isEven
          ? 'w-full overflow-hidden rounded-[0.65rem] border border-[var(--nc-border)] bg-[var(--nc-card)] p-3.5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--nc-signal)]'
          : 'w-full overflow-hidden rounded-[0.65rem] border border-[rgba(17,21,24,0.06)] bg-[var(--nc-cream)] p-3.5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--nc-signal)]'
      }
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
      transition={{ duration: 0.15 }}
    >
      <div className="flex flex-col gap-1">
        <p className={`text-[0.9375rem] font-bold leading-snug ${isEven ? 'text-[var(--nc-text)]' : 'text-[var(--nc-cream-text)]'}`}>
          {question.question}
        </p>
        <p className={`text-pretty text-[0.78rem] leading-[1.5] ${isEven ? 'text-[var(--nc-text-muted)]' : 'text-[var(--nc-cream-muted)]'}`}>
          {question.questionEnglish}
        </p>
      </div>
    </motion.button>
  )
}

// ── Score record ─────────────────────────────────────────────────────────────

interface ScoreRecord {
  questionId: string
  correct: boolean
  skipped: boolean
}

// ── Main ListenRespondScreen ──────────────────────────────────────────────────

type ScreenPhase = 'selection' | 'exercising' | 'complete'

export function ListenRespondScreen() {
  const router = useRouter()
  const { recordResult } = useFingerprint()
  const { fingerprint, setFingerprint } = useFingerprintStore()
  const { user } = useAuth()

  const [screenPhase, setScreenPhase] = useState<ScreenPhase>('selection')
  const [activeQuestion, setActiveQuestion] = useState<ListenRespondQuestion | null>(null)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [scores, setScores] = useState<ScoreRecord[]>([])

  const currentLevel = fingerprint?.currentLevel ?? 'A1'
  const levelQuestions = getListenQuestions(currentLevel)
  // Honest disclosure (Rule 6): A2 has no dedicated questions and reuses A1's —
  // surface that instead of substituting silently.
  const listenContentLevel = getListenContentLevel(currentLevel)
  const isBelowLevelListen = listenContentLevel !== currentLevel
  const focusSet = new Set(fingerprint?.weeklyFocus ?? [])
  const sortedQuestions = [...levelQuestions].sort((a, b) => {
    const aFocus = focusSet.has(a.conceptId) ? 0 : 1
    const bFocus = focusSet.has(b.conceptId) ? 0 : 1
    return aFocus - bFocus
  })

  function handleSelectQuestion(question: ListenRespondQuestion) {
    setActiveQuestion(question)
    setCurrentIndex(0)
    setScores([])
    setScreenPhase('exercising')
  }

  function handleQuestionComplete(correct: boolean, transcript: string, skipped: boolean) {
    if (!activeQuestion) return

    // Record to fingerprint engine (skip recording if user skipped with no input)
    if (!skipped) {
      const result: ExerciseResult = {
        sessionId: 'listen-respond',
        itemId: `listen-respond-${activeQuestion.id}`,
        correct,
        userAnswer: transcript,
        correctAnswer: activeQuestion.expectedKeywords.join(', '),
        timeTakenSeconds: 5,
        conceptId: activeQuestion.conceptId,
        sentenceId: undefined,
        errorTag: correct ? undefined : activeQuestion.errorTag,
      }
      recordResult(result)
      if (user?.id) {
        logExerciseResult(user.id, result)
      }
    }

    const newScores: ScoreRecord[] = [
      ...scores,
      { questionId: activeQuestion.id, correct, skipped },
    ]
    setScores(newScores)

    const nextIndex = currentIndex + 1
    if (nextIndex >= sortedQuestions.length) {
      if (fingerprint) {
        const answeredCount = newScores.filter((s) => !s.skipped).length
        const minutesSpoken = answeredCount * (5 / 60)
        const updated = {
          ...fingerprint,
          speakingMinutesTotal: (fingerprint.speakingMinutesTotal ?? 0) + minutesSpoken,
          updatedAt: new Date().toISOString(),
        }
        setFingerprint(updated)
        saveFingerprint(updated).catch(console.warn)
      }
      markLaneDone('listen')
      setScreenPhase('complete')
    } else {
      setCurrentIndex(nextIndex)
      setActiveQuestion(sortedQuestions[nextIndex] ?? null)
    }
  }

  function handleTryAnother() {
    setActiveQuestion(null)
    setCurrentIndex(0)
    setScores([])
    setScreenPhase('selection')
  }

  const passedCount = scores.filter((s) => s.correct).length
  const totalAnswered = scores.length

  return (
    <div className="nc-gradient-page nc-secondary-flow flex min-h-dvh flex-col">
      <main className="nc-mobile-shell nc-flow-shell">
        <AnimatePresence mode="wait">

          {/* ── Question selection ── */}
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
                  Lytt og svar
                </h1>
                <p className="mt-1 text-[0.78rem] leading-[1.5] text-[rgba(10,18,6,0.62)]">
                  Spørsmål vises på norsk. Du har 5 sekunder til å svare muntlig.
                </p>

                {/* Feature chips — dark inset on lime */}
                <div className="mt-2.5 flex flex-wrap gap-1.5">
                  {['Tidsbegrenset', 'Talegjenkjenning', 'Fingeravtrykk'].map((chip) => (
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
                <span className="text-[9px] font-bold uppercase tracking-[0.12em] text-[var(--nc-cream-dim)]">Spørsmål</span>
                <span className="text-[0.82rem] font-bold tabular-nums text-[var(--nc-cream-text)]">{sortedQuestions.length} tilgjengelig</span>
              </div>

              {/* Honest below-level disclosure (Rule 6 — no silent substitution) */}
              {isBelowLevelListen ? (
                <div className="rounded-[0.5rem] border border-[var(--nc-border)] bg-[rgba(255,255,255,0.04)] px-3 py-2 text-[10px] leading-snug text-[var(--nc-text-dim)]">
                  Lytteøvelser på {listenContentLevel}-nivå — egne {currentLevel}-øvelser kommer.
                </div>
              ) : null}

              {/* Question list — dark/cream alternation */}
              <div className="flex flex-col gap-2">
                {sortedQuestions.map((q, i) => (
                  <motion.div
                    key={q.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.22, delay: i * 0.05 }}
                  >
                    <QuestionCard question={q} onSelect={handleSelectQuestion} index={i} />
                  </motion.div>
                ))}
              </div>
            </motion.div>
          ) : null}

          {/* ── Exercising ── */}
          {screenPhase === 'exercising' && activeQuestion ? (
            <motion.div
              key={`exercising-${activeQuestion.id}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col gap-3"
            >
              {/* Exercise header — lime */}
              <div className="nc-signal-panel p-3">
                <div className="text-[9px] font-bold uppercase tracking-[0.12em] text-[rgba(10,18,6,0.48)]">Lytt og svar</div>
                <div className="mt-1 flex items-center justify-between gap-2">
                  <span className="text-[0.84rem] font-bold text-[var(--nc-signal-fg)]">Svar på norsk</span>
                  <span className="rounded-full bg-[rgba(6,16,23,0.90)] px-2.5 py-0.5 text-[10px] font-bold tabular-nums text-white">
                    {currentIndex + 1} / {sortedQuestions.length}
                  </span>
                </div>
                {/* Progress bar */}
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[rgba(6,16,23,0.14)]">
                  <motion.div
                    className="h-full origin-left rounded-full bg-[rgba(6,16,23,0.82)]"
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: currentIndex / sortedQuestions.length }}
                    transition={{ duration: 0.4, ease: 'easeOut' }}
                  />
                </div>
              </div>

              <ListenRespondExercise
                question={activeQuestion}
                index={currentIndex}
                total={levelQuestions.length}
                onComplete={handleQuestionComplete}
              />
            </motion.div>
          ) : null}

          {/* ── Complete ── */}
          {screenPhase === 'complete' ? (
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
                  {passedCount === totalAnswered ? 'Imponerende!' : 'Bra jobbet!'}
                </h2>

                {/* Score inset — dark on lime */}
                <div className="mt-4 rounded-[0.5rem] bg-[rgba(6,16,23,0.94)] p-4 text-white">
                  <div
                    className="text-[2.75rem] font-extrabold tabular-nums leading-none"
                    style={{
                      color: passedCount >= Math.ceil(totalAnswered / 2)
                        ? 'var(--nc-signal)'
                        : 'var(--nc-red)',
                    }}
                  >
                    {passedCount}/{totalAnswered}
                  </div>
                  <p className="mt-1.5 text-[0.78rem] text-[rgba(255,255,255,0.55)]">
                    spørsmål besvart riktig
                  </p>

                  {/* Per-question breakdown bar */}
                  <div className="mt-3 flex w-full gap-1.5">
                    {scores.map((s, i) => (
                      <div
                        key={i}
                        className="h-1.5 flex-1 rounded-full"
                        style={{
                          background: s.skipped
                            ? 'rgba(255,255,255,0.12)'
                            : s.correct
                              ? 'var(--nc-signal)'
                              : 'rgba(255,106,85,0.65)',
                        }}
                        title={`Spørsmål ${i + 1}: ${s.skipped ? 'hoppet over' : s.correct ? 'riktig' : 'feil'}`}
                        aria-label={`Spørsmål ${i + 1}: ${s.skipped ? 'hoppet over' : s.correct ? 'riktig' : 'feil'}`}
                      />
                    ))}
                  </div>
                </div>

                <p className="mt-3 text-pretty text-[0.8125rem] text-[rgba(10,18,6,0.62)]">
                  {passedCount === totalAnswered
                    ? 'Fremragende! Fremgangen er registrert i fingeravtrykket ditt.'
                    : passedCount >= Math.ceil(totalAnswered / 2)
                      ? 'Bra fremgang. Prøv å bruk flere norske nøkkelord neste gang.'
                      : 'Disse spørsmålene er utfordrende — prøv igjen for å bygge flyt.'}
                </p>
              </div>

              <div className="flex w-full flex-col gap-2">
                <button
                  onClick={handleTryAnother}
                  aria-label="Prøv et annet spørsmål"
                  className="nc-button-primary w-full py-3.5 text-[0.875rem] font-bold"
                >
                  Prøv et annet spørsmål
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

      <BottomNav active="snakk" />
    </div>
  )
}
