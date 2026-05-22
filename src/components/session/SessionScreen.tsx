'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AnimatePresence, motion } from 'framer-motion'
import { X } from 'lucide-react'
import { useSession } from '@/hooks/useSession'
import { useFingerprintStore } from '@/stores/fingerprint-store'
import { useSessionStore } from '@/stores/session-store'
import { ExerciseCard } from './ExerciseCard'
import { ExplanationCard } from './ExplanationCard'
import { AIStatusBadge } from '@/components/ai/AIStatusBadge'
import { incrementStreak } from '@/lib/streak'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import type { Sentence } from '@/types/content'
import type { ExerciseResult } from '@/types/session'
import type { ConceptGraph } from '@/types/concepts'
import a1GraphJson from '@content/concepts/a1-graph.json'
import a2GraphJson from '@content/concepts/a2-graph.json'

const a1Graph = a1GraphJson as ConceptGraph
const a2Graph = a2GraphJson as ConceptGraph

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
  const [exitDialogOpen, setExitDialogOpen] = useState(false)
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
    <div className="nc-gradient-page flex flex-col text-[var(--nc-text)]">
      <header className="mx-auto flex w-full max-w-lg items-center gap-3 px-5 pb-1 pt-4">
        <button
          type="button"
          onClick={() => {
            // Confirm only when there's mid-session progress to lose; otherwise
            // exit silently. P0.5-09 (F024) closed the data-loss risk; this is
            // the AlertDialog upgrade from the deferred follow-up.
            const hasProgress = (useSessionStore.getState().results?.length ?? 0) > 0
            if (hasProgress) {
              setExitDialogOpen(true)
            } else {
              router.push('/dashboard')
            }
          }}
          className="flex size-10 items-center justify-center rounded-[0.9rem] border border-[var(--nc-border)] bg-[var(--nc-card)] text-[var(--nc-text)]"
          aria-label="Back to dashboard"
        >
          <X size={18} />
        </button>

        <AlertDialog open={exitDialogOpen} onOpenChange={setExitDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Avslutte økten?</AlertDialogTitle>
              <AlertDialogDescription>
                Du mister fremgangen i denne økten.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Avbryt</AlertDialogCancel>
              <AlertDialogAction onClick={() => router.push('/dashboard')}>
                Avslutt
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <div className="flex-1">
          <div className="flex items-center gap-1.5">
            {Array.from({ length: Math.max(totalItems, 6) }).map((_, index) => {
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
          <div className="mt-2.5 flex items-center justify-between gap-3">
            <div>
              <div className="nc-label">
                {currentItem
                  ? getExerciseTypeLabel(currentItem.exerciseType)
                  : 'Session'}
              </div>
              <div className="mt-1 tabular-nums text-sm text-nc-text-muted">
                {/* P0.5-08 (F026): show "Laster…" while the session is loading
                    rather than "0 / -", which read as broken to users. */}
                {session ? `${progressValue} / ${totalItems || '-'}` : 'Laster…'}
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
                      (fingerprint?.currentLevel === 'A2' ? a2Graph : a1Graph).concepts.find(
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
      <div className="h-64 animate-pulse rounded-[1rem] bg-[var(--nc-card-soft)]" />
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
