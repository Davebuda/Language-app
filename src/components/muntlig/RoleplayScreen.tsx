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
import { markLaneDone } from '@/lib/lane-completion'

const LISTEN_SECONDS = 5

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

interface ScenarioCardProps {
  scenario: RoleplayScenario
  onSelect: (scenario: RoleplayScenario) => void
}

function ScenarioCard({ scenario, onSelect }: ScenarioCardProps) {
  return (
    <motion.button
      onClick={() => onSelect(scenario)}
      aria-label={`Velg scenario: ${scenario.title}`}
      className="w-full rounded-[1.2rem] border border-white/14 bg-[rgba(247,251,245,0.96)] p-5 text-left shadow-[0_18px_38px_rgba(0,0,0,0.12),inset_0_1px_0_rgba(255,255,255,0.55)] transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--nc-signal)]"
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
      transition={{ duration: 0.15 }}
    >
      <div className="flex flex-col gap-2">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[1rem] font-bold leading-snug text-[var(--nc-cream-text)]">
              {scenario.title}
            </p>
            <p className="mt-1 text-[0.8125rem] text-[var(--nc-cream-muted)]">
              {scenario.titleEnglish}
            </p>
          </div>
          <span className="rounded-full bg-[rgba(6,16,23,0.08)] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--nc-cream-muted)]">
            Voice
          </span>
        </div>
        <p className="text-pretty text-[0.8125rem] text-[var(--nc-cream-muted)]">
          {scenario.setting}
        </p>
        <span className="mt-1 inline-flex w-fit rounded-full bg-[rgba(215,255,92,0.18)] px-2.5 py-1 text-[0.6875rem] font-semibold text-[var(--nc-signal-fg)]">
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
      className="flex flex-col gap-4"
    >
      <div className="nc-glass-cream p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="nc-label text-[var(--nc-cream-dim)]">Scenario</div>
            <div className="mt-1 text-sm font-semibold text-[var(--nc-cream-text)]">
              {scenario.title}
            </div>
          </div>
          <div className="rounded-full bg-[rgba(6,16,23,0.08)] px-3 py-1.5 text-[11px] font-semibold tabular-nums text-[var(--nc-cream-muted)]">
            {turnIndex + 1} / {totalTurns}
          </div>
        </div>
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-[rgba(6,16,23,0.08)]">
          <motion.div
            className="h-full origin-left rounded-full bg-[var(--nc-signal)]"
            initial={{ scaleX: 0 }}
            animate={{ scaleX: (turnIndex + 1) / totalTurns }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
          />
        </div>
      </div>

      <div className="nc-glass p-5">
        <span className="nc-label">{scenario.characterName}</span>
        <p className="mt-3 text-balance text-[1.5rem] font-bold leading-tight text-[var(--nc-text)]">
          {turn.character}
        </p>
        <p className="mt-2 text-pretty text-[0.875rem] text-[var(--nc-text-muted)]">
          {turn.characterEnglish}
        </p>
      </div>

      <div className="nc-glass-cream p-5">
        <p className="nc-label text-[var(--nc-cream-dim)]">Ditt svar</p>

        <AnimatePresence mode="wait">
          {turnPhase === 'prompt' ? (
            <motion.div
              key="prompt"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="mt-4 flex flex-col gap-3"
            >
              {!isSupported ? (
                <p className="text-pretty text-[0.8125rem] text-[var(--nc-cream-muted)]">
                  Nettleseren støtter ikke talegjenkjenning. Prøv Chrome.
                </p>
              ) : (
                <button
                  onClick={handleStartListening}
                  aria-label="Svar på karakterens linje"
                  className="nc-button-primary w-full py-3.5 text-[0.875rem] font-bold"
                >
                  Start svar
                </button>
              )}
            </motion.div>
          ) : null}

          {turnPhase === 'listening' ? (
            <motion.div
              key="listening"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="mt-4 flex flex-col gap-3"
            >
              <div className="flex items-center gap-2">
                <PulsingDot />
                <span className="text-[0.8125rem] font-semibold text-[var(--nc-red)]">
                  Lytter…
                </span>
              </div>

              <div
                className="h-[4px] w-full overflow-hidden rounded-full bg-[rgba(6,16,23,0.08)]"
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

              {interimTranscript || transcript ? (
                <p className="text-pretty text-[0.875rem] italic text-[var(--nc-cream-muted)]">
                  {interimTranscript || transcript}
                </p>
              ) : null}

              <button
                onClick={handleSkip}
                aria-label="Hopp over denne replikken"
                className="rounded-[1rem] border border-[rgba(6,16,23,0.12)] bg-white/55 py-2.5 text-[0.8125rem] font-semibold text-[var(--nc-cream-text)]"
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
              className="mt-4 flex flex-col gap-4"
            >
              <div className="rounded-[1rem] border border-[rgba(6,16,23,0.10)] bg-white/55 p-3">
                <p className="nc-label text-[var(--nc-cream-dim)]">Hva du sa</p>
                {currentTranscript ? (
                  <p className="mt-2 text-[1rem] leading-relaxed text-[var(--nc-cream-text)]">
                    {currentTranscript}
                  </p>
                ) : (
                  <p className="mt-2 text-pretty text-[0.875rem] italic text-[var(--nc-cream-muted)]">
                    Ingen lyd registrert.
                  </p>
                )}
              </div>

              <span
                className="inline-flex w-fit items-center gap-1.5 rounded-full px-3 py-1 text-[0.75rem] font-bold"
                style={
                  passed
                    ? {
                        background: 'rgba(215,255,92,0.18)',
                        border: '1px solid rgba(215,255,92,0.38)',
                        color: 'var(--nc-signal-fg)',
                      }
                    : {
                        background: 'rgba(255,106,85,0.10)',
                        border: '1px solid rgba(255,106,85,0.28)',
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
                <ArrowRight size={16} aria-hidden="true" />
              </button>
            </motion.div>
          ) : null}

          {turnPhase === 'fallback' ? (
            <motion.div
              key="fallback"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mt-4 flex flex-col gap-4"
            >
              <div className="rounded-[1rem] border border-[rgba(6,16,23,0.10)] bg-white/55 p-3">
                <p className="nc-label text-[var(--nc-cream-dim)]">Hva du sa</p>
                {currentTranscript ? (
                  <p className="mt-2 text-[1rem] leading-relaxed text-[var(--nc-cream-text)]">
                    {currentTranscript}
                  </p>
                ) : (
                  <p className="mt-2 text-pretty text-[0.875rem] italic text-[var(--nc-cream-muted)]">
                    Ingen lyd registrert.
                  </p>
                )}
              </div>

              <p className="text-pretty text-[0.875rem] text-[var(--nc-cream-muted)]">
                {turn.hint}
              </p>

              <div className="rounded-[1rem] bg-[rgba(6,16,23,0.94)] p-4 text-white">
                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-white/40">
                  Prøv å si
                </p>
                <p className="mt-2 text-[0.9375rem] font-semibold text-white">
                  {turn.modelAnswer}
                </p>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handleRetryAfterFallback}
                  aria-label="Prøv replikken igjen"
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-[1rem] border border-[rgba(6,16,23,0.12)] bg-white/55 py-3 text-[0.8125rem] font-semibold text-[var(--nc-cream-text)]"
                >
                  <RotateCcw size={13} aria-hidden="true" />
                  Prøv igjen
                </button>
                <button
                  onClick={handleContinueFromFallback}
                  aria-label="Fortsett til neste replikk"
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-[1rem] bg-[rgba(6,16,23,0.94)] py-3 text-[0.8125rem] font-semibold text-white"
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
    <div className="nc-gradient-page flex min-h-dvh flex-col">
      <main className="nc-mobile-shell relative z-10 flex w-full flex-1 flex-col px-4 pb-28 pt-4">
        <AnimatePresence mode="wait">
          {screenPhase === 'selection' ? (
            <motion.div
              key="selection"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col gap-4"
            >
              <div className="nc-glass-cream p-5">
                <div className="nc-label text-[var(--nc-cream-dim)]">Roleplay</div>
                <h1 className="mt-2 text-balance text-[2rem] leading-[0.96] text-[var(--nc-cream-text)]">
                  Tren korte hverdagsdialoger med stemme.
                </h1>
                <p className="mt-3 text-sm leading-7 text-[var(--nc-cream-muted)]">
                  Velg en scene, lytt til karakteren, og svar på norsk under lett tidspress.
                </p>

                <div className="mt-5 rounded-[1.3rem] bg-[rgba(6,16,23,0.94)] p-4 text-white">
                  <div className="flex flex-wrap gap-2">
                    {['Talegjenkjenning', 'Mini-feedback', 'Muntlig flyt'].map((chip) => (
                      <span
                        key={chip}
                        className="rounded-full bg-white/8 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-white/58"
                      >
                        {chip}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

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
          ) : null}

          {screenPhase === 'turn' && activeScenario ? (
            <motion.div
              key={`turn-${activeScenario.id}-${turnIndex}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col gap-4"
            >
              <div className="nc-glass-cream p-4">
                <div className="nc-label text-[var(--nc-cream-dim)]">Aktiv scene</div>
                <h1 className="mt-2 text-balance text-[1.55rem] leading-tight text-[var(--nc-cream-text)]">
                  {activeScenario.title}
                </h1>
                <p className="mt-2 text-sm leading-7 text-[var(--nc-cream-muted)]">
                  Svar på norsk. Du har {LISTEN_SECONDS} sekunder når opptaket starter.
                </p>
              </div>

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

          {screenPhase === 'complete' ? (
            <motion.div
              key="complete"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="flex flex-1 flex-col justify-center gap-4"
            >
              <div className="nc-glass-cream p-6 text-center">
                <div className="nc-label text-[var(--nc-cream-dim)]">Scenario fullført</div>
                <h2 className="mt-3 text-balance text-[1.9rem] leading-[0.96] text-[var(--nc-cream-text)]">
                  {passedCount === totalTurns ? 'Imponerende.' : 'Bra jobbet.'}
                </h2>

                <div className="mt-5 rounded-[1.3rem] bg-[rgba(6,16,23,0.94)] p-4 text-white">
                  <div className="text-[3rem] font-extrabold leading-none" style={{ color: 'var(--nc-signal)' }}>
                    {passedCount}/{totalTurns}
                  </div>
                  <p className="mt-2 text-[0.8125rem] text-white/62">
                    replikker besvart riktig
                  </p>
                  <div className="mt-4 flex w-full gap-1.5">
                    {scores.map((score, i) => (
                      <div
                        key={i}
                        className="h-2 flex-1 rounded-full"
                        style={{
                          background: score ? 'var(--nc-signal)' : 'rgba(255,106,85,0.65)',
                        }}
                      />
                    ))}
                  </div>
                </div>

                <p className="mt-4 text-pretty text-[0.875rem] text-[var(--nc-cream-muted)]">
                  {passedCount === totalTurns
                    ? 'Sterk leveranse. Fremgangen er registrert i læringsprofilen din.'
                    : passedCount >= Math.ceil(totalTurns / 2)
                      ? 'God fremgang. Prøv igjen for å få svarene enda mer naturlige.'
                      : 'Denne scenen trenger litt mer flyt. Kjør den gjerne på nytt.'}
                </p>
              </div>

              <div className="flex flex-col gap-3">
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
                  className="nc-glass w-full rounded-[1rem] py-3 text-[0.875rem] font-semibold text-[var(--nc-text)]"
                >
                  Til dashboard
                </button>
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </main>

      <BottomNav active="home" />
    </div>
  )
}
