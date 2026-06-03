'use client';

import { useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { SessionItem, ExerciseResult } from '@/types/session';
import type { ResolvedContent } from '@/types/content';
import { checkWordOrder } from '@/lib/word-order';
import { classifyError } from '@/lib/classify-error';

interface WordOrderExerciseProps {
  item: SessionItem;
  sentence: ResolvedContent;
  sessionId: string;
  onResult: (result: ExerciseResult) => void;
}

interface Tile {
  id: string;
  word: string;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function WordOrderExercise({ item, sentence, sessionId, onResult }: WordOrderExerciseProps) {
  const correctWords = sentence.norwegian.split(' ');
  const [sourceTiles, setSourceTiles] = useState<Tile[]>(() =>
    shuffle(correctWords.map((w, i) => ({ id: `tile-${i}`, word: w })))
  );
  const [answerTiles, setAnswerTiles] = useState<Tile[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const [resultAnnouncement, setResultAnnouncement] = useState('');
  const startRef = useRef(Date.now());

  function moveToAnswer(tile: Tile) {
    if (submitted) return;
    setSourceTiles((t) => t.filter((x) => x.id !== tile.id));
    setAnswerTiles((t) => [...t, tile]);
  }

  function returnToSource(tile: Tile) {
    if (submitted) return;
    setAnswerTiles((t) => t.filter((x) => x.id !== tile.id));
    setSourceTiles((t) => [...t, tile]);
  }

  function submit() {
    if (submitted || sourceTiles.length > 0) return;
    setSubmitted(true);
    const userWords = answerTiles.map((t) => t.word);
    const correct = checkWordOrder(userWords, sentence.norwegian, sentence.acceptedOrders);
    setResultAnnouncement(correct ? 'Riktig svar.' : 'Feil svar.');
    onResult({
      sessionId,
      itemId: item.id,
      correct,
      userAnswer: userWords.join(' '),
      correctAnswer: sentence.norwegian,
      timeTakenSeconds: (Date.now() - startRef.current) / 1000,
      errorTag: correct
        ? undefined
        : (classifyError(userWords.join(' '), sentence.norwegian, 'word-order', sentence.errorTagsDetectable) ?? 'word-order'),
      conceptId: item.conceptIds[0] ?? '',
    });
  }

  return (
    <div className="space-y-4">
      {/* English instruction as micro-label */}
      <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-[var(--nc-cream-dim)]">
        {sentence.english}
      </p>

      {/* Answer zone */}
      <div
        aria-label="Ditt svar"
        className={[
          'min-h-[64px] flex flex-wrap items-center gap-2 rounded-[0.65rem] border p-3 transition-colors',
          answerTiles.length > 0
            ? 'border-[rgba(200,255,32,0.30)] bg-[rgba(200,255,32,0.06)]'
            : 'border-[rgba(17,21,24,0.12)] bg-[rgba(17,21,24,0.03)]',
        ].join(' ')}
      >
        {answerTiles.length === 0 ? (
          <span className="select-none px-1 text-[0.78rem] text-[var(--nc-cream-dim)]">
            Trykk på ordene nedenfor for å bygge setningen
          </span>
        ) : (
          <AnimatePresence mode="popLayout">
            {answerTiles.map((tile) => (
              <motion.button
                key={tile.id}
                type="button"
                onClick={() => returnToSource(tile)}
                disabled={submitted}
                aria-label={`Fjern "${tile.word}" fra svaret`}
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                transition={{ duration: 0.12 }}
                className="rounded-[0.55rem] border border-[rgba(200,255,32,0.45)] bg-[rgba(200,255,32,0.12)] px-4 py-2 font-display text-[1.35rem] font-extrabold text-[#3A5800] transition-colors hover:border-[rgba(200,255,32,0.70)] hover:bg-[rgba(200,255,32,0.20)] disabled:cursor-default"
              >
                {tile.word}
              </motion.button>
            ))}
          </AnimatePresence>
        )}
      </div>

      {/* Source zone */}
      <div
        aria-label="Tilgjengelige ord"
        className="flex flex-wrap gap-2.5 rounded-[0.65rem] border border-[rgba(17,21,24,0.10)] bg-[rgba(17,21,24,0.03)] p-3.5"
      >
        <AnimatePresence mode="popLayout">
          {sourceTiles.map((tile) => (
            <motion.button
              key={tile.id}
              type="button"
              onClick={() => moveToAnswer(tile)}
              disabled={submitted}
              aria-label={`Legg til "${tile.word}"`}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ duration: 0.12 }}
              className="rounded-[0.55rem] border border-[rgba(17,21,24,0.14)] bg-[rgba(17,21,24,0.06)] px-4 py-2.5 font-display text-[1.35rem] font-extrabold text-[var(--nc-cream-text)] transition-colors hover:border-[rgba(200,255,32,0.40)] hover:bg-[rgba(200,255,32,0.08)] hover:text-[#3A5800] disabled:cursor-default"
            >
              {tile.word}
            </motion.button>
          ))}
        </AnimatePresence>
        {sourceTiles.length === 0 && !submitted && (
          <span className="select-none px-1 text-[0.78rem] text-[var(--nc-cream-dim)]">Alle ord er plassert</span>
        )}
      </div>

      <button
        type="button"
        onClick={submit}
        disabled={submitted || sourceTiles.length > 0}
        className="nc-button-primary flex min-h-[52px] w-full items-center justify-center py-3.5 text-[0.9375rem] font-bold disabled:cursor-not-allowed disabled:opacity-30"
      >
        Sjekk rekkefølge
      </button>
      <div aria-live="polite" className="sr-only">{resultAnnouncement}</div>
    </div>
  );
}
