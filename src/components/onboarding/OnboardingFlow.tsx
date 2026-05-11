'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import { useFingerprintStore } from '@/stores/fingerprint-store'
import { createEmptyFingerprint } from '@/types/fingerprint'
import { saveFingerprint } from '@/storage/indexeddb'

type Step =
  | { kind: 'intro'; id: string }
  | { kind: 'quiz'; questionIndex: number }
  | { kind: 'ready' }

const INTRO_SLIDES = [
  {
    id: 'welcome',
    label: '01 / Adaptive system',
    heading: 'En roligere vei til norsk flyt.',
    body: 'Ikke et standardkurs. NorskCoach ser hvor du stopper opp og bygger neste økt rundt akkurat det.',
    cta: 'Fortsett',
  },
  {
    id: 'fingerprint',
    label: '02 / Learning memory',
    heading: 'Motoren lærer svakhetene dine.',
    body: 'Etter hvert svar oppdateres læringsprofilen din. Systemet ser hva som glipper, hva som sitter, og hva som bør trenes først.',
    detail: [
      { icon: '•', label: 'Substantivets kjønn', sub: 'Aktivt · 63%' },
      { icon: '•', label: 'V2-regelen', sub: 'Svakt · 41%' },
      { icon: '•', label: 'Adjektivbøying', sub: 'Låst' },
    ],
    cta: 'Neste',
  },
  {
    id: 'repair',
    label: '03 / Repair loops',
    heading: 'Feil blir til målrettet trening.',
    body: 'Når du svarer feil, åpnes en kort reparasjonsløkke med forklaring, miniøvelse og et nytt forsøk før du går videre.',
    steps: [
      { icon: '01', label: 'Feil svar' },
      { icon: '02', label: 'Forklaring' },
      { icon: '03', label: 'Miniøvelse' },
      { icon: '04', label: 'Nytt forsøk' },
    ],
    cta: 'Neste',
  },
] as const

const QUESTIONS = [
  {
    heading: 'Hvor mye norsk kan du fra før?',
    options: [
      { label: 'Ingenting - helt nybegynner', value: 'none', level: 'A1' as const },
      { label: 'Litt - kjenner noen ord', value: 'some', level: 'A1' as const },
      { label: 'Grunnleggende - enkle setninger', value: 'basic', level: 'A1' as const },
      {
        label: 'Middels - jeg kan holde en samtale',
        value: 'intermediate',
        level: 'A2' as const,
      },
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
      { label: 'Jobb eller integrering i Norge', value: 'work' },
      { label: 'Familie og sosialt liv', value: 'social' },
      { label: 'Reise og friluftsliv', value: 'travel' },
      { label: 'Akademisk og litteratur', value: 'academic' },
    ],
  },
] as const

const FIRST_CONCEPTS: Record<string, { label: string; sub: string }[]> = {
  'none,vocab': [
    { label: 'Personlige pronomen', sub: '~3 min' },
    { label: 'Ubestemte artikler', sub: '~4 min' },
  ],
  'none,grammar': [
    { label: 'Personlige pronomen', sub: '~3 min' },
    { label: 'Substantivets kjønn', sub: '~5 min' },
  ],
  'some,grammar': [
    { label: 'Substantivets kjønn', sub: '~5 min' },
    { label: 'V2-ordstilling', sub: '~6 min' },
  ],
  'basic,grammar': [
    { label: 'V2-ordstilling', sub: '~6 min' },
    { label: 'Adjektivbøying', sub: '~5 min' },
  ],
  'intermediate,grammar': [
    { label: 'V2-ordstilling', sub: '~6 min' },
    { label: 'Adjektivbøying', sub: '~5 min' },
  ],
}

function getFirstConcepts(answers: string[]) {
  const key = `${answers[0]},${answers[1]}`
  return (
    FIRST_CONCEPTS[key] ?? [
      { label: 'Personlige pronomen', sub: '~3 min' },
      { label: 'Ubestemte artikler', sub: '~4 min' },
    ]
  )
}

function getOrCreateUserId(): string {
  const stored = localStorage.getItem('norsk-coach-anon-id')
  if (stored) return stored
  const id = crypto.randomUUID()
  localStorage.setItem('norsk-coach-anon-id', id)
  return id
}

function seedFingerprint(
  answers: string[],
  setFingerprint: (fp: ReturnType<typeof createEmptyFingerprint>) => void,
) {
  const userId = getOrCreateUserId()
  const fp = createEmptyFingerprint(userId)

  const levelQuestion = QUESTIONS[0].options.find((option) => option.value === answers[0])
  if (levelQuestion && 'level' in levelQuestion) {
    fp.currentLevel = levelQuestion.level
  }
  fp.levelSetByUser = true

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

const slideVariants = {
  enter: (direction: number) => ({ x: direction > 0 ? 48 : -48, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (direction: number) => ({ x: direction > 0 ? -48 : 48, opacity: 0 }),
}

const transition = { duration: 0.24, ease: [0.32, 0.72, 0, 1] as const }

export function OnboardingFlow() {
  const router = useRouter()
  const { setFingerprint } = useFingerprintStore()

  const steps: Step[] = [
    ...INTRO_SLIDES.map((slide) => ({ kind: 'intro' as const, id: slide.id })),
    ...QUESTIONS.map((_, index) => ({ kind: 'quiz' as const, questionIndex: index })),
    { kind: 'ready' },
  ]

  const [stepIndex, setStepIndex] = useState(0)
  const [direction, setDirection] = useState(1)
  const [answers, setAnswers] = useState<string[]>([])
  const [selected, setSelected] = useState<string | null>(null)

  const currentStep = steps[stepIndex]

  function advance(value?: string) {
    const nextAnswers = value !== undefined ? [...answers, value] : answers
    if (value !== undefined) setAnswers(nextAnswers)

    if (stepIndex < steps.length - 1) {
      setDirection(1)
      setSelected(null)
      setStepIndex((current) => current + 1)
      return
    }

    seedFingerprint(nextAnswers, setFingerprint)
    router.push('/session')
  }

  function back() {
    if (stepIndex === 0) {
      router.push('/')
      return
    }

    setDirection(-1)
    setSelected(null)
    if (currentStep.kind === 'quiz' || currentStep.kind === 'ready') {
      setAnswers((current) => current.slice(0, -1))
    }
    setStepIndex((current) => current - 1)
  }

  function goToDashboard() {
    seedFingerprint(answers, setFingerprint)
    router.push('/dashboard')
  }

  function renderStep(step: Step) {
    if (step.kind === 'intro') {
      const slide = INTRO_SLIDES.find((item) => item.id === step.id)
      if (!slide) return null
      return <IntroSlide slide={slide} onNext={() => advance()} />
    }

    if (step.kind === 'quiz') {
      const question = QUESTIONS[step.questionIndex]
      return (
        <QuizStep
          heading={question.heading}
          questionNumber={step.questionIndex + 1}
          totalQuestions={QUESTIONS.length}
          options={question.options}
          selected={selected}
          onSelect={(value) => {
            setSelected(value)
            setTimeout(() => advance(value), 180)
          }}
        />
      )
    }

    return (
      <ReadyStep
        answers={answers}
        concepts={getFirstConcepts(answers)}
        onStart={() => {
          seedFingerprint(answers, setFingerprint)
          router.push('/session')
        }}
        onDashboard={goToDashboard}
      />
    )
  }

  return (
    <div className="flex min-h-dvh flex-col bg-transparent">
      <div className="mx-auto flex w-full max-w-lg items-center gap-3 px-5 pt-5">
        <button
          onClick={back}
          className="inline-flex h-10 w-10 items-center justify-center rounded-[0.9rem] border border-nc-border bg-white text-nc-text-dim transition-colors hover:text-nc-text"
          aria-label="Tilbake"
        >
          <ArrowLeft size={14} />
        </button>

        <div className="grid flex-1 grid-cols-7 gap-1.5">
          {steps.map((_, index) => (
            <div
              key={index}
              className={`h-1.5 rounded-[0.4rem] transition-colors ${
                index <= stepIndex ? 'bg-nc-violet' : 'bg-[rgba(23,23,29,0.08)]'
              }`}
            />
          ))}
        </div>

        <span className="text-[11px] font-medium tracking-[0.08em] text-nc-text-dim">
          {stepIndex + 1}/{steps.length}
        </span>
      </div>

      <div className="mx-auto flex w-full max-w-lg flex-1 overflow-hidden px-5 pb-10 pt-6">
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

function IntroSlide({
  slide,
  onNext,
}: {
  slide: (typeof INTRO_SLIDES)[number]
  onNext: () => void
}) {
  return (
    <div className="flex flex-1 flex-col gap-5">
      <div className="nc-panel-dark min-h-[18rem] p-6">
        <div className="pointer-events-none absolute inset-0 opacity-45">
          <div className="nc-pattern-orbits absolute inset-0" />
          <div className="nc-topography absolute inset-x-0 bottom-0 h-40 opacity-70" />
        </div>

        <div className="relative z-[1] flex h-full flex-col justify-between">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="nc-label-light">{slide.label}</div>
              <h1 className="mt-4 max-w-[14rem] text-[2.25rem] leading-[0.96] text-white">
                {slide.heading}
              </h1>
              <p className="mt-4 max-w-[17rem] text-[15px] leading-7 text-white/62">
                {slide.body}
              </p>
            </div>

            <div className="hidden h-20 w-20 rounded-[1rem] border border-white/10 bg-white/5 sm:block">
              <div className="nc-pattern-orbits h-full w-full opacity-60" />
            </div>
          </div>

          <div className="text-sm text-white/46">Bygges rundt det du faktisk trenger.</div>
        </div>
      </div>

      {'detail' in slide && slide.detail ? (
        <div className="nc-panel p-4">
          <div className="nc-label">Eksempel på konseptprofil</div>
          <div className="mt-4 flex flex-col gap-3">
            {slide.detail.map((item) => (
              <div key={item.label} className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-nc-violet">{item.icon}</span>
                  <span className="text-sm font-medium text-nc-text">{item.label}</span>
                </div>
                <span className="text-xs font-semibold text-nc-text-dim">{item.sub}</span>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {'steps' in slide && slide.steps ? (
        <div className="nc-panel-soft p-4">
          <div className="nc-label">Reparasjonsflyt</div>
          <div className="mt-4 grid grid-cols-2 gap-3">
            {slide.steps.map((item, index) => (
              <div
                key={item.label}
                className="rounded-[0.95rem] border border-nc-border bg-white px-4 py-4"
              >
                <div className="text-[11px] font-medium tracking-[0.08em] text-nc-text-dim">
                  {item.icon}
                </div>
                <div className="mt-2 text-sm font-medium text-nc-text">{item.label}</div>
                <div className="mt-3 text-[11px] text-nc-text-dim">
                  {index < slide.steps.length - 1 ? 'Neste steg' : 'Klar for nytt forsøk'}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {!('detail' in slide) && !('steps' in slide) ? (
        <div className="nc-panel-soft p-4">
          <div className="nc-label">Hva du får</div>
          <div className="mt-4 grid gap-3">
            {[
              'En tydelig første økt med riktig nivå.',
              'Forklaringer når du svarer feil.',
              'Fremdrift som bygger på det du faktisk gjør.',
            ].map((item) => (
              <div key={item} className="flex items-start gap-3">
                <div className="mt-[0.45rem] h-1.5 w-1.5 rounded-full bg-nc-violet" />
                <p className="text-sm leading-7 text-nc-text-muted">{item}</p>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <div className="flex-1" />

      <button
        onClick={onNext}
        className="nc-button-dark inline-flex items-center justify-center gap-2 px-4 py-4 text-sm font-medium transition-transform hover:-translate-y-0.5"
      >
        <span>{slide.cta}</span>
        <ArrowRight size={15} />
      </button>
    </div>
  )
}

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
  options: readonly { label: string; value: string }[]
  selected: string | null
  onSelect: (value: string) => void
}) {
  return (
    <div className="flex flex-1 flex-col gap-5">
      <div className="nc-panel-dark p-5">
        <div className="pointer-events-none absolute inset-0 opacity-40">
          <div className="nc-pattern-orbits absolute inset-0" />
        </div>

        <div className="relative z-[1]">
          <div className="nc-label-light">
            Spørsmål {questionNumber} av {totalQuestions}
          </div>
          <h2 className="mt-3 max-w-[15rem] text-[1.95rem] leading-[0.98] text-white">
            {heading}
          </h2>
          <p className="mt-3 text-sm leading-7 text-white/58">
            Svarene former den første økten og hvilke konsepter vi prioriterer.
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        {options.map((option, index) => {
          const isSelected = selected === option.value

          return (
            <button
              key={option.value}
              onClick={() => onSelect(option.value)}
              className={`rounded-[0.95rem] border px-4 py-4 text-left transition-all ${
                isSelected
                  ? 'border-nc-violet/28 bg-nc-violet/12 text-nc-text shadow-[0_18px_30px_rgba(183,167,255,0.12)]'
                  : 'border-nc-border bg-white text-nc-text-muted hover:-translate-y-0.5 hover:text-nc-text'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className="pt-0.5 text-[11px] font-medium text-nc-text-dim">
                  0{index + 1}
                </div>
                <div className="text-sm font-medium leading-6">{option.label}</div>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

function ReadyStep({
  answers,
  concepts,
  onStart,
  onDashboard,
}: {
  answers: string[]
  concepts: { label: string; sub: string }[]
  onStart: () => void
  onDashboard: () => void
}) {
  const levelAnswer = QUESTIONS[0].options.find((option) => option.value === answers[0])
  const level = levelAnswer && 'level' in levelAnswer ? levelAnswer.level : 'A1'

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      className="flex flex-1 flex-col gap-5"
    >
      <div className="nc-panel-soft px-5 py-6 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-[1rem] bg-white shadow-[0_12px_24px_rgba(23,23,29,0.08)]">
          <span className="text-lg font-display font-semibold text-nc-text">{level}</span>
        </div>
        <h2 className="mt-4 text-[2rem] leading-[0.98] text-nc-text">Første økt er klar.</h2>
        <p className="mt-3 text-sm leading-7 text-nc-text-muted">
          Vi starter på {level}-nivå og justerer videre ut fra hvordan du svarer.
        </p>
      </div>

      <div className="nc-panel-dark p-5">
        <div className="relative z-[1]">
          <div className="nc-label-light">Din første økt</div>
          <div className="mt-4 flex flex-col gap-3">
            {concepts.map((concept) => (
              <div key={concept.label} className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-nc-green" />
                  <span className="text-sm font-medium text-white/88">{concept.label}</span>
                </div>
                <span className="text-xs font-semibold text-white/45">{concept.sub}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="nc-panel p-4">
        <div className="nc-label">Hvordan det tilpasser seg</div>
        <div className="mt-4 grid gap-3">
          {[
            'Reparasjonsløkker aktiveres når du svarer feil.',
            'Øktplanen oppdateres etter hver runde du fullfører.',
            'Samtale, lesing og skriving bruker samme læringsprofil.',
          ].map((item) => (
            <div key={item} className="flex items-start gap-3">
              <div className="mt-1 h-2 w-2 rounded-full bg-nc-violet" />
              <p className="text-sm leading-7 text-nc-text-muted">{item}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="flex-1" />

      <button
        onClick={onStart}
        className="nc-button-dark inline-flex items-center justify-center gap-2 px-4 py-4 text-sm font-medium transition-transform hover:-translate-y-0.5"
      >
        <span>Start første økt</span>
        <ArrowRight size={15} />
      </button>

      <button
        onClick={onDashboard}
        className="text-sm font-medium text-nc-text-dim transition-colors hover:text-nc-text"
      >
        Gå til dashboard først
      </button>
    </motion.div>
  )
}
