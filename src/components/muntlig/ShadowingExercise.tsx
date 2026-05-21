'use client'

import { useCallback, useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Mic, Volume2, ArrowRight, RotateCcw } from 'lucide-react'
import type { Sentence } from '@/types/content'
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition'

// ── Word matching ────────────────────────────────────────────────────────────

function normaliseWord(w: string): string {
  return w
    .toLowerCase()
    .replace(/[.,!?;:«»"'()\-]/g, '')
    .trim()
}

function tokenise(text: string): string[] {
  return text.split(/\s+/).filter(Boolean)
}

interface WordMatch {
  word: string
  matched: boolean
}

function computeWordMatches(expected: string, actual: string): WordMatch[] {
  const expectedTokens = tokenise(expected)
  const actualNormalised = new Set(tokenise(actual).map(normaliseWord))

  return expectedTokens.map((word) => ({
    word,
    matched: actualNormalised.has(normaliseWord(word)),
  }))
}

function computeMatchScore(expected: string, actual: string): number {
  const expectedTokens = tokenise(expected)
  if (expectedTokens.length === 0) return 1

  const actualNormalised = new Set(tokenise(actual).map(normaliseWord))
  const matchedCount = expectedTokens.filter((w) =>
    actualNormalised.has(normaliseWord(w))
  ).length

  return matchedCount / expectedTokens.length
}

// ── Sub-components ───────────────────────────────────────────────────────────

function WordColorDisplay({ matches }: { matches: WordMatch[] }) {
  return (
    <p className="text-[1.1rem] leading-relaxed">
      {matches.map((m, i) => (
        <span
          key={i}
          className={
            m.matched
              ? 'text-[var(--nc-green)] font-semibold'
              : 'text-[var(--nc-text-muted)]'
          }
        >
          {i > 0 ? ' ' : ''}
          {m.word}
        </span>
      ))}
    </p>
  )
}

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

interface ShadowingExerciseProps {
  sentence: Sentence
  index: number
  total: number
  onComplete: (matchScore: number, transcript: string) => void
}

// ── Main component ───────────────────────────────────────────────────────────

export function ShadowingExercise({
  sentence,
  index,
  total,
  onComplete,
}: ShadowingExerciseProps) {
  const [phase, setPhase] = useState<Phase>('idle')
  const [finalTranscript, setFinalTranscript] = useState('')
  const [matchScore, setMatchScore] = useState(0)

  const {
    transcript,
    interimTranscript,
    isListening,
    isSupported,
    start,
    stop,
    reset,
  } = useSpeechRecognition()

  // When transcript lands after recording ends, compute score and show result
  const handleStartRecording = useCallback(() => {
    reset()
    setFinalTranscript('')
    setPhase('listening')
    start()
  }, [reset, start])

  const handleStopRecording = useCallback(() => {
    stop()
    // Give the browser 200ms to fire a final result event before falling back
    setTimeout(() => {
      const captured = transcript || interimTranscript
      const score = computeMatchScore(sentence.norwegian, captured)
      setFinalTranscript(captured)
      setMatchScore(score)
      setPhase('result')
    }, 200)
  }, [stop, transcript, interimTranscript, sentence.norwegian])

  // When the speech API fires a final result, isListening goes false and transcript is set.
  // Use an effect (not render-body setState) to auto-advance from listening → result.
  useEffect(() => {
    if (!isListening && phase === 'listening' && transcript) {
      const score = computeMatchScore(sentence.norwegian, transcript)
      setFinalTranscript(transcript)
      setMatchScore(score)
      setPhase('result')
    }
  }, [isListening, phase, transcript, sentence.norwegian])

  function playAudio() {
    if (!sentence.audioUrl) return
    try {
      const audio = new Audio(sentence.audioUrl)
      void audio.play()
    } catch {
      // audio playback failed silently — no fallback needed for v1
    }
  }

  function handleRetry() {
    reset()
    setFinalTranscript('')
    setMatchScore(0)
    setPhase('idle')
  }

  function handleNext() {
    onComplete(matchScore, finalTranscript)
  }

  const wordMatches = phase === 'result'
    ? computeWordMatches(sentence.norwegian, finalTranscript)
    : []

  const scorePercent = Math.round(matchScore * 100)
  const passed = matchScore >= 0.7

  return (
    <motion.div
      key={sentence.id}
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

        {/* No-audio banner */}
        {!sentence.audioUrl && (
          <div
            className="nc-label rounded-md px-3 py-1.5 text-center"
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.09)',
            }}
          >
            Tekst-modus — les setningen høyt
          </div>
        )}

        {/* Norwegian sentence — T1 dominant */}
        <div>
          <h2 className="text-balance text-[1.75rem] md:text-[2rem] font-bold leading-tight text-[var(--nc-text)]">
            {sentence.norwegian}
          </h2>
          <p className="text-pretty mt-2 text-[0.875rem] text-[var(--nc-text-muted)]">
            {sentence.english}
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
                {sentence.audioUrl && (
                  <button
                    onClick={playAudio}
                    aria-label="Spill av norsk lyd"
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
              {/* Word-level colour match */}
              <div className="rounded-lg p-3" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.09)' }}>
                <p className="nc-label mb-2">Dine ord</p>
                {finalTranscript ? (
                  <WordColorDisplay matches={wordMatches} />
                ) : (
                  <p className="text-pretty text-[0.875rem] text-[var(--nc-text-dim)] italic">
                    Ingen lyd registrert.
                  </p>
                )}
              </div>

              {/* Score badge */}
              <div className="flex items-center justify-between">
                <span
                  className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[0.75rem] font-bold"
                  style={
                    passed
                      ? { background: 'var(--nc-green-tint)', border: '1px solid var(--nc-green-border)', color: 'var(--nc-green)' }
                      : { background: 'var(--nc-nc-red-tint, rgba(220,38,38,0.12))', border: '1px solid rgba(220,38,38,0.28)', color: 'var(--nc-red)' }
                  }
                >
                  {passed ? 'Bra! ' : 'Nesten — '}
                  {scorePercent}%
                </span>

                {!passed && (
                  <button
                    onClick={handleRetry}
                    aria-label="Prøv setningen igjen"
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
                aria-label="Neste setning"
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
