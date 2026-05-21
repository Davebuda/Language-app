'use client'

import { motion } from 'framer-motion'

interface ConceptProgressRowProps {
  color: string
  name: string
  score: number
  locked?: boolean
  prereqLabel?: string
  className?: string
}

export function ConceptProgressRow({
  color,
  name,
  score,
  locked = false,
  prereqLabel,
  className,
}: ConceptProgressRowProps) {
  const defaultClass = locked
    ? 'nc-glass flex items-center gap-3 px-4 py-3 opacity-60'
    : 'nc-glass-cream flex items-center gap-3 px-4 py-3'

  return (
    <div className={className ?? defaultClass}>
      <div
        className="h-2.5 w-2.5 shrink-0 rounded-full"
        style={{ backgroundColor: locked ? 'var(--nc-border)' : color }}
      />

      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-3">
          <span className="truncate text-[13px] font-medium text-[var(--nc-cream-text)]">
            {name}
          </span>
          {locked ? (
            <span className="text-[10px] font-medium text-[var(--nc-cream-dim)]">
              {prereqLabel}
            </span>
          ) : (
            <span className="text-[12px] font-semibold text-[var(--nc-cream-dim)]">
              {score}%
            </span>
          )}
        </div>

        <div className="mt-2 h-[5px] overflow-hidden rounded-full bg-[rgba(4,14,8,0.12)]">
          {!locked ? (
            <motion.div
              className="h-full w-full origin-left rounded-full bg-[var(--nc-red)]"
              initial={{ scaleX: 0 }}
              animate={{ scaleX: score / 100 }}
              transition={{ duration: 0.65, ease: 'easeOut' }}
            />
          ) : null}
        </div>
      </div>
    </div>
  )
}
