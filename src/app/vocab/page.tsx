'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { BottomNav } from '@/components/layout/BottomNav'

export default function VocabPage() {
  const [notified, setNotified] = useState(false)

  return (
    <div className="nc-gradient-page nc-secondary-flow flex min-h-dvh flex-col">
      <main className="nc-mobile-shell relative z-10 flex w-full flex-1 flex-col gap-[6px] px-1.5 pb-28 pt-3">

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.28 }}
          className="flex flex-col gap-[6px]"
        >
          {/* Lime focal panel */}
          <div className="nc-signal-panel p-4">
            <div className="nc-label">Ordforråd</div>
            <h1 className="mt-2 font-display text-[2rem] font-extrabold leading-[0.94] tracking-[-0.03em] text-[var(--nc-signal-fg)]">
              Kommer i V2
            </h1>
            <p className="mt-2 text-pretty text-[0.82rem] leading-[1.55] text-[rgba(10,18,6,0.52)]">
              Alle ord du møter i Samtale, Lesestudio og Skrivejournal samles her og repeteres med SRS — akkurat når du er i ferd med å glemme dem.
            </p>
          </div>

          {/* Cream feature strip */}
          <div className="grid grid-cols-3 overflow-hidden rounded-lg bg-[var(--nc-cream)] border border-[rgba(17,21,24,0.06)]">
            {['Intervaller', 'Morfologi', 'Kontekst'].map((feat, i) => (
              <div
                key={feat}
                className={`px-2 py-3 text-center${i > 0 ? ' relative before:absolute before:left-0 before:top-[20%] before:h-[60%] before:w-px before:bg-[rgba(17,21,24,0.08)]' : ''}`}
              >
                <div className="text-[0.72rem] font-bold text-[var(--nc-cream-text)]">{feat}</div>
                <div className="mt-0.5 text-[8px] font-bold uppercase tracking-[0.1em] text-[var(--nc-cream-dim)]">V2</div>
              </div>
            ))}
          </div>

          {/* Dark note */}
          <div className="nc-glass px-4 py-4">
            <div className="nc-label mb-2">Hva du får</div>
            <p className="text-[0.82rem] leading-[1.55] text-[var(--nc-text-muted)]">
              Intelligente gjentaksintervaller, norsk morfologi og kontekstrike eksempler fra øktene dine.
            </p>
          </div>

          {/* CTA */}
          <button
            onClick={() => setNotified(true)}
            disabled={notified}
            className="nc-button-primary inline-flex min-h-[50px] w-full items-center justify-center gap-2 px-4 text-sm font-bold disabled:opacity-60"
            aria-label="Varsle meg når ordforråd er klart"
          >
            {notified ? 'Notert' : 'Varsle meg når det er klart'}
          </button>
        </motion.div>
      </main>

      <BottomNav active="home" />
    </div>
  )
}
