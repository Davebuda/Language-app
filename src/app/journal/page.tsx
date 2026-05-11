'use client'

import { motion } from 'framer-motion'
import { WritingEditor } from '@/components/journal/WritingEditor'
import { BottomNav } from '@/components/layout/BottomNav'

export default function JournalPage() {
  return (
    <div className="flex min-h-dvh flex-col bg-nc-bg">
      <main className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-4 px-5 pb-4 pt-5">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <h1 className="text-[22px] font-extrabold text-white">Skrivejournal</h1>
          <p className="text-[13px] text-white/40">Skriv fritt på norsk — AI gir deg tilbakemelding</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.08 }}
        >
          <WritingEditor />
        </motion.div>
      </main>

      <BottomNav active="home" />
    </div>
  )
}
