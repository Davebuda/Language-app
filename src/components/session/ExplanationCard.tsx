'use client'

import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import type { RepairPlan } from '@/engine/repair-loop'
import { GRAMMAR_EXPLAINERS } from '@/lib/grammar-explainers'
import { SavableWord } from '@/components/shared/SavableWord'

// Norwegian labels for the error classes — the "caught" chip names the mistake
// type crisply (the explanation below describes it). Keeps the surface Norwegian.
const ERROR_TAG_LABELS: Record<string, string> = {
  'word-order': 'Ordstilling',
  'verb-tense': 'Verbtid',
  'verb-conjugation': 'Verbbøying',
  'noun-gender': 'Substantivkjønn',
  'article-use': 'Artikkelbruk',
  'adjective-agreement': 'Adjektivsamsvar',
  'pronoun-choice': 'Pronomenvalg',
  preposition: 'Preposisjon',
  'modal-verb': 'Modalverb',
  'negation-placement': 'Nekting',
  'compound-word': 'Sammensatt ord',
  'wrong-word-same-category': 'Ordvalg',
  'wrong-word-different-category': 'Ordvalg',
  spelling: 'Staving',
  'listening-recognition': 'Lytting',
  'reading-parsing': 'Lesing',
  'meaning-misunderstood': 'Forståelse',
  unspecified: 'Generelt',
}

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
  const errorLabel = ERROR_TAG_LABELS[repairPlan.errorTag]

  return (
    <div className="overflow-hidden rounded-[0.75rem] border border-[var(--nc-repair-border)] bg-[var(--nc-repair-bg)] shadow-[0_18px_48px_rgba(0,0,0,0.22)]">
      {/* Red accent bar signals repair mode */}
      <div className="h-[3px] w-full bg-[linear-gradient(90deg,var(--nc-red)_0%,rgba(255,106,85,0.55)_100%)]" />
      <div className="space-y-[6px] p-3.5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="nc-label-red">Reparasjon</p>
            <h3 className="mt-1.5 text-balance font-display text-[1.55rem] font-extrabold leading-[0.96] tracking-[-0.03em] text-[var(--nc-text)]">
              Nesten.
            </h3>
            {/* What the repair caught — names the mistake class, beside the
                explanation prose below (the moat's remediation made visible). */}
            {errorLabel ? (
              <span className="mt-2 inline-flex items-center rounded-[0.3rem] border border-[var(--nc-red-border)] bg-[var(--nc-red-tint)] px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.08em] text-[var(--nc-text-muted)]">
                Fanget · {errorLabel}
              </span>
            ) : null}
          </div>
          <span className="shrink-0 rounded-[0.35rem] border border-[var(--nc-border)] bg-[rgba(255,255,255,0.06)] px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.10em] text-[var(--nc-text-muted)]">
            {label}
          </span>
        </div>

        <p className="text-pretty text-[0.84rem] leading-[1.6] text-[var(--nc-text-muted)]">
          {repairPlan.explanation}
        </p>

        {/* Correct answer — dark panel on dark card for contrast */}
        <div className="rounded-[0.55rem] border border-[var(--nc-border-strong)] bg-[var(--nc-card)] px-3 py-2.5">
          <div className="nc-label">Riktig svar</div>
          <SavableWord
            text={correctAnswer}
            source="okt"
            type="word"
            conceptId={conceptId}
            errorTag={repairPlan.errorTag}
          >
            <span className="mt-1.5 font-display text-[1.15rem] font-bold tracking-tight text-[var(--nc-signal)]">
              {correctAnswer}
            </span>
          </SavableWord>
        </div>

        {explainer ? (
          <>
            <button
              type="button"
              onClick={() => setShowGrammar((current) => !current)}
              className="w-full rounded-[0.55rem] border border-[var(--nc-border)] bg-[rgba(255,255,255,0.04)] px-4 py-2.5 text-left text-[0.82rem] font-semibold text-[var(--nc-text-muted)] transition-colors hover:bg-[rgba(255,255,255,0.08)]"
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
                  <div className="rounded-[0.55rem] border border-[var(--nc-border)] bg-[var(--nc-card)] px-3 py-3">
                    <p className="text-[0.84rem] font-semibold text-[var(--nc-text)]">
                      {explainer.shortRule}
                    </p>
                    <div className="mt-2.5 flex flex-col gap-2">
                      {explainer.examples.slice(0, 2).map((example, index) => (
                        <div
                          key={`${example.norwegian}-${index}`}
                          className="rounded-[0.45rem] border border-[var(--nc-border-subtle)] bg-[rgba(255,255,255,0.04)] px-3 py-2.5"
                        >
                          <div className="text-[0.84rem] font-semibold text-[var(--nc-text)]">
                            {example.norwegian}
                          </div>
                          <div className="mt-0.5 text-[0.75rem] text-[var(--nc-text-muted)]">
                            {example.english}
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="mt-2.5 rounded-[0.45rem] border border-[var(--nc-red-border)] bg-[var(--nc-red-tint)] px-3 py-2.5 text-[0.82rem] leading-[1.6] text-[var(--nc-text-muted)]">
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
          className="nc-button-primary min-h-[52px] w-full px-6 text-[0.9rem] font-bold"
        >
          Prøv igjen
        </button>
      </div>
    </div>
  )
}
