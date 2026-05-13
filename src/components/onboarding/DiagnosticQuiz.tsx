'use client'

import { useState, useEffect } from 'react'
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
  const [diagState, setDiagState] = useState<DiagnosticState>(createDiagnosticState)
  const [currentQuestion, setCurrentQuestion] = useState<DiagnosticQuestion | null>(null)
  const [selected, setSelected] = useState<number | null>(null)
  const [revealed, setRevealed] = useState(false)
  const [questionKey, setQuestionKey] = useState(0)

  useEffect(() => {
    const q = selectNextQuestion(diagState)
    setCurrentQuestion(q)
  }, [diagState])

  function handleSelect(index: number) {
    if (revealed || !currentQuestion) return
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
      setSelected(null)
      setRevealed(false)
      setQuestionKey((k) => k + 1)
    }
  }

  const answered = diagState.answers.length
  const MAX_Q = 12
  const progress = answered / MAX_Q

  if (!currentQuestion) return null

  return (
    <div className="flex flex-1 flex-col gap-5">
      {/* Progress */}
      <div className="flex items-center gap-3">
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[rgba(23,23,29,0.08)]">
          <motion.div
            className="h-full rounded-full bg-nc-violet"
            animate={{ width: `${progress * 100}%` }}
            transition={{ duration: 0.4 }}
          />
        </div>
        <span className="text-[11px] font-medium text-nc-text-dim">{answered} / {MAX_Q}</span>
      </div>

      {/* Question card */}
      <AnimatePresence mode="wait">
        <motion.div
          key={questionKey}
          variants={slideVariants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={transition}
          className="nc-panel-dark p-5"
        >
          <div className="pointer-events-none absolute inset-0 opacity-35">
            <div className="nc-pattern-orbits absolute inset-0" />
          </div>
          <div className="relative z-[1]">
            <div className="nc-label-light mb-3">
              {currentQuestion.cefrLevel} · {currentQuestion.conceptId.replace(/-/g, ' ')}
            </div>
            <p className="text-[1.25rem] font-semibold leading-snug text-white">
              {currentQuestion.prompt}
            </p>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Options */}
      <div className="flex flex-col gap-2">
        {currentQuestion.options.map((option, index) => {
          const isCorrect = index === currentQuestion.correctIndex
          const isSelected = selected === index

          let borderColor = 'rgba(23,23,29,0.10)'
          let bgColor = '#fff'
          let textColor = 'rgba(23,23,29,0.65)'

          if (revealed) {
            if (isCorrect) {
              borderColor = 'rgba(159,230,127,0.5)'
              bgColor = 'rgba(159,230,127,0.12)'
              textColor = '#2d6a22'
            } else if (isSelected && !isCorrect) {
              borderColor = 'rgba(239,118,100,0.4)'
              bgColor = 'rgba(239,118,100,0.08)'
              textColor = '#c0392b'
            }
          }

          return (
            <button
              key={index}
              onClick={() => handleSelect(index)}
              disabled={revealed}
              className="rounded-[0.95rem] border px-4 py-3.5 text-left text-sm font-medium transition-all disabled:cursor-default"
              style={{ borderColor, backgroundColor: bgColor, color: textColor }}
            >
              <span className="mr-2 text-[11px] font-semibold opacity-40">0{index + 1}</span>
              {option}
            </button>
          )
        })}
      </div>

      {/* Explanation + continue */}
      <AnimatePresence>
        {revealed && !isDiagnosticComplete(diagState) && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="nc-panel-soft p-4"
          >
            <p className="text-sm leading-7 text-nc-text-muted">
              {currentQuestion.explanation}
            </p>
            <button
              onClick={advance}
              className="nc-button-dark mt-4 inline-flex w-full items-center justify-center gap-2 px-4 py-3 text-sm font-medium"
            >
              Next question <ArrowRight size={14} />
            </button>
          </motion.div>
        )}

        {revealed && isDiagnosticComplete(diagState) && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="nc-panel-soft p-4 text-center"
          >
            <p className="text-sm font-medium text-nc-text">Working out your level…</p>
            <div className="mt-3 flex justify-center gap-1">
              {[0, 0.15, 0.3].map((d) => (
                <motion.div
                  key={d}
                  className="h-2 w-2 rounded-full bg-nc-violet"
                  animate={{ opacity: [0.3, 1, 0.3] }}
                  transition={{ duration: 0.9, delay: d, repeat: Infinity }}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Level estimate hint (faint, not distracting) */}
      <div className="mt-auto text-center text-[11px] text-nc-text-dim">
        {answered === 0
          ? 'Answer honestly — we adjust as we go'
          : `Current estimate: ~${CEFR_LABELS[computeResult(diagState).cefrLevel]}`}
      </div>
    </div>
  )
}
