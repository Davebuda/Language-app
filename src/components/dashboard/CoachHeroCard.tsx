'use client'

import Link from 'next/link'
import type { ElementType } from 'react'
import {
  ArrowRight,
  BookOpenText,
  BrainCircuit,
  CalendarCheck2,
  CheckCircle2,
  MessageSquareText,
  NotebookPen,
  PartyPopper,
  Sparkles,
  Theater,
} from 'lucide-react'
import { motion } from 'framer-motion'
import type { CoachRecommendation } from '@/lib/coach-recommendation'

type HeroLaneId =
  | 'session'
  | 'conversation'
  | 'journal'
  | 'roleplay'
  | 'reading'
  | 'weekly-check'
  | 'celebration'

const HERO_META: Record<HeroLaneId, {
  Icon: ElementType
  eyebrow: string
  accent: string
  statLabel: string
}> = {
  session: {
    Icon: BrainCircuit,
    eyebrow: 'AI valgt neste steg',
    accent: 'var(--nc-signal)',
    statLabel: 'Fokus',
  },
  conversation: {
    Icon: MessageSquareText,
    eyebrow: 'Muntlig flyt',
    accent: 'var(--nc-teal)',
    statLabel: 'Snakk',
  },
  journal: {
    Icon: NotebookPen,
    eyebrow: 'Skriv for å feste',
    accent: 'var(--nc-teal)',
    statLabel: 'Skriv',
  },
  roleplay: {
    Icon: Theater,
    eyebrow: 'Bruk det i kontekst',
    accent: 'var(--nc-teal)',
    statLabel: 'Scene',
  },
  reading: {
    Icon: BookOpenText,
    eyebrow: 'Input med mening',
    accent: 'var(--nc-teal)',
    statLabel: 'Les',
  },
  'weekly-check': {
    Icon: CalendarCheck2,
    eyebrow: 'Ukentlig validering',
    accent: 'var(--nc-signal)',
    statLabel: 'Sjekk',
  },
  celebration: {
    Icon: PartyPopper,
    eyebrow: 'Dagen er lukket',
    accent: 'var(--nc-green)',
    statLabel: 'Ferdig',
  },
}

interface CoachHeroCardProps {
  recommendation: CoachRecommendation
}

export function CoachHeroCard({ recommendation }: CoachHeroCardProps) {
  const {
    laneId,
    label,
    title,
    subtitle,
    reason,
    href,
    ctaLabel,
    compositionBadges,
    grammarTip,
    wordOfDay,
  } = recommendation

  const meta = HERO_META[laneId as HeroLaneId]
  const AccentIcon = meta.Icon
  const primaryBadge = compositionBadges?.[0]
  const secondaryBadge = compositionBadges?.[1]
  const compactReason = reason ?? 'Systemet prioriterer dette nå fordi det gir mest læring med minst friksjon.'

  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="nc-glass-elevated overflow-hidden p-5"
    >
      <div className="flex flex-col gap-4">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="nc-chip-signal gap-2 rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.12em]">
                <AccentIcon size={12} />
                {label}
              </span>
              <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--nc-text-dim)]">
                {meta.eyebrow}
              </span>
            </div>

            <h2 className="mt-3 max-w-[18rem] text-balance font-display text-[2rem] font-bold leading-[0.94] text-[var(--nc-text)]">
              {title}
            </h2>
            <p className="mt-3 max-w-[20rem] text-[0.95rem] leading-6 text-[var(--nc-text-muted)]">
              {subtitle}
            </p>
          </div>

          <div
            className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[1.1rem] text-[var(--nc-signal-fg)] shadow-[0_18px_40px_var(--nc-glow)]"
            style={{ background: 'linear-gradient(135deg, var(--nc-signal) 0%, var(--nc-signal-soft) 100%)' }}
          >
            <AccentIcon size={20} />
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-[1.1fr_0.9fr]">
          <div className="nc-glass-cream p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--nc-cream-dim)]">
                Hvorfor nå
              </div>
              <Sparkles size={13} className="text-[var(--nc-signal-fg)]" />
            </div>
            <p className="mt-2 text-[0.92rem] leading-6 text-[var(--nc-cream-muted)]">
              {compactReason}
            </p>
          </div>

          <div className="rounded-[1.25rem] bg-[linear-gradient(135deg,var(--nc-signal)_0%,var(--nc-signal-soft)_100%)] p-4 text-[var(--nc-signal-fg)] shadow-[0_18px_40px_var(--nc-glow)]">
            <div className="text-[10px] font-semibold uppercase tracking-[0.12em] opacity-60">
              {meta.statLabel}
            </div>
            <div className="mt-2 text-[1.65rem] font-display font-bold leading-none">
              {primaryBadge ? primaryBadge.count : 'Nå'}
            </div>
            <div className="mt-1 text-[0.8rem] font-semibold uppercase tracking-[0.08em] opacity-70">
              {primaryBadge ? primaryBadge.label : label}
            </div>
            {secondaryBadge ? (
              <div className="mt-4 rounded-[1rem] bg-[rgba(8,17,13,0.10)] px-3 py-2 text-[0.78rem] font-semibold">
                {secondaryBadge.count} {secondaryBadge.label}
              </div>
            ) : null}
          </div>
        </div>

        {(grammarTip || wordOfDay) ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {grammarTip ? (
              <div className="rounded-[1.1rem] border border-[rgba(255,255,255,0.10)] bg-[rgba(255,255,255,0.04)] p-4">
                <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--nc-text-dim)]">
                  Mønster
                </div>
                <div className="mt-2 text-[0.95rem] font-semibold text-[var(--nc-text)]">
                  {grammarTip.title}
                </div>
                <div className="mt-1 text-[0.88rem] text-[var(--nc-text-dim)]">
                  {grammarTip.example}
                </div>
              </div>
            ) : null}

            {wordOfDay ? (
              <div className="rounded-[1.1rem] border border-[rgba(255,255,255,0.10)] bg-[rgba(255,255,255,0.04)] p-4">
                <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--nc-text-dim)]">
                  Ord
                </div>
                <div className="mt-2 text-[0.95rem] font-semibold text-[var(--nc-text)]">
                  {wordOfDay.word}
                </div>
                <div className="mt-1 text-[0.88rem] text-[var(--nc-text-dim)]">
                  {wordOfDay.meaning}
                </div>
              </div>
            ) : null}
          </div>
        ) : null}

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[rgba(255,255,255,0.10)] bg-[rgba(255,255,255,0.04)] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--nc-text-dim)]">
              <CheckCircle2 size={12} className="text-[var(--nc-green)]" />
              Live nå
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[rgba(255,255,255,0.10)] bg-[rgba(255,255,255,0.04)] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--nc-text-dim)]">
              Samme læringsminne
            </span>
          </div>

          <motion.div whileTap={{ scale: 0.97 }} transition={{ duration: 0.15 }}>
            <Link
              href={href}
              className="nc-button-primary inline-flex min-h-[52px] items-center gap-2 rounded-[1rem] px-5 py-3 text-sm font-semibold"
            >
              {ctaLabel}
              <ArrowRight size={15} aria-hidden="true" />
            </Link>
          </motion.div>
        </div>
      </div>
    </motion.section>
  )
}
