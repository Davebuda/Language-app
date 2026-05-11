'use client';

import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import type { SessionItem, ExerciseResult } from '@/types/session';
import type { ResolvedContent } from '@/types/content';
import { checkAnswer } from '@/lib/answer';

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
  const startRef = useRef(Date.now());
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (submitted) return;
    const interval = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          clearInterval(interval);
          submitAnswer(userInput);
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
    const correctAnswer = sentence.english;
    const correct = checkAnswer(answer, correctAnswer);
    onResult({
      sessionId,
      itemId: item.id,
      correct,
      userAnswer: answer,
      correctAnswer,
      timeTakenSeconds: (Date.now() - startRef.current) / 1000,
      errorTag: correct ? undefined : 'spelling',
      conceptId: item.conceptIds[0] ?? '',
    });
  }

  const pct = (secondsLeft / initialSeconds) * 100;
  const urgentColor = secondsLeft <= 10 ? '#ff6b5b' : '#c8ff00';

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-bold uppercase tracking-widest text-white/30">
          Hurtigrunde
        </p>
        <span className="text-sm font-bold tabular-nums" style={{ color: urgentColor }}>
          {secondsLeft}s
        </span>
      </div>

      {/* Timer bar */}
      <div className="h-[3px] overflow-hidden rounded-full bg-[rgba(255,255,255,0.08)]">
        <motion.div
          className="h-full rounded-full"
          style={{ background: urgentColor }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.9, ease: 'linear' }}
        />
      </div>

      <motion.p
        className="text-[26px] font-bold text-white"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
      >
        {sentence.norwegian}
      </motion.p>
      <p className="text-sm text-white/40">Oversett til engelsk så raskt du kan</p>

      <input
        ref={inputRef}
        type="text"
        value={userInput}
        onChange={(e) => setUserInput(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter') submitAnswer(userInput); }}
        disabled={submitted}
        placeholder="Engelsk oversettelse…"
        className="min-h-[48px] w-full rounded-xl border border-nc-border bg-[rgba(255,255,255,0.04)] px-4 py-3 text-base text-white placeholder:text-white/25 focus:outline-none focus:border-nc-green/60 focus:ring-1 focus:ring-nc-green/40 disabled:opacity-50 transition-colors"
      />
      <button
        onClick={() => submitAnswer(userInput)}
        disabled={submitted || !userInput.trim()}
        className="min-h-[48px] w-full rounded-xl bg-nc-green px-6 py-3 font-bold text-[#0d0d14] transition-all hover:bg-nc-green/90 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-30"
      >
        Sjekk svar
      </button>
    </div>
  );
}
