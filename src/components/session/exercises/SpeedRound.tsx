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
  // G-02/S-02: on a miss (paraphrase / typo / empty timeout) speed-round does NOT
  // punish — instead of routing to the repair loop, it reveals the canonical
  // answer and lets the learner advance with "Neste". Correct answers advance
  // immediately (keeps the rapid rhythm).
  const [revealed, setRevealed] = useState<{ result: ExerciseResult; correctAnswer: string } | null>(null);
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
    // S-01: pass the resolved content for AI-generated items (id resolves nowhere).
    const fallback = sentence.source === 'generated'
      ? { norwegian: sentence.norwegian, english: sentence.english, notes: sentence.notes, errorTagsDetectable: sentence.errorTagsDetectable, acceptedAnswers: sentence.acceptedAnswers }
      : undefined;
    void gradeAnswer(sentence.id, item.exerciseType, answer, fallback).then((graded) => {
      if (!graded) {
        console.warn(`[SpeedRound] gradeAnswer returned null for sentence ${sentence.id}`);
        setSubmitted(false);
        setResultAnnouncement('Kunne ikke vurdere svaret.');
        return;
      }
      const { correct, correctAnswer } = graded;
      const result: ExerciseResult = {
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
      };
      if (correct) {
        setResultAnnouncement('Riktig svar.');
        onResult(result);
      } else {
        // Non-punitive: reveal the answer; the learner advances via "Neste".
        setResultAnnouncement(`Riktig svar: ${correctAnswer}`);
        setRevealed({ result, correctAnswer });
      }
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

      {revealed ? (
        <div className="space-y-3">
          <div className="rounded-[0.5rem] border border-[rgba(17,21,24,0.12)] bg-[rgba(17,21,24,0.04)] px-3 py-2.5">
            <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-[var(--nc-cream-dim)]">Riktig svar</p>
            <p className="mt-0.5 text-[1.05rem] font-bold text-[var(--nc-cream-text)]">{revealed.correctAnswer}</p>
          </div>
          <button
            onClick={() => onResult(revealed.result)}
            className="nc-button-primary flex min-h-[52px] w-full items-center justify-center gap-2 py-3.5 text-[0.9375rem] font-bold"
          >
            Neste
          </button>
        </div>
      ) : (
        <>
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
        </>
      )}
      <div aria-live="polite" className="sr-only">{resultAnnouncement}</div>
    </div>
  );
}
