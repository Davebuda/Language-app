'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import { useFingerprintStore } from '@/stores/fingerprint-store'
import type { MistakeFingerprint } from '@/types/fingerprint'
import { saveFingerprint, loadFingerprint } from '@/storage/indexeddb'
import { buildSeededFingerprint } from '@/lib/seed-fingerprint'
import { DiagnosticQuiz } from './DiagnosticQuiz'
import { ThemePicker } from '@/components/theme/ThemePicker'
import { applyTheme, getStoredTheme, type ThemeName } from '@/lib/theme'
import type { DiagnosticResult } from '@/lib/diagnostic/engine'
import type { CEFRLevel } from '@/types/fingerprint'

type Step =
  | { kind: 'intro'; id: string }
  | { kind: 'theme' }
  | { kind: 'diagnostic' }
  | { kind: 'ready' }

const INTRO_SLIDES = [
  {
    id: 'welcome',
    label: '01 / Oppstart',
    heading: 'Riktig flyt fra start.',
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
    label: '02 / Læringsminne',
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
    label: '03 / Reparasjon',
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

const INTRO_LABELS = {
  welcome: '01 / Oppstart',
  fingerprint: '02 / Læringsminne',
  repair: '03 / Reparasjon',
} as const

const INTRO_BODIES = {
  welcome: 'Nivå, stoppunkter og første fokus settes før du starter.',
  fingerprint: 'Hvert svar oppdaterer profilen og holder neste fokus aktivt.',
  repair: 'Feil blir forklaring, miniøvelse og nytt forsøk.',
} as const

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
  const existing = await loadFingerprint(userId).catch(() => null)
  // Theme already lives in localStorage (set by applyTheme in the theme step);
  // the builder falls back to the existing value or the default.
  const fp = buildSeededFingerprint(existing, result, {
    userId,
    now: new Date().toISOString(),
    theme: getStoredTheme() ?? undefined,
  })
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
    { kind: 'theme' },
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
      // Skip back over the completed diagnostic to the theme step (re-running the
      // diagnostic on a back-press would be jarring); theme is a safe re-entry.
      setStepIndex(steps.findIndex((s) => s.kind === 'theme'))
      return
    }
    setStepIndex((i) => i - 1)
  }

  // D-01: hold the in-flight seed write so commit() can await it before navigating.
  // The destination re-bootstraps useFingerprint from IndexedDB and would clobber
  // the seeded level back to A1 on a fast click if saveFingerprint hadn't flushed.
  const seedPromiseRef = useRef<Promise<void> | null>(null)

  function handleDiagnosticComplete(result: DiagnosticResult) {
    setDiagnosticResult(result)
    // Kick the seed off the moment the diagnostic finishes (not in an effect) so
    // the promise exists before ReadyStep can be clicked — and exactly once, so the
    // mastery blend never double-counts.
    seedPromiseRef.current = seedFingerprintFromDiagnostic(result, setFingerprint).catch(console.warn)
    advanceTo(steps.findIndex((s) => s.kind === 'ready'))
  }

  async function commit(destination: '/session' | '/dashboard') {
    if (!diagnosticResult) return
    // Wait for the seed (level + mastery) to land in IndexedDB before navigating.
    await seedPromiseRef.current
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

    if (step.kind === 'theme') {
      return <ThemeStep onNext={() => advanceTo(stepIndex + 1)} />
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
    <div className="nc-gradient-page nc-secondary-flow flex flex-col">
      <div className="nc-mobile-shell relative z-10 flex items-center gap-3 px-1.5 pt-4">
        <button
          onClick={back}
          className="nc-glass inline-flex h-11 w-11 items-center justify-center text-[var(--nc-text)] transition-transform hover:-translate-y-0.5"
          aria-label="Tilbake"
        >
          <ArrowLeft size={16} />
        </button>

        <div className="nc-glass flex flex-1 items-center gap-3 px-3 py-2.5">
          <div
            className="grid flex-1 gap-1.5"
            style={{ gridTemplateColumns: `repeat(${steps.length}, 1fr)` }}
          >
            {steps.map((_, index) => (
              <div
                key={index}
                className={`h-1.5 rounded-full transition-colors ${
                  index <= stepIndex ? 'bg-[var(--nc-signal)]' : 'bg-[rgba(6,16,23,0.10)]'
                }`}
              />
            ))}
          </div>

          <span className="text-[11px] font-semibold tracking-[0.08em] text-[var(--nc-text-muted)]">
            {stepIndex + 1}/{steps.length}
          </span>
        </div>
      </div>

      <div
        className="nc-mobile-shell relative z-10 flex w-full flex-1 overflow-hidden px-1.5 pb-10 pt-4"
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

function ThemeStep({ onNext }: { onNext: () => void }) {
  const [selected, setSelected] = useState<ThemeName>(() => getStoredTheme() ?? 'honning')

  function pick(theme: ThemeName) {
    setSelected(theme)
    // Apply immediately so the onboarding screen itself recolors — a live preview
    // of what the learner is choosing. localStorage is written here too, so the
    // choice is baked into the fingerprint at diagnostic-seed time.
    applyTheme(theme)
  }

  return (
    <div className="flex flex-1 flex-col gap-[6px]">
      <div className="nc-signal-panel p-2.5">
        <div className="nc-label">Tema</div>
        <h1 className="mt-3 text-balance text-[1.8rem] leading-[0.94] text-[var(--nc-signal-fg)]">
          Velg ditt uttrykk.
        </h1>
        <p className="mt-3 text-pretty text-[0.95rem] leading-7 text-[rgba(8,17,13,0.72)]">
          Velg fargene appen skal ha. Du kan bytte når som helst i profilen.
        </p>

        <div className="mt-5 rounded-lg bg-[rgba(6,16,23,0.92)] p-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
          <ThemePicker value={selected} onSelect={pick} />
        </div>
      </div>

      <div className="flex-1" />

      <button
        onClick={onNext}
        className="nc-button-primary inline-flex min-h-[52px] w-full items-center justify-center gap-2 px-6 text-sm font-bold whitespace-nowrap"
        aria-label="Fortsett"
      >
        <span>Fortsett</span>
        <ArrowRight size={16} aria-hidden="true" />
      </button>
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
    <div className="flex flex-1 flex-col gap-[6px]">
      <div className="nc-signal-panel p-2.5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="nc-label">
              {INTRO_LABELS[slide.id] ?? slide.label}
            </div>
            <h1 className="mt-3 text-balance text-[1.8rem] leading-[0.94] text-[var(--nc-signal-fg)]">
              {slide.heading}
            </h1>
            <p className="mt-3 text-pretty text-[0.95rem] leading-7 text-[rgba(8,17,13,0.72)]">
              {INTRO_BODIES[slide.id] ?? slide.body}
            </p>
          </div>

          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[0.8rem] bg-[var(--nc-signal)] text-sm font-bold text-[var(--nc-signal-fg)] shadow-[0_16px_32px_var(--nc-glow-strong)]">
            {slide.label.slice(0, 2)}
          </div>
        </div>

        <div className="mt-5 rounded-lg bg-[rgba(6,16,23,0.92)] p-2.5 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
          {'highlights' in slide && slide.highlights ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-white/45">
                  Oppstart
                </span>
                <span className="nc-chip-signal rounded-full px-2.5 py-1 text-[10px] font-semibold">
                  AI
                </span>
              </div>
              <div className="space-y-2">
                {slide.highlights.map((item, index) => (
                  <div
                    key={item}
                    className="flex items-center justify-between rounded-lg border border-white/8 bg-white/5 px-3 py-3"
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
                  Eksempel
                </span>
                <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-white/30">
                  Illustrasjon
                </span>
              </div>
              <div className="space-y-2">
                {slide.detail.map((item) => (
                  <div
                    key={item.label}
                    className="flex items-center justify-between rounded-lg border border-white/8 bg-white/5 px-3 py-3"
                  >
                    <div className="flex items-center gap-3">
                      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--nc-signal-glow)_24%,transparent)] text-[11px] font-bold text-[var(--nc-signal-fg)]">
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
                  Loop
                </span>
                <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-white/30">
                  Fokus
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                {slide.steps.map((item) => (
                  <div
                    key={item.label}
                    className="rounded-lg border border-white/8 bg-white/5 px-3 py-3"
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

      <div className="flex-1" />

      <button
        onClick={onNext}
        className="nc-button-primary inline-flex min-h-[52px] w-full items-center justify-center gap-2 px-6 text-sm font-bold whitespace-nowrap"
        aria-label={slide.cta}
      >
        <span>{slide.cta}</span>
        <ArrowRight size={16} aria-hidden="true" />
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
      className="flex flex-1 flex-col gap-[6px]"
    >
      <div className="nc-signal-panel p-2.5">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-[0.8rem] bg-[var(--nc-signal)] text-base font-semibold text-[var(--nc-signal-fg)] shadow-[0_18px_40px_var(--nc-glow-strong)]">
          {level}
        </div>
        <h2 className="mt-4 text-center text-[1.7rem] leading-[0.96] text-[var(--nc-signal-fg)]">
          Første økt er klar.
        </h2>
        <p className="mt-3 text-center text-sm leading-7 text-[rgba(8,17,13,0.72)]">
          Vi starter på {level}-nivå og justerer videre med en gang du begynner å svare.
        </p>

        <div className="mt-5 rounded-lg bg-[rgba(6,16,23,0.94)] p-2.5 text-white">
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
                className="flex items-center justify-between rounded-lg border border-white/8 bg-white/5 px-3 py-3"
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

      {/* Cream stat strip */}
      <div className="grid grid-cols-3 overflow-hidden rounded-lg bg-[var(--nc-cream)] border border-[rgba(17,21,24,0.06)]">
        {[
          { label: 'Nivå', value: level },
          { label: 'Loop', value: 'På' },
          { label: 'Neste', value: 'Økt' },
        ].map((item, i) => (
          <div
            key={item.label}
            className={`px-2 py-2.5 text-center${i > 0 ? ' relative before:absolute before:left-0 before:top-[20%] before:h-[60%] before:w-px before:bg-[rgba(17,21,24,0.08)]' : ''}`}
          >
            <div className="text-[0.82rem] font-bold text-[var(--nc-cream-text)]">{item.value}</div>
            <div className="mt-0.5 text-[8px] font-bold uppercase tracking-[0.1em] text-[var(--nc-cream-dim)]">{item.label}</div>
          </div>
        ))}
      </div>

      <div className="flex-1" />

      <button
        onClick={onStart}
        className="nc-button-primary inline-flex min-h-[52px] w-full items-center justify-center gap-2 px-6 text-sm font-bold whitespace-nowrap"
        aria-label="Start første økt"
      >
        <span>Start første økt</span>
        <ArrowRight size={16} aria-hidden="true" />
      </button>

      <button
        onClick={onDashboard}
        className="text-[0.82rem] font-medium text-[var(--nc-text-dim)] transition-colors hover:text-[var(--nc-text)]"
        aria-label="Gå til dashboard først"
      >
        Gå til dashboard først
      </button>
    </motion.div>
  )
}
