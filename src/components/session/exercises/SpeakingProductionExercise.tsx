'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Mic } from 'lucide-react'
import type { ResolvedContent } from '@/types/content'
import { AudioPlayer } from '@/components/audio/AudioPlayer'

interface SpeakingProductionExerciseProps {
  sentence: ResolvedContent
  /** Called once with the learner's honest self-assessment. produced = they
   *  spoke it acceptably (Flytende/Nølende); false = Bommet (spoke, but missed). */
  onComplete: (produced: boolean) => void
}

type Phase = 'attempt' | 'reveal'

/**
 * Speaking-production exercise — the daily Snakk block. The learner SAYS the
 * Norwegian aloud from an English cue (recall production), then reveals the
 * model answer + audio and self-assesses. No microphone is required and nothing
 * is machine-graded: a bag-of-words ASR score is not an honest judge (Rule 8).
 * Self-report drives speaking minutes + a guided production brick only — never
 * mastery. Producing aloud BEFORE seeing the model is the learning.
 */
export function SpeakingProductionExercise({ sentence, onComplete }: SpeakingProductionExerciseProps) {
  const [phase, setPhase] = useState<Phase>('attempt')

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="nc-label text-[var(--nc-cream-dim)]">Si det høyt på norsk</p>
        <span className="inline-flex items-center gap-1 rounded-full bg-[rgba(17,21,24,0.05)] px-2 py-0.5 text-[10px] font-semibold text-[var(--nc-cream-dim)]">
          <Mic size={11} aria-hidden="true" /> valgfri mikrofon
        </span>
      </div>

      {/* The cue — what to say, in English (a recall-production prompt) */}
      <p className="font-display text-[1.45rem] font-bold leading-snug text-[var(--nc-cream-text)]">
        {sentence.english}
      </p>

      {phase === 'attempt' ? (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="space-y-4"
        >
          <p className="text-pretty text-sm leading-6 text-[var(--nc-cream-muted)]">
            Si setningen høyt på norsk — du trenger ikke mikrofon. Når du har sagt den, ser du fasiten.
          </p>
          <button
            type="button"
            onClick={() => setPhase('reveal')}
            className="nc-button-primary min-h-[48px] w-full px-6 py-3 text-[0.95rem] font-bold"
          >
            Jeg sa det høyt
          </button>
        </motion.div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="space-y-4"
        >
          {/* Model answer + audio */}
          <div className="rounded-[0.55rem] border border-[rgba(17,21,24,0.08)] bg-[rgba(17,21,24,0.03)] p-3.5">
            <div className="mb-2 flex items-center justify-between">
              <span className="nc-label text-[var(--nc-cream-dim)]">Slik sies det</span>
              <AudioPlayer
                src={sentence.audioUrl}
                fallbackText={sentence.norwegian}
                label="Hør uttalen"
                size="sm"
              />
            </div>
            <p className="font-display text-[1.35rem] font-bold leading-snug text-[var(--nc-cream-text)]">
              {sentence.norwegian}
            </p>
            {sentence.english ? (
              <p className="mt-1.5 text-[0.78rem] leading-5 text-[var(--nc-cream-dim)]">{sentence.english}</p>
            ) : null}
          </div>

          {/* Honest self-assessment — drives minutes + a guided brick, never mastery */}
          <div>
            <p className="mb-2 text-[0.82rem] font-semibold text-[var(--nc-cream-text)]">Hvordan gikk det?</p>
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: 'Flytende', produced: true, dot: 'var(--nc-signal)' },
                { label: 'Nølende', produced: true, dot: 'var(--nc-amber)' },
                { label: 'Bommet', produced: false, dot: 'var(--nc-cream-dim)' },
              ].map((opt) => (
                <button
                  key={opt.label}
                  type="button"
                  onClick={() => onComplete(opt.produced)}
                  className="flex min-h-[48px] flex-col items-center justify-center gap-1.5 rounded-[0.5rem] border border-[rgba(17,21,24,0.12)] bg-[var(--nc-cream)] px-2 py-2.5 text-[0.8rem] font-bold text-[var(--nc-cream-text)] transition-colors hover:bg-[rgba(17,21,24,0.04)]"
                >
                  <span aria-hidden="true" className="size-2 rounded-full" style={{ background: opt.dot }} />
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </motion.div>
      )}
    </div>
  )
}
