'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowRight, Mic } from 'lucide-react'
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition'
import {
  KARI_GREETING,
  KARI_QUESTIONS,
  KARI_CLOSING,
  estimateLevelFromTranscript,
  saveVoiceOnboardingResult,
  type VoiceOnboardingTurn,
} from '@/lib/voice-onboarding'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CarouselCard {
  outcome: string
  sub: string
}

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------

const CAROUSEL_CARDS: CarouselCard[] = [
  {
    outcome: 'Bestill kaffe på norsk.',
    sub: 'Fra første ord til flytende hverdagsspråk.',
  },
  {
    outcome: 'Forstå kollegaene dine.',
    sub: 'Arbeidslivet krever mer enn læreboka.',
  },
  {
    outcome: 'Skriv en jobbsøknad.',
    sub: 'Formelt norsk uten å gjette deg frem.',
  },
  {
    outcome: 'Stå trygt i Norskprøven.',
    sub: 'Målrettet øving på nøyaktig det du mangler.',
  },
]

const AVATAR_SEEDS = [
  { initial: 'D', bg: '#C8FF20', fg: '#0A1206' },
  { initial: 'K', bg: '#6de5ff', fg: '#061017' },
  { initial: 'M', bg: '#ff8f62', fg: '#1a0a06' },
  { initial: 'A', bg: '#C8FF20', fg: '#0A1206' },
  { initial: 'S', bg: '#7dffb2', fg: '#062212' },
]

// ---------------------------------------------------------------------------
// Carousel sub-component
// ---------------------------------------------------------------------------

function Carousel() {
  const [activeIndex, setActiveIndex] = useState(0)
  const [direction, setDirection] = useState<1 | -1>(1)

  const advance = useCallback(() => {
    setDirection(1)
    setActiveIndex((i) => (i + 1) % CAROUSEL_CARDS.length)
  }, [])

  useEffect(() => {
    const id = setInterval(advance, 4000)
    return () => clearInterval(id)
  }, [advance])

  function goTo(index: number) {
    setDirection(index > activeIndex ? 1 : -1)
    setActiveIndex(index)
  }

  const cardVariants = {
    enter: (dir: number) => ({ x: dir > 0 ? '110%' : '-110%', opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (dir: number) => ({ x: dir > 0 ? '-110%' : '110%', opacity: 0 }),
  }

  return (
    <div>
      {/* Track */}
      <div className="overflow-hidden">
        <div className="relative h-[88px]">
          <AnimatePresence initial={false} custom={direction} mode="popLayout">
            <motion.div
              key={activeIndex}
              custom={direction}
              variants={cardVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ type: 'spring', stiffness: 360, damping: 34, mass: 0.85 }}
              className="absolute inset-0"
              style={{ right: '22%' }}
              aria-live="polite"
              aria-atomic="true"
            >
              <div
                className="h-full rounded-[0.5rem] px-3 py-3"
                style={{ background: 'rgba(10,18,6,0.06)' }}
              >
                <p
                  className="text-[0.95rem] font-[800] leading-[1.15] tracking-[-0.02em]"
                  style={{ color: '#0A1206' }}
                >
                  {CAROUSEL_CARDS[activeIndex].outcome}
                </p>
                <p
                  className="mt-1 text-[10px] leading-[1.4]"
                  style={{ color: 'rgba(10,18,6,0.40)' }}
                >
                  {CAROUSEL_CARDS[activeIndex].sub}
                </p>
              </div>
            </motion.div>
          </AnimatePresence>

          {/* Peek ghost */}
          <div
            className="pointer-events-none absolute inset-y-0 right-0 rounded-[0.5rem]"
            style={{ width: '20%', background: 'rgba(10,18,6,0.04)' }}
            aria-hidden="true"
          />
        </div>
      </div>

      {/* Dots */}
      <div
        className="mt-2.5 flex items-center justify-center gap-[5px]"
        role="tablist"
        aria-label="Karusellindikatorer"
      >
        {CAROUSEL_CARDS.map((card, i) => (
          <button
            key={card.outcome}
            role="tab"
            aria-selected={i === activeIndex}
            aria-label={`Vis kort ${i + 1}: ${card.outcome}`}
            onClick={() => goTo(i)}
            className="rounded-full"
            style={{
              width: i === activeIndex ? '16px' : '5px',
              height: '5px',
              background: i === activeIndex ? '#0A1206' : 'rgba(10,18,6,0.14)',
              transition: 'width 0.2s ease, background 0.2s ease',
            }}
          />
        ))}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function HomePage() {
  return (
    <main
      className="min-h-dvh"
      style={{ background: 'linear-gradient(180deg, #2C2E30 0%, #343638 100%)' }}
    >
      <div className="nc-mobile-shell flex flex-col items-center px-0.5 py-5">
        {/* Phone frame — full lime gradient */}
        <div
          className="relative flex w-full flex-col overflow-hidden"
          style={{
            borderRadius: '1.2rem',
            background: 'linear-gradient(160deg, #C8FF20 0%, #B8EF10 60%, #AADD08 100%)',
            border: '1px solid rgba(255,255,255,0.08)',
            boxShadow: '0 24px 80px rgba(0,0,0,0.3)',
          }}
        >
          {/* ── Decorative absolute elements (behind content, z-0) ── */}

          {/* Concentric rings — top right */}
          <span
            aria-hidden="true"
            className="pointer-events-none absolute"
            style={{ right: '-50px', top: '20px', zIndex: 0 }}
          >
            <svg width="200" height="200" viewBox="0 0 200 200" fill="none" aria-hidden="true">
              {([100, 65, 30, 80] as const).map((r, idx) => (
                <circle
                  key={idx}
                  cx="100"
                  cy="100"
                  r={r}
                  stroke="rgba(10,18,6,0.07)"
                  strokeWidth="1.5"
                />
              ))}
            </svg>
          </span>

          {/* Starburst — top left */}
          <span
            aria-hidden="true"
            className="pointer-events-none absolute"
            style={{ left: '14px', top: '60px', width: '32px', height: '32px', zIndex: 0 }}
          >
            <svg viewBox="0 0 48 48" fill="none" aria-hidden="true">
              <path
                d="M24 0 L26 20 L48 24 L26 26 L24 48 L22 26 L0 24 L22 20 Z"
                fill="rgba(10,18,6,0.10)"
              />
            </svg>
          </span>

          {/* Dot cluster */}
          <span
            aria-hidden="true"
            className="pointer-events-none absolute flex gap-[5px]"
            style={{ left: '54px', top: '82px', zIndex: 0 }}
          >
            {[true, false, true].map((filled, i) => (
              <span
                key={i}
                style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  border: '1.5px solid rgba(10,18,6,0.10)',
                  background: filled ? 'rgba(10,18,6,0.07)' : 'transparent',
                  display: 'block',
                }}
              />
            ))}
          </span>

          {/* ── Main content — generous gaps, scrollable ── */}
          <div
            className="relative flex flex-col gap-6"
            style={{
              padding: '14px 16px 0',
              zIndex: 1,
            }}
          >
            {/* Topbar */}
            <div className="flex items-center justify-between">
              <span
                className="font-display text-[12px] font-[800]"
                style={{ color: '#0A1206' }}
              >
                NorskCoach
              </span>
              <Link
                href="/onboarding"
                className="rounded-[0.4rem] px-[14px] py-[6px] text-[11px] font-[600] text-white"
                style={{ background: '#0A1206' }}
                aria-label="Start kartlegging"
              >
                Start
              </Link>
            </div>

            {/* Headline block */}
            <div style={{ paddingTop: '8px' }}>
              <h1
                className="font-display leading-[1] tracking-[-0.03em]"
                style={{ fontSize: '1.8rem', fontWeight: 800, color: '#0A1206' }}
              >
                Snakk norsk. Trygt.
                <span
                  className="mt-[6px] block text-[0.88rem] font-[500] leading-[1.3]"
                  style={{ color: 'rgba(10,18,6,0.36)' }}
                >
                  Speak Norwegian. Confidently.
                </span>
              </h1>
              <p
                className="mt-[10px] text-[12px] leading-[1.5]"
                style={{ color: 'rgba(10,18,6,0.48)', maxWidth: '250px' }}
              >
                Diagnostisk coaching som finner svakhetene dine og fikser dem.
              </p>
            </div>

            {/* Carousel */}
            <Carousel />

            {/* Social proof row */}
            <div className="flex items-center gap-[10px]">
              <div className="flex">
                {AVATAR_SEEDS.map((av, i) => (
                  <div
                    key={av.initial}
                    aria-hidden="true"
                    className="flex items-center justify-center rounded-full text-[8px] font-[800]"
                    style={{
                      width: '24px',
                      height: '24px',
                      background: av.bg,
                      color: av.fg,
                      marginLeft: i === 0 ? 0 : '-6px',
                      border: '2px solid rgba(180,220,30,0.4)',
                      position: 'relative',
                      zIndex: AVATAR_SEEDS.length - i,
                    }}
                  >
                    {av.initial}
                  </div>
                ))}
              </div>
              <span className="text-[10px]" style={{ color: 'rgba(10,18,6,0.44)' }}>
                <strong style={{ fontWeight: 700, color: 'rgba(10,18,6,0.60)' }}>4.9 ★</strong>{' '}
                fra tidlige brukere
              </span>
            </div>

            {/* CTA block */}
            <div>
              <Link
                href="/onboarding"
                className="flex w-full items-center justify-between rounded-[0.5rem] py-[14px] px-[18px] text-[13px] font-[700] text-white"
                style={{ background: '#0A1206' }}
                aria-label="Start kartlegging — to minutter, gratis, ingen konto"
              >
                <span>Start kartlegging</span>
                <span
                  className="flex items-center justify-center rounded-full"
                  style={{
                    width: '28px',
                    height: '28px',
                    background: 'rgba(255,255,255,0.12)',
                  }}
                  aria-hidden="true"
                >
                  <ArrowRight size={13} />
                </span>
              </Link>
              <p
                className="mt-[5px] text-center text-[9px]"
                style={{ color: 'rgba(10,18,6,0.28)' }}
              >
                2 min · Gratis · Ingen konto
              </p>
            </div>
          </div>

          {/* ── Floating orb card — voice onboarding ── */}
          <VoiceOrbCard />
        </div>
      </div>
    </main>
  )
}

// ---------------------------------------------------------------------------
// Voice Orb Card — inline voice conversation with Kari
// ---------------------------------------------------------------------------

type OrbState = 'idle' | 'greeting' | 'listening' | 'processing' | 'speaking' | 'complete'

const ORB_RING_VARIANTS: Record<OrbState, { scale: number[]; opacity: number[]; duration: number }> = {
  idle:       { scale: [1, 1.06, 1], opacity: [1, 0.45, 1], duration: 3.5 },
  greeting:   { scale: [1, 1.04, 1], opacity: [0.7, 1, 0.7], duration: 2 },
  listening:  { scale: [1, 1.12, 1], opacity: [1, 0.6, 1], duration: 1.2 },
  processing: { scale: [1, 1.02, 1], opacity: [0.4, 0.6, 0.4], duration: 2 },
  speaking:   { scale: [1, 1.06, 1], opacity: [0.8, 1, 0.8], duration: 1.8 },
  complete:   { scale: [1, 1.03, 1], opacity: [0.6, 0.8, 0.6], duration: 3 },
}

const ORB_GLOW: Record<OrbState, string> = {
  idle:       '0 0 16px rgba(200,255,32,0.25), 0 0 40px rgba(200,255,32,0.08)',
  greeting:   '0 0 22px rgba(200,255,32,0.35), 0 0 50px rgba(200,255,32,0.12)',
  listening:  '0 0 28px rgba(200,255,32,0.45), 0 0 60px rgba(200,255,32,0.18)',
  processing: '0 0 12px rgba(200,255,32,0.15), 0 0 30px rgba(200,255,32,0.06)',
  speaking:   '0 0 22px rgba(109,229,255,0.30), 0 0 50px rgba(109,229,255,0.10)',
  complete:   '0 0 18px rgba(200,255,32,0.30), 0 0 44px rgba(200,255,32,0.10)',
}

function speakText(text: string): Promise<void> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) {
      resolve()
      return
    }
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = 'nb-NO'
    utterance.rate = 0.9
    utterance.onend = () => resolve()
    utterance.onerror = () => resolve()
    window.speechSynthesis.speak(utterance)
  })
}

function VoiceOrbCard() {
  const [orbState, setOrbState] = useState<OrbState>('idle')
  const [transcript, setTranscript] = useState<VoiceOnboardingTurn[]>([])
  const [currentTurn, setCurrentTurn] = useState(0)
  const [textInput, setTextInput] = useState('')
  const [statusText, setStatusText] = useState('Trykk for å starte')
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const speech = useSpeechRecognition()

  // 2-minute global timeout
  useEffect(() => {
    if (orbState !== 'idle' && orbState !== 'complete') {
      timeoutRef.current = setTimeout(() => {
        finishConversation()
      }, 120_000)
      return () => { if (timeoutRef.current) clearTimeout(timeoutRef.current) }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orbState === 'idle', orbState === 'complete'])

  // Watch for final transcript from speech recognition
  useEffect(() => {
    if (speech.transcript && orbState === 'listening') {
      handleUserResponse(speech.transcript)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [speech.transcript])

  const startConversation = useCallback(async () => {
    if (orbState !== 'idle') return
    setOrbState('greeting')
    setStatusText('Kari snakker...')

    const greetingWithQuestion = `${KARI_GREETING} ${KARI_QUESTIONS[0]}`
    setTranscript([{ role: 'kari', text: greetingWithQuestion, turnIndex: 0 }])

    await speakText(greetingWithQuestion)

    setOrbState('listening')
    setStatusText(speech.isSupported ? 'Lytter...' : 'Skriv på norsk...')
    setCurrentTurn(1)
    if (speech.isSupported) speech.start()
  }, [orbState, speech])

  const handleUserResponse = useCallback(async (userText: string) => {
    if (!userText.trim()) return
    speech.stop()

    const userTurn: VoiceOnboardingTurn = { role: 'user', text: userText.trim(), turnIndex: currentTurn }
    const updated = [...transcript, userTurn]
    setTranscript(updated)

    if (currentTurn >= KARI_QUESTIONS.length) {
      await finishConversation(updated)
      return
    }

    setOrbState('processing')
    setStatusText('Kari tenker...')

    const nextQuestion = KARI_QUESTIONS[currentTurn] ?? KARI_QUESTIONS[KARI_QUESTIONS.length - 1]
    let kariResponse: string

    try {
      const messages = updated.map((t) => ({
        role: t.role === 'kari' ? 'assistant' : 'user',
        content: t.text,
      }))

      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'conversation',
          params: { messages, level: 'A1', topic: 'Introduksjon' },
        }),
      })

      if (res.ok) {
        const data = await res.json()
        const aiText = (data.result ?? '').split('CORRECTION:')[0].trim()
        kariResponse = aiText || `Bra! ${nextQuestion}`
      } else {
        kariResponse = `Bra! ${nextQuestion}`
      }
    } catch {
      kariResponse = `Bra! ${nextQuestion}`
    }

    const kariTurn: VoiceOnboardingTurn = { role: 'kari', text: kariResponse, turnIndex: currentTurn }
    const withKari = [...updated, kariTurn]
    setTranscript(withKari)

    setOrbState('speaking')
    setStatusText('Kari snakker...')
    await speakText(kariResponse)

    const nextTurnIndex = currentTurn + 1
    if (nextTurnIndex >= KARI_QUESTIONS.length) {
      await finishConversation(withKari)
      return
    }

    setCurrentTurn(nextTurnIndex)
    setOrbState('listening')
    setStatusText(speech.isSupported ? 'Lytter...' : 'Skriv på norsk...')
    if (speech.isSupported) speech.start()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTurn, transcript, speech])

  const finishConversation = useCallback(async (finalTranscript?: VoiceOnboardingTurn[]) => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    speech.stop()

    const ts = finalTranscript ?? transcript
    const level = estimateLevelFromTranscript(ts)

    saveVoiceOnboardingResult({
      transcript: ts,
      estimatedLevel: level,
      completedTurns: ts.filter((t) => t.role === 'user').length,
      timestamp: new Date().toISOString(),
    })

    setOrbState('speaking')
    setStatusText('Kari snakker...')
    await speakText(KARI_CLOSING)

    setOrbState('complete')
    setStatusText(`Estimert nivå: ${level}`)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transcript, speech])

  const handleTextSubmit = () => {
    if (textInput.trim() && orbState === 'listening') {
      handleUserResponse(textInput.trim())
      setTextInput('')
    }
  }

  const ringAnim = ORB_RING_VARIANTS[orbState]

  return (
    <div
      className="relative mx-[10px] mb-3 mt-0 flex flex-col items-center overflow-hidden rounded-[1rem] px-[18px] pb-4 pt-5 text-center"
      style={{
        zIndex: 10,
        background: '#151718',
        border: '1.5px solid rgba(200,255,32,0.22)',
        boxShadow:
          '0 0 14px rgba(200,255,32,0.10), 0 0 36px rgba(200,255,32,0.05), 0 16px 44px rgba(0,0,0,0.30), inset 0 1px 0 rgba(255,255,255,0.06)',
      }}
    >
      {/* Label */}
      <div className="relative z-10 flex items-center gap-[7px]">
        <span
          className="rounded-[0.2rem] px-[9px] py-[3px] text-[8px] font-[700] uppercase tracking-[0.12em]"
          style={{ color: '#C8FF20', background: 'rgba(200,255,32,0.08)' }}
        >
          AI
        </span>
        <span className="text-[14px] font-[700]" style={{ color: '#EDEEE9' }}>
          Snakk med Kari
        </span>
      </div>

      {/* Description */}
      <p className="relative z-10 mt-1 text-[11px] leading-[1.4]" style={{ color: 'rgba(237,238,233,0.34)' }}>
        {orbState === 'idle' ? 'Trykk og snakk norsk. Bare samtale.' : statusText}
      </p>

      {/* Orb with rings */}
      <div className="relative z-10 my-[14px]" style={{ width: '80px', height: '80px' }}>
        <motion.span
          aria-hidden="true"
          className="pointer-events-none absolute rounded-full"
          style={{ width: '80px', height: '80px', top: 0, left: 0, border: '1px solid rgba(200,255,32,0.06)' }}
          animate={{ scale: ringAnim.scale, opacity: ringAnim.opacity }}
          transition={{ duration: ringAnim.duration, ease: 'easeInOut', repeat: Infinity }}
        />
        <motion.span
          aria-hidden="true"
          className="pointer-events-none absolute rounded-full"
          style={{ width: '68px', height: '68px', top: '6px', left: '6px', border: '1px solid rgba(200,255,32,0.06)' }}
          animate={{ scale: ringAnim.scale, opacity: ringAnim.opacity }}
          transition={{ duration: ringAnim.duration, ease: 'easeInOut', repeat: Infinity, delay: 0.7 }}
        />

        <motion.button
          onClick={orbState === 'idle' ? startConversation : undefined}
          disabled={orbState !== 'idle' && orbState !== 'listening'}
          className="absolute flex items-center justify-center rounded-full"
          style={{
            width: '58px',
            height: '58px',
            top: '11px',
            left: '11px',
            background: 'radial-gradient(circle at 38% 32%, #d8ff58 0%, #C8FF20 48%, #aadc16 100%)',
            boxShadow: `${ORB_GLOW[orbState]}, inset 0 2px 3px rgba(255,255,255,0.26)`,
            cursor: orbState === 'idle' ? 'pointer' : 'default',
          }}
          animate={{ scale: orbState === 'listening' ? [1, 1.04, 1] : 1 }}
          transition={orbState === 'listening' ? { duration: 0.8, repeat: Infinity } : {}}
          aria-label="Start samtale med Kari"
        >
          <Mic
            size={20}
            style={{ color: orbState === 'listening' ? '#0A1206' : '#0A1206' }}
            aria-hidden="true"
          />
        </motion.button>
      </div>

      {/* Status text */}
      <p className="relative z-10 text-[10px]" style={{ color: 'rgba(237,238,233,0.34)' }}>
        {orbState === 'idle' ? 'Trykk for å starte' : statusText}
      </p>

      {/* Interim transcript while listening */}
      {orbState === 'listening' && speech.interimTranscript ? (
        <p className="relative z-10 mt-2 text-[11px] italic" style={{ color: 'rgba(200,255,32,0.5)' }}>
          {speech.interimTranscript}
        </p>
      ) : null}

      {/* Text fallback for unsupported browsers */}
      {orbState === 'listening' && !speech.isSupported ? (
        <form
          onSubmit={(e) => { e.preventDefault(); handleTextSubmit() }}
          className="relative z-10 mt-3 flex w-full gap-2"
        >
          <input
            type="text"
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            placeholder="Skriv på norsk..."
            className="flex-1 rounded-[0.4rem] border px-3 py-2 text-[12px] outline-none"
            style={{
              background: 'rgba(255,255,255,0.05)',
              borderColor: 'rgba(255,255,255,0.08)',
              color: '#EDEEE9',
            }}
            autoFocus
          />
          <button
            type="submit"
            className="flex items-center justify-center rounded-[0.4rem] px-3 py-2 text-[12px] font-[700]"
            style={{ background: '#C8FF20', color: '#0A1206' }}
          >
            →
          </button>
        </form>
      ) : null}

      {/* Complete state — CTA to onboarding */}
      <AnimatePresence>
        {orbState === 'complete' ? (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative z-10 mt-3 w-full"
          >
            <Link
              href="/onboarding"
              className="flex w-full items-center justify-center gap-2 rounded-[0.5rem] py-3 text-[13px] font-[700]"
              style={{ background: '#C8FF20', color: '#0A1206' }}
              aria-label="Start kartlegging"
            >
              Start kartlegging
              <ArrowRight size={14} aria-hidden="true" />
            </Link>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {/* Footer */}
      <div className="relative z-10 mt-2">
        <Link
          href="/dashboard"
          className="text-[10px]"
          style={{ color: 'rgba(237,238,233,0.34)' }}
          aria-label="Allerede bruker — gå til appen"
        >
          Allerede bruker? Se appen →
        </Link>
      </div>
    </div>
  )
}
