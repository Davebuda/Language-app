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
import { selectionJustification } from '@/lib/selection-justification'
import { useKariLine } from '@/hooks/useKariLine'
import type { CoachContext } from '@/ai/types'

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
    'speaking-production': 'Si høyt',
    dictation: 'Diktat',
  }
  return map[type] ?? 'Øvelse'
}

// The scheduler tags every SessionItem with a selectionReason — the honest
// answer to "why am I doing this exercise?". Surfacing it in-session makes the
// coaching intelligence (diagnosis + scheduling) felt, not just computed.
const WHY_LABELS: Record<string, string> = {
  weak_concept: 'Svakt punkt',
  review_due: 'Gjennomgang',
  decaying: 'Vedlikehold',
  new_material: 'Nytt',
  interleaving: 'Variasjon',
  weekly_focus: 'Ukens fokus',
  repair_target: 'Reparasjon',
  cold_start: 'Kartlegging',
  root_cause: 'Grunnårsak',
}

export function SessionScreen({
  sentences,
  availableSentenceIds,
}: SessionScreenProps) {
  const {
    session,
    currentItem,
    currentContent,
    currentCloze,
    currentItemUnresolved,
    currentItemIndex,
    currentBlock,
    isInRepair,
    repairPlan,
    startNewSession,
    submitResult,
    submitClozeResults,
    submitSpeakingResult,
    continueAfterRepair,
    skipRepair,
    skipUnresolvedItem,
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

  // Tier-2 Slice D — Kari frames the økt at the start (shown only on the first item,
  // so it greets and then fades). Template-first; AI swaps in a warm Kari line naming
  // today's focus. Display-only.
  const sessionFocusLabel = session?.primaryFocus
    ? getGraphForLevel(fingerprint?.currentLevel ?? 'A1').concepts.find((c) => c.id === session.primaryFocus)?.label
    : undefined
  const introCtx: CoachContext | null = session
    ? { kind: 'session-intro', level: fingerprint?.currentLevel ?? 'A1', focusLabel: sessionFocusLabel }
    : null
  const introTemplate = sessionFocusLabel ? `I dag tar vi tak i ${sessionFocusLabel}.` : 'La oss komme i gang med dagens økt.'
  const kariIntro = useKariLine(introCtx, introTemplate)

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
      const labels: Record<SessionBlockType, string> = { lytt: 'Lytt', lær: 'Lær', snakk: 'Snakk' }
      const label = labels[currentBlock.block.type]
      setBlockTransition({ label: `${label} · ${currentBlock.block.label}` })
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
      <div className="nc-gradient-page nc-secondary-flow flex min-h-dvh flex-col items-center justify-center text-[var(--nc-text)]">
        <div className="nc-mobile-shell flex flex-col items-center gap-5 px-5 text-center">
          <div className="nc-signal-panel w-full p-5 text-center">
            <div className="nc-label">Status</div>
            <h1 className="mt-2 font-display text-[1.9rem] font-extrabold leading-[0.96] tracking-[-0.03em]">
              Du har mestret alt!
            </h1>
            <p className="mt-3 text-[0.84rem] leading-6 text-[rgba(10,18,6,0.65)]">
              Alle konseptene på dette nivået er gjennomgått. Prøv å gå opp et nivå eller ta ukens sjekk.
            </p>
          </div>
          <div className="flex w-full gap-3">
            <button
              type="button"
              onClick={() => router.push('/uke')}
              className="nc-button-primary flex-1 py-3 text-[0.9rem] font-bold"
            >
              Ukens sjekk
            </button>
            <button
              type="button"
              onClick={() => router.push('/dashboard')}
              className="nc-button-dark flex-1 py-3 text-[0.9rem] font-semibold"
            >
              Dashbord
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="nc-gradient-page nc-secondary-flow flex min-h-dvh flex-col text-[var(--nc-text)]">
      <div className="nc-mobile-shell nc-flow-shell">
        <div className="flex flex-1 flex-col gap-[6px]">

          {/* ── Header: lime focal panel ── */}
          <header className="flex w-full flex-col gap-[6px]">
            <div className="rounded-[0.65rem] bg-[linear-gradient(135deg,#C8FF20_0%,#B8EF10_100%)] p-2.5 text-[var(--nc-signal-fg)]">
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
                  className="inline-flex size-10 shrink-0 items-center justify-center rounded-[0.55rem] bg-[rgba(10,18,6,0.90)] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]"
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
                      <div className="flex items-center gap-1.5">
                        <div className="text-[9px] font-bold uppercase tracking-[0.12em] text-[rgba(10,18,6,0.48)]">
                          {currentItem ? getExerciseTypeLabel(currentItem.exerciseType) : 'Økt'}
                        </div>
                        {currentItem ? (
                          <span
                            aria-label={`Valgt fordi: ${WHY_LABELS[currentItem.selectionReason] ?? 'tilpasset deg'}`}
                            className="rounded-[0.3rem] border border-[rgba(10,18,6,0.22)] px-1.5 py-px text-[8px] font-bold uppercase tracking-[0.1em] text-[rgba(10,18,6,0.6)]"
                          >
                            {WHY_LABELS[currentItem.selectionReason] ?? 'Tilpasset deg'}
                          </span>
                        ) : null}
                        {currentContent?.isReviewFallback ? (
                          <span className="rounded-[0.3rem] bg-[rgba(10,18,6,0.12)] px-1.5 py-px text-[8px] font-bold uppercase tracking-[0.1em] text-[rgba(10,18,6,0.6)]">
                            Repetisjon
                          </span>
                        ) : null}
                      </div>
                      {/* Why this exercise — the scheduling pillar made felt:
                          ties the bare reason badge to the learner's own evidence. */}
                      {currentItem ? (
                        <div className="mt-1 text-[9px] font-medium leading-snug text-[rgba(10,18,6,0.55)]">
                          {selectionJustification(
                            currentItem.selectionReason,
                            fingerprint?.conceptMastery[currentItem.conceptIds[0] ?? ''],
                          )}
                        </div>
                      ) : null}
                      <div className="mt-0.5 text-[0.88rem] font-extrabold leading-tight text-[var(--nc-signal-fg)]">
                        Økt
                      </div>
                      {currentItemIndex === 0 && kariIntro ? (
                        <div className="mt-1 max-w-[22rem] text-[10px] font-medium leading-snug text-[rgba(10,18,6,0.62)]">
                          {kariIntro}
                        </div>
                      ) : null}
                      {currentContent?.isReviewFallback ? (
                        <div className="mt-1 max-w-[22rem] text-[10px] font-medium leading-snug text-[rgba(10,18,6,0.6)]">
                          Repetisjonsmodus — nytt innhold er øvd opp. Vi repeterer til mer er klart.
                        </div>
                      ) : null}
                    </div>
                    <AIStatusBadge />
                  </div>

                  {/* Progress bar — lime on lime-dark track */}
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-[rgba(10,18,6,0.14)]">
                    <div
                      className="h-full rounded-full bg-[rgba(10,18,6,0.82)] transition-[width] duration-300"
                      style={{ width: `${progressPct}%` }}
                    />
                  </div>

                  {/* Stat row inside header */}
                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-[0.72rem] font-semibold tabular-nums text-[rgba(10,18,6,0.55)]">
                      {session ? `${progressValue} / ${totalItems || '—'}` : 'Laster…'}
                    </span>
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

          {/* ── Exercise area ── */}
          <main className="relative flex w-full flex-1 flex-col gap-[6px] pt-0">
            {blockTransition ? (
              <div
                className="pointer-events-none absolute inset-x-0 top-2 z-20 flex justify-center px-4"
                style={{ animation: 'nc-block-fade 1.5s ease forwards' }}
              >
                <div className="rounded-[0.5rem] border border-[var(--nc-border)] bg-[var(--nc-card)] px-4 py-2 text-[11px] font-bold uppercase tracking-[0.10em] text-[var(--nc-text-muted)] shadow-[0_20px_40px_rgba(0,0,0,0.26)]">
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
            ) : currentItem && (currentItem.exerciseType === 'cloze-passage' ? !!currentCloze : !!currentContent) ? (
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
                      clozePassage={currentCloze ?? null}
                      onClozeResults={submitClozeResults}
                      onSpeakingResult={submitSpeakingResult}
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
                          getGraphForLevel(fingerprint?.currentLevel ?? 'A1').concepts.find(
                            (concept) => concept.id === currentItem.conceptIds[0],
                          )?.label
                        }
                        onContinue={continueAfterRepair}
                        onSkip={skipRepair}
                      />
                    </motion.div>
                  ) : null}
                </AnimatePresence>
              </>
            ) : currentItemUnresolved ? (
              <UnresolvedItemCard onSkip={skipUnresolvedItem} />
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
    <div className="overflow-hidden rounded-[0.75rem] bg-[var(--nc-cream)] border border-[rgba(17,21,24,0.06)]">
      <div className="h-[3px] w-full bg-[linear-gradient(90deg,var(--nc-signal)_0%,#B8EF10_100%)]" />
      <div className="p-3.5">
        <div className="h-64 animate-pulse rounded-[0.55rem] bg-[rgba(17,21,24,0.06)]" />
      </div>
    </div>
  )
}

function EmptyState() {
  return (
    <div className="nc-glass flex flex-1 items-center justify-center p-4 text-center">
      <p className="max-w-xs text-[0.82rem] leading-6 text-[var(--nc-text-muted)]">
        Ingen øvelser tilgjengelig ennå. Innholdet blir seedet snart.
      </p>
    </div>
  )
}

// S-05: shown when an item resolved to no content (empty seed pool, no AI, no
// passage) instead of an indefinite skeleton. Honest disclosure + a manual skip
// (no auto-advance, no fingerprint write).
function UnresolvedItemCard({ onSkip }: { onSkip: () => void }) {
  return (
    <div className="overflow-hidden rounded-[0.75rem] bg-[var(--nc-cream)] border border-[rgba(17,21,24,0.06)]">
      <div className="h-[3px] w-full bg-[linear-gradient(90deg,var(--nc-signal)_0%,#B8EF10_100%)]" />
      <div className="flex flex-col items-center gap-3 p-5 text-center">
        <p className="text-[0.9rem] font-bold leading-snug text-[var(--nc-cream-text)]">
          Vi fant ikke innhold for denne øvelsen.
        </p>
        <p className="text-[0.78rem] leading-6 text-[var(--nc-cream-muted)]">
          Det er ikke noe nytt å øve på her akkurat nå. Hopp over og fortsett økta.
        </p>
        <button
          onClick={onSkip}
          className="nc-button-dark w-full rounded-xl py-3 text-[0.82rem] font-extrabold"
        >
          Hopp over
        </button>
      </div>
    </div>
  )
}

const BLOCK_LABELS: Record<SessionBlockType, string> = {
  lytt: 'Lytt',
  lær: 'Lær',
  snakk: 'Snakk',
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
    <div className="flex items-center justify-between rounded-[0.55rem] bg-[var(--nc-card)] border border-[var(--nc-border)] px-3 py-2">
      <div className="flex items-center gap-2">
        <span className="text-[9px] font-bold uppercase tracking-[0.10em] text-[var(--nc-text-dim)]">
          {BLOCK_LABELS[type]}
        </span>
        <span className="text-[0.8rem] font-semibold text-[var(--nc-text)]">{label}</span>
      </div>
      <span className="rounded-[0.35rem] bg-[rgba(255,255,255,0.06)] px-2 py-0.5 text-[9px] font-bold tabular-nums text-[var(--nc-text-dim)]">
        {current} / {total}
      </span>
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
    <div className="flex items-center gap-1">
      {blocks.map((block, i) => (
        <div
          key={block.id}
          title={block.label}
          className={[
            'h-1.5 flex-1 rounded-full transition-colors duration-200',
            i < activeBlockIndex
              ? 'bg-[rgba(10,18,6,0.70)]'
              : i === activeBlockIndex
                ? 'bg-[rgba(10,18,6,0.45)]'
                : 'bg-[rgba(10,18,6,0.18)]',
          ].join(' ')}
        />
      ))}
    </div>
  )
}
