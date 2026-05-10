'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

const DIAGNOSTIC_INSIGHTS: { label: string; category: string; severity: 'high' | 'medium' | 'low' }[] = [
  { label: 'V2 word order in subordinate clauses', category: 'Grammar', severity: 'high' },
  { label: 'Definite article agreement (-en vs -et)', category: 'Morphology', severity: 'high' },
  { label: 'Strong vs weak verb conjugation', category: 'Verb forms', severity: 'medium' },
  { label: 'Pitch accent in polysyllabic words', category: 'Pronunciation', severity: 'medium' },
  { label: 'Placement of ikke in main clauses', category: 'Negation', severity: 'high' },
  { label: 'Reflexive pronoun vs personal pronoun', category: 'Pronouns', severity: 'low' },
]

const severityColor = {
  high: '#ef4444',
  medium: '#f59e0b',
  low: '#3b82f6',
}

const severityLabel = {
  high: 'Needs work',
  medium: 'Developing',
  low: 'Near fluent',
}

function DiagnosticCard({
  insight,
}: {
  insight: (typeof DIAGNOSTIC_INSIGHTS)[number]
}) {
  return (
    <div
      className="relative overflow-hidden rounded-xl px-4 py-3"
      style={{
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.07)',
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium text-foreground-muted mb-0.5">{insight.category}</p>
          <p className="text-sm font-semibold text-foreground leading-snug">{insight.label}</p>
        </div>
        <div className="shrink-0 flex items-center gap-1.5 mt-0.5">
          <span
            className="inline-block h-1.5 w-1.5 rounded-full"
            style={{
              backgroundColor: severityColor[insight.severity],
              boxShadow: `0 0 6px ${severityColor[insight.severity]}`,
            }}
          />
          <span className="text-xs font-medium" style={{ color: severityColor[insight.severity] }}>
            {severityLabel[insight.severity]}
          </span>
        </div>
      </div>
    </div>
  )
}

function DiagnosticPanel() {
  const [activeIndex, setActiveIndex] = useState(0)
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    const interval = setInterval(() => {
      setVisible(false)
      setTimeout(() => {
        setActiveIndex((i) => (i + 1) % DIAGNOSTIC_INSIGHTS.length)
        setVisible(true)
      }, 400)
    }, 2800)
    return () => clearInterval(interval)
  }, [])

  const current = DIAGNOSTIC_INSIGHTS[activeIndex]

  return (
    <div
      className="relative rounded-2xl p-5 sm:p-6"
      style={{
        background: 'rgba(17,17,24,0.8)',
        border: '1px solid rgba(59,130,246,0.18)',
        backdropFilter: 'blur(12px)',
        boxShadow: '0 0 60px rgba(59,130,246,0.06), inset 0 1px 0 rgba(255,255,255,0.04)',
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold tracking-widest uppercase text-foreground-muted">
            Your diagnostic
          </span>
        </div>
        <div className="flex items-center gap-1">
          {DIAGNOSTIC_INSIGHTS.map((_, i) => (
            <span
              key={i}
              className="inline-block h-1 rounded-full transition-all duration-300"
              style={{
                width: i === activeIndex ? '16px' : '4px',
                backgroundColor: i === activeIndex ? '#3b82f6' : 'rgba(255,255,255,0.12)',
              }}
            />
          ))}
        </div>
      </div>

      {/* Animated insight card */}
      <AnimatePresence mode="wait">
        {visible && (
          <motion.div
            key={activeIndex}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
          >
            <DiagnosticCard insight={current} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mastery score row */}
      <div className="mt-4 flex items-center gap-3">
        <div className="flex-1 h-1 rounded-full overflow-hidden" style={{ backgroundColor: 'rgba(255,255,255,0.06)' }}>
          <motion.div
            key={activeIndex}
            className="h-full rounded-full"
            style={{ backgroundColor: severityColor[current.severity] }}
            initial={{ width: '0%' }}
            animate={{
              width: current.severity === 'high' ? '32%' : current.severity === 'medium' ? '61%' : '84%',
            }}
            transition={{ duration: 0.6, ease: 'easeOut', delay: 0.1 }}
          />
        </div>
        <span className="text-xs font-semibold tabular-nums text-foreground-muted">
          {current.severity === 'high' ? '32' : current.severity === 'medium' ? '61' : '84'}
          <span className="font-normal">/100</span>
        </span>
      </div>

      {/* Footer label */}
      <p className="mt-3 text-xs text-foreground-subtle">
        Based on 47 answered exercises across 6 skill areas
      </p>
    </div>
  )
}

const containerVariants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.12,
    },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.55, ease: 'easeOut' } },
}

export function DiagnosticHero() {
  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="grid gap-10 lg:grid-cols-[1fr_360px] lg:gap-14 lg:items-center"
    >
      {/* Left: headline + tagline */}
      <div>
        <motion.h1
          variants={itemVariants}
          className="text-4xl font-extrabold leading-[1.08] tracking-tight text-foreground sm:text-5xl lg:text-6xl"
        >
          Learn Norwegian{' '}
          <span
            className="relative inline-block"
            style={{
              background: 'linear-gradient(135deg, #60a5fa 0%, #3b82f6 50%, #93c5fd 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            precisely.
          </span>
        </motion.h1>

        <motion.p
          variants={itemVariants}
          className="mt-5 max-w-lg text-base leading-relaxed text-foreground-muted sm:text-lg"
        >
          A personal Norwegian tutor that finds your weak spots, explains why they happen, and fixes
          them with targeted practice. Not a course — a coach.
        </motion.p>
      </div>

      {/* Right: diagnostic panel */}
      <motion.div variants={itemVariants}>
        <DiagnosticPanel />
      </motion.div>
    </motion.div>
  )
}
