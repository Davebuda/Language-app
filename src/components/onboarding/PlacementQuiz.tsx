'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { AnimatePresence, motion } from 'framer-motion'
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
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center gap-6 text-center"
      >
        <div className="text-5xl">🎯</div>
        <div>
          <h2 className="text-xl font-extrabold text-white">Klar for A1!</h2>
          <p className="mt-2 text-sm leading-relaxed text-white/50">
            Vi starter med grunnleggende ordklasser og artikler.
            <br />
            Motoren tilpasser seg etter hvert svar.
          </p>
        </div>
        <div className="w-full rounded-2xl bg-nc-card border border-nc-border p-4 text-left">
          <div className="mb-1 text-[10px] uppercase tracking-widest text-white/30">Din første økt</div>
          <div className="text-base font-bold text-white">Substantiv og artikler</div>
          <div className="mt-1 text-[11px] text-white/45">
            9 øvelser · ~12 min · motoren tilpasser seg
          </div>
        </div>
        <button
          onClick={() => router.push('/session')}
          className="w-full rounded-xl bg-nc-green py-3.5 text-sm font-bold text-[#0d0d14]"
        >
          Start første økt →
        </button>
        <button
          onClick={() => router.push('/dashboard')}
          className="text-sm text-white/30 underline"
        >
          Gå til dashbord først
        </button>
      </motion.div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Progress dots */}
      <div className="flex gap-2">
        {QUESTIONS.map((_, i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full transition-colors duration-300 ${
              i < step ? 'bg-nc-green' : 'bg-[rgba(255,255,255,0.1)]'
            }`}
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
          className="flex flex-col gap-4"
        >
          <div>
            <div className="mb-1 text-[11px] font-semibold text-white/30">
              Spørsmål {step + 1} av {QUESTIONS.length}
            </div>
            <h2 className="text-[18px] font-extrabold leading-snug text-white">
              {question.text}
            </h2>
          </div>

          <div className="flex flex-col gap-3">
            {question.options.map((opt) => (
              <button
                key={opt.value}
                onClick={() => {
                  setSelected(opt.value)
                  setTimeout(() => advance(opt.value), 180)
                }}
                className={`rounded-xl border px-4 py-3 text-left text-[13px] font-medium transition-all duration-150 ${
                  selected === opt.value
                    ? 'border-nc-green bg-nc-green/10 text-nc-green font-bold'
                    : 'border-nc-border bg-nc-card text-white/70 hover:border-nc-green/40 hover:text-white'
                }`}
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
