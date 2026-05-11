'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
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
    <div className="relative overflow-hidden rounded-2xl border border-nc-repair-border bg-nc-repair-bg">
      <div className="relative space-y-4 p-5">
        {/* Label */}
        <div className="flex items-center justify-between">
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-nc-green">
            🔁 Reparasjonsløkke
          </p>
          <span className="rounded-full bg-nc-green/10 border border-nc-green/20 px-2.5 py-0.5 text-[10px] font-semibold text-nc-green">
            {label}
          </span>
        </div>

        {/* Correct answer */}
        <div className="space-y-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-white/30">
            Riktig svar
          </p>
          <p className="text-2xl font-extrabold leading-tight text-white">
            {correctAnswer}
          </p>
        </div>

        {/* Explanation */}
        <p className="text-[13px] leading-relaxed text-white/65">
          {repairPlan.explanation}
        </p>

        {/* Grammar explainer toggle */}
        {explainer && (
          <>
            <button
              onClick={() => setShowGrammar((v) => !v)}
              className="w-full rounded-xl border border-nc-border bg-[rgba(255,255,255,0.03)] px-4 py-2.5 text-left text-[12px] font-semibold text-white/50 transition-colors hover:border-nc-green/30 hover:text-white/70"
            >
              📖 {showGrammar ? 'Skjul grammatikk' : `Vis grammatikkregler for ${explainer.title}`}
            </button>

            <AnimatePresence>
              {showGrammar && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.22 }}
                  className="overflow-hidden"
                >
                  <div className="rounded-xl border border-nc-border bg-[rgba(255,255,255,0.02)] p-4 space-y-3">
                    <p className="text-[12px] font-bold text-white">{explainer.shortRule}</p>
                    <div className="flex flex-col gap-1.5">
                      {explainer.examples.slice(0, 2).map((ex, i) => (
                        <div key={i} className="rounded-lg border border-nc-border bg-[rgba(255,255,255,0.03)] px-3 py-2">
                          <div className="text-[12px] font-bold text-white">{ex.norwegian}</div>
                          <div className="text-[10px] text-white/40">{ex.english}</div>
                        </div>
                      ))}
                    </div>
                    <div className="rounded-lg border border-nc-green/15 bg-nc-green/5 px-3 py-2">
                      <p className="text-[11px] leading-relaxed text-white/60">💡 {explainer.tip}</p>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </>
        )}

        {/* Continue */}
        <button
          type="button"
          onClick={onContinue}
          className="min-h-[48px] w-full rounded-xl bg-nc-green px-6 font-bold text-[#0d0d14] transition-transform duration-150 hover:-translate-y-[1px] active:translate-y-0"
        >
          Fortsett å øve →
        </button>
      </div>
    </div>
  )
}
