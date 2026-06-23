'use client'

import * as React from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Popover,
  PopoverAnchor,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import type { WordExplanation } from '@/lib/word-explanation'

export interface WordPopupProps {
  /** The Norwegian word/phrase the popup explains. */
  word: string
  /** Resolved verified-first / AI-marked / honest-empty content (Task 2.3). */
  explanation: WordExplanation
  /** Optional — the Save button renders only when provided. Wiring lands in a later task. */
  onSave?: () => void
  /** The trigger — the clickable word. Rendered inside a real <button>. */
  children: React.ReactNode
}

/**
 * Reusable clickable-word popup. AI-01 honesty is enforced by the CONTENT rules:
 *  - the verified corpus rule/english renders as the primary, trusted block;
 *  - any AI suggestion renders in a clearly-MARKED secondary "forslag" block,
 *    never styled as authoritative truth;
 *  - when nothing is verified and there is no AI text (source === 'none'), an
 *    honest empty state ("Ingen oppslag ennå") shows — never a fabricated gloss.
 *
 * Desktop (>640px): Radix Popover anchored to the word (focus + Esc handled by Radix).
 * Mobile (<=640px): a fixed bottom-sheet (framer-motion slide-up + backdrop), with
 * Esc + backdrop-click dismissal and focus moved into the sheet.
 */
export function WordPopup({ word, explanation, onSave, children }: WordPopupProps) {
  const [open, setOpen] = React.useState(false)
  // SSR-safe: false on server + first client render (matches markup), then syncs.
  const isMobile = useMediaQuery('(max-width: 640px)')

  const content = (
    <WordPopupContent word={word} explanation={explanation} onSave={onSave} />
  )

  // Mobile: render the trigger as a real button + a framer-motion bottom-sheet.
  if (isMobile) {
    return (
      <>
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-haspopup="dialog"
          aria-expanded={open}
          className="nc-word-trigger cursor-pointer underline decoration-dotted underline-offset-2"
        >
          {children}
        </button>
        <MobileSheet open={open} onClose={() => setOpen(false)} title={word}>
          {content}
        </MobileSheet>
      </>
    )
  }

  // Desktop: Radix Popover anchored to the word (Radix handles focus + Esc).
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverAnchor asChild>
        <PopoverTrigger asChild>
          <button
            type="button"
            aria-haspopup="dialog"
            className="nc-word-trigger cursor-pointer underline decoration-dotted underline-offset-2"
          >
            {children}
          </button>
        </PopoverTrigger>
      </PopoverAnchor>
      <PopoverContent role="dialog" aria-label={`Oppslag: ${word}`}>
        {content}
      </PopoverContent>
    </Popover>
  )
}

/**
 * The shared inner content — identical on desktop and mobile. Norwegian-dominant,
 * dark-card token surface (matches PopoverContent + the repair card).
 */
function WordPopupContent({
  word,
  explanation,
  onSave,
}: {
  word: string
  explanation: WordExplanation
  onSave?: () => void
}) {
  const rule = explanation.verified?.rule
  const english = explanation.verified?.english
  const hasVerified = Boolean(rule || english)

  return (
    <div className="flex flex-col gap-3">
      {/* The Norwegian word/phrase, prominent. */}
      <div>
        <p className="text-[9px] font-bold uppercase tracking-[0.10em] text-[var(--nc-text-muted)]">
          Norsk
        </p>
        <p className="mt-0.5 font-display text-[1.25rem] font-extrabold leading-tight tracking-[-0.02em] text-[var(--nc-text)]">
          {word}
        </p>
      </div>

      {/* Primary, trusted corpus content. */}
      {hasVerified ? (
        <div className="flex flex-col gap-2 rounded-[0.55rem] border border-[var(--nc-border-strong)] bg-[rgba(255,255,255,0.04)] px-3 py-2.5">
          {rule ? (
            <div>
              <p className="text-[9px] font-bold uppercase tracking-[0.10em] text-[var(--nc-text-muted)]">
                Regel
              </p>
              <p className="mt-0.5 text-[0.86rem] font-semibold leading-[1.5] text-[var(--nc-text)]">
                {rule}
              </p>
            </div>
          ) : null}
          {english ? (
            <div>
              <p className="text-[9px] font-bold uppercase tracking-[0.10em] text-[var(--nc-text-muted)]">
                Engelsk
              </p>
              <p className="mt-0.5 text-[0.86rem] leading-[1.5] text-[var(--nc-signal)]">
                {english}
              </p>
            </div>
          ) : null}
        </div>
      ) : null}

      {/* AI suggestion — clearly MARKED, visually secondary, never authoritative. */}
      {explanation.aiSuggested ? (
        <div className="rounded-[0.55rem] border border-dashed border-[var(--nc-border)] bg-[rgba(255,255,255,0.02)] px-3 py-2.5">
          <span className="inline-flex items-center rounded-[0.3rem] border border-[var(--nc-border)] bg-[rgba(255,255,255,0.04)] px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.08em] text-[var(--nc-text-muted)]">
            Forslag
          </span>
          <p className="mt-1.5 text-[0.82rem] italic leading-[1.5] text-[var(--nc-text-muted)]">
            {explanation.aiSuggested}
          </p>
        </div>
      ) : null}

      {/* Honest empty state — no verified content, no AI. Never fabricate. */}
      {explanation.source === 'none' ? (
        <p className="text-[0.82rem] leading-[1.5] text-[var(--nc-text-muted)]">
          Ingen oppslag ennå
        </p>
      ) : null}

      {/* Save — only when a handler is provided. */}
      {onSave ? (
        <button
          type="button"
          onClick={onSave}
          className="nc-button-primary min-h-[44px] w-full px-4 text-[0.84rem] font-bold"
        >
          Lagre i notatboka
        </button>
      ) : null}
    </div>
  )
}

/**
 * Mobile bottom-sheet: framer-motion slide-up + a fading backdrop. Dismissable via
 * backdrop click and Esc; focus is moved into the sheet on open.
 */
function MobileSheet({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
}) {
  const sheetRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    if (!open) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    // Move focus into the sheet for keyboard users.
    sheetRef.current?.focus()
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open, onClose])

  return (
    <AnimatePresence>
      {open ? (
        <div className="fixed inset-0 z-50 flex flex-col justify-end">
          <motion.div
            className="absolute inset-0 bg-black/55"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            onClick={onClose}
            aria-hidden="true"
          />
          <motion.div
            ref={sheetRef}
            role="dialog"
            aria-modal="true"
            aria-label={`Oppslag: ${title}`}
            tabIndex={-1}
            className="relative w-full rounded-t-[1.1rem] border-t border-[var(--nc-border)] bg-[var(--nc-card)] px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-3 text-[var(--nc-text)] shadow-[0_-18px_48px_rgba(0,0,0,0.4)] outline-none"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 320 }}
          >
            {/* Grab handle */}
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-[var(--nc-border-strong)]" />
            {children}
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>
  )
}
