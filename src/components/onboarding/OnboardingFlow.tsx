'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import { useFingerprintStore } from '@/stores/fingerprint-store'
import { createEmptyFingerprint } from '@/types/fingerprint'
import type { MistakeFingerprint } from '@/types/fingerprint'
import { saveFingerprint, loadFingerprint } from '@/storage/indexeddb'
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
    label: '01 / AI coach',
    heading: 'Start med riktig flyt, ikke bare neste leksjon.',
    body:
      'NorskCoach bygger første steg rundt hvordan du faktisk lærer: hva du kan, hvor du stopper opp, og hva som bør trenes nå.',
    cta: 'Fortsett',
    highlights: [
      'Kort oppstart på mobilen',
      'AI-styrt nivåvalg',
      'Én læringsprofil på tvers av alle flater',
    ],
  },
  {
    id: 'fingerprint',
    label: '02 / Learning memory',
    heading: 'Motoren husker mønstrene dine.',
    body:
      'Etter hvert svar oppdateres læringsprofilen din. Systemet ser hva som sitter, hva som glipper, og hva som må repeteres før du mister det.',
    detail: [
      { icon: 'A', label: 'Substantiv og kjønn', sub: 'Aktiv · 63%' },
      { icon: 'V', label: 'V2-regelen', sub: 'Svakt · 41%' },
      { icon: 'B', label: 'Bisetninger', sub: 'Neste fokus' },
    ],
    cta: 'Neste',
  },
  {
    id: 'repair',
    label: '03 / Repair loops',
    heading: 'Hver feil blir til en målrettet loop.',
    body:
      'Når noe går galt, stopper appen ikke bare og markerer feil. Den forklarer raskt, trener akkurat det punktet, og lar deg prøve igjen med bedre støtte.',
    steps: [
      { icon: '01', label: 'Svar' },
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

async function seedFingerprintFromDiagnostic(
  result: DiagnosticResult,
  setFingerprint: (fp: MistakeFingerprint) => void,
) {
  const userId = getOrCreateUserId()
  const now = new Date().toISOString()

  const existing = await loadFingerprint(userId).catch(() => null)
  const fp: MistakeFingerprint = existing ?? createEmptyFingerprint(userId)

  fp.currentLevel = result.rawScore >= 0.55 ? 'A2' : result.cefrLevel
  fp.levelSetByUser = true

  for (const [conceptId, seed] of Object.entries(result.conceptSeeds)) {
    const existingMastery = fp.conceptMastery[conceptId]
    if (existingMastery) {
      const totalAttempts = existingMastery.attemptCount + seed.attemptCount
      const totalCorrect = existingMastery.correctCount + seed.correctCount
      const blendedRawScore = Math.round((totalCorrect / totalAttempts) * 100)
      fp.conceptMastery[conceptId] = {
        ...existingMastery,
        conceptId,
        attemptCount: totalAttempts,
        correctCount: totalCorrect,
        rawScore: blendedRawScore,
        decayedScore: blendedRawScore,
        confidenceScore: Math.min(1, existingMastery.confidenceScore + 0.1),
        lastAttemptAt: seed.lastAttemptAt ?? now,
        lastCorrectAt: seed.lastCorrectAt ?? existingMastery.lastCorrectAt,
        streak: seed.streak > 0 ? existingMastery.streak + seed.streak : 0,
        recentOutcomes: [...existingMastery.recentOutcomes, ...seed.recentOutcomes].slice(-10),
      }
    } else {
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
        recentOutcomes: seed.recentOutcomes,
        srsLevel: 0,
        nextReviewAt: new Date(Date.now() + 86400000).toISOString(),
      }
    }
  }

  const askedIdSet = new Set([
    ...(fp.askedDiagnosticQuestionIds ?? []),
    ...(result.askedQuestionIds ?? []),
  ])
  fp.askedDiagnosticQuestionIds = [...askedIdSet]

  fp.updatedAt = now
  setFingerprint(fp)
  await saveFingerprint(fp).catch(console.warn)
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

  const [stepIndex, setStepIndex] = useState(() => {
    if (typeof window === 'undefined') return 0
    const stored = window.sessionStorage.getItem('onboarding-step-index')
    const parsed = stored ? Number(stored) : 0
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0
  })
  const [direction, setDirection] = useState(1)
  const [diagnosticResult, setDiagnosticResult] = useState<DiagnosticResult | null>(null)

  useEffect(() => {
    if (typeof window === 'undefined') return
    window.sessionStorage.setItem('onboarding-step-index', String(stepIndex))
  }, [stepIndex])

  const currentStep = steps[stepIndex]

  function advanceTo(next: number) {
    setDirection(1)
    setStepIndex(next)
  }

  function back() {
    if (stepIndex === 0) {
      router.push('/')
      return
    }
    setDirection(-1)
    if (currentStep.kind === 'ready') {
      setStepIndex(INTRO_SLIDES.length - 1)
      return
    }
    setStepIndex((i) => i - 1)
  }

  function handleDiagnosticComplete(result: DiagnosticResult) {
    setDiagnosticResult(result)
    advanceTo(steps.findIndex((s) => s.kind === 'ready'))
  }

  useEffect(() => {
    if (!diagnosticResult) return
    seedFingerprintFromDiagnostic(diagnosticResult, setFingerprint).catch(console.warn)
  }, [diagnosticResult, setFingerprint])

  function commit(destination: '/session' | '/dashboard') {
    if (!diagnosticResult) return
    if (typeof window !== 'undefined') {
      window.sessionStorage.removeItem('onboarding-step-index')
    }
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
    <div className="nc-gradient-page flex flex-col">
      <div className="nc-mobile-shell relative z-10 flex items-center gap-3 px-4 pt-4">
        <button
          onClick={back}
          className="nc-glass-cream inline-flex h-11 w-11 items-center justify-center text-[var(--nc-cream-text)] transition-transform hover:-translate-y-0.5"
          aria-label="Tilbake"
        >
          <ArrowLeft size={16} />
        </button>

        <div className="nc-glass-cream flex flex-1 items-center gap-3 px-4 py-3">
          <div className="grid flex-1 grid-cols-5 gap-1.5">
            {steps.map((_, index) => (
              <div
                key={index}
                className={`h-1.5 rounded-full transition-colors ${
                  index <= stepIndex ? 'bg-[var(--nc-signal)]' : 'bg-[rgba(6,16,23,0.10)]'
                }`}
              />
            ))}
          </div>

          <span className="text-[11px] font-semibold tracking-[0.08em] text-[var(--nc-cream-muted)]">
            {stepIndex + 1}/{steps.length}
          </span>
        </div>
      </div>

      <div
        className="nc-mobile-shell relative z-10 flex w-full flex-1 overflow-hidden px-4 pb-10 pt-4"
        style={{ minHeight: 'calc(100dvh - 5rem)' }}
      >
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
    <div className="flex flex-1 flex-col gap-4">
      <div className="nc-glass-cream p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="nc-label text-[var(--nc-cream-dim)]">{slide.label}</div>
            <h1 className="mt-3 text-balance text-[2.1rem] leading-[0.94] text-[var(--nc-cream-text)]">
              {slide.heading}
            </h1>
            <p className="mt-3 text-pretty text-[0.95rem] leading-7 text-[var(--nc-cream-muted)]">
              {slide.body}
            </p>
          </div>

          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[1rem] bg-[var(--nc-signal)] text-sm font-bold text-[var(--nc-signal-fg)] shadow-[0_16px_32px_rgba(183,243,0,0.20)]">
            {slide.label.slice(0, 2)}
          </div>
        </div>

        <div className="mt-5 rounded-[1.35rem] bg-[rgba(6,16,23,0.92)] p-4 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
          {'highlights' in slide && slide.highlights ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-white/45">
                  Launch setup
                </span>
                <span className="nc-chip-signal rounded-full px-2.5 py-1 text-[10px] font-semibold">
                  AI guided
                </span>
              </div>
              <div className="space-y-2">
                {slide.highlights.map((item, index) => (
                  <div
                    key={item}
                    className="flex items-center justify-between rounded-[1rem] border border-white/8 bg-white/5 px-3 py-3"
                  >
                    <span className="text-sm font-medium text-white">{item}</span>
                    <span className="text-[11px] font-semibold text-white/35">0{index + 1}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : 'detail' in slide && slide.detail ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-white/45">
                  Fingerprint map
                </span>
                <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-white/30">
                  Live
                </span>
              </div>
              <div className="space-y-2">
                {slide.detail.map((item) => (
                  <div
                    key={item.label}
                    className="flex items-center justify-between rounded-[1rem] border border-white/8 bg-white/5 px-3 py-3"
                  >
                    <div className="flex items-center gap-3">
                      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[rgba(215,255,92,0.24)] text-[11px] font-bold text-[var(--nc-signal-fg)]">
                        {item.icon}
                      </span>
                      <span className="text-sm font-medium text-white">{item.label}</span>
                    </div>
                    <span className="text-xs font-semibold text-white/55">{item.sub}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : 'steps' in slide && slide.steps ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-white/45">
                  Repair flow
                </span>
                <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-white/30">
                  Focused
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                {slide.steps.map((item) => (
                  <div
                    key={item.label}
                    className="rounded-[1rem] border border-white/8 bg-white/5 px-3 py-3"
                  >
                    <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-white/32">
                      {item.icon}
                    </div>
                    <div className="mt-2 text-sm font-medium text-white">{item.label}</div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </div>

      <div className="nc-glass px-4 py-4">
        <div className="nc-label">Hva du får</div>
        <div className="mt-3 space-y-3">
          {[
            'Mobil først, med én tydelig handling per skjerm.',
            'Lys glassflate for lesing, mørke støtteflater for fokus.',
            'AI som styrer nivå, reparasjon og neste steg.',
          ].map((item) => (
            <div key={item} className="flex items-start gap-3">
              <span className="mt-1.5 h-2 w-2 rounded-full bg-[var(--nc-signal)]" />
              <p className="text-sm leading-7 text-[var(--nc-text-muted)]">{item}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="flex-1" />

      <button
        onClick={onNext}
        className="nc-button-primary inline-flex min-h-[54px] w-full items-center justify-center gap-2 px-6 text-sm font-bold"
      >
        <span>{slide.cta}</span>
        <ArrowRight size={16} />
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
      className="flex flex-1 flex-col gap-4"
    >
      <div className="nc-glass-cream p-5">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-[1rem] bg-[var(--nc-signal)] text-lg font-semibold text-[var(--nc-signal-fg)] shadow-[0_18px_40px_rgba(183,243,0,0.20)]">
          {level}
        </div>
        <h2 className="mt-4 text-center text-[2rem] leading-[0.96] text-[var(--nc-cream-text)]">
          Første økt er klar.
        </h2>
        <p className="mt-3 text-center text-sm leading-7 text-[var(--nc-cream-muted)]">
          Vi starter på {level}-nivå og justerer videre med en gang du begynner å svare.
        </p>

        <div className="mt-5 rounded-[1.3rem] bg-[rgba(6,16,23,0.94)] p-4 text-white">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-white/42">
              Første fokus
            </span>
            <span className="nc-chip-signal rounded-full px-2.5 py-1 text-[10px] font-semibold">
              10 min
            </span>
          </div>
          <div className="mt-3 space-y-2">
            {concepts.map((concept) => (
              <div
                key={concept.label}
                className="flex items-center justify-between rounded-[1rem] border border-white/8 bg-white/5 px-3 py-3"
              >
                <div className="flex items-center gap-3">
                  <span className="h-2.5 w-2.5 rounded-full bg-[var(--nc-signal)]" />
                  <span className="text-sm font-medium text-white">{concept.label}</span>
                </div>
                <span className="text-xs font-semibold text-white/50">{concept.sub}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="nc-glass p-4">
        <div className="nc-label">Systemet tilpasser seg slik</div>
        <div className="mt-3 space-y-3">
          {[
            'Feil aktiverer korte reparasjonsløkker med forklaring og nytt forsøk.',
            'Øktplanen endres etter hva du faktisk får til, ikke en fast pensumliste.',
            'Samtale, lesing og skriving deler samme læringsminne.',
          ].map((item) => (
            <div key={item} className="flex items-start gap-3">
              <span className="mt-1.5 h-2 w-2 rounded-full bg-[var(--nc-signal)]" />
              <p className="text-sm leading-7 text-[var(--nc-text-muted)]">{item}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="flex-1" />

      <button
        onClick={onStart}
        className="nc-button-primary inline-flex min-h-[54px] w-full items-center justify-center gap-2 px-6 text-sm font-bold"
      >
        <span>Start første økt</span>
        <ArrowRight size={16} />
      </button>

      <button
        onClick={onDashboard}
        className="text-sm font-medium text-[var(--nc-text-dim)] transition-colors hover:text-[var(--nc-text)]"
      >
        Gå til dashboard først
      </button>
    </motion.div>
  )
}
