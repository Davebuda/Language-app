'use client'

import { motion } from 'framer-motion'

interface ConceptProgressRowProps {
  color: string
  name: string
  score: number
  locked?: boolean
  prereqLabel?: string
}

export function ConceptProgressRow({
  color,
  name,
  score,
  locked = false,
  prereqLabel,
}: ConceptProgressRowProps) {
  return (
    <div className="nc-panel flex items-center gap-3 px-4 py-3">
      <div
        className="h-2.5 w-2.5 shrink-0 rounded-full"
        style={{ backgroundColor: locked ? 'rgba(23,23,29,0.18)' : color }}
      />

      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-3">
          <span className="truncate text-[13px] font-medium text-nc-text">
            {name}
          </span>
          {locked ? (
            <span className="text-[10px] font-medium text-nc-text-dim">
              {prereqLabel}
            </span>
          ) : (
            <span className="text-[12px] font-semibold text-nc-text-dim">
              {score}%
            </span>
          )}
        </div>

        <div className="mt-2 h-[5px] overflow-hidden rounded-full bg-[rgba(23,23,29,0.08)]">
          {!locked ? (
            <motion.div
              className="h-full rounded-full"
              style={{ background: color }}
              initial={{ width: 0 }}
              animate={{ width: `${score}%` }}
              transition={{ duration: 0.65, ease: 'easeOut' }}
            />
          ) : null}
        </div>
      </div>
    </div>
  )
}
