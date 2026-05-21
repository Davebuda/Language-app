'use client'

import { useCallback, useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Mic, Volume2, ArrowRight, RotateCcw } from 'lucide-react'
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition'
import { getHeuristicHint } from '@/lib/pronunciationHeuristics'
import { computeMatchScore } from '@/lib/speechMatchUtils'
import type { DrillWord } from '@/lib/drillContent'

// ── Sub-components ───────────────────────────────────────────────────────────

function PulsingDot() {
  return (
    <motion.span
      className="inline-block size-3 rounded-full bg-[var(--nc-red)]"
      animate={{ scale: [1, 1.15, 1] }}
      transition={{ repeat: Infinity, duration: 1, ease: 'easeInOut' }}
      aria-hidden="true"
    />
  )
}

// ── Types ────────────────────────────────────────────────────────────────────

type Phase = 'idle' | 'listening' | 'result'

interface DrillExerciseProps {
  word: DrillWord
  index: number
  total: number
  onComplete: (matchScore: number, transcript: string) => void
}

// ── Main component ───────────────────────────────────────────────────────────

export function DrillExercise({
  word,
  index,
  total,
  onComplete,
}: DrillExerciseProps) {
  const [phase, setPhase] = useState<Phase>('idle')
  const [finalTranscript, setFinalTranscript] = useState('')
  const [matchScore, setMatchScore] = useState(0)
  const [heuristicHint, setHeuristicHint] = useState<string | null>(null)

  const {
    transcript,
    interimTranscript,
    isListening,
    isSupported,
    start,
    stop,
    reset,
  } = useSpeechRecognition()

  // Reset local state when the word changes
  useEffect(() => {
    reset()
    setFinalTranscript('')
    setMatchScore(0)
    setHeuristicHint(null)
    setPhase('idle')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [word.norwegian])

  const resolveResult = useCallback(
    (captured: string) => {
      const score = computeMatchScore(word.norwegian, captured)
      const hint = getHeuristicHint(word.norwegian, captured)
      setFinalTranscript(captured)
      setMatchScore(score)
      setHeuristicHint(hint)
      setPhase('result')
    },
    [word.norwegian]
  )

  const handleStartRecording = useCallback(() => {
    reset()
    setFinalTranscript('')
    setMatchScore(0)
    setHeuristicHint(null)
    setPhase('listening')
    start()
  }, [reset, start])

  const handleStopRecording = useCallback(() => {
    stop()
    // Give the browser 200ms to fire a final result event before falling back
    setTimeout(() => {
      const captured = transcript || interimTranscript
      resolveResult(captured)
    }, 200)
  }, [stop, transcript, interimTranscript, resolveResult])

  // Auto-advance from listening → result when speech API fires final result
  useEffect(() => {
    if (!isListening && phase === 'listening' && transcript) {
      resolveResult(transcript)
    }
  }, [isListening, phase, transcript, resolveResult])

  function playAudio() {
    if (!word.audioUrl) return
    try {
      const audio = new Audio(word.audioUrl)
      void audio.play()
    } catch {
      // audio playback failed silently — no fallback needed for v1
    }
  }

  function handleRetry() {
    reset()
    setFinalTranscript('')
    setMatchScore(0)
    setHeuristicHint(null)
    setPhase('idle')
  }

  function handleNext() {
    onComplete(matchScore, finalTranscript)
  }

  const scorePercent = Math.round(matchScore * 100)
  const passed = matchScore >= 0.7

  return (
    <motion.div
      key={word.norwegian}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.28 }}
      className="flex flex-col gap-5"
    >
      {/* Progress indicator */}
      <div className="flex items-center gap-2">
        <span className="nc-label">{index + 1} / {total}</span>
        <div className="flex-1 h-[3px] overflow-hidden rounded-full bg-[var(--nc-border)]">
          <motion.div
            className="h-full w-full origin-left rounded-full bg-[var(--nc-red)]"
            initial={{ scaleX: 0 }}
            animate={{ scaleX: index / total }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
          />
        </div>
      </div>

      {/* Main card */}
      <div className="nc-glass-elevated p-6 flex flex-col gap-4">

        {/* Norwegian word — T1 dominant */}
        <div>
          <h2 className="text-balance text-[1.75rem] md:text-[2rem] font-bold leading-tight text-[var(--nc-text)]">
            {word.norwegian}
          </h2>
          <p className="text-pretty mt-2 text-[0.875rem] text-[var(--nc-text-muted)]">
            {word.english}
          </p>

          {/* Target phoneme label */}
          <span className="nc-label mt-3 inline-block">
            Målfonem: <span className="font-bold">{word.targetPhoneme}</span>
          </span>
        </div>

        {/* Phase-specific content */}
        <AnimatePresence mode="wait">

          {/* ── Idle ── */}
          {phase === 'idle' && (
            <motion.div
              key="idle"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col gap-3"
            >
              {!isSupported && (
                <p className="text-pretty text-[0.8125rem] text-[var(--nc-text-muted)]">
                  Din nettleser støtter ikke talegjenkjenning. Prøv Chrome.
                </p>
              )}

              <div className="flex gap-2">
                {word.audioUrl && (
                  <button
                    onClick={playAudio}
                    aria-label="Spill av norsk uttale"
                    className="nc-button-dark flex items-center gap-2 px-4 py-2.5 text-[0.8125rem] font-semibold"
                  >
                    <Volume2 size={15} aria-hidden="true" />
                    Lytt
                  </button>
                )}

                {isSupported && (
                  <button
                    onClick={handleStartRecording}
                    aria-label="Start opptak av din uttale"
                    className="nc-button-primary flex flex-1 items-center justify-center gap-2 py-2.5 text-[0.8125rem] font-bold"
                  >
                    <Mic size={15} aria-hidden="true" />
                    Start opptak
                  </button>
                )}
              </div>
            </motion.div>
          )}

          {/* ── Listening ── */}
          {phase === 'listening' && (
            <motion.div
              key="listening"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col gap-3"
            >
              <div className="flex items-center gap-2">
                <PulsingDot />
                <span className="text-[0.8125rem] font-semibold text-[var(--nc-red)]">
                  Innspilling…
                </span>
              </div>

              {interimTranscript && (
                <p className="text-pretty text-[0.875rem] italic text-[var(--nc-text-muted)]">
                  {interimTranscript}
                </p>
              )}

              <button
                onClick={handleStopRecording}
                aria-label="Stopp innspilling"
                className="nc-button-dark w-full py-2.5 text-[0.8125rem] font-semibold"
              >
                Stopp
              </button>
            </motion.div>
          )}

          {/* ── Result ── */}
          {phase === 'result' && (
            <motion.div
              key="result"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex flex-col gap-4"
            >
              {/* Transcript display */}
              <div
                className="rounded-lg p-3"
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.09)',
                }}
              >
                <p className="nc-label mb-2">Hva du sa</p>
                {finalTranscript ? (
                  <p className="text-[1.1rem] leading-relaxed text-[var(--nc-text)]">
                    {finalTranscript}
                  </p>
                ) : (
                  <p className="text-pretty text-[0.875rem] italic text-[var(--nc-text-dim)]">
                    Ingen lyd registrert.
                  </p>
                )}
              </div>

              {/* Heuristic hint — only when a substitution error was detected */}
              {heuristicHint && (
                <motion.div
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25, delay: 0.1 }}
                  className="nc-glass rounded-lg p-3"
                >
                  <p className="nc-label mb-1.5">Uttale-tips</p>
                  <p className="text-pretty text-[0.875rem] italic text-[var(--nc-text-muted)]">
                    {heuristicHint}
                  </p>
                </motion.div>
              )}

              {/* Score badge + retry */}
              <div className="flex items-center justify-between">
                <span
                  className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[0.75rem] font-bold"
                  style={
                    passed
                      ? {
                          background: 'var(--nc-green-tint)',
                          border: '1px solid var(--nc-green-border)',
                          color: 'var(--nc-green)',
                        }
                      : {
                          background: 'rgba(220,38,38,0.12)',
                          border: '1px solid rgba(220,38,38,0.28)',
                          color: 'var(--nc-red)',
                        }
                  }
                >
                  {passed ? 'Bra! ' : 'Nesten — '}
                  {scorePercent}%
                </span>

                {!passed && (
                  <button
                    onClick={handleRetry}
                    aria-label="Prøv ordet igjen"
                    className="flex items-center gap-1 text-[0.8125rem] text-[var(--nc-text-muted)] transition-colors hover:text-[var(--nc-text)]"
                  >
                    <RotateCcw size={13} aria-hidden="true" />
                    Prøv igjen
                  </button>
                )}
              </div>

              {/* Advance */}
              <button
                onClick={handleNext}
                aria-label="Neste ord"
                className="nc-button-primary flex w-full items-center justify-center gap-2 py-3 text-[0.875rem] font-bold"
              >
                Neste
                <ArrowRight size={16} aria-hidden="true" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  )
}
