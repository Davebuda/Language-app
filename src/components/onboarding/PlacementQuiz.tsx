'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowRight } from 'lucide-react'
import { useFingerprintStore } from '@/stores/fingerprint-store'
import { createEmptyFingerprint } from '@/types/fingerprint'
import { saveFingerprint } from '@/storage/indexeddb'

interface Question {
  text: string
  options: { label: string; value: string }[]
}

const QUESTIONS: Question[] = [
  {
    text: 'Hvor mye norsk kan du fra før?',
    options: [
      { label: 'Ingenting — helt nybegynner', value: 'none' },
      { label: 'Litt — kjenner noen ord', value: 'some' },
      { label: 'Grunnleggende — enkle setninger', value: 'basic' },
      { label: 'Middels — kan ha en samtale', value: 'intermediate' },
    ],
  },
  {
    text: 'Hva er vanskeligst for deg nå?',
    options: [
      { label: 'Ord og uttrykk', value: 'vocab' },
      { label: 'Grammatikk — f.eks. ordstilling', value: 'grammar' },
      { label: 'Lytte og forstå', value: 'listening' },
      { label: 'Vet ikke ennå', value: 'unknown' },
    ],
  },
  {
    text: 'Hva er målet ditt med norsk?',
    options: [
      { label: 'Jobb / integrering i Norge', value: 'work' },
      { label: 'Familie / sosialt', value: 'social' },
      { label: 'Reise / friluftsliv', value: 'travel' },
      { label: 'Akademisk / litteratur', value: 'academic' },
    ],
  },
]

function getOrCreateUserId(): string {
  const stored = localStorage.getItem('norsk-coach-anon-id')
  if (stored) return stored
  const id = crypto.randomUUID()
  localStorage.setItem('norsk-coach-anon-id', id)
  return id
}

function seedFingerprint(
  answers: string[],
  setFingerprint: (fp: ReturnType<typeof createEmptyFingerprint>) => void
) {
  const userId = getOrCreateUserId()
  const fp = createEmptyFingerprint(userId)
  if (answers[1] === 'vocab') {
    fp.productionGap['noun-gender'] = 30
    fp.productionGap['indefinite-articles'] = 30
  } else if (answers[1] === 'grammar') {
    fp.productionGap['noun-gender'] = 50
    fp.productionGap['indefinite-articles'] = 40
    fp.productionGap['definite-articles-singular'] = 40
  } else if (answers[1] === 'listening') {
    fp.productionGap['noun-gender'] = 20
  }
  setFingerprint(fp)
  saveFingerprint(fp).catch(console.warn)
  localStorage.setItem('norskcoach_onboarded', '1')
}

export function PlacementQuiz() {
  const router = useRouter()
  const { setFingerprint } = useFingerprintStore()
  const [step, setStep] = useState(0)
  const [answers, setAnswers] = useState<string[]>([])
  const [selected, setSelected] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  const question = QUESTIONS[step]

  function advance(value: string) {
    const newAnswers = [...answers, value]
    setAnswers(newAnswers)
    if (step < QUESTIONS.length - 1) {
      setSelected(null)
      setStep((s) => s + 1)
    } else {
      seedFingerprint(newAnswers, setFingerprint)
      setDone(true)
    }
  }

  if (done) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
        className="flex flex-col gap-[6px]"
      >
        {/* Lime focal result */}
        <div className="nc-signal-panel p-4 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-[0.8rem] bg-[rgba(10,18,6,0.88)] font-display text-base font-extrabold text-white shadow-[0_18px_40px_rgba(10,18,6,0.20)]">
            A1
          </div>
          <h2 className="mt-3 font-display text-[1.7rem] font-extrabold leading-[0.94] tracking-[-0.03em] text-[var(--nc-signal-fg)]">
            Klar for A1!
          </h2>
          <p className="mt-2 text-pretty text-[0.82rem] leading-[1.55] text-[rgba(10,18,6,0.52)]">
            Vi starter med grunnleggende ordklasser og artikler. Motoren tilpasser seg etter hvert svar.
          </p>
        </div>

        {/* Cream first session card */}
        <div className="nc-glass-cream px-4 py-3">
          <div className="nc-label mb-1.5">Din første økt</div>
          <div className="text-[0.88rem] font-bold text-[var(--nc-cream-text)]">Substantiv og artikler</div>
          <div className="mt-0.5 text-[0.72rem] tabular-nums text-[var(--nc-cream-dim)]">
            9 øvelser · ~12 min · motoren tilpasser seg
          </div>
        </div>

        <button
          onClick={() => router.push('/session')}
          className="nc-button-primary inline-flex min-h-[52px] w-full items-center justify-center gap-2 px-6 text-sm font-bold"
          aria-label="Start første økt"
        >
          Start første økt
          <ArrowRight size={15} aria-hidden="true" />
        </button>
        <button
          onClick={() => router.push('/dashboard')}
          className="text-[0.82rem] font-medium text-[var(--nc-text-dim)] transition-colors hover:text-[var(--nc-text)]"
          aria-label="Gå til dashbord først"
        >
          Gå til dashbord først
        </button>
      </motion.div>
    )
  }

  return (
    <div className="flex flex-col gap-[6px]">
      {/* Progress bar */}
      <div className="flex gap-1.5">
        {QUESTIONS.map((_, i) => (
          <div
            key={i}
            className="h-1.5 flex-1 rounded-full transition-colors duration-300"
            style={{ background: i < step ? 'var(--nc-signal)' : 'rgba(255,255,255,0.10)' }}
          />
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ x: 40, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: -40, opacity: 0 }}
          transition={{ duration: 0.22, ease: [0.32, 0.72, 0, 1] }}
          className="flex flex-col gap-[6px]"
        >
          {/* Question panel */}
          <div className="nc-surface px-4 py-5">
            <div className="nc-label mb-2">
              Spørsmål {step + 1} av {QUESTIONS.length}
            </div>
            <h2 className="text-balance font-display text-[1.2rem] font-extrabold leading-[1.15] tracking-[-0.02em] text-[var(--nc-cream-text)]">
              {question.text}
            </h2>
          </div>

          <div className="flex flex-col gap-2">
            {question.options.map((opt) => (
              <button
                key={opt.value}
                onClick={() => {
                  setSelected(opt.value)
                  setTimeout(() => advance(opt.value), 180)
                }}
                className="w-full rounded-[var(--radius)] border px-4 py-3.5 text-left text-[0.9rem] font-medium transition-opacity"
                style={
                  selected === opt.value
                    ? {
                        borderColor: 'rgba(200,255,32,0.42)',
                        background: 'linear-gradient(135deg, rgba(200,255,32,0.92) 0%, rgba(184,239,16,0.88) 100%)',
                        color: 'var(--nc-signal-fg)',
                      }
                    : {
                        borderColor: 'rgba(255,255,255,0.10)',
                        background: 'rgba(255,255,255,0.05)',
                        color: 'var(--nc-text)',
                      }
                }
                aria-label={opt.label}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
