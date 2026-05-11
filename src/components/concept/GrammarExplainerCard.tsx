'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { GRAMMAR_EXPLAINERS, type GrammarExplainer } from '@/lib/grammar-explainers'

interface GrammarExplainerCardProps {
  conceptId: string
  compact?: boolean
}

export function GrammarExplainerCard({ conceptId, compact = false }: GrammarExplainerCardProps) {
  const [expanded, setExpanded] = useState(false)
  const explainer = GRAMMAR_EXPLAINERS[conceptId]

  if (!explainer) return null

  if (compact) {
    return (
      <div className="rounded-xl border border-nc-border bg-nc-card p-4">
        <div className="mb-1 text-[10px] font-bold uppercase tracking-widest text-white/30">
          Grammatikk
        </div>
        <p className="text-[13px] font-semibold text-white">{explainer.shortRule}</p>
        <button
          onClick={() => setExpanded((v) => !v)}
          className="mt-2 text-[11px] font-semibold text-nc-green"
        >
          {expanded ? 'Lukk ↑' : 'Les mer →'}
        </button>
        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <FullExplainerContent explainer={explainer} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    )
  }

  return (
    <div className="rounded-2xl border border-nc-border bg-nc-card p-5 space-y-4">
      <div>
        <div className="mb-1 text-[10px] font-bold uppercase tracking-widest text-nc-green/70">
          Grammatikk
        </div>
        <h2 className="text-[17px] font-extrabold text-white">{explainer.title}</h2>
        <p className="mt-1 text-[13px] font-semibold text-white/70">{explainer.shortRule}</p>
      </div>
      <FullExplainerContent explainer={explainer} />
    </div>
  )
}

function FullExplainerContent({ explainer }: { explainer: GrammarExplainer }) {
  return (
    <div className="space-y-4 pt-2">
      <p className="text-[13px] leading-relaxed text-white/60">{explainer.explanation}</p>

      {/* Examples */}
      <div>
        <div className="mb-2 text-[10px] font-bold uppercase tracking-widest text-white/30">
          Eksempler
        </div>
        <div className="flex flex-col gap-2">
          {explainer.examples.map((ex, i) => (
            <div key={i} className="rounded-lg border border-nc-border bg-[rgba(255,255,255,0.03)] px-3 py-2">
              <div className="text-[13px] font-bold text-white">{ex.norwegian}</div>
              <div className="text-[11px] text-white/40">{ex.english}
                {ex.note && <span className="ml-2 text-nc-green/60">· {ex.note}</span>}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Common mistakes */}
      <div>
        <div className="mb-2 text-[10px] font-bold uppercase tracking-widest text-white/30">
          Vanlige feil
        </div>
        <div className="flex flex-col gap-1.5">
          {explainer.commonMistakes.map((m, i) => (
            <div key={i} className="flex items-start gap-2 text-[12px] text-white/50">
              <span className="mt-0.5 text-[10px] text-red-400">✗</span>
              {m}
            </div>
          ))}
        </div>
      </div>

      {/* Tip */}
      <div className="rounded-xl border border-nc-green/15 bg-nc-green/5 px-4 py-3">
        <div className="mb-1 text-[10px] font-bold uppercase tracking-widest text-nc-green/50">
          Tips
        </div>
        <p className="text-[12px] leading-relaxed text-white/70">{explainer.tip}</p>
      </div>
    </div>
  )
}
