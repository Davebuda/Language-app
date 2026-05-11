'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { useSession } from '@/hooks/useSession';
import { useSessionStore } from '@/stores/session-store';
import { ExerciseCard } from './ExerciseCard';
import { ExplanationCard } from './ExplanationCard';
import { incrementStreak } from '@/lib/streak';
import type { Sentence } from '@/types/content';
import type { ExerciseResult } from '@/types/session';

interface SessionScreenProps {
  /** All available sentences keyed by ID (mock + Supabase merged). */
  sentences: Record<string, Sentence>;
  /** Sentence IDs grouped by concept ID — drives the session scheduler. */
  availableSentenceIds: Record<string, string[]>;
}

function SegmentedProgress({ current, total }: { current: number; total: number }) {
  const safeTotal = Math.max(total, 1);
  return (
    <div className="flex gap-1">
      {Array.from({ length: safeTotal }).map((_, i) => (
        <div
          key={i}
          className={`h-[5px] flex-1 rounded-full transition-colors duration-300 ${
            i < current ? 'bg-[#0A0A0F]' : 'bg-[#E5E7EB]'
          }`}
        />
      ))}
    </div>
  );
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

  const correctCount = useSessionStore((s) => s.results.filter((r) => r.correct).length);
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
    <div className="flex min-h-dvh flex-col bg-[#FAFAFA] text-[#0A0A0F]">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-[#E5E7EB] px-5 py-4">
        <div className="flex items-baseline gap-2">
          <span className="text-base font-extrabold tracking-tight">NorskCoach</span>
          <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#6B7280]">
            Session
          </span>
        </div>
        <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#0A0A0F]">
          {Math.min(currentItemIndex + (isComplete ? 0 : 1), Math.max(totalItems, 1))}
          {' / '}
          {totalItems || '—'}
        </span>
      </header>

      {/* Segmented progress */}
      <div className="px-5 py-3">
        <SegmentedProgress
          current={Math.min(currentItemIndex, totalItems)}
          total={totalItems || 10}
        />
      </div>

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

function LoadingSkeleton() {
  return (
    <div className="rounded-2xl border-[1.5px] border-[#0A0A0F] bg-white p-5">
      <div className="h-48 animate-pulse rounded-2xl bg-[#E5E7EB]" />
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-1 items-center justify-center">
      <p className="max-w-xs text-center text-sm text-[#6B7280]">
        No exercises available yet — content is being seeded.
      </p>
    </div>
  );
}
