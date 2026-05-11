'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { AnimatePresence, motion } from 'framer-motion'
import { useFingerprintStore } from '@/stores/fingerprint-store'
import { createEmptyFingerprint } from '@/types/fingerprint'
import { saveFingerprint } from '@/storage/indexeddb'

// ─── Types ────────────────────────────────────────────────────────────────────

type Step =
  | { kind: 'intro'; id: string }
  | { kind: 'quiz'; questionIndex: number }
  | { kind: 'ready' }

// ─── Content ──────────────────────────────────────────────────────────────────

const INTRO_SLIDES = [
  {
    id: 'welcome',
    emoji: '🇳🇴',
    heading: 'Din personlige norsk-trener',
    body: 'Ikke et kurs med faste leksjoner. En coach som finner hva du sliter med og bygger en ny plan for deg — hver dag.',
    cta: 'Kom i gang →',
  },
  {
    id: 'fingerprint',
    emoji: '🧠',
    heading: 'Motoren lærer deg å kjenne',
    body: 'Etter hvert svar oppdaterer vi feilprofilen din. Motoren vet hvilke konsepter du strever med, hvilke du glemmer over tid, og hva som er roten til problemet.',
    detail: [
      { icon: '📍', label: 'Substantivets kjønn', sub: 'Aktivt · 63%' },
      { icon: '📍', label: 'V2-regelen', sub: 'Svakt · 41%' },
      { icon: '🔒', label: 'Adjektivbøying', sub: 'Låst' },
    ],
    cta: 'Neste →',
  },
  {
    id: 'repair',
    emoji: '🔁',
    heading: 'Feil = læringen begynner',
    body: 'Når du svarer feil, starter reparasjonsløkken. Du får en forklaring, to målrettede miniøvelser og et nytt forsøk — før du fortsetter.',
    steps: [
      { icon: '✗', label: 'Feil svar', color: 'text-red-400' },
      { icon: '💡', label: 'Forklaring', color: 'text-yellow-400' },
      { icon: '🎯', label: 'Miniøvelse × 2', color: 'text-blue-400' },
      { icon: '↩', label: 'Nytt forsøk', color: 'text-nc-green' },
    ],
    cta: 'Neste →',
  },
]

const QUESTIONS = [
  {
    heading: 'Hvor mye norsk kan du fra før?',
    options: [
      { label: 'Ingenting — helt nybegynner', value: 'none', level: 'A1' as const },
      { label: 'Litt — kjenner noen ord', value: 'some', level: 'A1' as const },
      { label: 'Grunnleggende — enkle setninger', value: 'basic', level: 'A1' as const },
      { label: 'Middels — kan ha en samtale', value: 'intermediate', level: 'A2' as const },
    ],
  },
  {
    heading: 'Hva er vanskeligst for deg nå?',
    options: [
      { label: 'Ord og uttrykk', value: 'vocab' },
      { label: 'Grammatikk og ordstilling', value: 'grammar' },
      { label: 'Lytte og forstå', value: 'listening' },
      { label: 'Vet ikke ennå', value: 'unknown' },
    ],
  },
  {
    heading: 'Hva er målet ditt med norsk?',
    options: [
      { label: 'Jobb / integrering i Norge', value: 'work' },
      { label: 'Familie / sosialt', value: 'social' },
      { label: 'Reise / friluftsliv', value: 'travel' },
      { label: 'Akademisk / litteratur', value: 'academic' },
    ],
  },
]

const FIRST_CONCEPTS: Record<string, { label: string; sub: string }[]> = {
  'none,vocab':     [{ label: 'Personlige pronomen', sub: '~3 min' }, { label: 'Ubest. artikler (en/ei/et)', sub: '~4 min' }],
  'none,grammar':   [{ label: 'Personlige pronomen', sub: '~3 min' }, { label: 'Substantivets kjønn', sub: '~5 min' }],
  'some,grammar':   [{ label: 'Substantivets kjønn', sub: '~5 min' }, { label: 'V2-ordstilling', sub: '~6 min' }],
  'basic,grammar':  [{ label: 'V2-ordstilling', sub: '~6 min' }, { label: 'Adjektivbøying', sub: '~5 min' }],
  'intermediate,grammar': [{ label: 'V2-ordstilling', sub: '~6 min' }, { label: 'Adjektivbøying', sub: '~5 min' }],
}

function getFirstConcepts(answers: string[]) {
  const key = `${answers[0]},${answers[1]}`
  return (
    FIRST_CONCEPTS[key] ?? [
      { label: 'Personlige pronomen', sub: '~3 min' },
      { label: 'Ubest. artikler (en/ei/et)', sub: '~4 min' },
    ]
  )
}

// ─── Fingerprint seeding ──────────────────────────────────────────────────────

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

  // Set level from first answer
  const levelQuestion = QUESTIONS[0].options.find((o) => o.value === answers[0])
  if (levelQuestion && 'level' in levelQuestion) {
    fp.currentLevel = (levelQuestion as { label: string; value: string; level: 'A1' | 'A2' }).level
  }

  // Seed production gaps from second answer
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

// ─── Slide transitions ────────────────────────────────────────────────────────

const slideVariants = {
  enter: (dir: number) => ({ x: dir > 0 ? 60 : -60, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (dir: number) => ({ x: dir > 0 ? -60 : 60, opacity: 0 }),
}

const transition = { duration: 0.22, ease: [0.32, 0.72, 0, 1] as const }

// ─── Main component ───────────────────────────────────────────────────────────

export function OnboardingFlow() {
  const router = useRouter()
  const { setFingerprint } = useFingerprintStore()

  // Build step list: 3 intro slides + 3 quiz questions + ready
  const STEPS: Step[] = [
    ...INTRO_SLIDES.map((s) => ({ kind: 'intro' as const, id: s.id })),
    ...QUESTIONS.map((_, i) => ({ kind: 'quiz' as const, questionIndex: i })),
    { kind: 'ready' },
  ]

  const [stepIndex, setStepIndex] = useState(0)
  const [direction, setDirection] = useState(1)
  const [answers, setAnswers] = useState<string[]>([])
  const [selected, setSelected] = useState<string | null>(null)

  const currentStep = STEPS[stepIndex]
  const totalSteps = STEPS.length
  const progressPct = ((stepIndex) / (totalSteps - 1)) * 100

  function advance(value?: string) {
    const newAnswers = value !== undefined ? [...answers, value] : answers
    if (value !== undefined) setAnswers(newAnswers)

    if (stepIndex < STEPS.length - 1) {
      setDirection(1)
      setSelected(null)
      setStepIndex((i) => i + 1)
    } else {
      // Final step already shown — navigate to session
      seedFingerprint(newAnswers, setFingerprint)
      router.push('/session')
    }
  }

  function back() {
    if (stepIndex === 0) { router.push('/'); return }
    setDirection(-1)
    setSelected(null)
    setAnswers((a) => a.slice(0, -1))
    setStepIndex((i) => i - 1)
  }

  // Render the active step's content
  function renderStep(step: Step) {
    if (step.kind === 'intro') {
      const slide = INTRO_SLIDES.find((s) => s.id === step.id)
      if (!slide) return null
      return <IntroSlide key={step.id} slide={slide} onNext={() => advance()} />
    }
    if (step.kind === 'quiz') {
      const q = QUESTIONS[step.questionIndex]
      return (
        <QuizStep
          key={`quiz-${step.questionIndex}`}
          heading={q.heading}
          questionNumber={step.questionIndex + 1}
          totalQuestions={QUESTIONS.length}
          options={q.options}
          selected={selected}
          onSelect={(v) => {
            setSelected(v)
            setTimeout(() => advance(v), 180)
          }}
        />
      )
    }
    // ready
    const concepts = getFirstConcepts(answers)
    return (
      <ReadyStep
        key="ready"
        answers={answers}
        concepts={concepts}
        onStart={() => {
          seedFingerprint(answers, setFingerprint)
          router.push('/session')
        }}
      />
    )
  }

  return (
    <div className="flex min-h-dvh flex-col bg-nc-bg">
      {/* Top bar */}
      <div className="flex items-center gap-3 px-5 pt-5">
        <button
          onClick={back}
          className="text-[12px] font-semibold text-white/30 hover:text-white/60 transition-colors"
        >
          ← Tilbake
        </button>
        <div className="flex-1 h-[3px] overflow-hidden rounded-full bg-white/8">
          <motion.div
            className="h-full rounded-full bg-nc-green"
            animate={{ width: `${progressPct}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
        <span className="text-[11px] font-semibold text-white/25">
          {stepIndex + 1}/{totalSteps}
        </span>
      </div>

      {/* Step content */}
      <div className="mx-auto flex w-full max-w-sm flex-1 overflow-hidden px-5 pb-10 pt-6">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={stepIndex}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={transition}
            className="flex w-full flex-1 flex-col"
          >
            {renderStep(currentStep)}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}

// ─── Intro slide ──────────────────────────────────────────────────────────────

function IntroSlide({
  slide,
  onNext,
}: {
  slide: typeof INTRO_SLIDES[number]
  onNext: () => void
}) {
  return (
    <div className="flex flex-1 flex-col gap-6">
      {/* Emoji hero */}
      <motion.div
        initial={{ scale: 0.7, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.05, duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
        className="flex h-20 w-20 items-center justify-center rounded-3xl border border-nc-border bg-nc-card text-4xl"
      >
        {slide.emoji}
      </motion.div>

      {/* Text */}
      <div className="space-y-2">
        <motion.h1
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.3 }}
          className="text-[26px] font-extrabold leading-tight tracking-tight text-white"
        >
          {slide.heading}
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.3 }}
          className="text-[14px] leading-relaxed text-white/50"
        >
          {slide.body}
        </motion.p>
      </div>

      {/* Fingerprint slide extras */}
      {'detail' in slide && slide.detail && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.3 }}
          className="rounded-2xl border border-nc-border bg-nc-card p-4 space-y-2"
        >
          <div className="text-[10px] font-bold uppercase tracking-widest text-white/25 mb-3">
            Din konseptprofil (eksempel)
          </div>
          {slide.detail.map((d) => (
            <div key={d.label} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm">{d.icon}</span>
                <span className="text-[13px] font-semibold text-white/80">{d.label}</span>
              </div>
              <span className="text-[11px] font-semibold text-white/35">{d.sub}</span>
            </div>
          ))}
        </motion.div>
      )}

      {/* Repair loop slide extras */}
      {'steps' in slide && slide.steps && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.3 }}
          className="rounded-2xl border border-nc-border bg-nc-card p-4"
        >
          <div className="flex items-center gap-0">
            {slide.steps.map((s, i) => (
              <div key={s.label} className="flex items-center">
                <div className="flex flex-col items-center gap-1">
                  <span className={`text-lg ${s.color}`}>{s.icon}</span>
                  <span className="text-[10px] font-semibold text-white/40 text-center leading-tight max-w-[56px]">
                    {s.label}
                  </span>
                </div>
                {i < slide.steps.length - 1 && (
                  <span className="mx-2 text-white/20 text-sm">→</span>
                )}
              </div>
            ))}
          </div>
        </motion.div>
      )}

      <div className="flex-1" />

      <button
        onClick={onNext}
        className="w-full rounded-xl bg-nc-green py-4 text-sm font-extrabold text-[#0d0d14] transition-transform active:scale-[0.98]"
      >
        {slide.cta}
      </button>
    </div>
  )
}

// ─── Quiz step ────────────────────────────────────────────────────────────────

function QuizStep({
  heading,
  questionNumber,
  totalQuestions,
  options,
  selected,
  onSelect,
}: {
  heading: string
  questionNumber: number
  totalQuestions: number
  options: { label: string; value: string }[]
  selected: string | null
  onSelect: (v: string) => void
}) {
  return (
    <div className="flex flex-1 flex-col gap-5">
      {/* Question header */}
      <div>
        <div className="mb-2 text-[11px] font-semibold text-white/30">
          Spørsmål {questionNumber} av {totalQuestions}
        </div>
        <h2 className="text-[20px] font-extrabold leading-snug text-white">{heading}</h2>
      </div>

      {/* Options */}
      <div className="flex flex-col gap-3">
        {options.map((opt) => (
          <button
            key={opt.value}
            onClick={() => onSelect(opt.value)}
            className={`rounded-xl border px-4 py-3.5 text-left text-[14px] font-medium transition-all duration-150 ${
              selected === opt.value
                ? 'border-nc-green bg-nc-green/10 font-bold text-nc-green'
                : 'border-nc-border bg-nc-card text-white/70 hover:border-nc-green/40 hover:text-white'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  )
}

// ─── Ready step ───────────────────────────────────────────────────────────────

function ReadyStep({
  answers,
  concepts,
  onStart,
}: {
  answers: string[]
  concepts: { label: string; sub: string }[]
  onStart: () => void
}) {
  const levelAnswer = QUESTIONS[0].options.find((o) => o.value === answers[0])
  const level = levelAnswer && 'level' in levelAnswer
    ? (levelAnswer as { label: string; value: string; level: string }).level
    : 'A1'
  const isIntermediate = level === 'A2'

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      className="flex flex-1 flex-col gap-5"
    >
      {/* Hero */}
      <div className="flex flex-col items-center gap-3 pt-4 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-nc-green text-3xl font-black text-[#0d0d14]">
          {level}
        </div>
        <div>
          <h2 className="text-[22px] font-extrabold text-white">
            {isIntermediate ? 'Klar for A2!' : 'Klar for A1!'}
          </h2>
          <p className="mt-1 text-[13px] text-white/45">
            {isIntermediate
              ? 'Vi starter med grunnleggende grammatikk og bygger raskt videre.'
              : 'Vi starter med det viktigste grunnlaget og tilpasser oss etter hvert svar.'}
          </p>
        </div>
      </div>

      {/* First session preview */}
      <div className="rounded-2xl border border-nc-border bg-nc-card p-4 space-y-3">
        <div className="text-[10px] font-bold uppercase tracking-widest text-white/30">
          Din første økt
        </div>
        {concepts.map((c) => (
          <div key={c.label} className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-1.5 w-1.5 rounded-full bg-nc-green" />
              <span className="text-[13px] font-semibold text-white/80">{c.label}</span>
            </div>
            <span className="text-[11px] text-white/35">{c.sub}</span>
          </div>
        ))}
        <div className="border-t border-nc-border pt-2 text-[11px] text-white/30">
          Motoren tilpasser seg etter hvert svar du gir.
        </div>
      </div>

      {/* How it adapts */}
      <div className="rounded-xl border border-nc-border bg-[rgba(255,255,255,0.02)] px-4 py-3 space-y-2">
        {[
          { icon: '🎯', text: 'Reparasjonsløkken starter ved feil svar' },
          { icon: '📈', text: 'Øktplan oppdateres etter hver økt' },
          { icon: '🧠', text: 'AI forklarer nøyaktig hva du gjorde galt' },
        ].map((item) => (
          <div key={item.text} className="flex items-start gap-2.5">
            <span className="text-[14px]">{item.icon}</span>
            <span className="text-[12px] leading-relaxed text-white/50">{item.text}</span>
          </div>
        ))}
      </div>

      <div className="flex-1" />

      <button
        onClick={onStart}
        className="w-full rounded-xl bg-nc-green py-4 text-sm font-extrabold text-[#0d0d14] transition-transform active:scale-[0.98]"
      >
        Start første økt →
      </button>

      <button
        onClick={() => {
          seedFingerprint(answers, useFingerprintStore.getState().setFingerprint)
          window.location.href = '/dashboard'
        }}
        className="w-full text-center text-[12px] font-semibold text-white/25 hover:text-white/40 transition-colors"
      >
        Gå til dashbord først
      </button>
    </motion.div>
  )
}
