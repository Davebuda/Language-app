'use client'

import { motion } from 'framer-motion'

interface ConceptProgressRowProps {
  color: string
  name: string
  score: number        // 0–100
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
    <div className="flex items-center gap-3 rounded-xl bg-nc-card border border-nc-border px-3 py-2.5">
      <div
        className="h-2.5 w-2.5 flex-shrink-0 rounded-full"
        style={{ background: locked ? 'rgba(255,255,255,0.15)' : color }}
      />
      <span className="w-36 flex-shrink-0 text-[11px] font-medium leading-tight text-white/70">
        {name}
      </span>
      <div className="h-[5px] flex-1 overflow-hidden rounded-full bg-[rgba(255,255,255,0.08)]">
        {!locked && (
          <motion.div
            className="h-full rounded-full"
            style={{ background: color }}
            initial={{ width: 0 }}
            animate={{ width: `${score}%` }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
          />
        )}
      </div>
      {locked ? (
        <span className="w-20 text-right text-[9px] leading-tight text-white/20">{prereqLabel}</span>
      ) : (
        <span className="w-8 text-right text-[11px] font-semibold text-white/30">{score}%</span>
      )}
    </div>
  )
}
