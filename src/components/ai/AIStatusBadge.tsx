'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { useAIStatusStore } from '@/stores/ai-status-store'

export function AIStatusBadge() {
  const { state, loadingPct } = useAIStatusStore()

  if (state === 'idle') return null

  if (state === 'unavailable') {
    return (
      <div className="inline-flex items-center gap-2 rounded-full border border-[var(--nc-red-border)] bg-[rgba(255,106,85,0.12)] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--nc-red)]">
        <span className="h-1.5 w-1.5 rounded-full bg-[var(--nc-red)]" />
        AI unavailable · templates
      </div>
    )
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -4 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -4 }}
        className="nc-chip-signal gap-2 rounded-full px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.12em]"
      >
        <span className={`h-1.5 w-1.5 rounded-full bg-[var(--nc-signal-fg)] ${state === 'loading' ? 'animate-pulse' : ''}`} />
        {state === 'loading' ? `AI ${loadingPct}%` : 'AI ready'}
      </motion.div>
    </AnimatePresence>
  )
}
