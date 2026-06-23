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
  A1: 'A1',
  A2: 'A2',
  B1: 'B1',
  B2: 'B2',
}

// Structural focus per concept — describes WHAT the question tests, never the answer.
// Keeps the diagnostic measuring (not teaching) so placement stays accurate.
const CONCEPT_FOCUS: Record<string, string> = {
  'noun-gender': 'Focus: which gender article a noun takes (en / ei / et).',
  'present-tense-regular': 'Focus: forming the present tense of a verb.',
  'personal-pronouns': 'Focus: choosing the right personal pronoun.',
  'svo-word-order': 'Focus: subject–verb–object order in a simple statement.',
  'definite-articles-singular': 'Focus: making a noun definite (the "the" form).',
  'v2-word-order': 'Focus: verb-second word order and inversion.',
  negation: "Focus: where “ikke” sits in the sentence.",
  'preterite-regular': 'Focus: past and perfect verb forms.',
  'adjective-agreement': 'Focus: matching the adjective form to its noun.',
  'common-modal-verbs': 'Focus: using modal verbs (kan / vil / skal / må).',
  'question-formation': 'Focus: forming a yes/no question.',
  'common-prepositions': 'Focus: choosing the correct preposition.',
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
    <div className="flex flex-1 flex-col gap-[6px]">

      {/* Lime focal — progress header */}
      <div className="nc-signal-panel p-3.5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="nc-label">Kartlegging</div>
            <div className="mt-1 font-display text-[1.1rem] font-extrabold leading-tight tracking-[-0.02em] text-[var(--nc-signal-fg)]">
              Finn riktig startnivå
            </div>
          </div>
          <div className="rounded-full bg-[rgba(10,18,6,0.88)] px-3 py-1.5 text-[11px] font-bold tabular-nums uppercase tracking-[0.08em] text-white">
            {Math.min(answered + (revealed ? 0 : 1), maxQuestions)}/{maxQuestions}
          </div>
        </div>

        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[rgba(10,18,6,0.14)]">
          <motion.div
            className="h-full origin-left rounded-full bg-[rgba(10,18,6,0.80)]"
            animate={{ scaleX: progress }}
            transition={{ duration: 0.4 }}
          />
        </div>

        <div className="mt-3 flex items-center justify-between gap-3 rounded-[0.65rem] bg-[rgba(10,18,6,0.88)] px-3 py-2.5 text-white">
          <div>
            <div className="text-[9px] font-bold uppercase tracking-[0.12em] text-white/38">
              Nivå nå
            </div>
            <div className="mt-1 text-[0.8rem] font-medium text-white">
              {answered === 0 ? 'Svar naturlig — vi justerer fortløpende.' : `Ser ut til ${estimatedLevel}-nivå.`}
            </div>
          </div>
          <div className="rounded-[0.6rem] bg-[color-mix(in_srgb,var(--nc-signal-glow)_22%,transparent)] px-3 py-1.5 text-[0.88rem] font-extrabold tabular-nums text-[var(--nc-signal-fg)]">
            {CEFR_LABELS[estimatedLevel]}
          </div>
        </div>
      </div>

      {/* Question panel */}
      <AnimatePresence mode="wait">
        <motion.div
          key={questionKey}
          variants={slideVariants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={transition}
          className="nc-surface flex min-h-[200px] flex-col justify-between gap-4 px-5 py-6"
        >
          {/* Top band — eyebrow + question number */}
          <div className="flex items-start justify-between gap-4">
            <div className="nc-label">
              {displayedQuestion.cefrLevel} · {displayedQuestion.conceptId.replace(/-/g, ' ')}
            </div>
            <div className="hidden shrink-0 rounded-[0.55rem] border border-[rgba(17,21,24,0.12)] bg-[rgba(17,21,24,0.05)] px-2.5 py-1.5 text-[10px] font-bold tabular-nums uppercase tracking-[0.08em] text-[var(--nc-cream-dim)] sm:block">
              Q{Math.min(answered + (revealed ? 0 : 1), maxQuestions)}
            </div>
          </div>

          {/* Middle band — question */}
          <p className="text-balance font-display text-[1.2rem] font-extrabold leading-[1.15] tracking-[-0.02em] text-[var(--nc-cream-text)]">
            {displayedQuestion.prompt}
          </p>

          {/* Bottom band — focus */}
          <p className="text-pretty text-[0.78rem] leading-snug text-[var(--nc-cream-muted)]">
            {CONCEPT_FOCUS[displayedQuestion.conceptId] ?? `Focus: ${displayedQuestion.conceptId.replace(/-/g, ' ')}.`}
          </p>
        </motion.div>
      </AnimatePresence>

      {/* Option buttons */}
      <div className="flex flex-col gap-2">
        {displayedQuestion.options.map((option, index) => {
          const isCorrect = index === displayedQuestion.correctIndex
          const isSelected = selected === index

          const classes =
            'w-full rounded-[var(--radius)] border px-4 py-3.5 text-left text-[0.9rem] font-medium transition-opacity'
          let style: CSSProperties = {
            borderColor: 'rgba(255,255,255,0.10)',
            background: 'rgba(255,255,255,0.05)',
            color: 'var(--nc-text)',
          }

          if (revealed) {
            if (isCorrect) {
              style = {
                borderColor: 'color-mix(in srgb, var(--nc-signal) 42%, transparent)',
                background: 'linear-gradient(135deg, var(--nc-signal) 0%, color-mix(in srgb, var(--nc-signal-bright) 88%, transparent) 100%)',
                color: 'var(--nc-signal-fg)',
              }
            } else if (isSelected && !isCorrect) {
              style = {
                borderColor: 'rgba(255,106,85,0.34)',
                background: 'rgba(255,106,85,0.10)',
                color: 'var(--nc-red)',
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
              aria-label={`Alternativ ${index + 1}: ${option}`}
            >
              <span className="mr-2 text-[10px] font-bold uppercase tracking-[0.08em] opacity-40">
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
            transition={{ duration: 0.2 }}
            className="nc-glass-cream p-4"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="nc-label">Forklaring</div>
                <p className="mt-1.5 text-[0.82rem] leading-[1.55] text-[var(--nc-cream-muted)]">
                  {displayedQuestion.explanation}
                </p>
              </div>
              <span className="nc-chip-signal shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.08em]">
                AI
              </span>
            </div>

            <button
              onClick={advance}
              className="nc-button-dark mt-4 inline-flex w-full items-center justify-center gap-2 px-4 py-3 text-sm font-bold"
              aria-label="Neste spørsmål"
            >
              Neste spørsmål <ArrowRight size={14} aria-hidden="true" />
            </button>
          </motion.div>
        )}

        {revealed && isDiagnosticComplete(diagState) && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className="nc-signal-panel p-5 text-center"
          >
            <p className="font-display text-[1rem] font-extrabold text-[var(--nc-signal-fg)]">
              Setter opp første økt.
            </p>
            <div className="mt-4 flex justify-center gap-1.5">
              {[0, 0.15, 0.3].map((d) => (
                <motion.div
                  key={d}
                  className="h-2 w-2 rounded-full bg-[rgba(10,18,6,0.70)]"
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
