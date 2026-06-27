'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowRight, Mic, RotateCcw, Volume2 } from 'lucide-react'
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition'
import { normaliseWord, tokenise } from '@/lib/speechMatchUtils'
import type { ListenRespondQuestion } from '@/lib/listenRespondContent'

// ── Types ────────────────────────────────────────────────────────────────────

type Phase = 'idle' | 'listening' | 'result'

// Max listening window. Generous on purpose: learners need time to think before
// they even start speaking, and a struggling learner shouldn't be cut off. They
// can finish early with the "Ferdig" button; this is only the upper bound.
const LISTEN_SECONDS = 20

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
  } = useSpeechRecognition({ continuous: true })

  // Keep transcriptRef in sync with latest speech state. Combine finalized text with
  // the trailing interim words so a learner's last (not-yet-finalized) words still
  // count when the timer fires or they tap Ferdig.
  useEffect(() => {
    transcriptRef.current = [transcript, interimTranscript].filter(Boolean).join(' ').trim()
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
        if (timerRef.current) clearInterval(timerRef.current)
        if (!hasResolved.current) {
          hasResolved.current = true
          stop()
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

  // Safety fallback: if the recognizer ends on its own (browser-side error/timeout)
  // while we still have captured speech, resolve with it rather than leaving a dead
  // "Lytter…" state. In continuous mode the learner normally ends via Ferdig/timer,
  // so this only fires on an unexpected end. hasResolved guards against double-resolve.
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

  // Learner taps "Ferdig" when they've finished answering — resolves immediately
  // with whatever they've said so far instead of waiting out the countdown.
  function handleDone() {
    if (hasResolved.current) return
    hasResolved.current = true
    if (timerRef.current) clearInterval(timerRef.current)
    stop()
    resolveResult(transcriptRef.current)
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

      {/* Main card — cream so Norwegian question pops */}
      <div className="nc-glass-cream flex flex-col gap-4 p-5">

        {/* Norwegian question — T1 dominant */}
        <div>
          <h2 className="text-balance text-[1.65rem] font-bold leading-tight text-[var(--nc-cream-text)]">
            {question.question}
          </h2>
          <p className="mt-1.5 text-pretty text-[0.8125rem] text-[var(--nc-cream-muted)]">
            {question.questionEnglish}
          </p>
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
                <p className="text-pretty text-[0.8125rem] text-[var(--nc-cream-muted)]">
                  Din nettleser støtter ikke talegjenkjenning. Prøv Chrome.
                </p>
              )}

              <div className="flex gap-2">
                {question.audioUrl && (
                  <button
                    onClick={playAudio}
                    aria-label="Spill av spørsmålet"
                    className="flex items-center gap-2 rounded-[var(--radius)] border border-[rgba(17,21,24,0.14)] bg-[rgba(17,21,24,0.07)] px-4 py-2.5 text-[0.8125rem] font-semibold text-[var(--nc-cream-text)]"
                  >
                    <Volume2 size={14} aria-hidden="true" />
                    Lytt
                  </button>
                )}

                {isSupported && (
                  /* Mic button with orb glow — on cream background */
                  <button
                    onClick={handleStartListening}
                    aria-label="Start lytting og svar på spørsmålet"
                    className="relative flex flex-1 items-center justify-center gap-2 overflow-hidden rounded-[var(--radius)] py-2.5 text-[0.8125rem] font-bold text-[var(--nc-signal-fg)]"
                    style={{
                      background: 'linear-gradient(135deg, var(--nc-signal) 0%, var(--nc-signal-bright) 100%)',
                      boxShadow: '0 0 16px var(--nc-glow-strong), 0 12px 32px var(--nc-glow)',
                    }}
                  >
                    <Mic size={14} aria-hidden="true" />
                    Start lytting
                  </button>
                )}
              </div>

              <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-[var(--nc-cream-dim)]">{question.hint}</p>
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
                    style={{ inset: 0, border: '1.5px solid color-mix(in srgb, var(--nc-signal) 40%, transparent)' }}
                    animate={{ scale: [1, 1.14, 1], opacity: [1, 0.5, 1] }}
                    transition={{ duration: 1.1, ease: 'easeInOut', repeat: Infinity }}
                  />
                  <div
                    className="absolute flex items-center justify-center rounded-full"
                    style={{
                      inset: 6,
                      background: 'radial-gradient(circle at 38% 32%, var(--nc-signal-glow) 0%, var(--nc-signal) 48%, var(--nc-signal-bright) 100%)',
                      boxShadow: '0 0 28px var(--nc-glow-strong), 0 0 60px var(--nc-glow)',
                    }}
                  >
                    <motion.span
                      className="inline-block size-2.5 rounded-full bg-[var(--nc-bg)]"
                      animate={{ scale: [1, 1.15, 1] }}
                      transition={{ repeat: Infinity, duration: 1, ease: 'easeInOut' }}
                      aria-hidden="true"
                    />
                  </div>
                </div>
                <span className="text-[0.72rem] font-bold text-[var(--nc-signal-ink)]">Lytter…</span>
              </div>

              {/* Countdown bar */}
              <div
                className="h-[4px] w-full overflow-hidden rounded-full bg-[rgba(17,21,24,0.10)]"
                role="progressbar"
                aria-label="Nedtelling"
                aria-valuenow={Math.round(progress * 100)}
                aria-valuemin={0}
                aria-valuemax={100}
              >
                <div
                  className="h-full w-full origin-left rounded-full"
                  style={{
                    background: 'linear-gradient(90deg, var(--nc-signal) 0%, var(--nc-signal-bright) 100%)',
                    transform: `scaleX(${1 - progress})`,
                    transformOrigin: 'left center',
                    transition: 'none',
                  }}
                />
              </div>

              {(interimTranscript || transcript) && (
                <p className="text-pretty text-[0.8125rem] italic text-[var(--nc-cream-muted)]">
                  {interimTranscript || transcript}
                </p>
              )}

              <div className="flex gap-2">
                <button
                  onClick={handleDone}
                  aria-label="Jeg er ferdig med å svare"
                  className="flex-1 rounded-[var(--radius)] py-2.5 text-[0.8125rem] font-bold text-[var(--nc-signal-fg)]"
                  style={{ background: 'linear-gradient(135deg, var(--nc-signal) 0%, var(--nc-signal-bright) 100%)' }}
                >
                  Ferdig
                </button>
                <button
                  onClick={handleSkip}
                  aria-label="Hopp over dette spørsmålet"
                  className="rounded-[var(--radius)] border border-[rgba(17,21,24,0.12)] bg-[rgba(17,21,24,0.05)] px-4 py-2.5 text-[0.8125rem] font-semibold text-[var(--nc-cream-muted)] hover:bg-[rgba(17,21,24,0.09)]"
                >
                  Hopp over
                </button>
              </div>
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
              {/* Transcript display — dark inset on cream */}
              <div
                className="rounded-[0.5rem] p-3"
                style={{
                  background: 'rgba(17,21,24,0.06)',
                  border: '1px solid rgba(17,21,24,0.09)',
                }}
              >
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

              {/* Keyword chips */}
              <div>
                <p className="mb-1.5 text-[9px] font-bold uppercase tracking-[0.12em] text-[var(--nc-cream-dim)]">Nøkkelord</p>
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
                                background: 'rgba(90,138,0,0.12)',
                                border: '1px solid rgba(90,138,0,0.28)',
                                color: 'var(--nc-signal-ink)',
                              }
                            : {
                                background: 'rgba(17,21,24,0.06)',
                                border: '1px solid rgba(17,21,24,0.10)',
                                color: 'var(--nc-cream-muted)',
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
                  className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[0.72rem] font-bold"
                  style={
                    passed
                      ? {
                          background: 'rgba(90,138,0,0.12)',
                          border: '1px solid rgba(90,138,0,0.28)',
                          color: 'var(--nc-signal-ink)',
                        }
                      : {
                          background: 'rgba(255,106,85,0.10)',
                          border: '1px solid rgba(255,106,85,0.24)',
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
                    className="flex items-center gap-1 text-[0.8125rem] text-[var(--nc-cream-muted)] transition-opacity hover:opacity-80"
                  >
                    <RotateCcw size={13} aria-hidden="true" />
                    Prøv igjen
                  </button>
                )}
              </div>

              {/* Advance — dark button on cream card */}
              <button
                onClick={handleNext}
                aria-label={index + 1 < total ? 'Neste spørsmål' : 'Avslutt øvelsen'}
                className="flex w-full items-center justify-center gap-2 rounded-[var(--radius)] py-3 text-[0.875rem] font-bold text-white"
                style={{ background: 'rgba(10,18,6,0.90)' }}
              >
                {index + 1 < total ? 'Neste spørsmål' : 'Avslutt'}
                <ArrowRight size={15} aria-hidden="true" />
              </button>
            </motion.div>
          ) : null}

        </AnimatePresence>
      </div>
    </motion.div>
  )
}
