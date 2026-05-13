'use client';

import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import type { SessionItem, ExerciseResult } from '@/types/session';
import type { ResolvedContent } from '@/types/content';
import { gradeAnswer } from '@/app/session/actions';
import { aiService } from '@/ai';
import { useFingerprintStore } from '@/stores/fingerprint-store';
import type { CEFRLevel } from '@/types/fingerprint';

interface TranslationExerciseProps {
  item: SessionItem;
  sentence: ResolvedContent;
  sessionId: string;
  onResult: (result: ExerciseResult) => void;
}

function useSmartFocus(inputRef: React.RefObject<HTMLInputElement | null>) {
  useEffect(() => {
    const isPointerDevice = window.matchMedia('(pointer: fine)').matches;
    if (isPointerDevice) {
      inputRef.current?.focus();
    }
  }, [inputRef]);
}

// Semantic upgrade: if AI says no errors, accept even if exact match fails.
// Only runs after server already returned correct=false, as an upgrade path.
async function semanticUpgrade(userAnswer: string, correctAnswer: string, level: string): Promise<boolean> {
  try {
    const errors = await aiService.detectErrors(userAnswer, level as CEFRLevel);
    if (errors.length > 0) return false;
    const ratio = userAnswer.trim().length / correctAnswer.trim().length;
    return ratio >= 0.5 && ratio <= 2.0;
  } catch {
    return false;
  }
}

export function TranslationExercise({ item, sentence, sessionId, onResult }: TranslationExerciseProps) {
  const [userInput, setUserInput] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const startRef = useRef(Date.now());

  useSmartFocus(inputRef);

  const toNorwegian = item.exerciseType === 'translation-to-norwegian';
  const prompt = toNorwegian ? sentence.english : sentence.norwegian;
  const promptLabel = toNorwegian ? 'Oversett til norsk' : 'Oversett til engelsk';

  async function submit() {
    if (submitted || !userInput.trim()) return;
    setSubmitted(true);

    // Grade server-side — correct answer is not exposed to the client before submission
    const { correct: serverCorrect, correctAnswer: serverAnswer, errorTag } =
      await gradeAnswer(sentence.id, item.exerciseType, userInput);

    let correct = serverCorrect;

    // Semantic upgrade for Norwegian translations when AI model is loaded
    if (!correct && toNorwegian && aiService.isReady()) {
      const { fingerprint } = useFingerprintStore.getState();
      const level = fingerprint?.currentLevel ?? 'A1';
      correct = await semanticUpgrade(userInput, serverAnswer, level);
    }

    const result: ExerciseResult = {
      sessionId,
      itemId: item.id,
      correct,
      userAnswer: userInput,
      correctAnswer: serverAnswer,
      timeTakenSeconds: (Date.now() - startRef.current) / 1000,
      errorTag: correct ? undefined : (errorTag ?? sentence.errorTagsDetectable[0] ?? 'word-order'),
      conceptId: item.conceptIds[0] ?? '',
    };
    onResult(result);
  }

  return (
    <div className="space-y-5">
      <p className="text-[10px] font-bold uppercase tracking-widest text-white/30">
        {promptLabel}
      </p>
      <motion.p
        className="text-[22px] font-bold leading-snug text-white"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
      >
        {prompt}
      </motion.p>
      <input
        ref={inputRef}
        type="text"
        value={userInput}
        onChange={(e) => setUserInput(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter') void submit(); }}
        disabled={submitted}
        placeholder="Ditt svar…"
        className="min-h-[48px] w-full rounded-xl border border-white/12 bg-[rgba(255,255,255,0.04)] px-4 py-3 text-base text-white placeholder:text-white/25 focus:outline-none focus:border-nc-violet/70 focus:ring-1 focus:ring-nc-violet/40 disabled:opacity-50 transition-colors"
      />
      <button
        onClick={() => void submit()}
        disabled={submitted || !userInput.trim()}
        className="min-h-[48px] w-full rounded-xl bg-[linear-gradient(135deg,#D7CBFF_0%,#B7A7FF_60%,#EFE8FF_100%)] px-6 py-3 font-bold text-nc-dark transition-all hover:brightness-105 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-30"
      >
        Sjekk svar
      </button>
    </div>
  );
}
