'use client'

import { useCallback, useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Mic, Volume2, ArrowRight, RotateCcw } from 'lucide-react'
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition'
import { getHeuristicHint } from '@/lib/pronunciationHeuristics'
import { computeMatchScore } from '@/lib/speechMatchUtils'
import type { DrillWord } from '@/lib/drillContent'

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
      className="flex flex-col gap-3"
    >
      {/* Progress indicator */}
      <div className="flex items-center gap-2">
        <span className="text-[9px] font-bold uppercase tracking-[0.12em] tabular-nums text-[var(--nc-text-dim)]">
          {index + 1} / {total}
        </span>
        <div className="flex-1 h-[3px] overflow-hidden rounded-full bg-[rgba(255,255,255,0.08)]">
          <motion.div
            className="h-full w-full origin-left rounded-full bg-[var(--nc-signal)]"
            initial={{ scaleX: 0 }}
            animate={{ scaleX: index / total }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
          />
        </div>
      </div>

      {/* Main card — dark glass */}
      <div className="nc-glass-elevated flex flex-col gap-4 p-5">

        {/* Norwegian word — T1 dominant */}
        <div>
          <h2 className="text-balance text-[2rem] font-extrabold leading-none tracking-[-0.03em] text-[var(--nc-text)]">
            {word.norwegian}
          </h2>
          <p className="mt-2 text-pretty text-[0.8125rem] text-[var(--nc-text-muted)]">
            {word.english}
          </p>

          {/* Target phoneme chip */}
          <span className="mt-2.5 inline-flex items-center rounded-full border border-[var(--nc-signal-border)] bg-[var(--nc-signal-tint)] px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.1em] text-[var(--nc-signal)]">
            Målfonem: {word.targetPhoneme}
          </span>
        </div>

        {/* Phase-specific content */}
        <AnimatePresence mode="wait">

          {/* ── Idle ── */}
          {phase === 'idle' ? (
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
                    <Volume2 size={14} aria-hidden="true" />
                    Lytt
                  </button>
                )}

                {isSupported && (
                  /* Mic button with orb-ring glow */
                  <button
                    onClick={handleStartRecording}
                    aria-label="Start opptak av din uttale"
                    className="relative flex flex-1 items-center justify-center gap-2 overflow-hidden rounded-[var(--radius)] py-2.5 text-[0.8125rem] font-bold text-[var(--nc-signal-fg)]"
                    style={{
                      background: 'linear-gradient(135deg, var(--nc-signal) 0%, var(--nc-signal-bright) 100%)',
                      boxShadow: '0 0 16px var(--nc-glow-strong), 0 12px 32px var(--nc-glow)',
                    }}
                  >
                    <Mic size={14} aria-hidden="true" />
                    Start opptak
                  </button>
                )}
              </div>
            </motion.div>
          ) : null}

          {/* ── Listening ── */}
          {phase === 'listening' ? (
            <motion.div
              key="listening"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col gap-3"
            >
              {/* Active mic orb */}
              <div className="flex flex-col items-center gap-2 py-1">
                <div className="relative" style={{ width: 56, height: 56 }}>
                  <motion.span
                    aria-hidden="true"
                    className="pointer-events-none absolute rounded-full"
                    style={{ inset: 0, border: '1.5px solid color-mix(in srgb, var(--nc-signal) 35%, transparent)' }}
                    animate={{ scale: [1, 1.14, 1], opacity: [1, 0.5, 1] }}
                    transition={{ duration: 1.1, ease: 'easeInOut', repeat: Infinity }}
                  />
                  <motion.button
                    onClick={handleStopRecording}
                    aria-label="Stopp innspilling"
                    className="absolute flex items-center justify-center rounded-full"
                    style={{
                      inset: 6,
                      background: 'radial-gradient(circle at 38% 32%, var(--nc-signal-glow) 0%, var(--nc-signal) 48%, var(--nc-signal-bright) 100%)',
                      boxShadow: '0 0 28px var(--nc-glow-strong), 0 0 60px var(--nc-glow)',
                    }}
                    animate={{ scale: [1, 1.04, 1] }}
                    transition={{ duration: 0.8, repeat: Infinity }}
                  >
                    <Mic size={16} style={{ color: 'var(--nc-bg)' }} aria-hidden="true" />
                  </motion.button>
                </div>
                <span className="text-[0.72rem] font-bold text-[var(--nc-signal)]">Innspilling… trykk for å stoppe</span>
              </div>

              {interimTranscript && (
                <p className="text-pretty text-[0.8125rem] italic text-[var(--nc-text-muted)]">
                  {interimTranscript}
                </p>
              )}
            </motion.div>
          ) : null}

          {/* ── Result ── */}
          {phase === 'result' ? (
            <motion.div
              key="result"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex flex-col gap-3"
            >
              {/* Transcript display — cream panel */}
              <div className="nc-glass-cream rounded-[0.55rem] p-3">
                <p className="mb-1.5 text-[9px] font-bold uppercase tracking-[0.12em] text-[var(--nc-cream-dim)]">Hva du sa</p>
                {finalTranscript ? (
                  <p className="text-[1rem] leading-relaxed text-[var(--nc-cream-text)]">
                    {finalTranscript}
                  </p>
                ) : (
                  <p className="text-pretty text-[0.8125rem] italic text-[var(--nc-cream-muted)]">
                    Ingen lyd registrert.
                  </p>
                )}
              </div>

              {/* Heuristic hint — only when a substitution error was detected */}
              {heuristicHint ? (
                <motion.div
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25, delay: 0.1 }}
                  className="nc-glass rounded-[0.55rem] p-3"
                >
                  <p className="mb-1.5 text-[9px] font-bold uppercase tracking-[0.12em] text-[var(--nc-text-dim)]">Uttale-tips</p>
                  <p className="text-pretty text-[0.8125rem] italic text-[var(--nc-text-muted)]">
                    {heuristicHint}
                  </p>
                </motion.div>
              ) : null}

              {/* Score badge + retry */}
              <div className="flex items-center justify-between">
                <span
                  className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[0.72rem] font-bold"
                  style={
                    passed
                      ? {
                          background: 'var(--nc-signal-tint)',
                          border: '1px solid var(--nc-signal-border)',
                          color: 'var(--nc-signal)',
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
                    className="flex items-center gap-1 text-[0.8125rem] text-[var(--nc-text-muted)] transition-opacity hover:opacity-80"
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
                <ArrowRight size={15} aria-hidden="true" />
              </button>
            </motion.div>
          ) : null}

        </AnimatePresence>
      </div>
    </motion.div>
  )
}
