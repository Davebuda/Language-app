'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { AnimatePresence, motion } from 'framer-motion'
import { X } from 'lucide-react'
import { useSession } from '@/hooks/useSession'
import { useFingerprintStore } from '@/stores/fingerprint-store'
import { ExerciseCard } from './ExerciseCard'
import { ExplanationCard } from './ExplanationCard'
import { AIStatusBadge } from '@/components/ai/AIStatusBadge'
import { incrementStreak } from '@/lib/streak'
import type { Sentence } from '@/types/content'
import type { ExerciseResult } from '@/types/session'
import type { ConceptGraph } from '@/types/concepts'
import conceptGraphJson from '@content/concepts/a1-graph.json'

const conceptGraph = conceptGraphJson as ConceptGraph

interface SessionScreenProps {
  sentences: Record<string, Sentence>
  availableSentenceIds: Record<string, string[]>
}

function getExerciseTypeLabel(type: string): string {
  const map: Record<string, string> = {
    'translation-to-norwegian': 'Translate to Norwegian',
    'translation-to-english': 'Translate to English',
    'fill-in-blank': 'Fill in the blank',
    'word-order': 'Word order',
    'listening-comprehension': 'Listening',
    'speed-round': 'Speed round',
    'sentence-transformation': 'Sentence transformation',
    dictation: 'Dictation',
  }
  return map[type] ?? 'Exercise'
}

export function SessionScreen({
  sentences,
  availableSentenceIds,
}: SessionScreenProps) {
  const {
    session,
    currentItem,
    currentContent,
    currentItemIndex,
    isInRepair,
    repairPlan,
    startNewSession,
    submitResult,
    continueAfterRepair,
  } = useSession(sentences, availableSentenceIds)

  const lastResultRef = useRef<ExerciseResult | null>(null)
  const sessionStartedRef = useRef(false)
  const { fingerprint } = useFingerprintStore()

  useEffect(() => {
    if (!fingerprint || sessionStartedRef.current) return
    sessionStartedRef.current = true
    startNewSession()
  }, [fingerprint, startNewSession])

  const router = useRouter()

  const totalItems = session?.items.length ?? 0
  const isComplete = !!session && totalItems > 0 && currentItemIndex >= totalItems
  const progressValue =
    totalItems > 0
      ? Math.min(currentItemIndex + 1, totalItems)
      : 0

  useEffect(() => {
    if (!session || totalItems === 0) return
    if (isComplete) {
      incrementStreak()
      router.push('/session/complete')
    }
  }, [isComplete, router, session, totalItems])

  function handleResult(result: ExerciseResult) {
    lastResultRef.current = result
    submitResult(result)
  }

  return (
    <div className="flex min-h-dvh flex-col bg-transparent text-nc-text">
      <header className="mx-auto flex w-full max-w-lg items-center gap-4 px-5 pt-5 pb-2">
        <button
          type="button"
          onClick={() => router.push('/dashboard')}
          className="flex h-10 w-10 items-center justify-center rounded-[0.9rem] border border-nc-border bg-white text-nc-text"
          aria-label="Back to dashboard"
        >
          <X size={18} />
        </button>

        <div className="flex-1">
          <div className="flex items-center gap-1.5">
            {Array.from({ length: Math.max(totalItems, 6) }).map((_, index) => {
              const isActive = index < progressValue
              return (
                <div
                  key={index}
                  className={`h-1.5 flex-1 rounded-full transition-colors ${
                    isActive ? 'bg-nc-violet' : 'bg-[rgba(23,23,29,0.10)]'
                  }`}
                />
              )
            })}
          </div>
          <div className="mt-3 flex items-center justify-between gap-3">
            <div>
              <div className="nc-label">
                {currentItem
                  ? getExerciseTypeLabel(currentItem.exerciseType)
                  : 'Session'}
              </div>
              <div className="mt-1 text-sm text-nc-text-muted">
                {progressValue} / {totalItems || '-'}
              </div>
            </div>
            <AIStatusBadge />
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-4 px-4 py-5">
        {!session ? (
          <LoadingSkeleton />
        ) : totalItems === 0 ? (
          <EmptyState />
        ) : isComplete ? (
          <LoadingSkeleton />
        ) : currentItem && currentContent ? (
          <>
            <AnimatePresence mode="wait">
              <motion.div
                key={currentItemIndex}
                initial={{ x: 48, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: -48, opacity: 0 }}
                transition={{ duration: 0.22, ease: [0.32, 0.72, 0, 1] }}
              >
                <ExerciseCard
                  item={currentItem}
                  sentence={currentContent}
                  sessionId={session.id}
                  onResult={handleResult}
                  repairPlan={isInRepair ? repairPlan : null}
                />
              </motion.div>
            </AnimatePresence>

            <AnimatePresence>
              {isInRepair && repairPlan ? (
                <motion.div
                  key="repair"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.25 }}
                >
                  <ExplanationCard
                    repairPlan={repairPlan}
                    correctAnswer={lastResultRef.current?.correctAnswer ?? ''}
                    conceptId={currentItem.conceptIds[0] ?? 'concept'}
                    conceptLabel={
                      conceptGraph.concepts.find(
                        (concept) => concept.id === currentItem.conceptIds[0],
                      )?.label
                    }
                    onContinue={continueAfterRepair}
                  />
                </motion.div>
              ) : null}
            </AnimatePresence>
          </>
        ) : (
          <LoadingSkeleton />
        )}
      </main>
    </div>
  )
}

function LoadingSkeleton() {
  return (
    <div className="nc-panel p-5">
      <div className="h-64 animate-pulse rounded-[1rem] bg-[rgba(23,23,29,0.06)]" />
    </div>
  )
}

function EmptyState() {
  return (
    <div className="nc-panel flex flex-1 items-center justify-center p-6 text-center">
      <p className="max-w-xs text-sm leading-7 text-nc-text-muted">
        Ingen ovelser tilgjengelig enna. Innholdet blir seedet snart.
      </p>
    </div>
  )
}
