'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowRight } from 'lucide-react'
import { useFingerprint } from '@/hooks/useFingerprint'
import { useFingerprintStore } from '@/stores/fingerprint-store'
import { ExerciseCard } from '@/components/session/ExerciseCard'
import { buildWeeklyCheckItems } from '@/lib/weekly-check'
import type { Sentence, ResolvedContent } from '@/types/content'
import type { SessionItem, ExerciseResult } from '@/types/session'
import { getGraphForLevel } from '@/lib/concept-graph-loader'
import { markLaneDone } from '@/lib/lane-completion'
import { filterSentencesByLevel } from '@/engine/scheduler'

interface WeeklyCheckScreenProps {
  sentences: Record<string, Sentence>
  availableSentenceIds: Record<string, string[]>
}

// Resolve a sentence for a SessionItem — picks the first sentence in the
// pool that supports the item's exerciseType, filtered to the learner's
// current CEFR level. Returns null if none found.
function resolveContent(
  item: SessionItem,
  sentences: Record<string, Sentence>,
  availableSentenceIds: Record<string, string[]>,
  currentLevel: string,
): ResolvedContent | null {
  const conceptId = item.conceptIds[0] ?? ''
  const rawIds = availableSentenceIds[conceptId] ?? []
  const sentenceIds = filterSentencesByLevel(rawIds, currentLevel, sentences)
  const isFillBlank = item.exerciseType === 'fill-in-blank'

  for (const id of sentenceIds) {
    const s = sentences[id]
    if (!s) continue
    // fill-in-blank sentences contain ___; other types should not use them
    if (!isFillBlank && s.norwegian.includes('___')) continue
    if (!s.exerciseTypes.includes(item.exerciseType)) continue
    return { ...s, source: 'seed' }
  }
  return null
}

export function WeeklyCheckScreen({
  sentences,
  availableSentenceIds,
}: WeeklyCheckScreenProps) {
  const router = useRouter()
  const { fingerprint, status, recordResult, recordWeeklyCheckResult } = useFingerprint()
  const { fingerprint: storeFp } = useFingerprintStore()

  const [currentIndex, setCurrentIndex] = useState(0)
  const [correctCount, setCorrectCount] = useState(0)
  const [isComplete, setIsComplete] = useState(false)

  // Use the store fingerprint directly for latest state
  const fp = storeFp ?? fingerprint

  const graph = useMemo(
    () => getGraphForLevel(fp?.currentLevel ?? 'A1'),
    [fp?.currentLevel],
  )

  const items: SessionItem[] = useMemo(() => {
    if (!fp) return []
    return buildWeeklyCheckItems(fp, graph, sentences, availableSentenceIds)
  }, [fp, graph, sentences, availableSentenceIds])

  const totalItems = items.length
  const currentItem = items[currentIndex] ?? null

  const currentContent: ResolvedContent | null = useMemo(() => {
    if (!currentItem) return null
    return resolveContent(currentItem, sentences, availableSentenceIds, fp?.currentLevel ?? 'A1')
  }, [currentItem, sentences, availableSentenceIds, fp?.currentLevel])

  // Weekly check session id — stable per mount
  const sessionId = useMemo(() => `weekly-check-${Date.now()}`, [])

  function handleResult(result: ExerciseResult) {
    recordResult(result)

    const correct = result.correct
    const nextCorrect = correct ? correctCount + 1 : correctCount
    const nextIndex = currentIndex + 1

    if (nextIndex >= totalItems) {
      const score = totalItems > 0 ? Math.round((nextCorrect / totalItems) * 100) : 0
      recordWeeklyCheckResult({ score, items: totalItems })
      markLaneDone('uke')
      setCorrectCount(nextCorrect)
      setIsComplete(true)
    } else {
      setCorrectCount(nextCorrect)
      setCurrentIndex(nextIndex)
    }
  }

  // ── Loading state ────────────────────────────────────────────────────────────
  const isLoading = status === 'loading' || (!fp && status !== 'empty')

  if (isLoading) {
    return (
      <div className="nc-gradient-page nc-secondary-flow flex min-h-dvh flex-col">
        <WeeklyHeader totalItems={0} progressValue={0} />
        <div className="nc-mobile-shell mx-auto flex w-full flex-1 flex-col gap-[6px] px-1.5 pb-32 pt-3">
          <LoadingSkeleton />
        </div>
      </div>
    )
  }

  // ── No week open ─────────────────────────────────────────────────────────────
  if (!fp || fp.weekStartedAt === null) {
    return (
      <div className="nc-gradient-page nc-secondary-flow flex min-h-dvh flex-col">
        <WeeklyHeader totalItems={0} progressValue={0} />
        <div className="nc-mobile-shell mx-auto flex w-full flex-1 flex-col gap-[6px] px-1.5 pb-32 pt-3">
          <EmptyState
            message="Ingen ukens fokus enda — start en økt for å åpne uka."
            onDashboard={() => router.push('/dashboard')}
          />
        </div>
      </div>
    )
  }

  // ── No items (empty weeklyFocus or no eligible sentences) ────────────────────
  if (!isComplete && totalItems === 0) {
    return (
      <div className="nc-gradient-page nc-secondary-flow flex min-h-dvh flex-col">
        <WeeklyHeader totalItems={0} progressValue={0} />
        <div className="nc-mobile-shell mx-auto flex w-full flex-1 flex-col gap-[6px] px-1.5 pb-32 pt-3">
          <EmptyState
            message="Ukens repetisjon kommer snart — du har ikke nok fokus enda."
            onDashboard={() => router.push('/dashboard')}
          />
        </div>
      </div>
    )
  }

  // ── Complete ─────────────────────────────────────────────────────────────────
  if (isComplete) {
    const score = totalItems > 0 ? Math.round((correctCount / totalItems) * 100) : 0
    return (
      <div className="nc-gradient-page nc-secondary-flow flex min-h-dvh flex-col">
        <WeeklyHeader totalItems={totalItems} progressValue={totalItems} />
        <div className="nc-mobile-shell mx-auto flex w-full flex-1 flex-col gap-[6px] px-1.5 pb-32 pt-3">
          <CompletePanel
            correctCount={correctCount}
            totalItems={totalItems}
            score={score}
            onDashboard={() => router.push('/dashboard')}
          />
        </div>
      </div>
    )
  }

  // ── In-progress ──────────────────────────────────────────────────────────────
  return (
    <div className="nc-gradient-page nc-secondary-flow flex min-h-dvh flex-col">
      <WeeklyHeader totalItems={totalItems} progressValue={currentIndex} />
      <div className="nc-mobile-shell mx-auto flex w-full flex-1 flex-col gap-[6px] px-1.5 pb-32 pt-3">
        {currentItem && currentContent ? (
          <AnimatePresence mode="wait">
            <motion.div
              key={currentIndex}
              initial={{ x: 48, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -48, opacity: 0 }}
              transition={{ duration: 0.18, ease: [0.32, 0.72, 0, 1] }}
            >
              <ExerciseCard
                item={currentItem}
                sentence={currentContent}
                sessionId={sessionId}
                onResult={handleResult}
              />
            </motion.div>
          </AnimatePresence>
        ) : currentItem && !currentContent ? (
          <SkippedCard onContinue={() => setCurrentIndex((i) => i + 1)} />
        ) : (
          <LoadingSkeleton />
        )}
      </div>
    </div>
  )
}

// ── Sub-components ────────────────────────────────────────────────────────────

function WeeklyHeader({
  totalItems,
  progressValue,
}: {
  totalItems: number
  progressValue: number
}) {
  const dotCount = Math.max(totalItems, 6)
  const pct = dotCount > 0 ? Math.round((progressValue / dotCount) * 100) : 0

  return (
    <header className="nc-mobile-shell mx-auto w-full px-1.5 pb-0 pt-3">
      {/* ── Lime focal panel ── */}
      <div className="nc-signal-panel p-3">
        <div className="text-[9px] font-bold uppercase tracking-[0.12em] text-[rgba(10,18,6,0.48)]">Repetisjon</div>
        <h1 className="mt-1 text-balance text-[1.2rem] font-extrabold leading-none text-[var(--nc-signal-fg)]">
          Ukens repetisjon
        </h1>
        {totalItems > 0 && (
          <div className="mt-2 flex items-center gap-2">
            {/* Progress bar */}
            <div className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-[rgba(10,18,6,0.14)]">
              <div
                className="h-full rounded-full bg-[rgba(10,18,6,0.72)] transition-all duration-200"
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="shrink-0 text-[9px] font-bold tabular-nums text-[rgba(10,18,6,0.55)]">
              {progressValue}/{dotCount}
            </span>
          </div>
        )}
        {totalItems === 0 && (
          <div className="mt-1 text-[0.75rem] text-[rgba(10,18,6,0.55)]">Laster innhold…</div>
        )}
      </div>

      {/* ── Dot progress strip (Dark bar) ── */}
      {totalItems > 0 && (
        <div className="mt-[6px] flex items-center gap-1 rounded-lg bg-[var(--nc-card)] border border-[var(--nc-border)] px-2 py-2">
          {Array.from({ length: dotCount }).map((_, index) => {
            const isActive = index < progressValue
            return (
              <div
                key={index}
                className={`h-1 flex-1 rounded-full transition-colors duration-150 ${
                  isActive ? 'bg-[var(--nc-signal)]' : 'bg-[rgba(255,255,255,0.08)]'
                }`}
              />
            )
          })}
        </div>
      )}
    </header>
  )
}

function EmptyState({
  message,
  onDashboard,
}: {
  message: string
  onDashboard: () => void
}) {
  return (
    <div className="nc-glass-cream rounded-lg p-5 text-center">
      <p className="text-[0.84rem] leading-6 text-[var(--nc-cream-muted)] text-pretty">{message}</p>
      <button
        type="button"
        onClick={onDashboard}
        className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-[rgba(10,18,6,0.88)] px-5 py-2.5 text-[0.82rem] font-semibold text-white"
      >
        Til dashbord <ArrowRight size={13} aria-hidden="true" />
      </button>
    </div>
  )
}

function CompletePanel({
  correctCount,
  totalItems,
  score,
  onDashboard,
}: {
  correctCount: number
  totalItems: number
  score: number
  onDashboard: () => void
}) {
  return (
    <>
      {/* Score focal panel (lime) */}
      <div className="nc-signal-panel p-4 text-center">
        <div className="text-[9px] font-bold uppercase tracking-[0.12em] text-[rgba(10,18,6,0.48)]">Fullført</div>
        <div className="mt-2 text-[3rem] font-extrabold tabular-nums leading-none text-[var(--nc-signal-fg)]">
          {score}%
        </div>
        <div className="mt-1 text-[0.78rem] text-[rgba(10,18,6,0.62)]">
          {correctCount} av {totalItems} riktige
        </div>
      </div>

      {/* Result detail (cream strip) */}
      <div className="grid grid-cols-2 overflow-hidden rounded-lg bg-[var(--nc-cream)] border border-[rgba(17,21,24,0.06)]">
        <div className="px-3 py-3 text-center">
          <div className="text-[1.25rem] font-extrabold tabular-nums text-[var(--nc-cream-text)]">{correctCount}</div>
          <div className="mt-0.5 text-[8px] font-bold uppercase tracking-[0.1em] text-[var(--nc-cream-dim)]">Riktige</div>
        </div>
        <div className="relative px-3 py-3 text-center before:absolute before:left-0 before:top-[20%] before:h-[60%] before:w-px before:bg-[rgba(17,21,24,0.08)]">
          <div className="text-[1.25rem] font-extrabold tabular-nums text-[var(--nc-cream-text)]">{totalItems - correctCount}</div>
          <div className="mt-0.5 text-[8px] font-bold uppercase tracking-[0.1em] text-[var(--nc-cream-dim)]">Feil</div>
        </div>
      </div>

      {/* CTA (dark surface) */}
      <div className="flex flex-col gap-[6px] rounded-lg bg-[var(--nc-card)] border border-[var(--nc-border)] p-2.5">
        <div className="text-[9px] font-bold uppercase tracking-[0.1em] text-[var(--nc-text-dim)]">Bra jobbet!</div>
        <button
          type="button"
          onClick={onDashboard}
          className="nc-button-primary flex w-full items-center justify-center gap-1.5 py-2.5 text-[0.82rem] font-extrabold"
        >
          Til dashbord <ArrowRight size={13} aria-hidden="true" />
        </button>
      </div>
    </>
  )
}

function LoadingSkeleton() {
  return (
    <div className="nc-glass rounded-lg p-5">
      <div className="h-64 animate-pulse rounded-[0.75rem] bg-[var(--nc-card-soft)]" />
    </div>
  )
}

// Shown when a sentence that supports the exercise type cannot be resolved.
function SkippedCard({ onContinue }: { onContinue: () => void }) {
  return (
    <div className="nc-glass-cream rounded-lg p-5">
      <p className="text-[0.84rem] leading-6 text-[var(--nc-cream-muted)]">
        Ingen setning tilgjengelig for denne øvelsen. Hopper over.
      </p>
      <button
        type="button"
        onClick={onContinue}
        className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-[rgba(10,18,6,0.88)] px-5 py-2.5 text-[0.82rem] font-semibold text-white"
      >
        Fortsett <ArrowRight size={13} aria-hidden="true" />
      </button>
    </div>
  )
}
