'use client';

import { useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import type { SessionItem, ExerciseResult } from '@/types/session';
import type { ResolvedContent } from '@/types/content';
import type { ErrorTag } from '@/types/taxonomy';
import { checkAnswer, extractBlank } from '@/lib/answer';
import { classifyError } from '@/lib/classify-error';

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
  before, after, correct, options, englishHint, sessionId, item, onResult, candidateTags,
}: {
  before: string; after: string; correct: string; options: string[];
  englishHint: string; sessionId: string; item: SessionItem;
  onResult: (r: ExerciseResult) => void;
  candidateTags: ErrorTag[];
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
      errorTag: isCorrect ? undefined : classifyError(option, correct, 'fill-in-blank', candidateTags),
      conceptId: item.conceptIds[0] ?? '',
    });
  }

  return (
    <div className="space-y-4">
      <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-[var(--nc-cream-dim)]">Fyll inn</p>

      <motion.div
        className="flex flex-wrap items-center gap-2 font-display text-[1.75rem] font-extrabold leading-[1.1] tracking-[-0.02em] text-[var(--nc-cream-text)]"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
      >
        {before && <span>{before}</span>}
        <span className="inline-flex min-w-[88px] items-center justify-center rounded-[0.55rem] border border-dashed border-[color-mix(in_srgb,var(--nc-signal)_45%,transparent)] bg-[color-mix(in_srgb,var(--nc-signal)_8%,transparent)] px-3 py-1 text-[var(--nc-cream-dim)]">
          {selected ?? '___'}
        </span>
        {after && <span>{after}</span>}
      </motion.div>

      <p className="text-[0.82rem] text-[var(--nc-cream-muted)]">{englishHint}</p>

      <div className="grid grid-cols-2 gap-2.5">
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
                'min-h-[48px] rounded-[0.65rem] border px-4 py-3 text-[0.88rem] font-semibold transition-colors',
                showCorrect
                  ? 'border-[var(--nc-signal-border)] bg-[var(--nc-signal-tint)] text-[var(--nc-signal-ink-soft)]'
                  : showWrong
                    ? 'border-[var(--nc-red-border)] bg-[var(--nc-red-tint)] text-[var(--nc-red)]'
                    : 'border-[rgba(17,21,24,0.12)] bg-[rgba(17,21,24,0.04)] text-[var(--nc-cream-muted)] hover:border-[color-mix(in_srgb,var(--nc-signal)_40%,transparent)] hover:bg-[color-mix(in_srgb,var(--nc-signal)_6%,transparent)] hover:text-[var(--nc-cream-text)]',
                selected ? 'cursor-default' : 'cursor-pointer',
              ].join(' ')}
            >
              {opt}
            </button>
          );
        })}
      </div>
      <div aria-live="polite" className="sr-only">
        {selected !== null
          ? selected.trim().toLowerCase() === correct.trim().toLowerCase()
            ? 'Riktig svar.'
            : 'Feil svar.'
          : ''}
      </div>
    </div>
  );
}

function FreeText({
  before, after, correct, englishHint, sessionId, item, onResult, candidateTags,
}: {
  before: string; after: string; correct: string; englishHint: string;
  sessionId: string; item: SessionItem; onResult: (r: ExerciseResult) => void;
  candidateTags: ErrorTag[];
}) {
  const [userInput, setUserInput] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [resultAnnouncement, setResultAnnouncement] = useState('');
  const startRef = useRef(Date.now());

  function submit() {
    if (submitted || !userInput.trim()) return;
    setSubmitted(true);
    const isCorrect = checkAnswer(userInput, correct);
    setResultAnnouncement(isCorrect ? 'Riktig svar.' : 'Feil svar.');
    onResult({
      sessionId,
      itemId: item.id,
      correct: isCorrect,
      userAnswer: userInput,
      correctAnswer: correct,
      timeTakenSeconds: (Date.now() - startRef.current) / 1000,
      errorTag: isCorrect ? undefined : classifyError(userInput, correct, 'fill-in-blank', candidateTags),
      conceptId: item.conceptIds[0] ?? '',
    });
  }

  return (
    <div className="space-y-4">
      <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-[var(--nc-cream-dim)]">Fyll inn</p>
      <motion.div
        className="flex flex-wrap items-center gap-2 font-display text-[1.75rem] font-extrabold leading-[1.1] tracking-[-0.02em] text-[var(--nc-cream-text)]"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
      >
        {before && <span>{before}</span>}
        <input
          type="text"
          value={userInput}
          onChange={(e) => setUserInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') submit(); }}
          disabled={submitted}
          placeholder="___"
          className="nc-input-cream min-h-[44px] min-w-[120px] px-3 py-1 text-[1.2rem] font-bold disabled:opacity-50"
        />
        {after && <span>{after}</span>}
      </motion.div>
      <p className="text-[0.82rem] text-[var(--nc-cream-muted)]">{englishHint}</p>
      <button
        onClick={submit}
        disabled={submitted || !userInput.trim()}
        className="nc-button-primary flex min-h-[52px] w-full items-center justify-center gap-2 py-3.5 text-[0.9375rem] font-bold disabled:cursor-not-allowed disabled:opacity-30"
      >
        Sjekk svar
      </button>
      <div aria-live="polite" className="sr-only">{resultAnnouncement}</div>
    </div>
  );
}

export function FillInBlankExercise({ item, sentence, sessionId, onResult }: FillInBlankExerciseProps) {
  const { before, after } = extractBlank(sentence.norwegian);
  const correctAnswer = sentence.notes ?? '';
  // The inner components classify the actual diff at submit time against this
  // candidate set (observed-error tagging) rather than always logging [0].
  const candidateTags = sentence.errorTagsDetectable;

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
        candidateTags={candidateTags}
      />
    );
  }

  return (
    <FreeText
      before={before} after={after} correct={correctAnswer}
      englishHint={sentence.english}
      sessionId={sessionId} item={item} onResult={onResult}
      candidateTags={candidateTags}
    />
  );
}
