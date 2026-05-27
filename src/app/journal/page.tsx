'use client'

import { motion } from 'framer-motion'
import { WritingEditor } from '@/components/journal/WritingEditor'
import { BottomNav } from '@/components/layout/BottomNav'

export default function JournalPage() {
  return (
    <div className="nc-gradient-page flex min-h-dvh flex-col">
      <main className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-4 px-5 pb-24 pt-5">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="relative z-10"
        >
          <div className="nc-glass-cream p-5">
            <div className="nc-label">Skriveflate</div>
            <h1 className="mt-2 text-[2rem] font-extrabold text-[var(--nc-cream-text)]">Skrivejournal</h1>
            <p className="mt-2 max-w-2xl text-[0.95rem] leading-7 text-[var(--nc-cream-muted)]">
              Skriv fritt på norsk. Når AI-en er klar får du modellrespons. Når den ikke er det, viser vi ærlige fallback-svar.
            </p>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.08 }}
          className="relative z-10"
        >
          <WritingEditor />
        </motion.div>
      </main>

      <BottomNav active="home" />
    </div>
  )
}
