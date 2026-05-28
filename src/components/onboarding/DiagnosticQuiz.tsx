'use client'

import { useEffect, useState, type CSSProperties } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowRight } from 'lucide-react'
import {
  createDiagnosticState,
  selectNextQuestion,
  recordAnswer,
  isDiagnosticComplete,
  computeResult,
} from '@/lib/diagnostic/engine'
import type { DiagnosticState, DiagnosticResult } from '@/lib/diagnostic/engine'
import type { DiagnosticQuestion } from '@/lib/diagnostic/questions'
import type { CEFRLevel } from '@/types/fingerprint'
import { useFingerprintStore } from '@/stores/fingerprint-store'
import { getVoiceOnboardingResult, clearVoiceOnboardingResult } from '@/lib/voice-onboarding'

interface DiagnosticQuizProps {
  onComplete: (result: DiagnosticResult) => void
}

const CEFR_LABELS: Record<CEFRLevel, string> = {
  A1: 'Beginner',
  A2: 'Elementary',
  B1: 'Intermediate',
  B2: 'Upper Intermediate',
}

const slideVariants = {
  enter: { x: 48, opacity: 0 },
  center: { x: 0, opacity: 1 },
  exit: { x: -48, opacity: 0 },
}

const transition = { duration: 0.22, ease: [0.32, 0.72, 0, 1] as const }

export function DiagnosticQuiz({ onComplete }: DiagnosticQuizProps) {
  const fingerprint = useFingerprintStore.getState().fingerprint
  const priorAskedIds = fingerprint?.askedDiagnosticQuestionIds ?? []
  const [voiceLevel] = useState(() => {
    const result = getVoiceOnboardingResult()
    if (result) clearVoiceOnboardingResult()
    return result?.estimatedLevel ?? undefined
  })
  const [diagState, setDiagState] = useState<DiagnosticState>(() => createDiagnosticState(priorAskedIds, voiceLevel))
  const [currentQuestion, setCurrentQuestion] = useState<DiagnosticQuestion | null>(null)
  const [selected, setSelected] = useState<number | null>(null)
  const [revealed, setRevealed] = useState(false)
  const [questionKey, setQuestionKey] = useState(0)
  const [answeredQuestion, setAnsweredQuestion] = useState<DiagnosticQuestion | null>(null)

  useEffect(() => {
    const q = selectNextQuestion(diagState)
    setCurrentQuestion(q)
  }, [diagState])

  function handleSelect(index: number) {
    if (revealed || !currentQuestion) return
    setAnsweredQuestion(currentQuestion)
    setSelected(index)
    setRevealed(true)

    const correct = index === currentQuestion.correctIndex
    const nextState = recordAnswer(diagState, currentQuestion, correct)
    setDiagState(nextState)

    if (isDiagnosticComplete(nextState)) {
      setTimeout(() => {
        onComplete(computeResult(nextState))
      }, 900)
    }
  }

  function advance() {
    if (!isDiagnosticComplete(diagState)) {
      setAnsweredQuestion(null)
      setSelected(null)
      setRevealed(false)
      setQuestionKey((k) => k + 1)
    }
  }

  const answered = diagState.answers.length
  const maxQuestions = 12
  const progress = answered / maxQuestions

  if (!currentQuestion) return null

  const displayedQuestion = revealed && answeredQuestion ? answeredQuestion : currentQuestion
  const estimatedLevel = computeResult(diagState).cefrLevel

  return (
    <div className="flex flex-1 flex-col gap-4">
      <div className="nc-glass-cream p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="nc-label text-[var(--nc-cream-dim)]">Smart placement</div>
            <div className="mt-1 text-lg font-semibold text-[var(--nc-cream-text)]">
              Finn riktig startnivå
            </div>
          </div>
          <div className="rounded-full bg-[rgba(6,16,23,0.08)] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--nc-cream-muted)]">
            {Math.min(answered + (revealed ? 0 : 1), maxQuestions)}/{maxQuestions}
          </div>
        </div>

        <div className="mt-4 h-2 overflow-hidden rounded-full bg-[rgba(6,16,23,0.08)]">
          <motion.div
            className="h-full origin-left rounded-full bg-[var(--nc-signal)]"
            animate={{ scaleX: progress }}
            transition={{ duration: 0.4 }}
          />
        </div>

        <div className="mt-4 flex items-center justify-between gap-3 rounded-[1rem] bg-[rgba(6,16,23,0.92)] px-4 py-3 text-white">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-white/38">
              Live estimate
            </div>
            <div className="mt-1 text-sm font-medium text-white">
              {answered === 0 ? 'Svar naturlig, så justerer vi fortløpende.' : `Nå ser du ut til å ligge rundt ${estimatedLevel}.`}
            </div>
          </div>
          <div className="rounded-[0.9rem] bg-[rgba(215,255,92,0.24)] px-3 py-2 text-sm font-bold text-[var(--nc-signal-fg)]">
            {CEFR_LABELS[estimatedLevel]}
          </div>
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={questionKey}
          variants={slideVariants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={transition}
          className="nc-glass-cream p-5"
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="nc-label text-[var(--nc-cream-dim)]">
                {displayedQuestion.cefrLevel} · {displayedQuestion.conceptId.replace(/-/g, ' ')}
              </div>
              <p className="mt-3 text-balance text-[1.85rem] font-semibold leading-[1.08] text-[var(--nc-cream-text)]">
                {displayedQuestion.prompt}
              </p>
            </div>
            <div className="hidden rounded-[1rem] bg-[rgba(6,16,23,0.06)] px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--nc-cream-muted)] sm:block">
              Q{Math.min(answered + (revealed ? 0 : 1), maxQuestions)}
            </div>
          </div>
        </motion.div>
      </AnimatePresence>

      <div className="space-y-2.5">
        {displayedQuestion.options.map((option, index) => {
          const isCorrect = index === displayedQuestion.correctIndex
          const isSelected = selected === index

          const classes =
            'w-full rounded-[1.1rem] border px-4 py-4 text-left text-[0.95rem] font-medium transition-all'
          let style: CSSProperties = {
            borderColor: 'rgba(255,255,255,0.10)',
            background: 'rgba(247,251,245,0.96)',
            color: 'var(--nc-cream-text)',
            boxShadow: '0 14px 36px rgba(0,0,0,0.12), inset 0 1px 0 rgba(255,255,255,0.55)',
          }

          if (revealed) {
            if (isCorrect) {
              style = {
                borderColor: 'rgba(215,255,92,0.42)',
                background: 'linear-gradient(135deg, rgba(215,255,92,0.92) 0%, rgba(199,244,93,0.86) 100%)',
                color: 'var(--nc-signal-fg)',
                boxShadow: '0 18px 40px rgba(183,243,0,0.18)',
              }
            } else if (isSelected && !isCorrect) {
              style = {
                borderColor: 'rgba(255,106,85,0.34)',
                background: 'rgba(255,106,85,0.10)',
                color: 'var(--nc-red)',
                boxShadow: '0 14px 30px rgba(0,0,0,0.10)',
              }
            }
          }

          return (
            <button
              key={index}
              onClick={() => handleSelect(index)}
              disabled={revealed}
              className={classes}
              style={style}
            >
              <span className="mr-2 text-[11px] font-bold uppercase tracking-[0.08em] opacity-45">
                0{index + 1}
              </span>
              {option}
            </button>
          )
        })}
      </div>

      <AnimatePresence>
        {revealed && !isDiagnosticComplete(diagState) && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="nc-glass p-4"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="nc-label">Why this matters</div>
                <p className="mt-2 text-sm leading-7 text-[var(--nc-text-muted)]">
                  {displayedQuestion.explanation}
                </p>
              </div>
              <span className="nc-chip-signal rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.08em]">
                AI
              </span>
            </div>

            <button
              onClick={advance}
              className="nc-button-primary mt-4 inline-flex w-full items-center justify-center gap-2 px-4 py-3 text-sm font-medium"
            >
              Next question <ArrowRight size={14} />
            </button>
          </motion.div>
        )}

        {revealed && isDiagnosticComplete(diagState) && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="nc-glass-cream p-5 text-center"
          >
            <p className="text-base font-semibold text-[var(--nc-cream-text)]">
              Bygger startøkten din…
            </p>
            <p className="mt-2 text-sm text-[var(--nc-cream-muted)]">
              Vi låser nivå, første fokus og hvilke reparasjonsløkker som bør være aktive.
            </p>
            <div className="mt-4 flex justify-center gap-1.5">
              {[0, 0.15, 0.3].map((d) => (
                <motion.div
                  key={d}
                  className="h-2.5 w-2.5 rounded-full bg-[var(--nc-signal)]"
                  animate={{ opacity: [0.3, 1, 0.3] }}
                  transition={{ duration: 0.9, delay: d, repeat: Infinity }}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
