'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { useSession } from '@/hooks/useSession';
import { ExerciseCard } from './ExerciseCard';
import { ExplanationCard } from './ExplanationCard';
import { AIStatusBadge } from '@/components/ai/AIStatusBadge';
import { incrementStreak } from '@/lib/streak';
import type { Sentence } from '@/types/content';
import type { ExerciseResult } from '@/types/session';
import type { ConceptGraph } from '@/types/concepts';
import conceptGraphJson from '@content/concepts/a1-graph.json';

const conceptGraph = conceptGraphJson as ConceptGraph;

interface SessionScreenProps {
  /** All available sentences keyed by ID (mock + Supabase merged). */
  sentences: Record<string, Sentence>;
  /** Sentence IDs grouped by concept ID — drives the session scheduler. */
  availableSentenceIds: Record<string, string[]>;
}

function getExerciseTypeLabel(type: string): string {
  const map: Record<string, string> = {
    'translation-to-norwegian': '✏️ Oversett til norsk',
    'translation-to-english': '✏️ Oversett til engelsk',
    'fill-in-blank': '📝 Fyll inn',
    'word-order': '🔀 Ordstilling',
    'listening-comprehension': '🎧 Lytteøvelse',
    'speed-round': '⚡ Hurtigrunde',
    'sentence-transformation': '✏️ Omskriv',
    'dictation': '🎧 Diktat',
  }
  return map[type] ?? '✏️ Øvelse'
}

export function SessionScreen({ sentences, availableSentenceIds }: SessionScreenProps) {
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
  } = useSession(sentences, availableSentenceIds);

  const lastResultRef = useRef<ExerciseResult | null>(null);

  useEffect(() => {
    startNewSession();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const router = useRouter()

  const totalItems = session?.items.length ?? 0;
  const isComplete = !!session && totalItems > 0 && currentItemIndex >= totalItems;

  useEffect(() => {
    if (!session || totalItems === 0) return
    if (isComplete) {
      incrementStreak()
      router.push('/session/complete')
    }
  }, [isComplete, session, totalItems, router])

  function handleResult(result: ExerciseResult) {
    lastResultRef.current = result;
    submitResult(result);
  }

  return (
    <div className="flex min-h-dvh flex-col bg-nc-bg text-white">
      <header className="px-5 pt-5 pb-2">
        <div className="flex items-center gap-2 mb-3">
          <div className="flex-1 h-[4px] bg-[rgba(255,255,255,0.08)] rounded-full overflow-hidden">
            <div
              className="h-full bg-nc-green rounded-full transition-all duration-300"
              style={{
                width: `${totalItems > 0 ? (Math.min(currentItemIndex, totalItems) / totalItems) * 100 : 0}%`,
              }}
            />
          </div>
          <span className="text-[11px] font-semibold text-white/30 min-w-[48px] text-right">
            {Math.min(currentItemIndex + 1, Math.max(totalItems, 1))} / {totalItems || '—'}
          </span>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {currentItem && (
            <div className="inline-flex items-center gap-1.5 rounded-full border border-nc-border bg-nc-card px-3 py-1 text-[10px] font-semibold text-white/40">
              {getExerciseTypeLabel(currentItem.exerciseType)}
            </div>
          )}
          {currentItem && (
            <PurposePill purpose={currentItem.purpose} />
          )}
          <div className="ml-auto">
            <AIStatusBadge />
          </div>
        </div>
      </header>

      {/* Body */}
      <main className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-4 px-4 py-6">
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
                initial={{ x: 60, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: -60, opacity: 0 }}
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
              {isInRepair && repairPlan && (
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
                    conceptLabel={conceptGraph.concepts.find((c) => c.id === currentItem.conceptIds[0])?.label}
                    onContinue={continueAfterRepair}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </>
        ) : (
          <LoadingSkeleton />
        )}
      </main>
    </div>
  );
}

function PurposePill({ purpose }: { purpose: string }) {
  const map: Record<string, { label: string; color: string }> = {
    'remediation': { label: 'Reparasjon', color: 'text-orange-400 border-orange-400/20 bg-orange-400/8' },
    'review': { label: 'Repetisjon', color: 'text-blue-400 border-blue-400/20 bg-blue-400/8' },
    'new-material': { label: 'Nytt', color: 'text-nc-green border-nc-green/20 bg-nc-green/8' },
    'interleaving': { label: 'Blanding', color: 'text-purple-400 border-purple-400/20 bg-purple-400/8' },
  }
  const config = map[purpose]
  if (!config) return null
  return (
    <div className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-semibold ${config.color}`}>
      {config.label}
    </div>
  )
}

function LoadingSkeleton() {
  return (
    <div className="rounded-2xl border border-nc-border bg-nc-card p-5">
      <div className="h-48 animate-pulse rounded-2xl bg-[rgba(255,255,255,0.06)]" />
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-1 items-center justify-center">
      <p className="max-w-xs text-center text-sm text-white/30">
        Ingen øvelser tilgjengelig ennå — innhold seedes snart.
      </p>
    </div>
  );
}
