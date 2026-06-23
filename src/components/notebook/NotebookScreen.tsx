'use client'

import { useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Search, Star, Archive, Trash2, Plus, Check, Languages } from 'lucide-react'
import { useNotebook } from '@/hooks/useNotebook'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { BottomNav } from '@/components/layout/BottomNav'
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
} from '@/components/ui/alert-dialog'
import type {
  NotebookItem,
  NotebookItemType,
  NotebookSource,
} from '@/types/notebook'

// ── Norwegian display labels (learning surface → Norwegian dominates) ──────────
const TYPE_LABEL: Record<NotebookItemType, string> = {
  word: 'ord',
  phrase: 'uttrykk',
  sentence: 'setning',
  rule: 'regel',
  note: 'notat',
}

const SOURCE_LABEL: Record<NotebookSource, string> = {
  okt: 'fra økt',
  journal: 'fra journal',
  reading: 'fra lesing',
  conversation: 'fra samtale',
  manual: 'lagt til selv',
}

// Type filter chips, in a stable display order.
const TYPE_FILTERS: NotebookItemType[] = ['word', 'phrase', 'sentence', 'rule', 'note']

// reviewStatus filters surfaced as chips. 'starred' is the dedicated stjernemerket
// filter; 'archived' lets the learner find what they've shelved.
type StatusFilter = 'starred' | 'archived'
const STATUS_FILTERS: { id: StatusFilter; label: string }[] = [
  { id: 'starred', label: 'Stjernemerket' },
  { id: 'archived', label: 'Arkivert' },
]

function matchesSearch(item: NotebookItem, query: string): boolean {
  if (!query) return true
  const haystack = [item.norwegian, item.english ?? '', item.explanation ?? '']
    .join(' ')
    .toLowerCase()
  return haystack.includes(query.toLowerCase())
}

/**
 * The learner's saved-notebook home (the de-facto v2 vocab surface). View + curate
 * only — search, filter, star/archive/delete. No scheduler/promotion wiring here
 * (later tasks 3.9/3.12); existing item fields render read-only. AI-01 is honored:
 * AI-suggested items (verified === false) are visibly marked "forslag", never shown
 * as authoritative.
 */
export function NotebookScreen() {
  const { items, status, updateItem, removeItem } = useNotebook()

  const [query, setQuery] = useState('')
  const [typeFilters, setTypeFilters] = useState<Set<NotebookItemType>>(new Set())
  const [statusFilters, setStatusFilters] = useState<Set<StatusFilter>>(new Set())

  const toggleType = (t: NotebookItemType) => {
    setTypeFilters((prev) => {
      const next = new Set(prev)
      if (next.has(t)) next.delete(t)
      else next.add(t)
      return next
    })
  }

  const toggleStatus = (s: StatusFilter) => {
    setStatusFilters((prev) => {
      const next = new Set(prev)
      if (next.has(s)) next.delete(s)
      else next.add(s)
      return next
    })
  }

  const visibleItems = useMemo(() => {
    return items.filter((item) => {
      if (!matchesSearch(item, query)) return false
      if (typeFilters.size > 0 && !typeFilters.has(item.type)) return false
      if (statusFilters.has('starred') && item.reviewStatus !== 'starred') return false
      if (statusFilters.has('archived') && item.reviewStatus !== 'archived') return false
      // When no status filter is active, hide archived items from the default view.
      if (statusFilters.size === 0 && item.reviewStatus === 'archived') return false
      return true
    })
  }, [items, query, typeFilters, statusFilters])

  if (status === 'loading') {
    return <LoadingSpinner />
  }

  const hasAnyItems = items.length > 0

  return (
    <div className="nc-gradient-page nc-secondary-flow flex min-h-dvh flex-col">
      <main className="nc-mobile-shell nc-flow-shell">
        {/* Header — lime focal panel, mirrors the other flow surfaces */}
        <div className="nc-signal-panel p-4">
          <div className="nc-label">Notatboka</div>
          <h1 className="mt-2 font-display text-[1.6rem] font-extrabold leading-[0.96] tracking-[-0.03em] text-[var(--nc-signal-fg)]">
            Notatboka di
          </h1>
          <p className="mt-2 text-[0.82rem] leading-[1.5] text-[rgba(10,18,6,0.56)]">
            {hasAnyItems
              ? `${items.length} ${items.length === 1 ? 'lagret ord' : 'lagrede ord'}`
              : 'Alt du lagrer underveis samles her.'}
          </p>
        </div>

        {hasAnyItems && (
          <>
            {/* Search */}
            <div className="relative">
              <Search
                size={16}
                aria-hidden="true"
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--nc-cream-muted)]"
              />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Søk i notatboka"
                aria-label="Søk i notatboka"
                className="nc-input nc-input-cream pl-9"
              />
            </div>

            {/* Filter chips — type + status */}
            <div className="flex flex-wrap gap-1.5">
              {TYPE_FILTERS.map((t) => {
                const active = typeFilters.has(t)
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => toggleType(t)}
                    aria-pressed={active}
                    className={`min-h-[34px] rounded-full border px-3 text-[0.72rem] font-bold transition-colors ${
                      active
                        ? 'border-[var(--nc-signal-border)] bg-[var(--nc-signal-tint)] text-[var(--nc-signal)]'
                        : 'border-[var(--nc-border)] text-[var(--nc-text-muted)] hover:text-[var(--nc-text)]'
                    }`}
                  >
                    {TYPE_LABEL[t]}
                  </button>
                )
              })}
              {STATUS_FILTERS.map(({ id, label }) => {
                const active = statusFilters.has(id)
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => toggleStatus(id)}
                    aria-pressed={active}
                    className={`inline-flex min-h-[34px] items-center gap-1 rounded-full border px-3 text-[0.72rem] font-bold transition-colors ${
                      active
                        ? 'border-[var(--nc-signal-border)] bg-[var(--nc-signal-tint)] text-[var(--nc-signal)]'
                        : 'border-[var(--nc-border)] text-[var(--nc-text-muted)] hover:text-[var(--nc-text)]'
                    }`}
                  >
                    {id === 'starred' && (
                      <Star size={12} aria-hidden="true" className={active ? 'fill-current' : ''} />
                    )}
                    {label}
                  </button>
                )
              })}
            </div>

            {/* Item list */}
            <ul className="flex flex-col gap-1.5">
              <AnimatePresence initial={false}>
                {visibleItems.map((item) => (
                  <motion.li
                    key={item.id}
                    layout
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.2 }}
                  >
                    <NotebookCard
                      item={item}
                      onToggleStar={() =>
                        updateItem(item.id, {
                          reviewStatus: item.reviewStatus === 'starred' ? 'new' : 'starred',
                        })
                      }
                      onArchive={() =>
                        updateItem(item.id, {
                          reviewStatus: item.reviewStatus === 'archived' ? 'new' : 'archived',
                        })
                      }
                      onTogglePractice={() =>
                        updateItem(item.id, { promoted: !item.promoted })
                      }
                      onAddTranslation={(english) =>
                        // Learner's own translation (AI-01: a learner value, NOT verified).
                        // Adding it makes the item practiceable, so promote it in one step.
                        updateItem(item.id, { english, promoted: true })
                      }
                      onDelete={() => removeItem(item.id)}
                    />
                  </motion.li>
                ))}
              </AnimatePresence>
            </ul>

            {/* No-match state (items exist, but the filter/search hides them all) */}
            {visibleItems.length === 0 && (
              <div className="nc-glass px-4 py-6 text-center">
                <p className="text-[0.85rem] text-[var(--nc-text-muted)]">
                  Ingen treff. Prøv et annet søk eller filter.
                </p>
              </div>
            )}
          </>
        )}

        {/* Honest empty state — no items saved yet */}
        {!hasAnyItems && (
          <div className="nc-glass flex flex-col items-center gap-3 px-5 py-10 text-center">
            <div className="flex size-12 items-center justify-center rounded-full bg-[var(--nc-signal-tint)] text-[var(--nc-signal)]">
              <Plus size={22} aria-hidden="true" />
            </div>
            <p className="text-pretty text-[0.9rem] leading-[1.5] text-[var(--nc-text-muted)]">
              Notatboka er tom — trykk <span className="font-bold text-[var(--nc-text)]">+</span> på
              et ord for å lagre det.
            </p>
          </div>
        )}
      </main>

      <BottomNav active="home" />
    </div>
  )
}

// ── Single saved item ─────────────────────────────────────────────────────────

function NotebookCard({
  item,
  onToggleStar,
  onArchive,
  onTogglePractice,
  onAddTranslation,
  onDelete,
}: {
  item: NotebookItem
  onToggleStar: () => void
  onArchive: () => void
  onTogglePractice: () => void
  onAddTranslation: (english: string) => void
  onDelete: () => void
}) {
  const starred = item.reviewStatus === 'starred'
  const archived = item.reviewStatus === 'archived'
  const canPractice = Boolean(item.english?.trim())

  // Inline "add translation" affordance, shown only when the item lacks an
  // english value (and so cannot be served as a translation exercise yet).
  const [addingTranslation, setAddingTranslation] = useState(false)
  const [draftEnglish, setDraftEnglish] = useState('')

  const submitTranslation = () => {
    const value = draftEnglish.trim()
    if (!value) return
    onAddTranslation(value)
    setDraftEnglish('')
    setAddingTranslation(false)
  }

  return (
    <div className={`nc-glass px-3.5 py-3 ${archived ? 'opacity-60' : ''}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          {/* Norwegian is the prominent, dominant element */}
          <p className="font-display text-[1.05rem] font-bold leading-tight text-[var(--nc-text)]">
            {item.norwegian}
          </p>
          {item.english && (
            <p className="mt-0.5 text-[0.82rem] text-[var(--nc-text-muted)]">{item.english}</p>
          )}
          {item.explanation && (
            <p className="mt-1 text-[0.78rem] leading-[1.45] text-[var(--nc-text-dim)]">
              {item.explanation}
            </p>
          )}
        </div>

        {/* Per-item actions */}
        <div className="flex shrink-0 items-center gap-0.5">
          <button
            type="button"
            onClick={onToggleStar}
            aria-label={starred ? 'Fjern stjerne' : 'Stjernemerk'}
            aria-pressed={starred}
            className="flex size-9 items-center justify-center rounded-[var(--radius)] text-[var(--nc-text-dim)] transition-colors hover:text-[var(--nc-signal)]"
          >
            <Star
              size={16}
              className={starred ? 'fill-[var(--nc-signal)] text-[var(--nc-signal)]' : ''}
            />
          </button>
          <button
            type="button"
            onClick={onArchive}
            aria-label={archived ? 'Hent ut av arkiv' : 'Arkiver'}
            aria-pressed={archived}
            className="flex size-9 items-center justify-center rounded-[var(--radius)] text-[var(--nc-text-dim)] transition-colors hover:text-[var(--nc-text)]"
          >
            <Archive size={16} />
          </button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <button
                type="button"
                aria-label="Slett"
                className="flex size-9 items-center justify-center rounded-[var(--radius)] text-[var(--nc-text-dim)] transition-colors hover:text-[var(--nc-red)]"
              >
                <Trash2 size={16} />
              </button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Slette dette?</AlertDialogTitle>
                <AlertDialogDescription>
                  «{item.norwegian}» fjernes fra notatboka. Dette kan ikke angres.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Avbryt</AlertDialogCancel>
                <AlertDialogAction onClick={onDelete}>Slett</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {/* Meta row — source chip, type chip, verified/forslag indicator, tags */}
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <span className="inline-flex items-center rounded-full border border-[var(--nc-border)] px-2 py-0.5 text-[0.64rem] font-bold uppercase tracking-[0.06em] text-[var(--nc-text-dim)]">
          {SOURCE_LABEL[item.source]}
        </span>
        <span className="inline-flex items-center rounded-full border border-[var(--nc-border)] px-2 py-0.5 text-[0.64rem] font-bold uppercase tracking-[0.06em] text-[var(--nc-text-dim)]">
          {TYPE_LABEL[item.type]}
        </span>
        {/* Trust badge: "Bekreftet" for corpus-verified items; "Forslag" ONLY
            when the item carries unverified AI-derived content (an explanation).
            A plain save (no explanation) is neither verified nor a suggestion —
            it shows a neutral "Lagret" so it's not mislabelled as AI (AI-01). */}
        {item.verified ? (
          <span className="inline-flex items-center rounded-full border border-[var(--nc-green-border)] bg-[var(--nc-green-tint)] px-2 py-0.5 text-[0.64rem] font-bold uppercase tracking-[0.06em] text-[var(--nc-green)]">
            Bekreftet
          </span>
        ) : item.explanation ? (
          <span className="inline-flex items-center rounded-full border border-[rgba(249,115,22,0.22)] bg-[rgba(249,115,22,0.08)] px-2 py-0.5 text-[0.64rem] font-bold uppercase tracking-[0.06em] text-[var(--nc-warn)]">
            Forslag
          </span>
        ) : (
          <span className="inline-flex items-center rounded-full border border-[var(--nc-border)] px-2 py-0.5 text-[0.64rem] font-bold uppercase tracking-[0.06em] text-[var(--nc-text-dim)]">
            Lagret
          </span>
        )}
        {item.tags.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center rounded-full bg-white/[0.04] px-2 py-0.5 text-[0.64rem] text-[var(--nc-text-muted)]"
          >
            #{tag}
          </span>
        ))}
      </div>

      {/* Practice intent control — full-width below the card so it never crowds
          the top action row. Two paths: (1) item HAS english → an "Øv på dette"
          toggle that promotes it for the økt; (2) item LACKS english → an inline
          "Legg til oversettelse" affordance, because a promoted item comes back
          as an English-prompt translation exercise and needs an english value to
          be practiceable at all. */}
      <div className="mt-2.5 border-t border-[var(--nc-border)] pt-2.5">
        {canPractice ? (
          <button
            type="button"
            onClick={onTogglePractice}
            aria-pressed={item.promoted}
            className={`inline-flex min-h-[44px] items-center gap-1.5 rounded-[var(--radius)] border px-3.5 text-[0.78rem] font-bold transition-colors ${
              item.promoted
                ? 'border-[var(--nc-signal-border)] bg-[var(--nc-signal-tint)] text-[var(--nc-signal)]'
                : 'border-[var(--nc-border)] text-[var(--nc-text-muted)] hover:text-[var(--nc-text)]'
            }`}
          >
            {item.promoted ? (
              <>
                <Check size={15} aria-hidden="true" />
                Øver ✓
              </>
            ) : (
              'Øv på dette'
            )}
          </button>
        ) : (
          <div>
            <AnimatePresence initial={false} mode="wait">
              {addingTranslation ? (
                <motion.div
                  key="input"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.18 }}
                  className="overflow-hidden"
                >
                  <div className="flex flex-wrap items-center gap-1.5">
                    <input
                      type="text"
                      value={draftEnglish}
                      onChange={(e) => setDraftEnglish(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') submitTranslation()
                        if (e.key === 'Escape') {
                          setDraftEnglish('')
                          setAddingTranslation(false)
                        }
                      }}
                      placeholder="Engelsk oversettelse"
                      aria-label={`Engelsk oversettelse for «${item.norwegian}»`}
                      autoFocus
                      className="nc-input min-w-0 flex-1 basis-40"
                    />
                    <button
                      type="button"
                      onClick={submitTranslation}
                      disabled={!draftEnglish.trim()}
                      className="inline-flex min-h-[44px] items-center rounded-[var(--radius)] border border-[var(--nc-signal-border)] bg-[var(--nc-signal-tint)] px-3.5 text-[0.78rem] font-bold text-[var(--nc-signal)] transition-colors hover:bg-[var(--nc-signal-tint)] disabled:opacity-40"
                    >
                      Lagre og øv
                    </button>
                  </div>
                </motion.div>
              ) : (
                <motion.button
                  key="trigger"
                  type="button"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.18 }}
                  onClick={() => setAddingTranslation(true)}
                  className="inline-flex min-h-[44px] items-center gap-1.5 rounded-[var(--radius)] border border-[var(--nc-border)] px-3.5 text-[0.78rem] font-bold text-[var(--nc-text-muted)] transition-colors hover:text-[var(--nc-text)]"
                >
                  <Languages size={15} aria-hidden="true" />
                  Legg til oversettelse
                </motion.button>
              )}
            </AnimatePresence>
            <p className="mt-1.5 text-[0.7rem] leading-[1.4] text-[var(--nc-text-dim)]">
              Trenger en engelsk oversettelse for å kunne øves.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
