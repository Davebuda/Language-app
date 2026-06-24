'use client'

import { motion } from 'framer-motion'
import { WritingEditor } from '@/components/journal/WritingEditor'
import { BottomNav } from '@/components/layout/BottomNav'

export default function JournalPage() {
  return (
    <div className="nc-gradient-page nc-secondary-flow flex min-h-dvh flex-col">
      <main className="nc-mobile-shell nc-flow-shell">

        {/* Lime hero panel */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className="relative z-10"
        >
          <div className="nc-signal-panel p-2.5">
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="text-[9px] font-bold uppercase tracking-[0.12em] text-[rgba(10,18,6,0.48)]">Journal</div>
                <h1 className="mt-1 text-balance text-[1.25rem] font-extrabold leading-none tracking-[-0.03em] text-[var(--nc-signal-fg)]">
                  Skrivejournal
                </h1>
                <p className="mt-1 text-[0.75rem] leading-[1.4] text-[rgba(10,18,6,0.60)]">
                  Skriv fritt på norsk. AI gir respons når klar.
                </p>
              </div>
              <span className="rounded-[0.3rem] bg-[rgba(10,18,6,0.90)] px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.10em] text-white">
                AI
              </span>
            </div>
          </div>
        </motion.div>

        {/* Editor — delayed in */}
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, delay: 0.08 }}
          className="relative z-10"
        >
          <WritingEditor />
        </motion.div>

      </main>

      <BottomNav active="snakk" />
    </div>
  )
}
