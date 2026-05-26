'use client';

import { useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { SessionItem, ExerciseResult } from '@/types/session';
import type { ResolvedContent } from '@/types/content';
import { normalizeAnswer } from '@/lib/answer';

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
    const correct =
      userWords.length === correctWords.length &&
      userWords.every((w, i) => normalizeAnswer(w) === normalizeAnswer(correctWords[i] ?? ''));
    setResultAnnouncement(correct ? 'Riktig svar.' : 'Feil svar.');
    onResult({
      sessionId,
      itemId: item.id,
      correct,
      userAnswer: userWords.join(' '),
      correctAnswer: sentence.norwegian,
      timeTakenSeconds: (Date.now() - startRef.current) / 1000,
      errorTag: correct ? undefined : (sentence.errorTagsDetectable[0] ?? 'word-order'),
      conceptId: item.conceptIds[0] ?? '',
    });
  }

  return (
    <div className="space-y-4">
      {/* English instruction — demoted to small label per aesthetic direction */}
      <p className="text-[12px] font-bold uppercase tracking-widest text-nc-cream-dim">
        {sentence.english}
      </p>

      {/* Answer zone — where tiles are placed in order */}
      <div
        aria-label="Ditt svar"
        className={[
          'min-h-[64px] flex flex-wrap items-center gap-2 rounded-xl border p-3 transition-colors',
          answerTiles.length > 0
            ? 'border-nc-green/30 bg-nc-green/5'
            : 'border-[rgba(4,14,8,0.12)] bg-[rgba(4,14,8,0.03)]',
        ].join(' ')}
      >
        {answerTiles.length === 0 ? (
          <span className="text-[12px] text-nc-cream-dim select-none px-1">
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
                className="rounded-xl border border-nc-green/50 bg-nc-green/14 px-5 py-2.5 text-[22px] sm:text-[24px] lg:text-[26px] font-bold text-nc-green transition-colors hover:border-nc-green/80 hover:bg-nc-green/20 disabled:cursor-default"
              >
                {tile.word}
              </motion.button>
            ))}
          </AnimatePresence>
        )}
      </div>

      {/* Source zone — scrambled tiles not yet placed */}
      <div
        aria-label="Tilgjengelige ord"
        className="flex flex-wrap gap-3 rounded-xl border border-[rgba(4,14,8,0.10)] bg-[rgba(4,14,8,0.03)] p-4"
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
              className="rounded-xl border border-[rgba(4,14,8,0.16)] bg-[rgba(4,14,8,0.06)] px-5 py-3 text-[22px] sm:text-[24px] lg:text-[26px] font-bold text-nc-cream-text transition-colors hover:border-nc-green/50 hover:bg-nc-green/10 hover:text-nc-green disabled:cursor-default"
            >
              {tile.word}
            </motion.button>
          ))}
        </AnimatePresence>
        {sourceTiles.length === 0 && !submitted && (
          <span className="text-[12px] text-nc-cream-dim select-none px-1">Alle ord er plassert</span>
        )}
      </div>

      <button
        type="button"
        onClick={submit}
        disabled={submitted || sourceTiles.length > 0}
        className="min-h-[48px] w-full rounded-xl nc-button-primary px-6 py-3 font-bold transition-all hover:brightness-105 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-30"
      >
        Sjekk rekkefølge
      </button>
      <div aria-live="polite" className="sr-only">{resultAnnouncement}</div>
    </div>
  );
}
