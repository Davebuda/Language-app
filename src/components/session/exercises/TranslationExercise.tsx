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
    const graded = await gradeAnswer(sentence.id, item.exerciseType, userInput);

    if (!graded) {
      // Server grader could not resolve the sentence id (F011).
      // Surface honestly rather than persist a "[unavailable]" placeholder.
      console.warn(`[TranslationExercise] gradeAnswer returned null for sentence ${sentence.id}`);
      setSubmitted(false);
      setFeedbackTone('idle');
      return;
    }

    const { correct: serverCorrect, correctAnswer: serverAnswer, errorTag } = graded;
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
    'nc-input-cream',
    feedbackTone === 'correct'
      ? 'border-[var(--nc-signal-border)] bg-[var(--nc-signal-tint)]'
      : feedbackTone === 'wrong'
        ? 'border-[var(--nc-red-border)] bg-[var(--nc-red-tint)]'
        : '',
    submitted ? 'opacity-50' : '',
  ].filter(Boolean).join(' ');

  return (
    <div className="flex flex-col gap-4">
      {/* Micro-label */}
      <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-[var(--nc-cream-dim)]">
        {promptLabel}
      </p>
      {/* Hero prompt — dominant Norwegian/English sentence */}
      <motion.p
        className="font-display text-[1.75rem] font-extrabold leading-[1.1] tracking-[-0.02em] text-[var(--nc-cream-text)]"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
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
        placeholder="Skriv svaret ditt her..."
        className={answerFieldClassName}
      />
      <button
        onClick={() => void submit()}
        disabled={submitted || !userInput.trim()}
        className="nc-button-primary flex min-h-[52px] w-full items-center justify-center gap-2 py-3.5 text-[0.9375rem] font-bold disabled:cursor-not-allowed disabled:opacity-30"
      >
        <span>Sjekk svar</span>
        <ArrowRight size={16} aria-hidden="true" />
      </button>
      <div aria-live="polite" className="sr-only">
        {feedbackTone === 'correct' ? 'Riktig svar.' : feedbackTone === 'wrong' ? 'Feil svar.' : ''}
      </div>
    </div>
  );
}
