'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { useAIStatusStore } from '@/stores/ai-status-store'

export function AIStatusBadge() {
  const { state, loadingPct, aiMode } = useAIStatusStore()

  if (state === 'idle') return null

  // Still initializing the on-device model — show load progress.
  if (state === 'loading') {
    return (
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          className="nc-chip-signal gap-2 rounded-full px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.12em]"
        >
          <span className="h-1.5 w-1.5 rounded-full bg-[var(--nc-signal-fg)] animate-pulse" />
          {`AI ${loadingPct}%`}
        </motion.div>
      </AnimatePresence>
    )
  }

  // Load attempt finished. Reflect the ACTUAL active mode (consistent with /profile):
  // aiMode 'none' === template fallback, even when a load attempt completed.
  if (aiMode === 'none') {
    return (
      <div className="inline-flex items-center gap-2 rounded-full border border-[var(--nc-red-border)] bg-[rgba(255,106,85,0.12)] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--nc-red)]">
        <span className="h-1.5 w-1.5 rounded-full bg-[var(--nc-red)]" />
        Maler
      </div>
    )
  }

  const label = aiMode === 'webllm' ? 'Lokal AI' : 'Sky-AI'
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -4 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -4 }}
        className="nc-chip-signal gap-2 rounded-full px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.12em]"
      >
        <span className="h-1.5 w-1.5 rounded-full bg-[var(--nc-signal-fg)]" />
        {label}
      </motion.div>
    </AnimatePresence>
  )
}
