'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { BottomNav } from '@/components/layout/BottomNav'
import { ListenRespondExercise } from '@/components/muntlig/ListenRespondExercise'
import { useFingerprint } from '@/hooks/useFingerprint'
import { useFingerprintStore } from '@/stores/fingerprint-store'
import { LISTEN_RESPOND_QUESTIONS } from '@/lib/listenRespondContent'
import type { ListenRespondQuestion } from '@/lib/listenRespondContent'
import { markLaneDone } from '@/lib/lane-completion'
import type { ExerciseResult } from '@/types/session'

// ── Question selection card ───────────────────────────────────────────────────

interface QuestionCardProps {
  question: ListenRespondQuestion
  onSelect: (question: ListenRespondQuestion) => void
}

function QuestionCard({ question, onSelect }: QuestionCardProps) {
  return (
    <motion.button
      onClick={() => onSelect(question)}
      aria-label={`Velg spørsmål: ${question.question}`}
      className="nc-glass w-full rounded-xl p-5 text-left transition-colors hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--nc-red)]"
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
      transition={{ duration: 0.15 }}
    >
      <div className="flex flex-col gap-1.5">
        <p className="text-[1rem] font-bold leading-snug text-[var(--nc-text)]">
          {question.question}
        </p>
        <p className="text-pretty text-[0.8125rem] text-[var(--nc-text-muted)]">
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

  const [screenPhase, setScreenPhase] = useState<ScreenPhase>('selection')
  const [activeQuestion, setActiveQuestion] = useState<ListenRespondQuestion | null>(null)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [scores, setScores] = useState<ScoreRecord[]>([])

  const focusSet = new Set(fingerprint?.weeklyFocus ?? [])
  const sortedQuestions = [...LISTEN_RESPOND_QUESTIONS].sort((a, b) => {
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
        setFingerprint({
          ...fingerprint,
          speakingMinutesTotal: (fingerprint.speakingMinutesTotal ?? 0) + minutesSpoken,
          updatedAt: new Date().toISOString(),
        })
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
    <div className="nc-gradient-page flex flex-col min-h-dvh">
      <main className="relative z-10 mx-auto flex w-full max-w-lg flex-1 flex-col px-5 pb-24 pt-5">
        <AnimatePresence mode="wait">

          {/* ── Question selection ── */}
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
                  Lytt og svar
                </h1>
                <p className="text-pretty mt-0.5 text-[0.8125rem] text-[var(--nc-text-muted)]">
                  Spørsmål vises på norsk. Du har 5 sekunder til å svare muntlig.
                </p>
              </div>

              {/* Feature chips */}
              <div className="flex flex-wrap gap-2">
                {['Tidsbegrenset', 'Talegjenkjenning', 'Fingeravtrykk'].map((chip) => (
                  <span
                    key={chip}
                    className="nc-glass rounded-full px-3 py-1 text-[0.6875rem] font-semibold text-[var(--nc-text-dim)]"
                  >
                    {chip}
                  </span>
                ))}
              </div>

              {/* Question cards */}
              <div className="flex flex-col gap-3">
                {sortedQuestions.map((q, i) => (
                  <motion.div
                    key={q.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.22, delay: i * 0.06 }}
                  >
                    <QuestionCard question={q} onSelect={handleSelectQuestion} />
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}

          {/* ── Exercising ── */}
          {screenPhase === 'exercising' && activeQuestion && (
            <motion.div
              key={`exercising-${activeQuestion.id}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col gap-4 pt-4"
            >
              {/* Exercise header */}
              <div className="mb-2">
                <h1 className="text-balance text-[1.375rem] font-extrabold text-[var(--nc-text)]">
                  Lytt og svar
                </h1>
                <p className="text-pretty mt-0.5 text-[0.8125rem] text-[var(--nc-text-muted)]">
                  Svar på norsk — du har 5 sekunder.
                </p>
              </div>

              <ListenRespondExercise
                question={activeQuestion}
                index={currentIndex}
                total={LISTEN_RESPOND_QUESTIONS.length}
                onComplete={handleQuestionComplete}
              />
            </motion.div>
          )}

          {/* ── Complete ── */}
          {screenPhase === 'complete' && (
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
                  {passedCount === totalAnswered ? 'Imponerende!' : 'Bra jobbet!'}
                </h2>

                {/* Pass / total count */}
                <div className="flex flex-col items-center gap-1">
                  <span
                    className="text-[3rem] font-extrabold tabular-nums leading-none"
                    style={{
                      color:
                        passedCount >= Math.ceil(totalAnswered / 2)
                          ? 'var(--nc-green)'
                          : 'var(--nc-red)',
                    }}
                  >
                    {passedCount}/{totalAnswered}
                  </span>
                  <p className="text-pretty text-[0.8125rem] text-[var(--nc-text-muted)]">
                    spørsmål besvart riktig
                  </p>
                </div>

                {/* Per-question breakdown bar */}
                <div className="flex w-full gap-1.5">
                  {scores.map((s, i) => (
                    <div
                      key={i}
                      className="flex-1 rounded-full h-2"
                      style={{
                        background: s.skipped
                          ? 'rgba(255,255,255,0.1)'
                          : s.correct
                            ? 'var(--nc-green)'
                            : 'rgba(220,38,38,0.55)',
                      }}
                      title={`Spørsmål ${i + 1}: ${s.skipped ? 'hoppet over' : s.correct ? 'riktig' : 'feil'}`}
                      aria-label={`Spørsmål ${i + 1}: ${s.skipped ? 'hoppet over' : s.correct ? 'riktig' : 'feil'}`}
                    />
                  ))}
                </div>

                <p className="text-pretty text-[0.875rem] text-[var(--nc-text-muted)]">
                  {passedCount === totalAnswered
                    ? 'Fremragende! Fremgangen er registrert i fingeravtrykket ditt.'
                    : passedCount >= Math.ceil(totalAnswered / 2)
                      ? 'Bra fremgang. Prøv å bruk flere norske nøkkelord neste gang.'
                      : 'Disse spørsmålene er utfordrende — prøv igjen for å bygge flyt.'}
                </p>
              </div>

              <div className="flex w-full flex-col gap-3">
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
