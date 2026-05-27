'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowRight, Mic } from 'lucide-react'

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
      <div className="nc-mobile-shell flex min-h-dvh flex-col items-center px-0.5 py-5">
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

          {/* ── Main content — space-evenly distributes gaps ── */}
          <div
            className="relative flex flex-1 flex-col"
            style={{
              justifyContent: 'space-evenly',
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

          {/* ── Floating orb card — on the lime, no neon spinner ── */}
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
            {/* Orb label row */}
            <div className="relative z-10 flex items-center gap-[7px]">
              <span
                className="rounded-[0.2rem] px-[9px] py-[3px] text-[8px] font-[700] uppercase tracking-[0.12em]"
                style={{ color: '#C8FF20', background: 'rgba(200,255,32,0.08)', letterSpacing: '0.12em' }}
              >
                AI
              </span>
              <span className="text-[14px] font-[700]" style={{ color: '#EDEEE9' }}>
                Snakk med Kari
              </span>
            </div>

            {/* Description */}
            <p
              className="relative z-10 mt-1 text-[11px] leading-[1.4]"
              style={{ color: 'rgba(237,238,233,0.34)' }}
            >
              Trykk og snakk norsk. Bare samtale.
            </p>

            {/* Orb button with tight ambient rings */}
            <div
              className="relative z-10 my-[14px]"
              style={{ width: '80px', height: '80px' }}
            >
              {/* Ambient ring — outer (80px) */}
              <motion.span
                aria-hidden="true"
                className="pointer-events-none absolute rounded-full"
                style={{
                  width: '80px',
                  height: '80px',
                  top: 0,
                  left: 0,
                  border: '1px solid rgba(200,255,32,0.06)',
                }}
                animate={{ scale: [1, 1.06, 1], opacity: [1, 0.45, 1] }}
                transition={{ duration: 3.5, ease: 'easeInOut', repeat: Infinity }}
              />

              {/* Ambient ring — inner (68px), centered */}
              <motion.span
                aria-hidden="true"
                className="pointer-events-none absolute rounded-full"
                style={{
                  width: '68px',
                  height: '68px',
                  top: '6px',
                  left: '6px',
                  border: '1px solid rgba(200,255,32,0.06)',
                }}
                animate={{ scale: [1, 1.06, 1], opacity: [1, 0.45, 1] }}
                transition={{ duration: 3.5, ease: 'easeInOut', repeat: Infinity, delay: 0.7 }}
              />

              {/* Orb button — 58px, centered in 80px wrapper */}
              <Link
                href="/conversation"
                className="absolute flex items-center justify-center rounded-full"
                style={{
                  width: '58px',
                  height: '58px',
                  top: '11px',
                  left: '11px',
                  background:
                    'radial-gradient(circle at 38% 32%, #d8ff58 0%, #C8FF20 48%, #aadc16 100%)',
                  boxShadow:
                    '0 0 16px rgba(200,255,32,0.25), 0 0 40px rgba(200,255,32,0.08), inset 0 2px 3px rgba(255,255,255,0.26)',
                }}
                aria-label="Start samtale med Kari"
              >
                <Mic size={20} style={{ color: '#0A1206' }} aria-hidden="true" />
              </Link>
            </div>

            {/* Hint */}
            <p
              className="relative z-10 text-[10px]"
              style={{ color: 'rgba(237,238,233,0.34)' }}
            >
              Trykk for å starte
            </p>

            {/* Footer link */}
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
        </div>
      </div>
    </main>
  )
}
