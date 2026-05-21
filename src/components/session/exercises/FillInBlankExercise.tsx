'use client';

import { useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import type { SessionItem, ExerciseResult } from '@/types/session';
import type { ResolvedContent } from '@/types/content';
import type { ErrorTag } from '@/types/taxonomy';
import { checkAnswer, extractBlank } from '@/lib/answer';

interface FillInBlankExerciseProps {
  item: SessionItem;
  sentence: ResolvedContent;
  sessionId: string;
  onResult: (result: ExerciseResult) => void;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function MultipleChoice({
  before, after, correct, options, englishHint, sessionId, item, onResult, errorTag,
}: {
  before: string; after: string; correct: string; options: string[];
  englishHint: string; sessionId: string; item: SessionItem;
  onResult: (r: ExerciseResult) => void;
  errorTag: ErrorTag | undefined;
}) {
  const [selected, setSelected] = useState<string | null>(null);
  const startRef = useRef(Date.now());

  function choose(option: string) {
    if (selected) return;
    setSelected(option);
    const isCorrect = option.trim().toLowerCase() === correct.trim().toLowerCase();
    onResult({
      sessionId,
      itemId: item.id,
      correct: isCorrect,
      userAnswer: option,
      correctAnswer: correct,
      timeTakenSeconds: (Date.now() - startRef.current) / 1000,
      errorTag: isCorrect ? undefined : errorTag,
      conceptId: item.conceptIds[0] ?? '',
    });
  }

  return (
    <div className="space-y-5">
      <p className="text-[10px] font-bold uppercase tracking-widest text-nc-cream-dim">Fyll inn</p>

      <motion.div
        className="flex flex-wrap items-center gap-2 text-[24px] sm:text-[28px] lg:text-[32px] font-bold text-nc-cream-text"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
      >
        {before && <span>{before}</span>}
        <span className="inline-flex min-w-[80px] items-center justify-center rounded-lg border border-dashed border-nc-green/50 bg-nc-green/10 px-3 py-1 text-xl text-nc-cream-dim">
          {selected ?? '___'}
        </span>
        {after && <span>{after}</span>}
      </motion.div>

      <p className="text-sm text-nc-cream-muted">{englishHint}</p>

      <div className="grid grid-cols-2 gap-3">
        {options.map((opt) => {
          const isSelected = selected === opt;
          const isCorrectOpt = opt.trim().toLowerCase() === correct.trim().toLowerCase();
          const showCorrect = selected && isCorrectOpt;
          const showWrong = isSelected && !isCorrectOpt;

          return (
            <button
              key={opt}
              onClick={() => choose(opt)}
              disabled={!!selected}
              className={[
                'min-h-[48px] rounded-xl border px-4 py-3 text-sm font-semibold transition',
                showCorrect
                  ? 'border-nc-green/50 bg-nc-green/14 text-nc-green'
                  : showWrong
                    ? 'border-nc-red/50 bg-nc-red/10 text-nc-red'
                    : 'border-[rgba(4,14,8,0.14)] bg-[rgba(4,14,8,0.04)] text-nc-cream-muted hover:border-nc-green/50 hover:text-nc-cream-text',
                selected ? 'cursor-default' : 'cursor-pointer',
              ].join(' ')}
            >
              {opt}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function FreeText({
  before, after, correct, englishHint, sessionId, item, onResult, errorTag,
}: {
  before: string; after: string; correct: string; englishHint: string;
  sessionId: string; item: SessionItem; onResult: (r: ExerciseResult) => void;
  errorTag: ErrorTag | undefined;
}) {
  const [userInput, setUserInput] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const startRef = useRef(Date.now());

  function submit() {
    if (submitted || !userInput.trim()) return;
    setSubmitted(true);
    const isCorrect = checkAnswer(userInput, correct);
    onResult({
      sessionId,
      itemId: item.id,
      correct: isCorrect,
      userAnswer: userInput,
      correctAnswer: correct,
      timeTakenSeconds: (Date.now() - startRef.current) / 1000,
      errorTag: isCorrect ? undefined : errorTag,
      conceptId: item.conceptIds[0] ?? '',
    });
  }

  return (
    <div className="space-y-5">
      <p className="text-[10px] font-bold uppercase tracking-widest text-nc-cream-dim">Fyll inn</p>
      <motion.div
        className="flex flex-wrap items-center gap-2 text-[24px] sm:text-[28px] lg:text-[32px] font-bold text-nc-cream-text"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
      >
        {before && <span>{before}</span>}
        <input
          type="text"
          value={userInput}
          onChange={(e) => setUserInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') submit(); }}
          disabled={submitted}
          placeholder="___"
          className="min-h-[44px] min-w-[120px] rounded-lg border border-nc-green/40 bg-white/40 px-3 py-1 text-xl font-semibold text-nc-cream-text placeholder:text-nc-cream-dim focus:outline-none focus:border-nc-green/60 focus:ring-1 focus:ring-nc-green/15 disabled:opacity-50 transition-colors"
        />
        {after && <span>{after}</span>}
      </motion.div>
      <p className="text-sm text-nc-cream-muted">{englishHint}</p>
      <button
        onClick={submit}
        disabled={submitted || !userInput.trim()}
        className="nc-button-primary flex min-h-[48px] w-full items-center justify-center gap-2 px-6 py-3 transition-all active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-[rgba(4,14,8,0.06)] disabled:text-[var(--nc-cream-dim)] disabled:shadow-none"
      >
        Sjekk svar
      </button>
    </div>
  );
}

export function FillInBlankExercise({ item, sentence, sessionId, onResult }: FillInBlankExerciseProps) {
  const { before, after } = extractBlank(sentence.norwegian);
  const correctAnswer = sentence.notes ?? '';
  // Take the first declared error tag. For multi-tag sentences this logs the primary
  // tag, not the specific error the user made — see backlog future-item note.
  const errorTag = sentence.errorTagsDetectable[0];

  const options = useMemo(() => {
    if (!sentence.distractors?.length || !correctAnswer) return null;
    return shuffle([correctAnswer, ...sentence.distractors]);
  }, [correctAnswer, sentence.distractors]);

  if (options) {
    return (
      <MultipleChoice
        before={before} after={after} correct={correctAnswer}
        options={options} englishHint={sentence.english}
        sessionId={sessionId} item={item} onResult={onResult}
        errorTag={errorTag}
      />
    );
  }

  return (
    <FreeText
      before={before} after={after} correct={correctAnswer}
      englishHint={sentence.english}
      sessionId={sessionId} item={item} onResult={onResult}
      errorTag={errorTag}
    />
  );
}
