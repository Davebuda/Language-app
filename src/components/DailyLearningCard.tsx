'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { getDailyRule } from '@/lib/dailyContent'

interface Props {
  alwaysVisible?: boolean
}

export function DailyLearningCard({ alwaysVisible = false }: Props) {
  const rule = getDailyRule()
  const [isVisible, setIsVisible] = useState(false)

  return (
    <div
      role="region"
      aria-label="Dagens grammatikk"
      className="nc-glass border-l-2 border-[var(--nc-red)] p-5 rounded-[var(--radius)]"
    >
      <div className="nc-label mb-3 text-[var(--nc-text-muted)]">{rule.title}</div>

      <p className="text-2xl font-bold font-display text-[var(--nc-text)] leading-tight text-balance">
        {rule.norwegianExample}
      </p>

      <p className="text-[14px] text-[var(--nc-text-muted)] mt-2 leading-relaxed text-pretty">
        {rule.ruleExplanation}
      </p>

      {alwaysVisible ? (
        <p className="mt-3 text-pretty text-[14px] text-[var(--nc-text-dim)] italic">
          {rule.englishTranslation}
        </p>
      ) : (
        <div className="mt-3">
          <motion.button
            onClick={() => setIsVisible((v) => !v)}
            aria-expanded={isVisible}
            aria-label={isVisible ? 'Skjul oversettelse' : 'Vis oversettelse'}
            whileTap={{ scale: 0.97 }}
            className="text-xs font-semibold text-[var(--nc-text-dim)] hover:text-[var(--nc-text-muted)] underline-offset-2 hover:underline"
          >
            {isVisible ? 'Skjul oversettelse' : 'Vis oversettelse'}
          </motion.button>
          <AnimatePresence initial={false}>
            {isVisible && (
              <motion.div
                key="translation"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
              >
                <p className="mt-2 text-pretty text-[14px] text-[var(--nc-text-dim)] italic">
                  {rule.englishTranslation}
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  )
}
