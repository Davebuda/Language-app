'use client'

import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import type { RepairPlan } from '@/engine/repair-loop'
import { GRAMMAR_EXPLAINERS } from '@/lib/grammar-explainers'

interface ExplanationCardProps {
  repairPlan: RepairPlan
  correctAnswer: string
  conceptId: string
  conceptLabel?: string
  onContinue: () => void
}

export function ExplanationCard({
  repairPlan,
  correctAnswer,
  conceptId,
  conceptLabel,
  onContinue,
}: ExplanationCardProps) {
  const [showGrammar, setShowGrammar] = useState(false)
  const explainer = GRAMMAR_EXPLAINERS[conceptId]
  const label = conceptLabel ?? conceptId

  return (
    <div className="nc-glass-cream-strong space-y-4 overflow-hidden p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="nc-label text-nc-cream-dim">Repair loop</p>
          <h3 className="mt-2 text-balance text-[1.65rem] font-display font-semibold text-nc-cream-text">
            Nesten.
          </h3>
        </div>
        <span className="rounded-full border border-[rgba(4,14,8,0.14)] bg-[rgba(4,14,8,0.06)] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-nc-cream-muted">
          {label}
        </span>
      </div>

      <p className="text-pretty text-sm leading-7 text-nc-cream-muted">
        {repairPlan.explanation}
      </p>

      <div className="rounded-[1rem] bg-[rgba(6,16,23,0.94)] px-4 py-4 text-white">
        <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-white/40">
          Riktig svar
        </div>
        <div className="mt-2 text-[15px] font-medium text-white">
          {correctAnswer}
        </div>
      </div>

      {explainer ? (
        <>
          <button
            type="button"
            onClick={() => setShowGrammar((current) => !current)}
            className="w-full rounded-[1rem] border border-[rgba(4,14,8,0.12)] bg-white/45 px-4 py-3 text-left text-sm font-medium text-nc-cream-text transition-colors hover:bg-white/60"
          >
            {showGrammar
              ? 'Skjul grammatikk'
              : `Vis regelen for ${explainer.title}`}
          </button>

          <AnimatePresence>
            {showGrammar ? (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.18, ease: 'easeOut' }}
              >
                <div className="rounded-[1rem] border border-[rgba(4,14,8,0.14)] bg-white/45 px-4 py-4">
                  <p className="text-sm font-medium text-nc-cream-text">
                    {explainer.shortRule}
                  </p>
                  <div className="mt-3 flex flex-col gap-2">
                    {explainer.examples.slice(0, 2).map((example, index) => (
                      <div
                        key={`${example.norwegian}-${index}`}
                        className="rounded-[0.85rem] border border-[rgba(4,14,8,0.10)] bg-white/45 px-3 py-3"
                      >
                        <div className="text-sm font-medium text-nc-cream-text">
                          {example.norwegian}
                        </div>
                        <div className="mt-1 text-xs text-nc-cream-muted">
                          {example.english}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 rounded-[0.85rem] border border-[var(--nc-red-border)] bg-[var(--nc-red-tint)] px-3 py-3 text-sm leading-7 text-nc-cream-muted">
                    {explainer.tip}
                  </div>
                </div>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </>
      ) : null}

      <button
        type="button"
        onClick={onContinue}
        className="nc-button-primary min-h-[52px] w-full px-6 text-sm font-bold"
      >
        Prøv igjen
      </button>
    </div>
  )
}
