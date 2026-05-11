'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useFingerprintStore } from '@/stores/fingerprint-store'
import { saveFingerprint } from '@/storage/indexeddb'
import type { CEFRLevel } from '@/types/fingerprint'

const LEVELS: { value: CEFRLevel; label: string; desc: string }[] = [
  { value: 'A1', label: 'A1', desc: 'Beginner — first words' },
  { value: 'A2', label: 'A2', desc: 'Elementary — simple conversations' },
  { value: 'B1', label: 'B1', desc: 'Intermediate — handle most situations' },
  { value: 'B2', label: 'B2', desc: 'Upper Intermediate — fluent discussions' },
]

interface LevelSelectorProps {
  /** If true, renders as an inline prompt card (first-time). If false, renders as a compact picker. */
  variant: 'prompt' | 'picker'
  onClose?: () => void
}

export function LevelSelector({ variant, onClose }: LevelSelectorProps) {
  const { fingerprint, setFingerprint } = useFingerprintStore()
  const [selecting, setSelecting] = useState(false)

  async function choose(level: CEFRLevel) {
    if (!fingerprint || selecting) return
    setSelecting(true)
    const updated = {
      ...fingerprint,
      currentLevel: level,
      levelSetByUser: true,
      updatedAt: new Date().toISOString(),
    }
    setFingerprint(updated)
    await saveFingerprint(updated).catch(console.warn)
    setSelecting(false)
    onClose?.()
  }

  const current = fingerprint?.currentLevel ?? 'A1'

  if (variant === 'prompt') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -6 }}
        className="nc-panel p-4"
      >
        <div className="nc-label mb-3">What&apos;s your Norwegian level?</div>
        <div className="grid grid-cols-2 gap-2">
          {LEVELS.map((lvl) => (
            <button
              key={lvl.value}
              type="button"
              disabled={selecting}
              onClick={() => void choose(lvl.value)}
              className="flex flex-col gap-0.5 rounded-[0.875rem] border px-3 py-2.5 text-left transition-colors disabled:opacity-50"
              style={{
                background: current === lvl.value ? '#111118' : '#fff',
                borderColor: current === lvl.value ? '#111118' : 'rgba(17,17,24,0.10)',
              }}
            >
              <span
                className="text-[13px] font-bold"
                style={{ color: current === lvl.value ? '#C8FF00' : '#111118' }}
              >
                {lvl.label}
              </span>
              <span
                className="text-[11px] leading-snug"
                style={{
                  color: current === lvl.value ? 'rgba(255,255,255,0.55)' : 'rgba(17,17,24,0.45)',
                }}
              >
                {lvl.desc}
              </span>
            </button>
          ))}
        </div>
      </motion.div>
    )
  }

  // 'picker' variant — compact inline change picker
  return (
    <div className="flex flex-wrap gap-1.5">
      {LEVELS.map((lvl) => (
        <button
          key={lvl.value}
          type="button"
          disabled={selecting}
          onClick={() => void choose(lvl.value)}
          className="rounded-full border px-3 py-1 text-[11px] font-bold transition-colors disabled:opacity-50"
          style={{
            background: current === lvl.value ? '#111118' : '#fff',
            borderColor: current === lvl.value ? '#111118' : 'rgba(17,17,24,0.12)',
            color: current === lvl.value ? '#C8FF00' : 'rgba(17,17,24,0.55)',
          }}
        >
          {lvl.label}
        </button>
      ))}
    </div>
  )
}

/** Small badge shown in header — tapping opens the inline picker */
export function LevelBadge() {
  const { fingerprint } = useFingerprintStore()
  const [open, setOpen] = useState(false)
  const level = fingerprint?.currentLevel ?? 'A1'

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="rounded-full border border-nc-border bg-nc-dark px-2.5 py-1 text-[11px] font-bold text-nc-green transition-opacity hover:opacity-80"
        aria-label="Change level"
      >
        {level}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 4 }}
            className="absolute right-0 top-9 z-50 rounded-[1rem] border border-nc-border bg-nc-card p-3 shadow-card"
            style={{ minWidth: 220 }}
          >
            <div className="nc-label mb-2">Change level</div>
            <LevelSelector variant="picker" onClose={() => setOpen(false)} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Backdrop to close */}
      {open && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setOpen(false)}
        />
      )}
    </div>
  )
}
