'use client';

import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import type { SessionItem, ExerciseResult } from '@/types/session';
import type { ResolvedContent } from '@/types/content';
import { gradeAnswer } from '@/app/session/actions';

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
    void gradeAnswer(sentence.id, item.exerciseType, answer).then(({ correct, correctAnswer, errorTag }) => {
      onResult({
        sessionId,
        itemId: item.id,
        correct,
        userAnswer: answer,
        correctAnswer,
        timeTakenSeconds: (Date.now() - startRef.current) / 1000,
        errorTag: correct ? undefined : (errorTag ?? sentence.errorTagsDetectable[0] ?? 'spelling'),
        conceptId: item.conceptIds[0] ?? '',
      });
      setResultAnnouncement(correct ? 'Riktig svar.' : 'Feil svar.');
    });
  }

  const pct = (secondsLeft / initialSeconds) * 100;
  const urgentColor = secondsLeft <= 10 ? 'var(--nc-red)' : 'var(--nc-teal)';

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-bold uppercase tracking-widest text-nc-cream-dim">
          Hurtigrunde
        </p>
        <span className="text-sm font-bold tabular-nums" style={{ color: urgentColor }}>
          {secondsLeft}s
        </span>
      </div>

      {/* Timer bar */}
      <div className="h-[3px] overflow-hidden rounded-full bg-[rgba(4,14,8,0.12)]">
        <motion.div
          className="h-full w-full origin-left rounded-full"
          style={{ background: urgentColor }}
          animate={{ scaleX: pct / 100 }}
          transition={{ duration: 0.9, ease: 'linear' }}
        />
      </div>

      <motion.p
        className="text-[28px] font-bold text-nc-cream-text"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
      >
        {sentence.norwegian}
      </motion.p>
      <p className="text-sm text-nc-cream-muted">Oversett til engelsk så raskt du kan</p>

      <input
        ref={inputRef}
        type="text"
        value={userInput}
        onChange={(e) => { setUserInput(e.target.value); userInputRef.current = e.target.value; }}
        onKeyDown={(e) => { if (e.key === 'Enter') submitAnswer(userInput); }}
        disabled={submitted}
        placeholder="Engelsk oversettelse…"
        className="min-h-[48px] w-full rounded-xl border border-[rgba(0,220,180,0.30)] bg-white/55 px-4 py-3 text-base text-nc-cream-text placeholder:text-nc-cream-dim focus:outline-none focus:border-nc-green/50 focus:ring-1 focus:ring-nc-green/15 disabled:opacity-50 transition-colors"
      />
      <button
        onClick={() => submitAnswer(userInput)}
        disabled={submitted || !userInput.trim()}
        className="nc-button-primary flex min-h-[48px] w-full items-center justify-center gap-2 px-6 py-3 transition-all active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-white/30 disabled:shadow-none"
      >
        Sjekk svar
      </button>
      <div aria-live="polite" className="sr-only">{resultAnnouncement}</div>
    </div>
  );
}
