'use client'

import { useState } from 'react'
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
      <div className="text-xs text-[var(--nc-text-dim)] mb-3">{words.length} ord for i dag</div>

      {words.map((word, i) => {
        const isExpanded = expanded.has(i)
        return (
          <div
            key={i}
            className="border-t border-[var(--nc-border)] py-2.5 first:border-t-0"
          >
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-[var(--nc-text)]">
                {word.norwegian}
              </span>
              <span className="rounded-full border border-[var(--nc-border)] px-1.5 py-0.5 text-[9px] text-[var(--nc-text-dim)]">
                {word.wordClass}
              </span>
              <button
                onClick={() => toggle(i)}
                aria-expanded={isExpanded}
                aria-label={`Vis ${word.norwegian}`}
                className="ml-auto text-xs font-semibold text-[var(--nc-text-dim)] hover:text-[var(--nc-text)] transition-colors"
              >
                {isExpanded ? 'Skjul' : 'Vis'}
              </button>
            </div>

            <div
              className={[
                'overflow-hidden transition-all duration-200',
                isExpanded ? 'max-h-16 opacity-100 mt-1.5' : 'max-h-0 opacity-0',
              ].join(' ')}
            >
              <span className="text-xs text-[var(--nc-text-muted)]">{word.english}</span>
              {' · '}
              <span className="text-xs italic text-[var(--nc-text-dim)]">{word.exampleSentence}</span>
            </div>
          </div>
        )
      })}
    </div>
  )
}
