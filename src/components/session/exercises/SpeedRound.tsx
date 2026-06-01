'use client';

import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import type { SessionItem, ExerciseResult } from '@/types/session';
import type { ResolvedContent } from '@/types/content';
import { gradeAnswer } from '@/app/session/actions';
import { classifyError } from '@/lib/classify-error';

interface SpeedRoundProps {
  item: SessionItem;
  sentence: ResolvedContent;
  sessionId: string;
  onResult: (result: ExerciseResult) => void;
  initialSeconds?: number;
}

export function SpeedRound({ item, sentence, sessionId, onResult, initialSeconds = 30 }: SpeedRoundProps) {
  const [userInput, setUserInput] = useState('');
  const [secondsLeft, setSecondsLeft] = useState(initialSeconds);
  const [submitted, setSubmitted] = useState(false);
  const [resultAnnouncement, setResultAnnouncement] = useState('');
  const startRef = useRef(Date.now());
  const inputRef = useRef<HTMLInputElement>(null);
  const userInputRef = useRef('');

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (submitted) return;
    const interval = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          clearInterval(interval);
          submitAnswer(userInputRef.current);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [submitted]);

  function submitAnswer(answer: string) {
    if (submitted) return;
    setSubmitted(true);
    void gradeAnswer(sentence.id, item.exerciseType, answer).then((graded) => {
      if (!graded) {
        console.warn(`[SpeedRound] gradeAnswer returned null for sentence ${sentence.id}`);
        setSubmitted(false);
        setResultAnnouncement('Kunne ikke vurdere svaret.');
        return;
      }
      const { correct, correctAnswer } = graded;
      onResult({
        sessionId,
        itemId: item.id,
        correct,
        userAnswer: answer,
        correctAnswer,
        timeTakenSeconds: (Date.now() - startRef.current) / 1000,
        errorTag: correct
          ? undefined
          : (classifyError(answer, correctAnswer, item.exerciseType, sentence.errorTagsDetectable) ?? 'unspecified'),
        conceptId: item.conceptIds[0] ?? '',
      });
      setResultAnnouncement(correct ? 'Riktig svar.' : 'Feil svar.');
    });
  }

  const pct = (secondsLeft / initialSeconds) * 100;
  // Timer urgent threshold: red when ≤10s, lime otherwise (demote teal)
  const urgentColor = secondsLeft <= 10 ? 'var(--nc-red)' : 'var(--nc-signal)';

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-[var(--nc-cream-dim)]">
          Hurtigrunde
        </p>
        <span className="font-display text-[0.92rem] font-extrabold tabular-nums" style={{ color: urgentColor }}>
          {secondsLeft}s
        </span>
      </div>

      {/* Timer bar — lime accent */}
      <div className="h-[3px] overflow-hidden rounded-full bg-[rgba(17,21,24,0.10)]">
        <motion.div
          className="h-full w-full origin-left rounded-full"
          style={{ background: urgentColor }}
          animate={{ scaleX: pct / 100 }}
          transition={{ duration: 0.9, ease: 'linear' }}
        />
      </div>

      <motion.p
        className="font-display text-[1.75rem] font-extrabold leading-[1.1] tracking-[-0.02em] text-[var(--nc-cream-text)]"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
      >
        {sentence.norwegian}
      </motion.p>
      <p className="text-[0.82rem] text-[var(--nc-cream-muted)]">Oversett til engelsk så raskt du kan</p>

      <input
        ref={inputRef}
        type="text"
        value={userInput}
        onChange={(e) => { setUserInput(e.target.value); userInputRef.current = e.target.value; }}
        onKeyDown={(e) => { if (e.key === 'Enter') submitAnswer(userInput); }}
        disabled={submitted}
        placeholder="Skriv svaret ditt her..."
        className="nc-input-cream"
      />
      <button
        onClick={() => submitAnswer(userInput)}
        disabled={submitted || !userInput.trim()}
        className="nc-button-primary flex min-h-[52px] w-full items-center justify-center gap-2 py-3.5 text-[0.9375rem] font-bold disabled:cursor-not-allowed disabled:opacity-30"
      >
        Sjekk svar
      </button>
      <div aria-live="polite" className="sr-only">{resultAnnouncement}</div>
    </div>
  );
}
