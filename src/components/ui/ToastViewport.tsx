'use client'

import * as React from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useToastStore, type Toast } from '@/stores/toast-store'

/**
 * Global toast viewport. Mounted ONCE in the root layout's client tree so any
 * surface can make a silent engine action (chiefly a notebook save) VISIBLE via
 * useToastStore().showToast(...).
 *
 * - role="status" + aria-live="polite" so screen readers announce the save
 *   without stealing focus.
 * - framer-motion enter/exit; reduced-motion is honoured globally via the
 *   layout's <MotionConfig reducedMotion="user">.
 * - Each toast auto-dismisses after its durationMs and is hand-dismissable via a
 *   44px+ close target.
 *
 * SSR-safe: renders an empty live region on the server + first client render
 * (the store starts with no toasts), so there is no hydration mismatch.
 */
export function ToastViewport() {
  const toasts = useToastStore((s) => s.toasts)

  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="false"
      className="pointer-events-none fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+5.25rem)] z-[60] flex flex-col items-center gap-2 px-4"
    >
      <AnimatePresence initial={false}>
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} />
        ))}
      </AnimatePresence>
    </div>
  )
}

function ToastItem({ toast }: { toast: Toast }) {
  const dismissToast = useToastStore((s) => s.dismissToast)

  React.useEffect(() => {
    const timer = setTimeout(() => dismissToast(toast.id), toast.durationMs)
    return () => clearTimeout(timer)
  }, [toast.id, toast.durationMs, dismissToast])

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 8, scale: 0.98 }}
      transition={{ duration: 0.22, ease: [0.32, 0.72, 0, 1] }}
      className="pointer-events-auto flex w-full max-w-[22rem] items-center gap-3 rounded-[0.6rem] border border-[var(--nc-border-strong)] bg-[var(--nc-card)] px-3.5 py-2.5 text-[var(--nc-text)] shadow-[0_18px_48px_rgba(0,0,0,0.32)]"
    >
      {/* Lime accent dot — the one lime focal mark on the toast. */}
      <span
        aria-hidden="true"
        className="size-2 shrink-0 rounded-full bg-[var(--nc-signal)]"
      />
      <p className="min-w-0 flex-1 text-[0.84rem] font-semibold leading-[1.4]">
        {toast.message}
      </p>
      <button
        type="button"
        onClick={() => dismissToast(toast.id)}
        aria-label="Lukk"
        className="-mr-1.5 flex size-11 shrink-0 items-center justify-center rounded-[0.45rem] text-[var(--nc-text-muted)] transition-colors hover:text-[var(--nc-text)]"
      >
        <span aria-hidden="true" className="text-[1.1rem] leading-none">
          ×
        </span>
      </button>
    </motion.div>
  )
}
