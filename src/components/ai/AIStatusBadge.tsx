'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { useAIStatusStore } from '@/stores/ai-status-store'

export function AIStatusBadge() {
  const { state, loadingPct } = useAIStatusStore()

  if (state === 'idle' || state === 'unavailable') return null

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
