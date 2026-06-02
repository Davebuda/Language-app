'use client'

// RECITE step of the read→recite→write flow.
//
// Honesty rail (CLAUDE.md Rule 6/8 + unified-read-recite-write-design.md §2):
// the browser ASR word-match is a VISUAL ASSIST ONLY (green = heard) — it is
// NEVER the grade and NO percentage is ever shown. The learner SELF-REPORTS
// ("Jeg sa det" / "Det var vanskelig"). Non-mic fallback: read aloud + self-report.
// The model audio uses the browser speech-synthesis voice (no audio files needed;
// missing audio degrades to text-mode, matching ShadowingExercise).

import { useCallback, useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Mic, Volume2, Check, RotateCcw } from 'lucide-react'
import { computeWordMatches, type WordMatch } from '@/lib/speechMatchUtils'
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition'

export type ReciteSelfReport = 'said' | 'hard'

function WordColorDisplay({ matches }: { matches: WordMatch[] }) {
  return (
    <p className="text-[1rem] leading-relaxed">
      {matches.map((m, i) => (
        <span
          key={i}
          className={m.matched ? 'font-semibold text-[#5A8A00]' : 'text-[var(--nc-cream-muted)]'}
        >
          {i > 0 ? ' ' : ''}
          {m.word}
        </span>
      ))}
    </p>
  )
}

function speakNorwegian(text: string) {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return
  try {
    window.speechSynthesis.cancel()
    const u = new SpeechSynthesisUtterance(text)
    u.lang = 'nb-NO'
    u.rate = 0.95
    window.speechSynthesis.speak(u)
  } catch {
    // browser TTS unavailable — text-mode read-aloud still works
  }
}

type Phase = 'idle' | 'listening' | 'reported'

interface ReciteStepProps {
  /** The recite-target sentences (already resolved from reciteTargetIndices). */
  sentences: string[]
  /** Fired once after the last sentence is self-reported. */
  onAllComplete: (outcomes: ReciteSelfReport[], transcripts: string[]) => void
}

export function ReciteStep({ sentences, onAllComplete }: ReciteStepProps) {
  const [current, setCurrent] = useState(0)
  const [phase, setPhase] = useState<Phase>('idle')
  const [captured, setCaptured] = useState('')
  const outcomesRef = useRef<ReciteSelfReport[]>([])
  const transcriptsRef = useRef<string[]>([])

  const { transcript, interimTranscript, isListening, isSupported, start, stop, reset } =
    useSpeechRecognition()

  const sentence = sentences[current] ?? ''
  const total = sentences.length

  const handleStart = useCallback(() => {
    reset()
    setCaptured('')
    setPhase('listening')
    start()
  }, [reset, start])

  const handleStop = useCallback(() => {
    stop()
    setTimeout(() => {
      setCaptured(transcript || interimTranscript)
      setPhase('reported')
    }, 200)
  }, [stop, transcript, interimTranscript])

  // Auto-advance listening → reported when the API fires a final result.
  useEffect(() => {
    if (!isListening && phase === 'listening' && transcript) {
      setCaptured(transcript)
      setPhase('reported')
    }
  }, [isListening, phase, transcript])

  function report(outcome: ReciteSelfReport) {
    outcomesRef.current = [...outcomesRef.current, outcome]
    transcriptsRef.current = [...transcriptsRef.current, captured]

    const next = current + 1
    if (next >= total) {
      onAllComplete(outcomesRef.current, transcriptsRef.current)
      return
    }
    reset()
    setCaptured('')
    setPhase('idle')
    setCurrent(next)
  }

  const wordMatches = phase === 'reported' ? computeWordMatches(sentence, captured) : []

  return (
    <motion.div
      key={`recite-${current}`}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.26 }}
      className="flex flex-col gap-3"
    >
      {/* progress within the recite scope */}
      <div className="flex items-center gap-2">
        <span className="text-[9px] font-bold uppercase tracking-[0.12em] tabular-nums text-[var(--nc-text-dim)]">
          Setning {current + 1} / {total}
        </span>
        <div className="h-[3px] flex-1 overflow-hidden rounded-full bg-[rgba(255,255,255,0.08)]">
          <motion.div
            className="h-full origin-left rounded-full bg-[var(--nc-teal)]"
            initial={{ scaleX: 0 }}
            animate={{ scaleX: current / total }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
          />
        </div>
      </div>

      <div className="nc-glass-cream flex flex-col gap-4 p-5">
        {!isSupported ? (
          <div
            className="rounded-[0.4rem] px-3 py-1.5 text-center text-[9px] font-bold uppercase tracking-[0.1em] text-[var(--nc-cream-dim)]"
            style={{ background: 'rgba(17,21,24,0.05)', border: '1px solid rgba(17,21,24,0.09)' }}
          >
            Tekst-modus — les setningen høyt
          </div>
        ) : null}

        {/* the recite-target sentence — Norwegian dominant */}
        <h2 className="text-balance text-[1.5rem] font-bold leading-tight text-[var(--nc-cream-text)]">
          {sentence}
        </h2>

        <AnimatePresence mode="wait">
          {phase === 'idle' ? (
            <motion.div
              key="idle"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex gap-2"
            >
              <button
                onClick={() => speakNorwegian(sentence)}
                aria-label="Hør modellen lese setningen"
                className="nc-button-dark flex items-center gap-2 px-4 py-2.5 text-[0.8125rem] font-semibold"
              >
                <Volume2 size={14} aria-hidden="true" />
                Hør modellen
              </button>

              {isSupported ? (
                <button
                  onClick={handleStart}
                  aria-label="Start opptak — si setningen høyt"
                  className="relative flex flex-1 items-center justify-center gap-2 overflow-hidden rounded-[var(--radius)] py-2.5 text-[0.8125rem] font-bold text-[var(--nc-signal-fg)]"
                  style={{
                    background: 'linear-gradient(135deg, #C8FF20 0%, #b7f300 100%)',
                    boxShadow: '0 0 16px rgba(200,255,32,0.25), 0 12px 32px rgba(183,243,0,0.18)',
                  }}
                >
                  <Mic size={14} aria-hidden="true" />
                  Si det høyt
                </button>
              ) : null}
            </motion.div>
          ) : null}

          {phase === 'listening' ? (
            <motion.div
              key="listening"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center gap-2 py-1"
            >
              <div className="relative" style={{ width: 56, height: 56 }}>
                <motion.span
                  aria-hidden="true"
                  className="pointer-events-none absolute rounded-full"
                  style={{ inset: 0, border: '1.5px solid rgba(200,255,32,0.35)' }}
                  animate={{ scale: [1, 1.14, 1], opacity: [1, 0.5, 1] }}
                  transition={{ duration: 1.1, ease: 'easeInOut', repeat: Infinity }}
                />
                <motion.button
                  onClick={handleStop}
                  aria-label="Stopp innspilling"
                  className="absolute flex items-center justify-center rounded-full"
                  style={{
                    inset: 6,
                    background: 'radial-gradient(circle at 38% 32%, #d8ff58 0%, #C8FF20 48%, #aadc16 100%)',
                    boxShadow: '0 0 28px rgba(200,255,32,0.45), 0 0 60px rgba(200,255,32,0.18)',
                  }}
                  animate={{ scale: [1, 1.04, 1] }}
                  transition={{ duration: 0.8, repeat: Infinity }}
                >
                  <Mic size={16} style={{ color: '#0A1206' }} aria-hidden="true" />
                </motion.button>
              </div>
              <span className="text-[0.72rem] font-bold text-[#5A8A00]">Innspilling… trykk for å stoppe</span>
              {interimTranscript ? (
                <p className="text-pretty text-[0.8125rem] italic text-[var(--nc-cream-muted)]">{interimTranscript}</p>
              ) : null}
            </motion.div>
          ) : null}

          {phase === 'reported' ? (
            <motion.div
              key="reported"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex flex-col gap-3"
            >
              {/* word-colour ASSIST — explicitly not a grade, no % */}
              {isSupported ? (
                <div className="rounded-[0.55rem] border border-[rgba(17,21,24,0.08)] bg-[rgba(17,21,24,0.05)] p-3">
                  <p className="mb-1.5 text-[9px] font-bold uppercase tracking-[0.12em] text-[var(--nc-cream-dim)]">
                    Dine ord — bare en hjelp, ikke en karakter
                  </p>
                  {captured ? (
                    <WordColorDisplay matches={wordMatches} />
                  ) : (
                    <p className="text-pretty text-[0.8125rem] italic text-[var(--nc-cream-muted)]">
                      Ingen lyd registrert — du kan likevel rapportere selv.
                    </p>
                  )}
                  <button
                    onClick={handleStart}
                    className="mt-2 inline-flex items-center gap-1 text-[0.78rem] text-[var(--nc-cream-muted)] transition-opacity hover:opacity-80"
                    aria-label="Ta opp på nytt"
                  >
                    <RotateCcw size={12} aria-hidden="true" />
                    Ta opp på nytt
                  </button>
                </div>
              ) : null}

              {/* SELF-REPORT — the honest signal */}
              <div className="flex flex-col gap-2">
                <span className="text-center text-[0.78rem] font-medium text-[var(--nc-cream-dim)]">
                  Hvordan gikk det?
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => report('said')}
                    aria-label="Jeg sa det"
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-[0.6rem] border border-[var(--nc-signal-border)] bg-[var(--nc-signal-tint)] py-3 text-[0.84rem] font-bold text-[#5A8A00]"
                  >
                    <Check size={15} aria-hidden="true" />
                    Jeg sa det
                  </button>
                  <button
                    onClick={() => report('hard')}
                    aria-label="Det var vanskelig"
                    className="flex flex-1 items-center justify-center rounded-[0.6rem] border border-[rgba(17,21,24,0.12)] bg-[rgba(17,21,24,0.04)] py-3 text-[0.84rem] font-semibold text-[var(--nc-cream-muted)]"
                  >
                    Det var vanskelig
                  </button>
                </div>
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    </motion.div>
  )
}
