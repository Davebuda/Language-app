'use client';

import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { SessionItem, ExerciseResult } from '@/types/session';
import type { ResolvedContent } from '@/types/content';
import type { RepairPlan } from '@/engine/repair-loop';
import { TranslationExercise } from './exercises/TranslationExercise';
import { FillInBlankExercise } from './exercises/FillInBlankExercise';
import { SpeedRound } from './exercises/SpeedRound';
import { ListeningExercise } from './exercises/ListeningExercise';
import WordOrderExerciseLazy from './exercises/WordOrderExerciseLazy';

interface ExerciseCardProps {
  item: SessionItem;
  sentence: ResolvedContent;
  sessionId: string;
  onResult: (result: ExerciseResult) => void;
  repairPlan?: RepairPlan | null;
}

function InlineExplanation({
  correctAnswer,
  explanation,
  onContinue,
}: {
  correctAnswer: string;
  explanation: string;
  onContinue: () => void;
}) {
  return (
    <div className="rounded-2xl border border-nc-repair-border bg-nc-repair-bg p-5 space-y-3">
      <p className="text-[10px] font-bold uppercase tracking-widest text-nc-green">🔁 Reparasjonsløkke</p>
      <div className="space-y-1">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-white/30">Riktig svar</p>
        <p className="text-xl font-extrabold text-white">{correctAnswer}</p>
      </div>
      <p className="text-sm leading-relaxed text-white/60">{explanation}</p>
      <button
        onClick={onContinue}
        className="min-h-[44px] w-full rounded-xl bg-nc-green px-5 py-2.5 text-sm font-bold text-[#0d0d14] transition-all hover:bg-nc-green/90 active:scale-[0.98]"
      >
        Fortsett å øve →
      </button>
    </div>
  );
}

export function ExerciseCard({ item, sentence, sessionId, onResult, repairPlan }: ExerciseCardProps) {
  const [showExplanation, setShowExplanation] = useState(false);
  const [lastResult, setLastResult] = useState<ExerciseResult | null>(null);
  const [shakeKey, setShakeKey] = useState(0);

  function handleResult(result: ExerciseResult) {
    setLastResult(result);
    onResult(result);
    if (!result.correct) {
      setShowExplanation(true);
      setShakeKey((k) => k + 1);
    }
  }

  function renderExercise() {
    const props = { item, sentence, sessionId, onResult: handleResult };
    switch (item.exerciseType) {
      case 'translation-to-norwegian':
      case 'translation-to-english':
      case 'sentence-transformation':
        return <TranslationExercise {...props} />;
      case 'fill-in-blank':
        return <FillInBlankExercise {...props} />;
      case 'word-order':
        return <WordOrderExerciseLazy {...props} />;
      case 'listening-comprehension':
      case 'dictation':
        return <ListeningExercise {...props} />;
      case 'speed-round':
        return <SpeedRound {...props} />;
      default:
        return <TranslationExercise {...props} />;
    }
  }

  return (
    <div className="space-y-4">
      <motion.div
        key={shakeKey}
        animate={
          lastResult && !lastResult.correct && shakeKey > 0
            ? { x: [0, -8, 8, -6, 6, 0] }
            : { x: 0 }
        }
        transition={{ duration: 0.4 }}
        className="rounded-2xl border border-nc-border bg-nc-card p-6"
      >
        {renderExercise()}
      </motion.div>

      <AnimatePresence>
        {showExplanation && lastResult && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
          >
            <InlineExplanation
              correctAnswer={lastResult.correctAnswer}
              explanation={repairPlan?.explanation ?? 'Gjennomgå dette konseptet og prøv igjen.'}
              onContinue={() => setShowExplanation(false)}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
