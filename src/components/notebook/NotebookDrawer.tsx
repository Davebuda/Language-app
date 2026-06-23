'use client'

import * as React from 'react'
import Link from 'next/link'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { ArrowRight, X } from 'lucide-react'
import { useNotebook } from '@/hooks/useNotebook'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import type { NotebookItem, NotebookSource } from '@/types/notebook'

// Norwegian source labels — mirror NotebookScreen so the chip reads identically
// across surfaces (learning surface → Norwegian dominates).
const SOURCE_LABEL: Record<NotebookSource, string> = {
  okt: 'fra økt',
  journal: 'fra journal',
  reading: 'fra lesing',
  conversation: 'fra samtale',
  manual: 'lagt til selv',
}

// How many recent saves the quick-access drawer shows. The full list lives at /vocab.
const RECENT_LIMIT = 5

export interface NotebookDrawerProps {
  open: boolean
  onClose: () => void
}

/**
 * Quick-access notebook drawer — the learner's MOST RECENT saves (last 5 by
 * createdAt) as compact rows, with an honest empty state and a footer link into
 * the full notebook (/vocab). View-only: no scheduler/promotion/edit here.
 *
 * Desktop (>640px): a right-side slide-in panel. Mobile (<=640px): a bottom sheet.
 * Both paths trap focus, dismiss on Esc + backdrop click, move focus into the
 * panel on open, and restore focus to the trigger on close — the WordPopup
 * MobileSheet a11y contract, applied to both breakpoints.
 */
export function NotebookDrawer({ open, onClose }: NotebookDrawerProps) {
  const { items, status } = useNotebook()
  const reduce = useReducedMotion()
  const isMobile = useMediaQuery('(max-width: 640px)')

  // Most recent saves first, capped — sort a copy so the store order is untouched.
  const recent = React.useMemo<NotebookItem[]>(() => {
    return [...items]
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, RECENT_LIMIT)
  }, [items])

  const panelRef = React.useRef<HTMLDivElement>(null)
  // Element focused before the drawer opened (the trigger) — restored on close.
  const triggerRef = React.useRef<HTMLElement | null>(null)
  // Keep onClose in a ref so its inline identity doesn't re-run the effect (which
  // would restore focus mid-open). The effect depends only on `open`.
  const onCloseRef = React.useRef(onClose)
  onCloseRef.current = onClose

  React.useEffect(() => {
    if (!open) return

    triggerRef.current = document.activeElement as HTMLElement | null

    const getFocusable = (): HTMLElement[] => {
      const root = panelRef.current
      if (!root) return []
      return Array.from(
        root.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])',
        ),
      ).filter((el) => el.offsetParent !== null || el === root)
    }

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCloseRef.current()
        return
      }
      if (e.key !== 'Tab') return
      // Trap Tab within the panel so focus can't escape to the page behind it.
      const focusable = getFocusable()
      const root = panelRef.current
      if (!root) return
      const first = focusable[0] ?? root
      const last = focusable[focusable.length - 1] ?? root
      const active = document.activeElement
      if (e.shiftKey) {
        if (active === first || active === root) {
          e.preventDefault()
          last.focus()
        }
      } else if (active === last) {
        e.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', onKeyDown)
    panelRef.current?.focus()
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      triggerRef.current?.focus()
    }
    // Depends only on `open`: onClose is read via onCloseRef to avoid re-running
    // (and prematurely restoring focus) when its inline identity changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  // Panel slides from the right on desktop, up from the bottom on mobile.
  const panelMotion = isMobile
    ? { initial: { y: '100%' }, animate: { y: 0 }, exit: { y: '100%' } }
    : { initial: { x: '100%' }, animate: { x: 0 }, exit: { x: '100%' } }

  const panelLayout = isMobile
    ? 'w-full rounded-t-[1.1rem] border-t pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-3'
    : 'ml-auto h-full w-[min(22rem,90vw)] border-l pt-4'

  return (
    <AnimatePresence>
      {open ? (
        <div className={`fixed inset-0 z-50 flex ${isMobile ? 'flex-col justify-end' : 'flex-row'}`}>
          <motion.div
            className="absolute inset-0 bg-black/55"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduce ? 0 : 0.2, ease: 'easeOut' }}
            onClick={onClose}
            aria-hidden="true"
          />
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label="Notatboka — siste lagrede"
            tabIndex={-1}
            className={`relative flex flex-col gap-3 border-[var(--nc-border)] bg-[var(--nc-card)] px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] text-[var(--nc-text)] shadow-[0_-18px_48px_rgba(0,0,0,0.4)] outline-none ${panelLayout}`}
            {...panelMotion}
            transition={
              reduce
                ? { duration: 0 }
                : { type: 'spring', damping: 30, stiffness: 320 }
            }
          >
            {/* Mobile grab handle */}
            {isMobile ? (
              <div className="mx-auto h-1 w-10 rounded-full bg-[var(--nc-border-strong)]" />
            ) : null}

            {/* Header */}
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-[9px] font-bold uppercase tracking-[0.13em] text-[var(--nc-text-muted)]">
                  Notatboka
                </p>
                <h2 className="mt-0.5 font-display text-[1.15rem] font-extrabold leading-tight tracking-[-0.02em] text-[var(--nc-text)]">
                  Siste lagrede
                </h2>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Lukk"
                className="flex size-9 shrink-0 items-center justify-center rounded-[var(--radius)] text-[var(--nc-text-dim)] transition-colors hover:text-[var(--nc-text)]"
              >
                <X size={18} aria-hidden="true" />
              </button>
            </div>

            {/* Body */}
            {status === 'loading' ? (
              <p className="py-6 text-center text-[0.82rem] text-[var(--nc-text-muted)]">
                Laster …
              </p>
            ) : recent.length === 0 ? (
              <p className="py-8 text-center text-[0.85rem] leading-[1.5] text-[var(--nc-text-muted)]">
                Notatboka er tom
              </p>
            ) : (
              <ul className="flex flex-col gap-1.5">
                {recent.map((item) => (
                  <li
                    key={item.id}
                    className="rounded-[0.55rem] border border-[var(--nc-border)] bg-[rgba(255,255,255,0.03)] px-3 py-2.5"
                  >
                    <p className="font-display text-[0.95rem] font-bold leading-tight text-[var(--nc-text)]">
                      {item.norwegian}
                    </p>
                    {item.english ? (
                      <p className="mt-0.5 text-[0.78rem] leading-[1.4] text-[var(--nc-text-muted)]">
                        {item.english}
                      </p>
                    ) : null}
                    <span className="mt-1.5 inline-flex items-center rounded-full border border-[var(--nc-border)] px-2 py-0.5 text-[0.62rem] font-bold uppercase tracking-[0.06em] text-[var(--nc-text-dim)]">
                      {SOURCE_LABEL[item.source]}
                    </span>
                  </li>
                ))}
              </ul>
            )}

            {/* Footer link into the full notebook */}
            <Link
              href="/vocab"
              onClick={onClose}
              className="mt-auto flex min-h-[44px] items-center justify-between gap-2 rounded-[0.55rem] border border-[var(--nc-border)] bg-[rgba(255,255,255,0.02)] px-3.5 text-[0.84rem] font-bold text-[var(--nc-text)] transition-colors hover:bg-[rgba(255,255,255,0.05)]"
            >
              Åpne notatboka
              <ArrowRight size={15} aria-hidden="true" className="text-[var(--nc-text-muted)]" />
            </Link>
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>
  )
}
