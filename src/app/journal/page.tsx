'use client'

import { motion } from 'framer-motion'
import { WritingEditor } from '@/components/journal/WritingEditor'
import { BottomNav } from '@/components/layout/BottomNav'

export default function JournalPage() {
  return (
    <div className="nc-gradient-page flex flex-col min-h-dvh">
      <main className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-4 px-5 pb-4 pt-5">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="relative z-10"
        >
          <h1 className="text-[22px] font-extrabold text-[var(--nc-text)]">Skrivejournal</h1>
          <p className="text-[13px] text-[var(--nc-text-muted)]">Skriv fritt på norsk — AI gir deg tilbakemelding</p>
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
