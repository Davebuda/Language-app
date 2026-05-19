'use client'

import { motion } from 'framer-motion'
import { BottomNav } from '@/components/layout/BottomNav'

export default function ShadowPage() {
  return (
    <div className="nc-gradient-page flex flex-col min-h-dvh">
      <main className="relative z-10 mx-auto flex w-full max-w-lg flex-1 flex-col justify-center gap-4 px-5 pb-24 pt-5">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="flex flex-col items-center gap-6 text-center"
        >
          <div className="text-6xl">🎙️</div>
          <div>
            <h1 className="text-[24px] font-extrabold text-[var(--nc-text)]">Uttalelab</h1>
            <p className="mt-1 text-[13px] text-[var(--nc-text-muted)]">Hørselstrening og skygging</p>
          </div>

          <div className="nc-glass-elevated w-full p-5 text-left">
            <p className="text-[14px] leading-relaxed text-[var(--nc-text-muted)]">
              Du vil lytte til norske innfødte og gjenta setninger. AI sammenligner uttalen din og gir deg tilbakemelding på nøyaktig hvor du avviker fra norsk uttale — inkludert retroflekse lyder og tonelag.
            </p>
          </div>

          <div className="flex flex-wrap justify-center gap-2">
            {['Skygging', 'Fonemanalyse', 'Retroflekse lyder'].map((chip) => (
              <span
                key={chip}
                className="nc-glass rounded-full px-3 py-1 text-[11px] font-semibold text-[var(--nc-text-dim)]"
              >
                {chip}
              </span>
            ))}
          </div>

          <button className="nc-button-dark w-full px-4 py-3 text-sm font-semibold text-[var(--nc-text)]">
            Varsle meg når det er klart
          </button>
        </motion.div>
      </main>

      <BottomNav active="home" />
    </div>
  )
}
