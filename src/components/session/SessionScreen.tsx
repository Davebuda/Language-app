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
import type { ExerciseResult, SessionBlock, SessionBlockType } from '@/types/session'
import { getGraphForLevel } from '@/lib/concept-graph-loader'

interface SessionScreenProps {
  sentences: Record<string, Sentence>
  availableSentenceIds: Record<string, string[]>
}

function getExerciseTypeLabel(type: string): string {
  const map: Record<string, string> = {
    'translation-to-norwegian': 'Oversett til norsk',
    'translation-to-english': 'Oversett til engelsk',
    'fill-in-blank': 'Fyll inn',
    'word-order': 'Ordstilling',
    'listening-comprehension': 'Lytting',
    'speed-round': 'Hurtigrunde',
    'sentence-transformation': 'Setningsomforming',
    dictation: 'Diktat',
  }
  return map[type] ?? 'Øvelse'
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
    currentBlock,
    isInRepair,
    repairPlan,
    startNewSession,
    submitResult,
    continueAfterRepair,
  } = useSession(sentences, availableSentenceIds)

  const lastResultRef = useRef<ExerciseResult | null>(null)
  const sessionStartedRef = useRef(false)
  const [exitDialogOpen, setExitDialogOpen] = useState(false)
  const prevBlockIndexRef = useRef<number | null>(null)
  const [blockTransition, setBlockTransition] = useState<{ label: string } | null>(null)
  const { fingerprint } = useFingerprintStore()

  useEffect(() => {
    if (!fingerprint || sessionStartedRef.current) return
    sessionStartedRef.current = true
    startNewSession()
  }, [fingerprint, startNewSession])

  const router = useRouter()

  const totalItems = session?.items.length ?? 0
  const isComplete = !!session && totalItems > 0 && currentItemIndex >= totalItems
  const progressValue = totalItems > 0 ? Math.min(currentItemIndex + 1, totalItems) : 0
  const progressPct = totalItems > 0 ? (progressValue / totalItems) * 100 : 0

  const isMasteryComplete = !!session && totalItems === 0

  useEffect(() => {
    if (!session || totalItems === 0) return
    if (isComplete) {
      incrementStreak()
      router.push('/session/complete')
    }
  }, [isComplete, router, session, totalItems])

  useEffect(() => {
    if (!currentBlock) return
    const prev = prevBlockIndexRef.current
    if (prev !== null && prev !== currentBlock.blockIndex) {
      const icons: Record<SessionBlockType, string> = { lytt: '🎧', lær: '✏️', snakk: '🗣️' }
      const icon = icons[currentBlock.block.type]
      setBlockTransition({ label: `${icon} ${currentBlock.block.label}` })
      const timer = setTimeout(() => setBlockTransition(null), 1500)
      prevBlockIndexRef.current = currentBlock.blockIndex
      return () => clearTimeout(timer)
    }
    prevBlockIndexRef.current = currentBlock.blockIndex
  }, [currentBlock])

  function handleResult(result: ExerciseResult) {
    lastResultRef.current = result
    submitResult(result)
  }

  if (isMasteryComplete) {
    return (
      <div className="nc-stage flex min-h-dvh flex-col items-center justify-center text-[var(--nc-text)]">
        <div className="nc-mobile-shell flex flex-col items-center gap-6 px-5 text-center">
          <div className="text-6xl">🎉</div>
          <h1 className="font-display text-2xl font-bold">Du har mestret alt!</h1>
          <p className="max-w-xs text-sm text-[var(--nc-text-muted)]">
            Alle konseptene på dette nivået er gjennomgått. Prøv å gå opp et nivå eller ta ukens sjekk.
          </p>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => router.push('/uke')}
              className="rounded-xl bg-[var(--nc-red)] px-5 py-3 text-sm font-semibold text-white"
            >
              Ukens sjekk
            </button>
            <button
              type="button"
              onClick={() => router.push('/dashboard')}
              className="rounded-xl border border-[var(--nc-border)] px-5 py-3 text-sm font-semibold text-[var(--nc-text-muted)]"
            >
              Dashbord
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="nc-stage flex min-h-dvh flex-col text-[var(--nc-text)]">
      <div className="nc-mobile-shell flex w-full flex-1 flex-col px-2.5 pb-24 pt-2.5">
      <div className="nc-phone-page flex flex-1 flex-col p-2.5">
      <header className="flex w-full flex-col gap-2 pb-2">
        <div className="nc-card-soft p-3">
          <div className="flex items-start gap-3">
            <button
              type="button"
              onClick={() => {
                const hasProgress = (useSessionStore.getState().results?.length ?? 0) > 0
                if (hasProgress) {
                  setExitDialogOpen(true)
                } else {
                  router.push('/dashboard')
                }
              }}
              className="inline-flex size-10 shrink-0 items-center justify-center rounded-[0.7rem] bg-[rgba(6,16,23,0.92)] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]"
              aria-label="Tilbake til dashboard"
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

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div className="nc-label text-[var(--nc-cream-dim)]">
                    {currentItem ? getExerciseTypeLabel(currentItem.exerciseType) : 'Session'}
                  </div>
                  <div className="mt-0.5 text-[0.92rem] font-semibold text-[var(--nc-cream-text)]">
                    Økt
                  </div>
                </div>
                <AIStatusBadge />
              </div>

              <div className="mt-4 h-2 overflow-hidden rounded-full bg-[rgba(6,16,23,0.08)]">
                <div
                  className="h-full rounded-full bg-[var(--nc-signal)] transition-[width] duration-300"
                  style={{ width: `${progressPct}%` }}
                />
              </div>

              <div className="mt-3 rounded-[0.75rem] bg-[rgba(6,16,23,0.94)] px-3 py-2.5 text-white">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-[9px] font-semibold uppercase tracking-[0.12em] text-white/38">
                      Status
                    </div>
                    <div className="mt-1 text-[0.82rem] font-medium text-white">
                      {session ? `${progressValue} / ${totalItems || '-'}` : 'Laster økt…'}
                    </div>
                  </div>
                  <div className="rounded-[0.5rem] bg-white/8 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-white/60">
                    Nå
                  </div>
                </div>

                {session?.blocks && session.blocks.length > 0 && currentBlock ? (
                  <BlockIndicatorStrip
                    blocks={session.blocks}
                    activeBlockIndex={currentBlock.blockIndex}
                  />
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="relative flex w-full flex-1 flex-col gap-2.5 pt-0">
        {blockTransition ? (
          <div
            className="pointer-events-none absolute inset-x-0 top-2 z-20 flex justify-center px-4"
            style={{ animation: 'nc-block-fade 1.5s ease forwards' }}
          >
            <div className="rounded-[0.6rem] border border-white/16 bg-[rgba(247,251,245,0.92)] px-4 py-2 text-[12px] font-semibold text-[var(--nc-cream-text)] shadow-[0_20px_40px_rgba(0,0,0,0.18)] backdrop-blur">
              {blockTransition.label}
            </div>
          </div>
        ) : null}

        {!session ? (
          <LoadingSkeleton />
        ) : totalItems === 0 ? (
          <EmptyState />
        ) : isComplete ? (
          <LoadingSkeleton />
        ) : currentItem && currentContent ? (
          <>
            {currentBlock ? (
              <BlockHeader
                type={currentBlock.block.type}
                label={currentBlock.block.label}
                current={currentBlock.positionInBlock + 1}
                total={currentBlock.block.items.length}
              />
            ) : null}

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

            {!isInRepair && currentBlock ? (
              <div className="nc-card-dark-solid p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="nc-label">Blokk</div>
                    <div className="mt-1.5 text-[0.84rem] font-medium text-[var(--nc-text)]">
                      {currentBlock.block.label}
                    </div>
                    <p className="mt-1 text-[0.74rem] leading-5 text-[var(--nc-text-muted)]">
                      Ett steg av gangen.
                    </p>
                  </div>
                  <span className="nc-chip-signal rounded-[0.5rem] px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.08em]">
                    Aktiv
                  </span>
                </div>
              </div>
            ) : null}

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
                      getGraphForLevel(fingerprint?.currentLevel ?? 'A1').concepts.find(
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
      </div>
    </div>
  )
}

function LoadingSkeleton() {
  return (
    <div className="nc-card-soft p-3">
      <div className="h-72 animate-pulse rounded-[0.7rem] bg-[rgba(6,16,23,0.08)]" />
    </div>
  )
}

function EmptyState() {
  return (
    <div className="nc-card-soft flex flex-1 items-center justify-center p-4 text-center">
      <p className="max-w-xs text-[0.82rem] leading-6 text-[var(--nc-cream-muted)]">
        Ingen øvelser tilgjengelig ennå. Innholdet blir seedet snart.
      </p>
    </div>
  )
}

const BLOCK_ICONS: Record<SessionBlockType, string> = {
  lytt: '🎧',
  lær: '✏️',
  snakk: '🗣️',
}

function BlockHeader({
  type,
  label,
  current,
  total,
}: {
  type: SessionBlockType
  label: string
  current: number
  total: number
}) {
  return (
    <div className="nc-card-dark-solid px-3 py-2.5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span aria-hidden="true">{BLOCK_ICONS[type]}</span>
          <span className="text-[0.82rem] font-semibold text-[var(--nc-text)]">{label}</span>
        </div>
        <span className="rounded-[0.5rem] bg-white/6 px-2.5 py-1 text-[10px] font-semibold tabular-nums text-[var(--nc-text-muted)]">
          {current} / {total}
        </span>
      </div>
    </div>
  )
}

function BlockIndicatorStrip({
  blocks,
  activeBlockIndex,
}: {
  blocks: SessionBlock[]
  activeBlockIndex: number
}) {
  return (
    <div className="mt-3 flex items-center gap-1.5">
      {blocks.map((block, i) => (
        <div
          key={block.id}
          title={block.label}
          className={[
            'flex h-1.5 flex-1 items-center justify-center rounded-full transition-colors duration-300',
            i < activeBlockIndex
              ? 'bg-[var(--nc-signal)]'
              : i === activeBlockIndex
                ? 'bg-[var(--nc-signal)] opacity-55'
                : 'bg-white/10',
          ].join(' ')}
        />
      ))}
    </div>
  )
}
