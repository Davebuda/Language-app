'use client'

import { useAIStatusStore } from '@/stores/ai-status-store'
import { motion, AnimatePresence } from 'framer-motion'

export function AIStatusBadge() {
  const { state, loadingPct } = useAIStatusStore()

  if (state === 'idle' || state === 'unavailable') return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="inline-flex items-center gap-1.5 rounded-full border border-nc-green/20 bg-nc-green/8 px-2.5 py-1 text-[10px] font-semibold"
      >
        {state === 'loading' ? (
          <>
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-nc-green opacity-75" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-nc-green" />
            </span>
            <span className="text-nc-green/70">AI laster {loadingPct}%</span>
          </>
        ) : (
          <>
            <span className="h-1.5 w-1.5 rounded-full bg-nc-green" />
            <span className="text-nc-green/70">AI aktiv</span>
          </>
        )}
      </motion.div>
    </AnimatePresence>
  )
}
