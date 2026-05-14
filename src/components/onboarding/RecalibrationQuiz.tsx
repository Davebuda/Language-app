'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowRight } from 'lucide-react'
import { createDiagnosticState, recordAnswer } from '@/lib/diagnostic/engine'
import type { DiagnosticState } from '@/lib/diagnostic/engine'
import type { DiagnosticQuestion } from '@/lib/diagnostic/questions'
import {
  selectRecalibrationQuestion,
  isRecalibrationComplete,
  applyRecalibration,
  MAX_RECALIBRATION_QUESTIONS,
} from '@/lib/diagnostic/recalibration'
import type { RecalibrationResult } from '@/lib/diagnostic/recalibration'
import type { MistakeFingerprint } from '@/types/fingerprint'
import type { ConceptGraph } from '@/types/concepts'

interface RecalibrationQuizProps {
  fingerprint: MistakeFingerprint
  graph: ConceptGraph
  onComplete: (result: RecalibrationResult) => void
  onSkip: () => void
}

export function RecalibrationQuiz({ fingerprint, graph, onComplete, onSkip }: RecalibrationQuizProps) {
  const [diagState, setDiagState] = useState<DiagnosticState>(() => createDiagnosticState())
  const [currentQuestion, setCurrentQuestion] = useState<DiagnosticQuestion | null>(null)
  const [selected, setSelected] = useState<number | null>(null)
  const [revealed, setRevealed] = useState(false)
  const [questionKey, setQuestionKey] = useState(0)

  useEffect(() => {
    const q = selectRecalibrationQuestion(diagState, fingerprint)
    setCurrentQuestion(q)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [diagState])

  if (!currentQuestion) {
    return (
      <div className="nc-panel p-6 text-center">
        <p className="text-sm text-nc-text-muted">
          No recalibration questions available — all concepts are up to date.
        </p>
        <button onClick={onSkip} className="nc-button-dark mt-4 px-5 py-3 text-sm font-medium">
          Back to dashboard
        </button>
      </div>
    )
  }

  function handleSelect(index: number) {
    if (revealed || !currentQuestion) return
    setSelected(index)
    setRevealed(true)

    const correct = index === currentQuestion.correctIndex
    const nextState = recordAnswer(diagState, currentQuestion, correct)
    setDiagState(nextState)

    if (isRecalibrationComplete(nextState)) {
      setTimeout(() => {
        onComplete(applyRecalibration(nextState, fingerprint, graph))
      }, 800)
    }
  }

  function advance() {
    if (!isRecalibrationComplete(diagState)) {
      setSelected(null)
      setRevealed(false)
      setQuestionKey((k) => k + 1)
    }
  }

  const answered = diagState.answers.length
  const progress = answered / MAX_RECALIBRATION_QUESTIONS

  return (
    <div className="flex flex-1 flex-col gap-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="nc-label">Recalibration</div>
          <p className="mt-1 text-[13px] text-nc-text-muted">
            A short check on concepts you have not practiced recently.
          </p>
        </div>
        <button
          onClick={onSkip}
          className="text-[12px] font-medium text-nc-text-dim transition-colors hover:text-nc-text"
        >
          Skip
        </button>
      </div>

      {/* Progress */}
      <div className="flex items-center gap-3">
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[rgba(23,23,29,0.08)]">
          <motion.div
            className="h-full rounded-full bg-nc-apricot"
            animate={{ width: `${progress * 100}%` }}
            transition={{ duration: 0.4 }}
          />
        </div>
        <span className="text-[11px] font-medium text-nc-text-dim">
          {answered} / {MAX_RECALIBRATION_QUESTIONS}
        </span>
      </div>

      {/* Question card */}
      <AnimatePresence mode="wait">
        <motion.div
          key={questionKey}
          initial={{ x: 48, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: -48, opacity: 0 }}
          transition={{ duration: 0.22, ease: [0.32, 0.72, 0, 1] as const }}
          className="nc-panel-dark p-5"
        >
          <div className="pointer-events-none absolute inset-0 opacity-30">
            <div className="nc-pattern-orbits absolute inset-0" />
          </div>
          <div className="relative z-[1]">
            <div className="nc-label-light mb-3">
              {currentQuestion.cefrLevel} · {currentQuestion.conceptId.replace(/-/g, ' ')}
            </div>
            <p className="text-[1.2rem] font-semibold leading-snug text-white">
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
            if (isCorrect) { borderColor = 'rgba(159,230,127,0.5)'; bgColor = 'rgba(159,230,127,0.12)'; textColor = '#2d6a22' }
            else if (isSelected) { borderColor = 'rgba(239,118,100,0.4)'; bgColor = 'rgba(239,118,100,0.08)'; textColor = '#c0392b' }
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
        {revealed && !isRecalibrationComplete(diagState) && (
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
              Next <ArrowRight size={14} />
            </button>
          </motion.div>
        )}

        {revealed && isRecalibrationComplete(diagState) && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="nc-panel-soft p-4 text-center"
          >
            <p className="text-sm font-medium text-nc-text">Updating your profile…</p>
            <div className="mt-3 flex justify-center gap-1">
              {[0, 0.15, 0.3].map((d) => (
                <motion.div
                  key={d}
                  className="h-2 w-2 rounded-full bg-nc-apricot"
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
