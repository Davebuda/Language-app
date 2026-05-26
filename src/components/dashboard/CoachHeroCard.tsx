'use client'

import Link from 'next/link'
import { Play } from 'lucide-react'
import { motion } from 'framer-motion'
import type { CoachRecommendation } from '@/lib/coach-recommendation'

const BADGE_STYLES = {
  red: 'border-[var(--nc-red-border)] bg-[var(--nc-red-tint)] text-[var(--nc-red)]',
  teal: 'border-[var(--nc-teal-border)] bg-[var(--nc-teal-tint)] text-[var(--nc-teal)]',
  muted: 'border-[rgba(4,14,8,0.14)] bg-[rgba(4,14,8,0.04)] text-[rgba(4,14,8,0.52)]',
} as const

interface CoachHeroCardProps {
  recommendation: CoachRecommendation
}

export function CoachHeroCard({ recommendation }: CoachHeroCardProps) {
  const { laneId, label, title, subtitle, reason, href, ctaLabel, compositionBadges, grammarTip, wordOfDay } = recommendation
  const isCelebration = laneId === 'celebration'
  const isCheck = laneId === 'weekly-check'

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={[
        'rounded-[var(--radius)] p-5',
        isCheck
          ? 'border border-[var(--nc-teal-border)] bg-[rgba(0,229,196,0.06)]'
          : isCelebration
            ? 'nc-glass-elevated'
            : 'nc-glass-cream',
      ].join(' ')}
    >
      <div
        className={[
          'text-[10px] font-bold uppercase tracking-[0.06em]',
          isCheck ? 'text-[var(--nc-teal)]' : isCelebration ? 'text-[var(--nc-green)]' : 'text-[rgba(4,14,8,0.34)]',
        ].join(' ')}
      >
        {label} {!isCelebration && !isCheck && `· ${subtitle.split('·')[0]?.trim() ?? ''}`}
      </div>

      <div
        className={[
          'mt-1.5 font-display text-[1.5rem] font-bold leading-tight text-balance',
          isCheck ? 'text-[var(--nc-text)]' : isCelebration ? 'text-[var(--nc-green)]' : 'text-[var(--nc-cream-text)]',
        ].join(' ')}
      >
        {title}
      </div>

      <p
        className={[
          'mt-2 text-[12px]',
          isCheck ? 'text-[var(--nc-text-muted)]' : isCelebration ? 'text-[var(--nc-text-muted)]' : 'text-[var(--nc-cream-muted)]',
        ].join(' ')}
      >
        {subtitle}
      </p>

      {reason && (
        <div
          className={[
            'mt-3 rounded-[var(--radius)] px-3 py-2.5 text-[12px] leading-relaxed',
            isCheck
              ? 'border border-[var(--nc-teal-border)] bg-[rgba(0,229,196,0.06)] text-[var(--nc-text-muted)]'
              : 'border border-[rgba(4,14,8,0.14)] bg-[rgba(4,14,8,0.04)] text-[var(--nc-cream-text)]',
          ].join(' ')}
        >
          {reason}
        </div>
      )}

      {grammarTip && (
        <div className="mt-3 rounded-[var(--radius)] border border-[rgba(4,14,8,0.10)] bg-[rgba(4,14,8,0.03)] px-3 py-2">
          <div className="text-[9px] font-bold uppercase tracking-[0.06em] text-[rgba(4,14,8,0.34)]">Dagens tips</div>
          <div className="mt-1 text-[12px] font-semibold text-[var(--nc-cream-text)]">{grammarTip.title}</div>
          <div className="mt-0.5 text-[11px] italic text-[var(--nc-cream-muted)]">{grammarTip.example}</div>
        </div>
      )}

      {wordOfDay && (
        <div className="mt-3 flex items-baseline gap-2">
          <span className="text-[11px] font-bold text-[var(--nc-cream-text)]">{wordOfDay.word}</span>
          <span className="text-[10px] text-[var(--nc-cream-muted)]">— {wordOfDay.meaning}</span>
        </div>
      )}

      <motion.div whileTap={{ scale: 0.97 }} className="mt-4">
        <Link
          href={href}
          className={[
            'inline-flex min-h-[48px] items-center gap-2 rounded-[var(--radius)] px-5 py-3 text-sm font-bold',
            isCheck
              ? 'bg-[var(--nc-teal)] text-[var(--nc-bg)]'
              : isCelebration
                ? 'bg-[var(--nc-green)] text-[var(--nc-green-fg)]'
                : 'nc-button-primary',
          ].join(' ')}
          aria-label={ctaLabel}
        >
          {!isCelebration && <Play size={14} aria-hidden="true" />}
          {ctaLabel}
        </Link>
      </motion.div>

      {compositionBadges && compositionBadges.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {compositionBadges.map((b) => (
            <span
              key={b.label}
              className={`rounded-[0.65rem] border px-3 py-1.5 text-[10px] font-semibold ${BADGE_STYLES[b.variant]}`}
            >
              {b.count} {b.label}
            </span>
          ))}
        </div>
      )}
    </motion.div>
  )
}
