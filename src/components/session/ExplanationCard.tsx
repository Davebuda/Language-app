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
    <div className="nc-panel-soft overflow-hidden p-5">
      <div className="absolute right-5 top-5 h-24 w-24 opacity-65">
        <div className="absolute inset-0 rounded-full border border-nc-apricot/60" />
        <div className="absolute inset-[18%] rounded-full border border-nc-apricot/40" />
        <div className="absolute left-[52%] top-[6%] h-2 w-2 rounded-full bg-nc-apricot" />
        <div className="absolute left-[18%] top-[50%] h-1.5 w-1.5 rounded-full bg-nc-violet" />
      </div>

      <div className="relative z-[1] space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="nc-label">La oss se på dette</p>
            <h3 className="mt-2 text-[1.65rem] font-display font-semibold text-nc-text">
              Nesten — ett mønster til.
            </h3>
          </div>
          <span className="rounded-[0.75rem] bg-white px-3 py-1.5 text-[10px] font-medium uppercase tracking-[0.12em] text-nc-text-dim">
            {label}
          </span>
        </div>

        <p className="text-sm leading-7 text-nc-text-muted">
          {repairPlan.explanation}
        </p>

        <div className="rounded-[0.95rem] border border-[#d7e8bd] bg-[linear-gradient(180deg,#eef7d2_0%,#f8fbef_100%)] px-4 py-3">
          <div className="text-[10px] font-medium uppercase tracking-[0.12em] text-nc-text-dim">
            Correct answer
          </div>
          <div className="mt-1 text-[15px] font-medium text-nc-text">
            {correctAnswer}
          </div>
        </div>

        {explainer ? (
          <>
            <button
              onClick={() => setShowGrammar((current) => !current)}
              className="w-full rounded-[0.9rem] border border-nc-border bg-white px-4 py-3 text-left text-sm font-medium text-nc-text transition-colors hover:bg-[#fffdf9]"
            >
              {showGrammar
                ? 'Skjul grammatikk'
                : `Vis grammatikkregler for ${explainer.title}`}
            </button>

            <AnimatePresence>
              {showGrammar ? (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.22 }}
                  className="overflow-hidden"
                >
                  <div className="rounded-[0.95rem] border border-nc-border bg-white px-4 py-4">
                    <p className="text-sm font-medium text-nc-text">
                      {explainer.shortRule}
                    </p>
                    <div className="mt-3 flex flex-col gap-2">
                      {explainer.examples.slice(0, 2).map((example, index) => (
                        <div
                          key={`${example.norwegian}-${index}`}
                          className="rounded-[0.85rem] border border-nc-border bg-[#fff9f3] px-3 py-3"
                        >
                          <div className="text-sm font-medium text-nc-text">
                            {example.norwegian}
                          </div>
                          <div className="mt-1 text-xs text-nc-text-dim">
                            {example.english}
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="mt-3 rounded-[0.85rem] bg-nc-apricot/18 px-3 py-3 text-sm leading-7 text-nc-text-muted">
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
          className="nc-button-dark min-h-[48px] w-full px-6 text-sm font-medium transition-transform hover:-translate-y-0.5"
        >
          Prøv igjen
        </button>
      </div>
    </div>
  )
}
