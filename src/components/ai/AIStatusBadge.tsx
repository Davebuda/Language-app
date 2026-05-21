'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { useAIStatusStore } from '@/stores/ai-status-store'

export function AIStatusBadge() {
  const { state, loadingPct } = useAIStatusStore()

  if (state === 'idle') return null

  // Unavailable: static badge, muted styling — distinct from the animated 'ready' chip.
  // No motion: unavailable is a discovered fact, not a progress event.
  // Follow-up: split into three states (capability-gated vs. load-failed vs. loading)
  // once the lazy-load architecture lands. For now one honest copy covers both
  // unavailable paths without violating CLAUDE.md's no-silent-substitution rule.
  if (state === 'unavailable') {
    return (
      <div className="rounded-[0.75rem] border border-nc-border bg-nc-card px-2.5 py-1.5 text-[10px] font-medium text-nc-text-dim">
        AI unavailable — using templates
      </div>
    )
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -4 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -4 }}
        className="rounded-[0.75rem] border border-nc-border bg-white px-2.5 py-1.5 text-[10px] font-medium text-nc-text-muted"
      >
        {state === 'loading' ? `AI ${loadingPct}%` : 'AI ready'}
      </motion.div>
    </AnimatePresence>
  )
}
