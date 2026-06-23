'use client';

import { useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import type { ExerciseResult } from '@/types/session';
import type { ResolvedClozePassage } from '@/types/content';
import { getClozeGaps, buildClozeResults } from '@/lib/cloze';

interface ClozePassageExerciseProps {
  passage: ResolvedClozePassage;
  sessionId: string;
  itemId: string;
  onClozeResults: (results: ExerciseResult[]) => void;
}

export function ClozePassageExercise({ passage, sessionId, itemId, onClozeResults }: ClozePassageExerciseProps) {
  const gaps = useMemo(() => getClozeGaps(passage), [passage]);
  const [answers, setAnswers] = useState<string[]>(() => gaps.map(() => ''));
  const [submitted, setSubmitted] = useState(false);
  const [results, setResults] = useState<ExerciseResult[] | null>(null);
  const startRef = useRef(Date.now());

  function setAnswer(i: number, value: string) {
    if (submitted) return;
    setAnswers((prev) => prev.map((a, idx) => (idx === i ? value : a)));
  }

  function submit() {
    if (submitted || answers.some((a) => !a.trim())) return;
    const built = buildClozeResults({
      passage, answers, sessionId, itemId,
      timeTakenSeconds: (Date.now() - startRef.current) / 1000,
    });
    setResults(built);
    setSubmitted(true);
    onClozeResults(built);
  }

  let gapCursor = -1;
  const allFilled = answers.every((a) => a.trim().length > 0);

  return (
    <div className="space-y-4">
      <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-[var(--nc-cream-dim)]">Fyll inn teksten</p>

      <motion.div
        className="font-display text-[1.15rem] font-extrabold leading-[1.55] tracking-[-0.01em] text-[var(--nc-cream-text)]"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
      >
        {passage.segments.map((seg, idx) => {
          if (seg.kind === 'text') return <span key={idx}>{seg.value}</span>;
          gapCursor += 1;
          const i = gapCursor;
          const res = results?.[i];
          const state = res ? (res.correct ? 'correct' : 'wrong') : 'idle';
          return (
            <input
              key={idx}
              type="text"
              value={answers[i]}
              onChange={(e) => setAnswer(i, e.target.value)}
              disabled={submitted}
              aria-label={`Luke ${i + 1}`}
              autoCapitalize="off"
              autoCorrect="off"
              className={[
                'mx-1 inline-flex min-h-[44px] min-w-[96px] rounded-[0.45rem] border-[1.5px] px-2 py-1 align-middle text-[1rem] font-bold',
                state === 'correct'
                  ? 'border-[var(--nc-signal-border)] bg-[var(--nc-signal-tint)] text-[var(--nc-signal-ink-soft)]'
                  : state === 'wrong'
                    ? 'border-[var(--nc-red-border)] bg-[var(--nc-red-tint)] text-[var(--nc-red)]'
                    : 'border-[rgba(120,150,20,0.7)] bg-[color-mix(in_srgb,var(--nc-signal)_10%,transparent)] text-[var(--nc-cream-text)]',
              ].join(' ')}
            />
          );
        })}
      </motion.div>

      <p className="text-[0.82rem] text-[var(--nc-cream-muted)]">{passage.englishGloss}</p>

      {!submitted ? (
        <button
          onClick={submit}
          disabled={!allFilled}
          className="nc-button-primary flex min-h-[52px] w-full items-center justify-center gap-2 py-3.5 text-[0.9375rem] font-bold disabled:cursor-not-allowed disabled:opacity-30"
        >
          Sjekk svar
        </button>
      ) : null}

      <div aria-live="polite" className="sr-only">
        {results ? (results.every((r) => r.correct) ? 'Alle riktige.' : 'Noen svar var feil.') : ''}
      </div>
    </div>
  );
}
