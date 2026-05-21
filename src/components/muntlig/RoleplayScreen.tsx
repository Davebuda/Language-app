'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowRight, RotateCcw } from 'lucide-react'
import { BottomNav } from '@/components/layout/BottomNav'
import { useFingerprint } from '@/hooks/useFingerprint'
import { useFingerprintStore } from '@/stores/fingerprint-store'
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition'
import { normaliseWord, tokenise } from '@/lib/speechMatchUtils'
import { ROLEPLAY_SCENARIOS } from '@/lib/roleplayContent'
import type { RoleplayScenario, RoleplayTurn } from '@/lib/roleplayContent'
import type { ExerciseResult } from '@/types/session'

// ── Constants ─────────────────────────────────────────────────────────────────

const LISTEN_SECONDS = 5

// ── Sub-components ────────────────────────────────────────────────────────────

function PulsingDot() {
  return (
    <motion.span
      className="inline-block size-3 rounded-full bg-[var(--nc-red)]"
      animate={{ scale: [1, 1.15, 1] }}
      transition={{ repeat: Infinity, duration: 1, ease: 'easeInOut' }}
      aria-hidden="true"
    />
  )
}

// ── Scenario selection card ───────────────────────────────────────────────────

interface ScenarioCardProps {
  scenario: RoleplayScenario
  onSelect: (scenario: RoleplayScenario) => void
}

function ScenarioCard({ scenario, onSelect }: ScenarioCardProps) {
  return (
    <motion.button
      onClick={() => onSelect(scenario)}
      aria-label={`Velg scenario: ${scenario.title}`}
      className="nc-glass w-full rounded-xl p-5 text-left transition-colors hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--nc-red)]"
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
      transition={{ duration: 0.15 }}
    >
      <div className="flex flex-col gap-2">
        <p className="text-[1rem] font-bold leading-snug text-[var(--nc-text)]">
          {scenario.title}
        </p>
        <p className="text-pretty text-[0.8125rem] text-[var(--nc-text-muted)]">
          {scenario.titleEnglish}
        </p>
        <p className="text-pretty text-[0.8125rem] text-[var(--nc-text-dim)]">
          {scenario.setting}
        </p>
        <span
          className="mt-1 inline-flex w-fit rounded-full px-2.5 py-0.5 text-[0.6875rem] font-semibold"
          style={{
            background: 'var(--nc-teal-tint)',
            border: '1px solid var(--nc-teal-border)',
            color: 'var(--nc-teal)',
          }}
        >
          Med: {scenario.characterName}
        </span>
      </div>
    </motion.button>
  )
}

// ── Match helper ──────────────────────────────────────────────────────────────

function isKeywordMatch(transcript: string, expectedKeywords: string[]): boolean {
  const normalisedTranscript = normaliseWord(transcript)
  const tokens = tokenise(normalisedTranscript)
  return expectedKeywords.some(
    (kw) => tokens.includes(kw) || normalisedTranscript.includes(kw),
  )
}

// ── Types ─────────────────────────────────────────────────────────────────────

type ScreenPhase = 'selection' | 'turn' | 'complete'
type TurnPhase = 'prompt' | 'listening' | 'result' | 'fallback'

// ── Turn exercise component ───────────────────────────────────────────────────

interface RoleplayTurnExerciseProps {
  scenario: RoleplayScenario
  turn: RoleplayTurn
  turnIndex: number
  totalTurns: number
  onComplete: (passed: boolean, transcript: string) => void
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

  // Keep transcriptRef in sync with latest speech state
  useEffect(() => {
    transcriptRef.current = transcript || interimTranscript
  }, [transcript, interimTranscript])

  // Reset local state when turn changes
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
        // First fail — go to fallback for coaching
        setTurnPhase('fallback')
      } else {
        // Pass, or second fail — show final result
        setTurnPhase('result')
      }
    },
    [turn.expectedKeywords, retried],
  )

  // Countdown timer — starts when turnPhase enters 'listening'
  useEffect(() => {
    if (turnPhase !== 'listening') return
    const startTime = Date.now()
    timerRef.current = setInterval(() => {
      const elapsed = (Date.now() - startTime) / 1000
      setProgress(Math.min(elapsed / LISTEN_SECONDS, 1))
      if (elapsed >= LISTEN_SECONDS) {
        clearInterval(timerRef.current!)
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

  // Auto-advance when speech API fires a final result before the timer
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
    onComplete(false, '')
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
    onComplete(false, currentTranscript)
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
      className="flex flex-col gap-5"
    >
      {/* Progress indicator */}
      <div className="flex items-center gap-2">
        <span className="nc-label tabular-nums">{turnIndex + 1} / {totalTurns}</span>
        <div className="flex-1 h-[3px] overflow-hidden rounded-full bg-[var(--nc-border)]">
          <motion.div
            className="h-full w-full origin-left rounded-full bg-[var(--nc-red)]"
            initial={{ scaleX: 0 }}
            animate={{ scaleX: turnIndex / totalTurns }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
          />
        </div>
      </div>

      {/* Character card */}
      <div className="nc-glass-dark p-5 flex flex-col gap-2">
        <span className="nc-label text-[var(--nc-teal)]">{scenario.characterName}</span>
        <p className="text-balance text-[1.5rem] md:text-[1.75rem] font-bold leading-tight text-[var(--nc-text)]">
          {turn.character}
        </p>
        <p className="text-pretty text-[0.875rem] text-[var(--nc-text-muted)]">
          {turn.characterEnglish}
        </p>
      </div>

      {/* Response area */}
      <div className="nc-glass-elevated p-5 flex flex-col gap-4">
        <p className="nc-label text-[var(--nc-text-dim)]">Ditt svar</p>

        <AnimatePresence mode="wait">

          {/* ── Prompt ── */}
          {turnPhase === 'prompt' && (
            <motion.div
              key="prompt"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col gap-3"
            >
              {!isSupported && (
                <p className="text-pretty text-[0.8125rem] text-[var(--nc-text-muted)]">
                  Din nettleser støtter ikke talegjenkjenning. Prøv Chrome.
                </p>
              )}
              {isSupported && (
                <button
                  onClick={handleStartListening}
                  aria-label="Svar på karakterens linje"
                  className="nc-button-primary w-full py-3.5 text-[0.875rem] font-bold"
                >
                  Svar
                </button>
              )}
            </motion.div>
          )}

          {/* ── Listening ── */}
          {turnPhase === 'listening' && (
            <motion.div
              key="listening"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col gap-3"
            >
              <div className="flex items-center gap-2">
                <PulsingDot />
                <span className="text-[0.8125rem] font-semibold text-[var(--nc-red)]">
                  Lytter…
                </span>
              </div>

              {/* Countdown bar */}
              <div
                className="h-[4px] w-full overflow-hidden rounded-full"
                style={{ background: 'rgba(255,255,255,0.1)' }}
                role="progressbar"
                aria-label="Nedtelling"
                aria-valuenow={Math.round(progress * 100)}
                aria-valuemin={0}
                aria-valuemax={100}
              >
                <div
                  className="h-full w-full origin-left rounded-full bg-[var(--nc-red)]"
                  style={{
                    transform: `scaleX(${1 - progress})`,
                    transformOrigin: 'left center',
                    transition: 'none',
                  }}
                />
              </div>

              {(interimTranscript || transcript) && (
                <p className="text-pretty text-[0.875rem] italic text-[var(--nc-text-muted)]">
                  {interimTranscript || transcript}
                </p>
              )}

              <button
                onClick={handleSkip}
                aria-label="Hopp over denne replikken"
                className="w-full rounded-[var(--radius)] border border-[var(--nc-border)] bg-transparent py-2.5 text-[0.8125rem] font-semibold text-[var(--nc-text-muted)] hover:bg-[rgba(255,255,255,0.06)] hover:text-[var(--nc-text)]"
              >
                Hopp over
              </button>
            </motion.div>
          )}

          {/* ── Result (pass or retried fail) ── */}
          {turnPhase === 'result' && (
            <motion.div
              key="result"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex flex-col gap-4"
            >
              {/* Transcript display */}
              <div
                className="rounded-lg p-3"
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.09)',
                }}
              >
                <p className="nc-label mb-2">Hva du sa</p>
                {currentTranscript ? (
                  <p className="text-[1rem] leading-relaxed text-[var(--nc-text)]">
                    {currentTranscript}
                  </p>
                ) : (
                  <p className="text-pretty text-[0.875rem] italic text-[var(--nc-text-dim)]">
                    Ingen lyd registrert.
                  </p>
                )}
              </div>

              {/* Pass/fail badge */}
              <span
                className="inline-flex w-fit items-center gap-1.5 rounded-full px-3 py-1 text-[0.75rem] font-bold"
                style={
                  passed
                    ? {
                        background: 'var(--nc-green-tint)',
                        border: '1px solid var(--nc-green-border)',
                        color: 'var(--nc-green)',
                      }
                    : {
                        background: 'rgba(220,38,38,0.12)',
                        border: '1px solid rgba(220,38,38,0.28)',
                        color: 'var(--nc-red)',
                      }
                }
              >
                {passed ? 'Riktig svar!' : 'Prøv å bruke norske nøkkelord'}
              </span>

              <button
                onClick={handleNext}
                aria-label={turnIndex + 1 < totalTurns ? 'Neste replikk' : 'Avslutt scenario'}
                className="nc-button-primary flex w-full items-center justify-center gap-2 py-3 text-[0.875rem] font-bold"
              >
                {turnIndex + 1 < totalTurns ? 'Neste' : 'Avslutt'}
                <ArrowRight size={16} aria-hidden="true" />
              </button>
            </motion.div>
          )}

          {/* ── Fallback (first fail — coaching) ── */}
          {turnPhase === 'fallback' && (
            <motion.div
              key="fallback"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex flex-col gap-4"
            >
              {/* Transcript display */}
              <div
                className="rounded-lg p-3"
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.09)',
                }}
              >
                <p className="nc-label mb-2">Hva du sa</p>
                {currentTranscript ? (
                  <p className="text-[1rem] leading-relaxed text-[var(--nc-text)]">
                    {currentTranscript}
                  </p>
                ) : (
                  <p className="text-pretty text-[0.875rem] italic text-[var(--nc-text-dim)]">
                    Ingen lyd registrert.
                  </p>
                )}
              </div>

              {/* Hint text */}
              <p className="text-pretty text-[0.875rem] text-[var(--nc-text-muted)]">
                {turn.hint}
              </p>

              {/* Model answer */}
              <div
                className="rounded-lg p-3"
                style={{
                  background: 'var(--nc-teal-tint)',
                  border: '1px solid var(--nc-teal-border)',
                }}
              >
                <p className="nc-label mb-1.5" style={{ color: 'var(--nc-teal)' }}>
                  Prøv å si
                </p>
                <p className="text-[0.9375rem] font-semibold text-[var(--nc-text)]">
                  {turn.modelAnswer}
                </p>
              </div>

              {/* Two-button row */}
              <div className="flex gap-2">
                <button
                  onClick={handleRetryAfterFallback}
                  aria-label="Prøv replikken igjen"
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-[var(--radius)] border border-[var(--nc-border)] bg-transparent py-3 text-[0.8125rem] font-semibold text-[var(--nc-text-muted)] hover:bg-[rgba(255,255,255,0.06)] hover:text-[var(--nc-text)]"
                >
                  <RotateCcw size={13} aria-hidden="true" />
                  Prøv igjen
                </button>
                <button
                  onClick={handleContinueFromFallback}
                  aria-label="Fortsett til neste replikk"
                  className="nc-button-dark flex flex-1 items-center justify-center gap-1.5 py-3 text-[0.8125rem] font-semibold"
                >
                  Fortsett
                </button>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </motion.div>
  )
}

// ── Main RoleplayScreen ───────────────────────────────────────────────────────

export function RoleplayScreen() {
  const router = useRouter()
  const { recordResult } = useFingerprint()
  const { fingerprint, setFingerprint } = useFingerprintStore()

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

  function handleTurnComplete(passed: boolean, transcript: string) {
    if (!activeScenario) return

    const turn = activeScenario.turns[turnIndex]
    if (!turn) return

    // Record to fingerprint engine
    const result: ExerciseResult = {
      sessionId: 'roleplay',
      itemId: `roleplay-${activeScenario.id}-${turn.id}`,
      correct: passed,
      userAnswer: transcript,
      correctAnswer: turn.modelAnswer,
      timeTakenSeconds: LISTEN_SECONDS,
      conceptId: 'speaking-production',
      sentenceId: undefined,
      errorTag: passed ? undefined : 'listening-recognition',
    }
    recordResult(result)

    const newScores = [...scores, passed]
    setScores(newScores)

    const nextIndex = turnIndex + 1
    if (nextIndex >= activeScenario.turns.length) {
      // Scenario complete — increment speaking minutes
      if (fingerprint) {
        const minutesSpoken = activeScenario.turns.length * (LISTEN_SECONDS / 60)
        setFingerprint({
          ...fingerprint,
          speakingMinutesTotal: (fingerprint.speakingMinutesTotal ?? 0) + minutesSpoken,
          updatedAt: new Date().toISOString(),
        })
      }
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
    <div className="nc-gradient-page flex flex-col min-h-dvh">
      <main className="relative z-10 mx-auto flex w-full max-w-lg flex-1 flex-col px-5 pb-24 pt-5">
        <AnimatePresence mode="wait">

          {/* ── Scenario selection ── */}
          {screenPhase === 'selection' && (
            <motion.div
              key="selection"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col gap-4 pt-4"
            >
              {/* Page header */}
              <div className="mb-2">
                <h1 className="text-balance text-[1.375rem] font-extrabold text-[var(--nc-text)]">
                  Rollespill
                </h1>
                <p className="text-pretty mt-0.5 text-[0.8125rem] text-[var(--nc-text-muted)]">
                  Øv på hverdagslige samtaler på norsk
                </p>
              </div>

              {/* Feature chips */}
              <div className="flex flex-wrap gap-2">
                {['Samtalesimulator', 'Talegjenkjenning', 'Fingeravtrykk'].map((chip) => (
                  <span
                    key={chip}
                    className="nc-glass rounded-full px-3 py-1 text-[0.6875rem] font-semibold text-[var(--nc-text-dim)]"
                  >
                    {chip}
                  </span>
                ))}
              </div>

              {/* Scenario cards */}
              <div className="flex flex-col gap-3">
                {ROLEPLAY_SCENARIOS.map((scenario, i) => (
                  <motion.div
                    key={scenario.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.22, delay: i * 0.06 }}
                  >
                    <ScenarioCard scenario={scenario} onSelect={handleSelectScenario} />
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}

          {/* ── Turn ── */}
          {screenPhase === 'turn' && activeScenario && (
            <motion.div
              key={`turn-${activeScenario.id}-${turnIndex}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col gap-4 pt-4"
            >
              {/* Turn header */}
              <div className="mb-2">
                <h1 className="text-balance text-[1.375rem] font-extrabold text-[var(--nc-text)]">
                  {activeScenario.title}
                </h1>
                <p className="text-pretty mt-0.5 text-[0.8125rem] text-[var(--nc-text-muted)]">
                  Svar på norsk — du har {LISTEN_SECONDS} sekunder.
                </p>
              </div>

              {activeScenario.turns[turnIndex] && (
                <RoleplayTurnExercise
                  scenario={activeScenario}
                  turn={activeScenario.turns[turnIndex]!}
                  turnIndex={turnIndex}
                  totalTurns={activeScenario.turns.length}
                  onComplete={handleTurnComplete}
                />
              )}
            </motion.div>
          )}

          {/* ── Complete ── */}
          {screenPhase === 'complete' && (
            <motion.div
              key="complete"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="flex flex-1 flex-col items-center justify-center gap-6 py-12"
            >
              <div className="nc-glass-elevated w-full p-8 text-center flex flex-col items-center gap-5">
                <div className="nc-label">Scenario fullført</div>

                <h2 className="text-balance text-[1.75rem] font-extrabold text-[var(--nc-text)]">
                  {passedCount === totalTurns ? 'Imponerende!' : 'Bra jobbet!'}
                </h2>

                {/* Pass / total count */}
                <div className="flex flex-col items-center gap-1">
                  <span
                    className="text-[3rem] font-extrabold tabular-nums leading-none"
                    style={{
                      color:
                        passedCount >= Math.ceil(totalTurns / 2)
                          ? 'var(--nc-green)'
                          : 'var(--nc-red)',
                    }}
                  >
                    {passedCount}/{totalTurns}
                  </span>
                  <p className="text-pretty text-[0.8125rem] text-[var(--nc-text-muted)]">
                    replikker besvart riktig
                  </p>
                </div>

                {/* Per-turn breakdown bar */}
                <div className="flex w-full gap-1.5">
                  {scores.map((s, i) => (
                    <div
                      key={i}
                      className="flex-1 rounded-full h-2"
                      style={{
                        background: s
                          ? 'var(--nc-green)'
                          : 'rgba(220,38,38,0.55)',
                      }}
                      title={`Replikk ${i + 1}: ${s ? 'riktig' : 'feil'}`}
                      aria-label={`Replikk ${i + 1}: ${s ? 'riktig' : 'feil'}`}
                    />
                  ))}
                </div>

                <p className="text-pretty text-[0.875rem] text-[var(--nc-text-muted)]">
                  {passedCount === totalTurns
                    ? 'Fremragende! Fremgangen er registrert i fingeravtrykket ditt.'
                    : passedCount >= Math.ceil(totalTurns / 2)
                      ? 'Bra fremgang. Prøv å bruk flere norske nøkkelord neste gang.'
                      : 'Disse replikken er utfordrende — prøv igjen for å bygge flyt.'}
                </p>
              </div>

              <div className="flex w-full flex-col gap-3">
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
                  className="nc-button-dark w-full py-3 text-[0.875rem] font-semibold"
                >
                  Tilbake til dashboard
                </button>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </main>

      <BottomNav active="home" />
    </div>
  )
}
