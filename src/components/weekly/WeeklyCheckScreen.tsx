'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AnimatePresence, motion } from 'framer-motion'
import { useFingerprint } from '@/hooks/useFingerprint'
import { useFingerprintStore } from '@/stores/fingerprint-store'
import { ExerciseCard } from '@/components/session/ExerciseCard'
import { buildWeeklyCheckItems } from '@/lib/weekly-check'
import type { Sentence, ResolvedContent } from '@/types/content'
import type { SessionItem, ExerciseResult } from '@/types/session'
import type { ConceptGraph } from '@/types/concepts'
import a1GraphJson from '@content/concepts/a1-graph.json'
import a2GraphJson from '@content/concepts/a2-graph.json'

const a1Graph = a1GraphJson as ConceptGraph
const a2Graph = a2GraphJson as ConceptGraph

interface WeeklyCheckScreenProps {
  sentences: Record<string, Sentence>
  availableSentenceIds: Record<string, string[]>
}

// Resolve a sentence for a SessionItem — picks the first sentence in the
// pool that supports the item's exerciseType. Returns null if none found.
function resolveContent(
  item: SessionItem,
  sentences: Record<string, Sentence>,
  availableSentenceIds: Record<string, string[]>,
): ResolvedContent | null {
  const conceptId = item.conceptIds[0] ?? ''
  const sentenceIds = availableSentenceIds[conceptId] ?? []
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
  const { fingerprint, status, recordWeeklyCheckResult } = useFingerprint()
  const { fingerprint: storeFp } = useFingerprintStore()

  const [currentIndex, setCurrentIndex] = useState(0)
  const [correctCount, setCorrectCount] = useState(0)
  const [isComplete, setIsComplete] = useState(false)

  // Use the store fingerprint directly for latest state
  const fp = storeFp ?? fingerprint

  const graph = useMemo(
    () => (fp?.currentLevel === 'A2' ? a2Graph : a1Graph),
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
    return resolveContent(currentItem, sentences, availableSentenceIds)
  }, [currentItem, sentences, availableSentenceIds])

  // Weekly check session id — stable per mount
  const sessionId = useMemo(() => `weekly-check-${Date.now()}`, [])

  function handleResult(result: ExerciseResult) {
    const correct = result.correct
    const nextCorrect = correct ? correctCount + 1 : correctCount
    const nextIndex = currentIndex + 1

    if (nextIndex >= totalItems) {
      // All items answered — record and show complete screen
      const score = totalItems > 0 ? Math.round((nextCorrect / totalItems) * 100) : 0
      recordWeeklyCheckResult({ score, items: totalItems })
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
      <div className="nc-gradient-page flex flex-col text-[var(--nc-text)]">
        <WeeklyHeader totalItems={0} progressValue={0} />
        <main className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-4 px-4 py-5">
          <LoadingSkeleton />
        </main>
      </div>
    )
  }

  // ── No week open ─────────────────────────────────────────────────────────────
  if (!fp || fp.weekStartedAt === null) {
    return (
      <div className="nc-gradient-page flex flex-col text-[var(--nc-text)]">
        <WeeklyHeader totalItems={0} progressValue={0} />
        <main className="mx-auto flex w-full max-w-lg flex-1 flex-col items-center justify-center gap-6 px-4 py-10 text-center">
          <p className="max-w-xs text-base leading-7 text-nc-text-muted">
            Ingen ukens fokus enda — start en økt for å åpne uka.
          </p>
          <button
            type="button"
            onClick={() => router.push('/dashboard')}
            className="nc-button-dark min-h-[48px] px-8 py-3"
          >
            Til dashbord
          </button>
        </main>
      </div>
    )
  }

  // ── No items (empty weeklyFocus or no eligible sentences) ────────────────────
  if (!isComplete && totalItems === 0) {
    return (
      <div className="nc-gradient-page flex flex-col text-[var(--nc-text)]">
        <WeeklyHeader totalItems={0} progressValue={0} />
        <main className="mx-auto flex w-full max-w-lg flex-1 flex-col items-center justify-center gap-6 px-4 py-10 text-center">
          <p className="max-w-xs text-base leading-7 text-nc-text-muted">
            Ukens repetisjon kommer snart — du har ikke nok fokus enda.
          </p>
          <button
            type="button"
            onClick={() => router.push('/dashboard')}
            className="nc-button-dark min-h-[48px] px-8 py-3"
          >
            Til dashbord
          </button>
        </main>
      </div>
    )
  }

  // ── Complete ─────────────────────────────────────────────────────────────────
  if (isComplete) {
    const score = totalItems > 0 ? Math.round((correctCount / totalItems) * 100) : 0
    return (
      <div className="nc-gradient-page flex flex-col text-[var(--nc-text)]">
        <WeeklyHeader totalItems={totalItems} progressValue={totalItems} />
        <main className="mx-auto flex w-full max-w-lg flex-1 flex-col items-center justify-center gap-6 px-4 py-10 text-center">
          <h1 className="text-3xl font-bold text-nc-text">Bra jobbet!</h1>
          <p className="text-base text-nc-text-muted">
            {correctCount} av {totalItems} riktige — {score}%
          </p>
          <button
            type="button"
            onClick={() => router.push('/dashboard')}
            className="nc-button-dark min-h-[48px] px-8 py-3"
          >
            Til dashbord
          </button>
        </main>
      </div>
    )
  }

  // ── In-progress ──────────────────────────────────────────────────────────────
  return (
    <div className="nc-gradient-page flex flex-col text-[var(--nc-text)]">
      <WeeklyHeader totalItems={totalItems} progressValue={currentIndex} />
      <main className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-4 px-4 py-5">
        {currentItem && currentContent ? (
          <AnimatePresence mode="wait">
            <motion.div
              key={currentIndex}
              initial={{ x: 48, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -48, opacity: 0 }}
              transition={{ duration: 0.22, ease: [0.32, 0.72, 0, 1] }}
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
      </main>
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
  return (
    <header className="mx-auto flex w-full max-w-lg flex-col gap-2 px-5 pb-1 pt-4">
      <h1 className="text-xl font-bold text-nc-text">Ukens repetisjon</h1>
      <div className="flex items-center gap-1.5">
        {Array.from({ length: dotCount }).map((_, index) => {
          const isActive = index < progressValue
          return (
            <div
              key={index}
              className={`h-1.5 flex-1 rounded-full transition-colors ${
                isActive ? 'bg-[var(--nc-teal)]' : 'bg-[var(--nc-border)]'
              }`}
            />
          )
        })}
      </div>
    </header>
  )
}

function LoadingSkeleton() {
  return (
    <div className="nc-panel p-5">
      <div className="h-64 animate-pulse rounded-[1rem] bg-[var(--nc-card-soft)]" />
    </div>
  )
}

// Shown when a sentence that supports the exercise type cannot be resolved.
function SkippedCard({ onContinue }: { onContinue: () => void }) {
  return (
    <div className="nc-glass-cream-strong p-6">
      <p className="text-sm text-nc-text-muted">
        Ingen setning tilgjengelig for denne øvelsen. Hopper over.
      </p>
      <button
        type="button"
        onClick={onContinue}
        className="nc-button-dark mt-4 min-h-[48px] w-full px-6 py-3"
      >
        Fortsett
      </button>
    </div>
  )
}
