'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowRight, RotateCcw } from 'lucide-react'
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition'
import { normaliseWord, tokenise } from '@/lib/speechMatchUtils'
import type { ListenRespondQuestion } from '@/lib/listenRespondContent'

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

const LISTEN_SECONDS = 5

interface ListenRespondExerciseProps {
  question: ListenRespondQuestion
  index: number
  total: number
  onComplete: (correct: boolean, transcript: string, skipped: boolean) => void
}

// ── Match helper ─────────────────────────────────────────────────────────────

function getMatchedKeywords(keywords: string[], transcript: string): string[] {
  const normalisedTranscript = transcript.toLowerCase()
  const tokens = tokenise(normaliseWord(transcript))
  return keywords.filter(
    (kw) => tokens.includes(kw) || normalisedTranscript.includes(kw),
  )
}

// ── Main component ───────────────────────────────────────────────────────────

export function ListenRespondExercise({
  question,
  index,
  total,
  onComplete,
}: ListenRespondExerciseProps) {
  const [phase, setPhase] = useState<Phase>('idle')
  const [finalTranscript, setFinalTranscript] = useState('')
  const [matchedKeywords, setMatchedKeywords] = useState<string[]>([])
  const [progress, setProgress] = useState(0)

  const hasResolved = useRef(false)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  // Live ref so timer closure always captures the freshest transcript
  const transcriptRef = useRef('')

  const {
    transcript,
    interimTranscript,
    isListening,
    isSupported,
    start,
    stop,
    reset,
  } = useSpeechRecognition()

  // Keep transcriptRef in sync with latest speech state
  useEffect(() => {
    transcriptRef.current = transcript || interimTranscript
  }, [transcript, interimTranscript])

  // Reset local state when question changes
  useEffect(() => {
    reset()
    setFinalTranscript('')
    setMatchedKeywords([])
    setProgress(0)
    hasResolved.current = false
    setPhase('idle')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [question.id])

  const resolveResult = useCallback(
    (captured: string) => {
      const matched = getMatchedKeywords(question.expectedKeywords, captured)
      setFinalTranscript(captured)
      setMatchedKeywords(matched)
      setPhase('result')
    },
    [question.expectedKeywords],
  )

  // Countdown timer — starts when phase enters 'listening'
  useEffect(() => {
    if (phase !== 'listening') return
    const start = Date.now()
    timerRef.current = setInterval(() => {
      const elapsed = (Date.now() - start) / 1000
      setProgress(Math.min(elapsed / LISTEN_SECONDS, 1))
      if (elapsed >= LISTEN_SECONDS) {
        clearInterval(timerRef.current!)
        if (!hasResolved.current) {
          hasResolved.current = true
          resolveResult(transcriptRef.current)
        }
      }
    }, 100)
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
    // intentionally omit transcript/interimTranscript — captured via ref at timer expiry
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, resolveResult])

  // Auto-advance when speech API fires a final result before the timer
  useEffect(() => {
    if (phase !== 'listening') return
    if (isListening) return
    if (!transcript) return
    if (hasResolved.current) return
    hasResolved.current = true
    if (timerRef.current) clearInterval(timerRef.current)
    resolveResult(transcript)
  }, [isListening, phase, transcript, resolveResult])

  function handleStartListening() {
    reset()
    setFinalTranscript('')
    setMatchedKeywords([])
    setProgress(0)
    hasResolved.current = false
    setPhase('listening')
    start()
  }

  function handleSkip() {
    if (timerRef.current) clearInterval(timerRef.current)
    stop()
    onComplete(false, '', true)
  }

  function handleRetry() {
    reset()
    setFinalTranscript('')
    setMatchedKeywords([])
    setProgress(0)
    hasResolved.current = false
    setPhase('idle')
  }

  function handleNext() {
    const correct = matchedKeywords.length >= 1
    onComplete(correct, finalTranscript, false)
  }

  function playAudio() {
    if (!question.audioUrl) return
    try {
      const audio = new Audio(question.audioUrl)
      void audio.play()
    } catch {
      // audio playback failed silently — no fallback needed for v1
    }
  }

  const passed = matchedKeywords.length >= 1

  return (
    <motion.div
      key={question.id}
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

        {/* Norwegian question — T1 dominant */}
        <div>
          <h2 className="text-balance text-[1.75rem] md:text-[2rem] font-bold leading-tight text-[var(--nc-text)]">
            {question.question}
          </h2>
          <p className="text-pretty mt-2 text-[0.875rem] text-[var(--nc-text-muted)]">
            {question.questionEnglish}
          </p>
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
                {question.audioUrl && (
                  <button
                    onClick={playAudio}
                    aria-label="Spill av spørsmålet"
                    className="nc-button-dark flex items-center gap-2 px-4 py-2.5 text-[0.8125rem] font-semibold"
                  >
                    Lytt
                  </button>
                )}

                {isSupported && (
                  <button
                    onClick={handleStartListening}
                    aria-label="Start lytting og svar på spørsmålet"
                    className="nc-button-primary flex flex-1 items-center justify-center gap-2 py-2.5 text-[0.8125rem] font-bold"
                  >
                    Start lytting
                  </button>
                )}
              </div>

              <p className="nc-label text-[var(--nc-text-dim)]">{question.hint}</p>
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
                  Lytter…
                </span>
              </div>

              {/* Countdown bar — scaleX transform only, NO layout properties */}
              <div
                className="h-[4px] w-full overflow-hidden rounded-full"
                style={{ background: 'rgba(255,255,255,0.1)' }}
                role="progressbar"
                aria-label="Nedtelling"
                aria-valuenow={Math.round(progress * 100)}
                aria-valuemin={0}
                aria-valuemax={100}
              >
                <div
                  className="h-full w-full origin-left rounded-full bg-[var(--nc-red)]"
                  style={{
                    transform: `scaleX(${1 - progress})`,
                    transformOrigin: 'left center',
                    transition: 'none',
                  }}
                />
              </div>

              {(interimTranscript || transcript) && (
                <p className="text-pretty text-[0.875rem] italic text-[var(--nc-text-muted)]">
                  {interimTranscript || transcript}
                </p>
              )}

              <button
                onClick={handleSkip}
                aria-label="Hopp over dette spørsmålet"
                className="w-full rounded-[var(--radius)] border border-[var(--nc-border)] bg-transparent py-2.5 text-[0.8125rem] font-semibold text-[var(--nc-text-muted)] hover:bg-[rgba(255,255,255,0.06)] hover:text-[var(--nc-text)]"
              >
                Hopp over
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

              {/* Keyword chips */}
              <div>
                <p className="nc-label mb-2 text-[var(--nc-text-dim)]">Nøkkelord</p>
                <div className="flex flex-wrap gap-1.5">
                  {question.expectedKeywords.map((kw) => {
                    const isMatched = matchedKeywords.includes(kw)
                    return (
                      <span
                        key={kw}
                        className="rounded-full px-2.5 py-0.5 text-[0.6875rem] font-semibold"
                        style={
                          isMatched
                            ? {
                                background: 'var(--nc-green-tint)',
                                border: '1px solid var(--nc-green-border)',
                                color: 'var(--nc-green)',
                              }
                            : {
                                background: 'rgba(255,255,255,0.04)',
                                border: '1px solid rgba(255,255,255,0.09)',
                                color: 'var(--nc-text-dim)',
                              }
                        }
                      >
                        {kw}
                      </span>
                    )
                  })}
                </div>
              </div>

              {/* Pass/fail badge + retry */}
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
                  {passed ? 'Bra svar!' : 'Prøv å bruk flere norske ord'}
                </span>

                {!passed && (
                  <button
                    onClick={handleRetry}
                    aria-label="Prøv spørsmålet igjen"
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
                aria-label={index + 1 < total ? 'Neste spørsmål' : 'Avslutt øvelsen'}
                className="nc-button-primary flex w-full items-center justify-center gap-2 py-3 text-[0.875rem] font-bold"
              >
                {index + 1 < total ? 'Neste spørsmål' : 'Avslutt'}
                <ArrowRight size={16} aria-hidden="true" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  )
}
