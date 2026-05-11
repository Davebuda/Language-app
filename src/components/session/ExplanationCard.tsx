'use client'

import type { RepairPlan } from '@/engine/repair-loop'

interface ExplanationCardProps {
  repairPlan: RepairPlan
  correctAnswer: string
  conceptId: string
  onContinue: () => void
}

export function ExplanationCard({
  repairPlan,
  correctAnswer,
  conceptId,
  onContinue,
}: ExplanationCardProps) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-nc-repair-border bg-nc-repair-bg">
      <div className="relative space-y-5 p-6">
        {/* Label */}
        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-nc-green">
          🔁 Reparasjonsløkke
        </p>

        {/* Correct answer block */}
        <div className="space-y-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-white/30">
            Correct answer
          </p>
          <p className="text-2xl font-extrabold leading-tight text-white">
            {correctAnswer}
          </p>
        </div>

        {/* Explanation */}
        <p className="text-sm leading-relaxed text-white/60">
          {repairPlan.explanation}
        </p>

        {/* Concept badge */}
        <div className="flex flex-wrap gap-2">
          <span className="rounded-full bg-nc-green/15 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-nc-green">
            Practising: {conceptId}
          </span>
        </div>

        {/* Continue button */}
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
