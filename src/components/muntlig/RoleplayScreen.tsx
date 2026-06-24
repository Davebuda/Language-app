'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowRight, Mic, RotateCcw } from 'lucide-react'
import { BottomNav } from '@/components/layout/BottomNav'
import { useFingerprint } from '@/hooks/useFingerprint'
import { useFingerprintStore } from '@/stores/fingerprint-store'
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition'
import { normaliseWord, tokenise } from '@/lib/speechMatchUtils'
import { getRoleplayScenarios, getRoleplayContentLevel } from '@/lib/roleplayContent'
import type { RoleplayScenario, RoleplayTurn } from '@/lib/roleplayContent'
import { rankScenariosByFocusOverlap, scoreFocusOverlap } from '@/lib/roleplay-focus-scoring'
import type { ExerciseResult } from '@/types/session'
import { markLaneDone } from '@/lib/lane-completion'
import { useAuth } from '@/hooks/useAuth'
import { logExerciseResult } from '@/lib/logEvents'

const LISTEN_SECONDS = 5

function PulsingDot() {
  return (
    <motion.span
      className="inline-block size-2.5 rounded-full bg-[var(--nc-red)]"
      animate={{ scale: [1, 1.15, 1] }}
      transition={{ repeat: Infinity, duration: 1, ease: 'easeInOut' }}
      aria-hidden="true"
    />
  )
}

interface ScenarioCardProps {
  scenario: RoleplayScenario
  onSelect: (scenario: RoleplayScenario) => void
  isRecommended?: boolean
  index: number
}

function ScenarioCard({ scenario, onSelect, isRecommended, index }: ScenarioCardProps) {
  // Alternate dark / cream for visual rhythm
  const isEven = index % 2 === 0

  return (
    <motion.button
      onClick={() => onSelect(scenario)}
      aria-label={`Velg scenario: ${scenario.title}`}
      className={
        isEven
          ? 'w-full overflow-hidden rounded-[0.65rem] border border-[var(--nc-border)] bg-[var(--nc-card)] p-4 text-left shadow-[0_22px_46px_rgba(0,0,0,0.24)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--nc-signal)]'
          : 'w-full overflow-hidden rounded-[0.65rem] border border-[rgba(17,21,24,0.06)] bg-[var(--nc-cream)] p-4 text-left shadow-[0_12px_32px_rgba(0,0,0,0.12)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--nc-signal)]'
      }
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
      transition={{ duration: 0.15 }}
    >
      <div className="flex flex-col gap-2">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className={`text-[0.9375rem] font-bold leading-snug ${isEven ? 'text-[var(--nc-text)]' : 'text-[var(--nc-cream-text)]'}`}>
              {scenario.title}
            </p>
            <p className={`mt-0.5 text-[0.78rem] ${isEven ? 'text-[var(--nc-text-muted)]' : 'text-[var(--nc-cream-muted)]'}`}>
              {scenario.titleEnglish}
            </p>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1.5">
            {isRecommended ? (
              <span className="nc-chip-signal rounded-full px-2.5 py-0.5 text-[8px] font-bold uppercase tracking-[0.1em]">
                Anbefalt
              </span>
            ) : null}
            <span className={`rounded-full px-2.5 py-0.5 text-[8px] font-bold uppercase tracking-[0.1em] ${isEven ? 'border border-[color-mix(in_srgb,var(--nc-signal)_18%,transparent)] bg-[var(--nc-signal-tint)] text-[var(--nc-signal)]' : 'border border-[rgba(17,21,24,0.12)] bg-[rgba(17,21,24,0.07)] text-[var(--nc-cream-muted)]'}`}>
              Stemme
            </span>
          </div>
        </div>
        <p className={`text-pretty text-[0.78rem] leading-[1.5] ${isEven ? 'text-[var(--nc-text-muted)]' : 'text-[var(--nc-cream-muted)]'}`}>
          {scenario.setting}
        </p>
        <span className={`mt-0.5 inline-flex w-fit rounded-full border px-2.5 py-0.5 text-[0.6875rem] font-semibold ${isEven ? 'border-[var(--nc-signal-border)] bg-[var(--nc-signal-tint)] text-[var(--nc-signal)]' : 'border-[rgba(17,21,24,0.14)] bg-[rgba(17,21,24,0.06)] text-[var(--nc-cream-text)]'}`}>
          Med: {scenario.characterName}
        </span>
      </div>
    </motion.button>
  )
}

function isKeywordMatch(transcript: string, expectedKeywords: string[]): boolean {
  const normalisedTranscript = normaliseWord(transcript)
  const tokens = tokenise(normalisedTranscript)
  return expectedKeywords.some(
    (kw) => tokens.includes(kw) || normalisedTranscript.includes(kw),
  )
}

type ScreenPhase = 'selection' | 'turn' | 'complete'
type TurnPhase = 'prompt' | 'listening' | 'result' | 'fallback'

interface RoleplayTurnExerciseProps {
  scenario: RoleplayScenario
  turn: RoleplayTurn
  turnIndex: number
  totalTurns: number
  onComplete: (passed: boolean, transcript: string, skipped?: boolean) => void
}

function RoleplayTurnExercise({
  scenario,
  turn,
  turnIndex,
  totalTurns,
  onComplete,
}: RoleplayTurnExerciseProps) {
  const [turnPhase, setTurnPhase] = useState<TurnPhase>('prompt')
  const [currentTranscript, setCurrentTranscript] = useState('')
  const [retried, setRetried] = useState(false)
  const [progress, setProgress] = useState(0)
  const [passed, setPassed] = useState(false)

  const hasResolved = useRef(false)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const transcriptRef = useRef('')

  const {
    transcript,
    interimTranscript,
    isListening,
    isSupported,
    start,
    stop,
    reset,
  } = useSpeechRecognition()

  useEffect(() => {
    transcriptRef.current = transcript || interimTranscript
  }, [transcript, interimTranscript])

  useEffect(() => {
    reset()
    setCurrentTranscript('')
    setProgress(0)
    setRetried(false)
    setPassed(false)
    hasResolved.current = false
    setTurnPhase('prompt')
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [turn.id])

  const resolveResult = useCallback(
    (captured: string) => {
      const matched = isKeywordMatch(captured, turn.expectedKeywords)
      setCurrentTranscript(captured)
      setPassed(matched)

      if (!matched && !retried) {
        setTurnPhase('fallback')
      } else {
        setTurnPhase('result')
      }
    },
    [turn.expectedKeywords, retried],
  )

  useEffect(() => {
    if (turnPhase !== 'listening') return
    const startTime = Date.now()
    timerRef.current = setInterval(() => {
      const elapsed = (Date.now() - startTime) / 1000
      setProgress(Math.min(elapsed / LISTEN_SECONDS, 1))
      if (elapsed >= LISTEN_SECONDS) {
        if (timerRef.current) clearInterval(timerRef.current)
        if (!hasResolved.current) {
          hasResolved.current = true
          resolveResult(transcriptRef.current)
        }
      }
    }, 100)
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [turnPhase, resolveResult])

  useEffect(() => {
    if (turnPhase !== 'listening') return
    if (isListening) return
    if (!transcript) return
    if (hasResolved.current) return
    hasResolved.current = true
    if (timerRef.current) clearInterval(timerRef.current)
    resolveResult(transcript)
  }, [isListening, turnPhase, transcript, resolveResult])

  function handleStartListening() {
    reset()
    setCurrentTranscript('')
    setProgress(0)
    hasResolved.current = false
    setTurnPhase('listening')
    start()
  }

  function handleSkip() {
    if (timerRef.current) clearInterval(timerRef.current)
    stop()
    // Abstention — the learner never attempted this turn. Mark it skipped so the
    // parent does not log a diagnosed grammar error against a turn they declined.
    onComplete(false, '', true)
  }

  function handleRetryAfterFallback() {
    reset()
    setCurrentTranscript('')
    setProgress(0)
    hasResolved.current = false
    setRetried(true)
    setTurnPhase('prompt')
  }

  function handleContinueFromFallback() {
    // If no speech was captured, this is an abstention, not a failed attempt —
    // don't let an empty turn poison the error log.
    onComplete(false, currentTranscript, currentTranscript.trim().length === 0)
  }

  function handleNext() {
    onComplete(passed, currentTranscript)
  }

  return (
    <motion.div
      key={turn.id}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.28 }}
      className="flex flex-col gap-3"
    >
      {/* Progress header — lime panel */}
      <div className="nc-signal-panel p-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-[9px] font-bold uppercase tracking-[0.12em] text-[rgba(10,18,6,0.48)]">Scenario</div>
            <div className="mt-0.5 text-[0.84rem] font-bold text-[var(--nc-signal-fg)]">
              {scenario.title}
            </div>
          </div>
          <div className="rounded-full bg-[rgba(6,16,23,0.90)] px-2.5 py-1 text-[10px] font-bold tabular-nums text-white">
            {turnIndex + 1} / {totalTurns}
          </div>
        </div>
        <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-[rgba(6,16,23,0.14)]">
          <motion.div
            className="h-full origin-left rounded-full bg-[rgba(6,16,23,0.82)]"
            initial={{ scaleX: 0 }}
            animate={{ scaleX: (turnIndex + 1) / totalTurns }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
          />
        </div>
      </div>

      {/* Character line — cream panel */}
      <div className="nc-glass-cream p-3.5">
        <span className="text-[9px] font-bold uppercase tracking-[0.12em] text-[var(--nc-cream-dim)]">{scenario.characterName}</span>
        <p className="mt-2 text-balance text-[1.35rem] font-bold leading-tight text-[var(--nc-cream-text)]">
          {turn.character}
        </p>
        <p className="mt-1.5 text-pretty text-[0.8125rem] leading-[1.5] text-[var(--nc-cream-muted)]">
          {turn.characterEnglish}
        </p>
      </div>

      {/* Response area — dark panel */}
      <div className="nc-glass p-3.5">
        <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-[var(--nc-text-dim)]">Ditt svar</p>

        <AnimatePresence mode="wait">
          {turnPhase === 'prompt' ? (
            <motion.div
              key="prompt"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="mt-3 flex flex-col gap-3"
            >
              {!isSupported ? (
                <p className="text-pretty text-[0.8125rem] text-[var(--nc-text-muted)]">
                  Nettleseren støtter ikke talegjenkjenning. Prøv Chrome.
                </p>
              ) : (
                /* Mic button with orb-ring language */
                <div className="flex flex-col items-center gap-3 py-2">
                  <div className="relative" style={{ width: 72, height: 72 }}>
                    <motion.span
                      aria-hidden="true"
                      className="pointer-events-none absolute rounded-full"
                      style={{ inset: 0, border: '1px solid color-mix(in srgb, var(--nc-signal) 14%, transparent)' }}
                      animate={{ scale: [1, 1.07, 1], opacity: [1, 0.5, 1] }}
                      transition={{ duration: 3, ease: 'easeInOut', repeat: Infinity }}
                    />
                    <motion.span
                      aria-hidden="true"
                      className="pointer-events-none absolute rounded-full"
                      style={{ inset: 8, border: '1px solid color-mix(in srgb, var(--nc-signal) 10%, transparent)' }}
                      animate={{ scale: [1, 1.05, 1], opacity: [0.6, 1, 0.6] }}
                      transition={{ duration: 3, ease: 'easeInOut', repeat: Infinity, delay: 0.6 }}
                    />
                    <button
                      onClick={handleStartListening}
                      aria-label="Svar på karakterens linje"
                      className="absolute flex items-center justify-center rounded-full"
                      style={{
                        inset: 10,
                        background: 'radial-gradient(circle at 38% 32%, var(--nc-signal-glow) 0%, var(--nc-signal) 48%, var(--nc-signal-bright) 100%)',
                        boxShadow: '0 0 16px var(--nc-glow-strong), 0 0 40px var(--nc-glow), inset 0 2px 3px rgba(255,255,255,0.26)',
                      }}
                    >
                      <Mic size={18} style={{ color: 'var(--nc-bg)' }} aria-hidden="true" />
                    </button>
                  </div>
                  <span className="text-[0.72rem] font-semibold text-[var(--nc-text-dim)]">Trykk for å svare</span>
                </div>
              )}
            </motion.div>
          ) : null}

          {turnPhase === 'listening' ? (
            <motion.div
              key="listening"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="mt-3 flex flex-col gap-3"
            >
              {/* Active orb ring while listening */}
              <div className="flex flex-col items-center gap-2 py-1">
                <div className="relative" style={{ width: 64, height: 64 }}>
                  <motion.span
                    aria-hidden="true"
                    className="pointer-events-none absolute rounded-full"
                    style={{ inset: 0, border: '1.5px solid color-mix(in srgb, var(--nc-signal) 35%, transparent)' }}
                    animate={{ scale: [1, 1.14, 1], opacity: [1, 0.55, 1] }}
                    transition={{ duration: 1.1, ease: 'easeInOut', repeat: Infinity }}
                  />
                  <div
                    className="absolute flex items-center justify-center rounded-full"
                    style={{
                      inset: 8,
                      background: 'radial-gradient(circle at 38% 32%, var(--nc-signal-glow) 0%, var(--nc-signal) 48%, var(--nc-signal-bright) 100%)',
                      boxShadow: '0 0 28px var(--nc-glow-strong), 0 0 60px var(--nc-glow)',
                    }}
                  >
                    <PulsingDot />
                  </div>
                </div>
                <span className="text-[0.72rem] font-bold text-[var(--nc-signal)]">Lytter…</span>
              </div>

              <div
                className="h-[4px] w-full overflow-hidden rounded-full bg-[rgba(255,255,255,0.08)]"
                role="progressbar"
                aria-label="Nedtelling"
                aria-valuenow={Math.round(progress * 100)}
                aria-valuemin={0}
                aria-valuemax={100}
              >
                <div
                  className="h-full w-full origin-left rounded-full bg-[var(--nc-signal)]"
                  style={{
                    transform: `scaleX(${1 - progress})`,
                    transformOrigin: 'left center',
                    transition: 'none',
                  }}
                />
              </div>

              {interimTranscript || transcript ? (
                <p className="text-pretty text-[0.8125rem] italic text-[var(--nc-text-muted)]">
                  {interimTranscript || transcript}
                </p>
              ) : null}

              <button
                onClick={handleSkip}
                aria-label="Hopp over denne replikken"
                className="nc-button-dark w-full py-2.5 text-[0.8125rem] font-semibold"
              >
                Hopp over
              </button>
            </motion.div>
          ) : null}

          {turnPhase === 'result' ? (
            <motion.div
              key="result"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mt-3 flex flex-col gap-3"
            >
              <div className="rounded-[0.5rem] border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.04)] p-3">
                <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-[var(--nc-text-dim)]">Hva du sa</p>
                {currentTranscript ? (
                  <p className="mt-1.5 text-[0.9375rem] leading-relaxed text-[var(--nc-text)]">
                    {currentTranscript}
                  </p>
                ) : (
                  <p className="mt-1.5 text-pretty text-[0.8125rem] italic text-[var(--nc-text-muted)]">
                    Ingen lyd registrert.
                  </p>
                )}
              </div>

              <span
                className="inline-flex w-fit items-center gap-1.5 rounded-full px-3 py-1 text-[0.72rem] font-bold"
                style={
                  passed
                    ? {
                        background: 'var(--nc-signal-tint)',
                        border: '1px solid var(--nc-signal-border)',
                        color: 'var(--nc-signal)',
                      }
                    : {
                        background: 'var(--nc-red-tint)',
                        border: '1px solid var(--nc-red-border)',
                        color: 'var(--nc-red)',
                      }
                }
              >
                {passed ? 'Riktig retning' : 'Prøv å bruke norske nøkkelord'}
              </span>

              <button
                onClick={handleNext}
                aria-label={turnIndex + 1 < totalTurns ? 'Neste replikk' : 'Avslutt scenario'}
                className="nc-button-primary flex w-full items-center justify-center gap-2 py-3 text-[0.875rem] font-bold"
              >
                {turnIndex + 1 < totalTurns ? 'Neste replikk' : 'Avslutt'}
                <ArrowRight size={15} aria-hidden="true" />
              </button>
            </motion.div>
          ) : null}

          {turnPhase === 'fallback' ? (
            <motion.div
              key="fallback"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mt-3 flex flex-col gap-3"
            >
              <div className="rounded-[0.5rem] border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.04)] p-3">
                <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-[var(--nc-text-dim)]">Hva du sa</p>
                {currentTranscript ? (
                  <p className="mt-1.5 text-[0.9375rem] leading-relaxed text-[var(--nc-text)]">
                    {currentTranscript}
                  </p>
                ) : (
                  <p className="mt-1.5 text-pretty text-[0.8125rem] italic text-[var(--nc-text-muted)]">
                    Ingen lyd registrert.
                  </p>
                )}
              </div>

              <p className="text-pretty text-[0.8125rem] text-[var(--nc-text-muted)]">
                {turn.hint}
              </p>

              <div className="rounded-[0.5rem] bg-[rgba(6,16,23,0.94)] p-3.5">
                <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-[rgba(255,255,255,0.38)]">
                  Prøv å si
                </p>
                <p className="mt-1.5 text-[0.9375rem] font-semibold text-white">
                  {turn.modelAnswer}
                </p>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handleRetryAfterFallback}
                  aria-label="Prøv replikken igjen"
                  className="nc-button-dark flex flex-1 items-center justify-center gap-1.5 py-3 text-[0.8125rem] font-semibold"
                >
                  <RotateCcw size={13} aria-hidden="true" />
                  Prøv igjen
                </button>
                <button
                  onClick={handleContinueFromFallback}
                  aria-label="Fortsett til neste replikk"
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-[var(--radius)] bg-[rgba(6,16,23,0.94)] py-3 text-[0.8125rem] font-semibold text-white"
                >
                  Fortsett
                </button>
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    </motion.div>
  )
}

export function RoleplayScreen() {
  const router = useRouter()
  const { recordResult } = useFingerprint()
  const { setFingerprint } = useFingerprintStore()
  const { user } = useAuth()

  const currentLevel = useFingerprintStore.getState().fingerprint?.currentLevel ?? 'A1'
  const levelScenarios = getRoleplayScenarios(currentLevel)
  // Honest disclosure (Rule 6): A2 has no dedicated scenarios and reuses A1's —
  // surface that instead of substituting silently.
  const roleplayContentLevel = getRoleplayContentLevel(currentLevel)
  const isBelowLevelRoleplay = roleplayContentLevel !== currentLevel

  const [screenPhase, setScreenPhase] = useState<ScreenPhase>('selection')
  const [activeScenario, setActiveScenario] = useState<RoleplayScenario | null>(null)
  const [turnIndex, setTurnIndex] = useState(0)
  const [scores, setScores] = useState<boolean[]>([])

  function handleSelectScenario(scenario: RoleplayScenario) {
    setActiveScenario(scenario)
    setTurnIndex(0)
    setScores([])
    setScreenPhase('turn')
  }

  function handleTurnComplete(passed: boolean, transcript: string, skipped = false) {
    if (!activeScenario) return

    const turn = activeScenario.turns[turnIndex]
    if (!turn) return

    // An abstention (skipped, or no speech captured) is not a diagnosed mistake.
    // Recording a wrong result here would penalize mastery AND write a false
    // grammar error into recentErrors/productionGap — corrupting the very
    // diagnosis the product is built on. Only write a result for a real attempt.
    const attempted = !skipped && transcript.trim().length > 0
    if (passed || attempted) {
      const result: ExerciseResult = {
        sessionId: 'roleplay',
        itemId: `roleplay-${activeScenario.id}-${turn.id}`,
        correct: passed,
        userAnswer: transcript,
        correctAnswer: turn.modelAnswer,
        timeTakenSeconds: LISTEN_SECONDS,
        conceptId: turn.targetConceptId,
        sentenceId: undefined,
        errorTag: passed ? undefined : turn.errorTag,
      }
      recordResult(result)
      if (user?.id) {
        logExerciseResult(user.id, result)
      }
    }

    const newScores = [...scores, passed]
    setScores(newScores)

    const nextIndex = turnIndex + 1
    if (nextIndex >= activeScenario.turns.length) {
      const fp = useFingerprintStore.getState().fingerprint
      if (fp) {
        const minutesSpoken = activeScenario.turns.length * (LISTEN_SECONDS / 60)
        setFingerprint({
          ...fp,
          speakingMinutesTotal: (fp.speakingMinutesTotal ?? 0) + minutesSpoken,
          updatedAt: new Date().toISOString(),
        })
      }
      markLaneDone('roleplay')
      setScreenPhase('complete')
    } else {
      setTurnIndex(nextIndex)
    }
  }

  function handleTryAnother() {
    setActiveScenario(null)
    setTurnIndex(0)
    setScores([])
    setScreenPhase('selection')
  }

  const passedCount = scores.filter(Boolean).length
  const totalTurns = activeScenario?.turns.length ?? scores.length

  return (
    <div className="nc-gradient-page nc-secondary-flow flex min-h-dvh flex-col">
      <main className="nc-mobile-shell nc-flow-shell">
        <AnimatePresence mode="wait">

          {/* ── Selection ── */}
          {screenPhase === 'selection' ? (
            <motion.div
              key="selection"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col gap-3"
            >
              {/* Lime hero */}
              <div className="nc-signal-panel p-3">
                <div className="text-[9px] font-bold uppercase tracking-[0.12em] text-[rgba(10,18,6,0.48)]">Muntlig</div>
                <h1 className="mt-1 text-balance text-[1.35rem] font-extrabold leading-none text-[var(--nc-signal-fg)]">
                  Rollespill
                </h1>
                <p className="mt-1 text-[0.78rem] leading-[1.5] text-[rgba(10,18,6,0.62)]">
                  Stemme, scene, norsk svar.
                </p>

                {/* Feature chips — dark inset on lime */}
                <div className="mt-2.5 flex flex-wrap gap-1.5">
                  {['Talegjenkjenning', 'Mini-feedback', 'Muntlig flyt'].map((chip) => (
                    <span
                      key={chip}
                      className="rounded-full bg-[rgba(6,16,23,0.12)] px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.08em] text-[rgba(6,16,23,0.62)]"
                    >
                      {chip}
                    </span>
                  ))}
                </div>
              </div>

              {/* Scenario count strip — cream */}
              <div className="flex items-center justify-between rounded-[0.5rem] border border-[rgba(17,21,24,0.06)] bg-[var(--nc-cream)] px-3 py-2">
                <span className="text-[9px] font-bold uppercase tracking-[0.12em] text-[var(--nc-cream-dim)]">Scenarier</span>
                <span className="text-[0.82rem] font-bold tabular-nums text-[var(--nc-cream-text)]">{levelScenarios.length} tilgjengelig</span>
              </div>

              {/* Honest below-level disclosure (Rule 6 — no silent substitution) */}
              {isBelowLevelRoleplay ? (
                <div className="rounded-[0.5rem] border border-[var(--nc-border)] bg-[rgba(255,255,255,0.04)] px-3 py-2 text-[10px] leading-snug text-[var(--nc-text-dim)]">
                  Scenarier på {roleplayContentLevel}-nivå — egne {currentLevel}-scenarier kommer.
                </div>
              ) : null}

              {/* Scenario list */}
              <div className="flex flex-col gap-2">
                {(() => {
                  const fp = useFingerprintStore.getState().fingerprint
                  const focus = fp?.weeklyFocus ?? []
                  const ranked = rankScenariosByFocusOverlap(levelScenarios, focus)
                  const topHasOverlap = focus.length > 0 && ranked.length > 0 && scoreFocusOverlap(ranked[0], focus) > 0
                  return ranked.map((scenario, i) => (
                    <motion.div
                      key={scenario.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.22, delay: i * 0.06 }}
                    >
                      <ScenarioCard
                        scenario={scenario}
                        onSelect={handleSelectScenario}
                        isRecommended={topHasOverlap && i === 0}
                        index={i}
                      />
                    </motion.div>
                  ))
                })()}
              </div>
            </motion.div>
          ) : null}

          {/* ── Turn ── */}
          {screenPhase === 'turn' && activeScenario ? (
            <motion.div
              key={`turn-${activeScenario.id}-${turnIndex}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col gap-3"
            >
              {(() => {
                const currentTurn = activeScenario.turns[turnIndex]
                if (!currentTurn) return null
                return (
                  <RoleplayTurnExercise
                    scenario={activeScenario}
                    turn={currentTurn}
                    turnIndex={turnIndex}
                    totalTurns={activeScenario.turns.length}
                    onComplete={handleTurnComplete}
                  />
                )
              })()}
            </motion.div>
          ) : null}

          {/* ── Complete ── */}
          {screenPhase === 'complete' ? (
            <motion.div
              key="complete"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="flex flex-1 flex-col justify-center gap-3"
            >
              {/* Lime result panel */}
              <div className="nc-signal-panel p-4 text-center">
                <div className="text-[9px] font-bold uppercase tracking-[0.12em] text-[rgba(10,18,6,0.48)]">Scenario fullført</div>
                <h2 className="mt-2 text-balance text-[1.75rem] font-extrabold leading-[0.96] text-[var(--nc-signal-fg)]">
                  {passedCount === totalTurns ? 'Imponerende.' : 'Bra jobbet.'}
                </h2>

                {/* Score inset — dark on lime */}
                <div className="mt-4 rounded-[0.5rem] bg-[rgba(6,16,23,0.94)] p-4 text-white">
                  <div className="text-[2.75rem] font-extrabold tabular-nums leading-none text-[var(--nc-signal)]">
                    {passedCount}/{totalTurns}
                  </div>
                  <p className="mt-1.5 text-[0.78rem] text-[rgba(255,255,255,0.55)]">
                    replikker besvart riktig
                  </p>
                  <div className="mt-3 flex w-full gap-1.5">
                    {scores.map((score, i) => (
                      <div
                        key={i}
                        className="h-1.5 flex-1 rounded-full"
                        style={{
                          background: score ? 'var(--nc-signal)' : 'rgba(255,106,85,0.65)',
                        }}
                      />
                    ))}
                  </div>
                </div>

                <p className="mt-3 text-pretty text-[0.8125rem] text-[rgba(10,18,6,0.62)]">
                  {passedCount === totalTurns
                    ? 'Sterk leveranse. Fremgangen er registrert i læringsprofilen din.'
                    : passedCount >= Math.ceil(totalTurns / 2)
                      ? 'God fremgang. Prøv igjen for å få svarene enda mer naturlige.'
                      : 'Denne scenen trenger litt mer flyt. Kjør den gjerne på nytt.'}
                </p>
              </div>

              <div className="flex flex-col gap-2">
                <button
                  onClick={handleTryAnother}
                  aria-label="Prøv et annet scenario"
                  className="nc-button-primary w-full py-3.5 text-[0.875rem] font-bold"
                >
                  Prøv et annet scenario
                </button>

                <button
                  onClick={() => router.push('/dashboard')}
                  aria-label="Tilbake til dashboard"
                  className="nc-button-dark w-full rounded-[var(--radius)] py-3 text-[0.875rem] font-semibold"
                >
                  Til dashboard
                </button>
              </div>
            </motion.div>
          ) : null}

        </AnimatePresence>
      </main>

      <BottomNav active="snakk" />
    </div>
  )
}
