'use client'

import { motion } from 'framer-motion'

interface ConceptProgressRowProps {
  color: string
  name: string
  score: number
  locked?: boolean
  prereqLabel?: string
  /** Pre-formatted SRS due phrase (e.g. "Om 3 dager"); omitted when empty. */
  nextReview?: string
  className?: string
  /** 'cream' uses cream text colors (default); 'dark' uses nc-text colors for dark card backgrounds */
  variant?: 'cream' | 'dark'
}

export function ConceptProgressRow({
  color,
  name,
  score,
  locked = false,
  prereqLabel,
  nextReview,
  className,
  variant = 'cream',
}: ConceptProgressRowProps) {
  const defaultClass = locked
    ? 'nc-glass flex items-center gap-3 px-4 py-3 opacity-60'
    : variant === 'dark'
      ? 'nc-glass flex items-center gap-3 px-4 py-3'
      : 'nc-glass-cream flex items-center gap-3 px-4 py-3'

  const nameColor = locked
    ? 'text-[var(--nc-text-muted)]'
    : variant === 'dark'
      ? 'text-[var(--nc-text)]'
      : 'text-[var(--nc-cream-text)]'

  const scoreColor = variant === 'dark'
    ? 'text-[var(--nc-signal)]'
    : 'text-[#5A8A00]'

  const trackColor = variant === 'dark'
    ? 'bg-[rgba(255,255,255,0.08)]'
    : 'bg-[rgba(4,14,8,0.12)]'

  return (
    <div className={className ?? defaultClass}>
      <div
        className="h-2.5 w-2.5 shrink-0 rounded-full"
        style={{ backgroundColor: locked ? 'var(--nc-border)' : color }}
      />

      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-3">
          <span className={`truncate text-[13px] font-medium ${nameColor}`}>
            {name}
          </span>
          {locked ? (
            <span className="text-[10px] font-medium text-[var(--nc-text-dim)]">
              {prereqLabel}
            </span>
          ) : (
            <span className={`text-[12px] font-semibold ${scoreColor}`}>
              {score}%
            </span>
          )}
        </div>

        <div className={`mt-2 h-[5px] overflow-hidden rounded-full ${trackColor}`}>
          {!locked ? (
            <motion.div
              className="h-full w-full origin-left rounded-full bg-[var(--nc-signal)]"
              initial={{ scaleX: 0 }}
              animate={{ scaleX: score / 100 }}
              transition={{ duration: 0.65, ease: 'easeOut' }}
            />
          ) : null}
        </div>

        {!locked && nextReview ? (
          <div className="mt-1.5 text-[10px] text-[var(--nc-text-dim)]">
            Neste repetisjon: {nextReview}
          </div>
        ) : null}
      </div>
    </div>
  )
}
