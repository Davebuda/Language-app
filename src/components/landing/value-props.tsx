'use client'

import { motion } from 'framer-motion'
import { ScanSearch, Crosshair, Repeat2 } from 'lucide-react'

const VALUE_PROPS = [
  {
    icon: ScanSearch,
    title: 'Finds your weaknesses',
    body: 'A short diagnostic session maps exactly where your Norwegian breaks down — grammar, pronunciation, vocabulary, or fluency under pressure.',
  },
  {
    icon: Crosshair,
    title: 'Targets what holds you back',
    body: "Most learners drill what they already know. NorskCoach surfaces the specific patterns blocking your progress and explains the linguistic reason behind each one.",
  },
  {
    icon: Repeat2,
    title: 'Fixes it with adaptive practice',
    body: 'Exercises adjust in real time to your error patterns. As a gap closes, the system moves on. No repetition for the sake of repetition.',
  },
]

const containerVariants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.1, delayChildren: 0.6 },
  },
}

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } },
}

export function ValueProps() {
  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="mt-20 grid gap-4 sm:grid-cols-3"
    >
      {VALUE_PROPS.map((prop) => {
        const Icon = prop.icon
        return (
          <motion.div
            key={prop.title}
            variants={cardVariants}
            className="group relative rounded-2xl p-5 transition-all duration-300"
            style={{
              background: 'rgba(255,255,255,0.025)',
              border: '1px solid rgba(255,255,255,0.06)',
            }}
            whileHover={{
              backgroundColor: 'var(--nc-red-tint)',
              borderColor: 'var(--nc-red-border)',
              transition: { duration: 0.2 },
            }}
          >
            <div
              className="mb-4 inline-flex h-9 w-9 items-center justify-center rounded-lg"
              style={{
                background: 'var(--nc-red-tint)',
                border: '1px solid var(--nc-red-border)',
              }}
            >
              <Icon className="h-4 w-4 text-[var(--nc-red)]" />
            </div>

            <h3 className="mb-2 text-sm font-bold text-foreground">{prop.title}</h3>
            <p className="text-sm leading-relaxed text-foreground-muted">{prop.body}</p>
          </motion.div>
        )
      })}
    </motion.div>
  )
}
