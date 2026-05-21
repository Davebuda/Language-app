'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { getDailyWords } from '@/lib/dailyContent'

export function DailyWordPack() {
  const words = getDailyWords()
  const [expanded, setExpanded] = useState<Set<number>>(new Set())

  function toggle(index: number) {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(index)) {
        next.delete(index)
      } else {
        next.add(index)
      }
      return next
    })
  }

  return (
    <div
      role="region"
      aria-label="Dagens ordliste"
      className="nc-glass p-4 border-l-2 border-[var(--nc-red-border)]"
    >
      <div className="nc-label mb-2 text-[var(--nc-text-dim)]">DAGENS ORD</div>
      <div className="text-[11px] text-[var(--nc-text-dim)] mb-3">{words.length} ord for i dag</div>

      {words.map((word, i) => {
        const isExpanded = expanded.has(i)
        return (
          <div
            key={i}
            className="border-t border-[var(--nc-border)] py-2.5 first:border-t-0"
          >
            <div className="flex items-center gap-2">
              <span className="text-[14px] font-semibold text-[var(--nc-text)]">
                {word.norwegian}
              </span>
              <span className="rounded-full border border-[var(--nc-border)] px-1.5 py-0.5 text-[9px] text-[var(--nc-text-dim)]">
                {word.wordClass}
              </span>
              <motion.button
                onClick={() => toggle(i)}
                aria-expanded={isExpanded}
                aria-label={`${isExpanded ? 'Skjul' : 'Vis'} oversettelse for ${word.norwegian}`}
                whileTap={{ scale: 0.95 }}
                className="ml-auto text-[11px] font-semibold text-[var(--nc-text-dim)] hover:text-[var(--nc-text)]"
              >
                {isExpanded ? 'Skjul' : 'Vis'}
              </motion.button>
            </div>

            <AnimatePresence initial={false}>
              {isExpanded && (
                <motion.div
                  key={`word-${i}`}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.18, ease: 'easeOut' }}
                  className="overflow-hidden"
                >
                  <div className="mt-1.5 text-[12px] text-[var(--nc-text-muted)]">
                    {word.english}
                    {' · '}
                    <span className="italic text-[var(--nc-text-dim)]">{word.exampleSentence}</span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )
      })}
    </div>
  )
}
