'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import { useFingerprintStore } from '@/stores/fingerprint-store'
import { createEmptyFingerprint } from '@/types/fingerprint'
import { saveFingerprint } from '@/storage/indexeddb'
import { DiagnosticQuiz } from './DiagnosticQuiz'
import type { DiagnosticResult } from '@/lib/diagnostic/engine'
import type { CEFRLevel } from '@/types/fingerprint'

type Step =
  | { kind: 'intro'; id: string }
  | { kind: 'diagnostic' }
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

const FIRST_CONCEPTS_BY_LEVEL: Record<CEFRLevel, { label: string; sub: string }[]> = {
  A1: [
    { label: 'Personlige pronomen', sub: '~3 min' },
    { label: 'Ubestemte artikler', sub: '~4 min' },
  ],
  A2: [
    { label: 'V2-ordstilling', sub: '~6 min' },
    { label: 'Adjektivbøying', sub: '~5 min' },
  ],
  B1: [
    { label: 'Bisetningsordstilling', sub: '~7 min' },
    { label: 'Perfektum', sub: '~6 min' },
  ],
  B2: [
    { label: 'Kondisjonalis', sub: '~8 min' },
    { label: 'Avansert V2', sub: '~7 min' },
  ],
}

function getOrCreateUserId(): string {
  const stored = localStorage.getItem('norsk-coach-anon-id')
  if (stored) return stored
  const id = crypto.randomUUID()
  localStorage.setItem('norsk-coach-anon-id', id)
  return id
}

function seedFingerprintFromDiagnostic(
  result: DiagnosticResult,
  setFingerprint: (fp: ReturnType<typeof createEmptyFingerprint>) => void,
) {
  const userId = getOrCreateUserId()
  const fp = createEmptyFingerprint(userId)
  const now = new Date().toISOString()

  // Cap displayed level at A2 until B1/B2 graphs exist
  fp.currentLevel = result.rawScore >= 0.55 ? 'A2' : result.cefrLevel
  fp.levelSetByUser = true

  // Seed concept mastery from diagnostic answers
  for (const [conceptId, seed] of Object.entries(result.conceptSeeds)) {
    fp.conceptMastery[conceptId] = {
      conceptId,
      rawScore: seed.rawScore,
      confidenceScore: seed.confidenceScore,
      decayedScore: seed.decayedScore,
      attemptCount: seed.attemptCount,
      correctCount: seed.correctCount,
      uniqueDaysActive: seed.uniqueDaysActive,
      lastAttemptAt: seed.lastAttemptAt ?? now,
      lastCorrectAt: seed.lastCorrectAt,
      streak: seed.streak,
    }
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
    { kind: 'diagnostic' },
    { kind: 'ready' },
  ]

  const [stepIndex, setStepIndex] = useState(0)
  const [direction, setDirection] = useState(1)
  const [diagnosticResult, setDiagnosticResult] = useState<DiagnosticResult | null>(null)

  const currentStep = steps[stepIndex]

  function advanceTo(next: number) {
    setDirection(1)
    setStepIndex(next)
  }

  function back() {
    if (stepIndex === 0) { router.push('/'); return }
    setDirection(-1)
    // Back from ready → return to last intro slide (skip diagnostic re-run)
    if (currentStep.kind === 'ready') { setStepIndex(INTRO_SLIDES.length - 1); return }
    setStepIndex((i) => i - 1)
  }

  function handleDiagnosticComplete(result: DiagnosticResult) {
    setDiagnosticResult(result)
    advanceTo(steps.findIndex((s) => s.kind === 'ready'))
  }

  function commit(destination: '/session' | '/dashboard') {
    if (!diagnosticResult) return
    seedFingerprintFromDiagnostic(diagnosticResult, setFingerprint)
    router.push(destination)
  }

  function renderStep(step: Step) {
    if (step.kind === 'intro') {
      const slide = INTRO_SLIDES.find((item) => item.id === step.id)
      if (!slide) return null
      return <IntroSlide slide={slide} onNext={() => advanceTo(stepIndex + 1)} />
    }

    if (step.kind === 'diagnostic') {
      return <DiagnosticQuiz onComplete={handleDiagnosticComplete} />
    }

    return (
      <ReadyStep
        level={diagnosticResult?.cefrLevel ?? 'A1'}
        concepts={FIRST_CONCEPTS_BY_LEVEL[diagnosticResult?.cefrLevel ?? 'A1']}
        onStart={() => commit('/session')}
        onDashboard={() => commit('/dashboard')}
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

function ReadyStep({
  level,
  concepts,
  onStart,
  onDashboard,
}: {
  level: CEFRLevel
  concepts: { label: string; sub: string }[]
  onStart: () => void
  onDashboard: () => void
}) {

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
