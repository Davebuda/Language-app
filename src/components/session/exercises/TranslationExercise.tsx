'use client';

import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
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
  const [feedbackTone, setFeedbackTone] = useState<'idle' | 'correct' | 'wrong'>('idle');
  const inputRef = useRef<HTMLInputElement>(null);
  const startRef = useRef(Date.now());

  useSmartFocus(inputRef);

  const toNorwegian = item.exerciseType === 'translation-to-norwegian';
  const prompt = toNorwegian ? sentence.english : sentence.norwegian;
  const promptLabel = toNorwegian ? 'Oversett til norsk' : 'Oversett til engelsk';

  async function submit() {
    if (submitted || !userInput.trim()) return;
    setSubmitted(true);

    // Grade server-side: correct answer is not exposed to the client before submission.
    const { correct: serverCorrect, correctAnswer: serverAnswer, errorTag } =
      await gradeAnswer(sentence.id, item.exerciseType, userInput);

    let correct = serverCorrect;

    // Semantic upgrade for Norwegian translations when AI model is loaded.
    if (!correct && toNorwegian && aiService.isReady()) {
      const { fingerprint } = useFingerprintStore.getState();
      const level = fingerprint?.currentLevel ?? 'A1';
      correct = await semanticUpgrade(userInput, serverAnswer, level);
    }

    setFeedbackTone(correct ? 'correct' : 'wrong');

    const result: ExerciseResult = {
      sessionId,
      itemId: item.id,
      correct,
      userAnswer: userInput,
      correctAnswer: serverAnswer,
      timeTakenSeconds: (Date.now() - startRef.current) / 1000,
      errorTag: correct ? undefined : (errorTag ?? sentence.errorTagsDetectable[0] ?? 'unspecified'),
      conceptId: item.conceptIds[0] ?? '',
    };
    onResult(result);
  }

  const answerFieldClassName = [
    'nc-input',
    feedbackTone === 'correct'
      ? 'border-[var(--nc-green-border)] bg-[var(--nc-green-tint)]'
      : feedbackTone === 'wrong'
        ? 'border-[var(--nc-red-border)] bg-[var(--nc-red-tint)]'
        : '',
    submitted ? 'opacity-50' : '',
  ].filter(Boolean).join(' ');

  return (
    <div className="space-y-5">
      <p className="nc-label">
        {promptLabel}
      </p>
      <motion.p
        className="font-display text-2xl font-bold leading-[1.15] tracking-tight text-nc-text"
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
        onChange={(e) => {
          setUserInput(e.target.value);
          if (feedbackTone !== 'idle') setFeedbackTone('idle');
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') void submit();
        }}
        disabled={submitted}
        placeholder="Ditt svar..."
        className={answerFieldClassName}
      />
      <button
        onClick={() => void submit()}
        disabled={submitted || !userInput.trim()}
        className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-[var(--radius)] bg-[var(--nc-red)] px-6 py-3 text-sm font-bold text-white transition-all active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-[var(--nc-card-soft)] disabled:text-nc-text-dim disabled:shadow-none"
      >
        <span>Sjekk svar</span>
        <ArrowRight size={16} />
      </button>
    </div>
  );
}
