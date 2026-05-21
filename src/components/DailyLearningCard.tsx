'use client'

import { useState } from 'react'
import { getDailyRule } from '@/lib/dailyContent'
import { cn } from '@/lib/utils'

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

      <p className="text-sm text-[var(--nc-text-muted)] mt-2 leading-relaxed">
        {rule.ruleExplanation}
      </p>

      {alwaysVisible ? (
        <p className="mt-3 text-sm text-[var(--nc-text-dim)] italic">
          {rule.englishTranslation}
        </p>
      ) : (
        <div className="mt-3">
          <button
            onClick={() => setIsVisible((v) => !v)}
            aria-expanded={isVisible}
            className="text-xs font-semibold text-[var(--nc-text-dim)] hover:text-[var(--nc-text-muted)] transition-colors underline-offset-2 hover:underline"
          >
            {isVisible ? 'Skjul oversettelse' : 'Vis oversettelse'}
          </button>
          <div className={cn('overflow-hidden', isVisible ? 'max-h-20 mt-2' : 'max-h-0')}>
            <p className={cn('text-sm text-[var(--nc-text-dim)] italic transition-opacity duration-200', isVisible ? 'opacity-100' : 'opacity-0')}>
              {rule.englishTranslation}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
