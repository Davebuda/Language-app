'use client';

import { useRef, useState } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  horizontalListSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
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

function WordTile({ id, word }: { id: string; word: string }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id });
  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : 1,
      }}
      {...attributes}
      {...listeners}
      className="cursor-grab touch-none select-none rounded-lg border border-white/12 bg-white/10 px-4 py-2 text-sm font-semibold text-white active:cursor-grabbing hover:border-nc-green/40 hover:text-nc-green transition-colors"
    >
      {word}
    </div>
  );
}

export function WordOrderExercise({ item, sentence, sessionId, onResult }: WordOrderExerciseProps) {
  const correctWords = sentence.norwegian.split(' ');
  const [tiles, setTiles] = useState<Tile[]>(() =>
    shuffle(correctWords.map((w, i) => ({ id: `tile-${i}`, word: w })))
  );
  const [submitted, setSubmitted] = useState(false);
  const startRef = useRef(Date.now());

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setTiles((t) => {
        const oldIndex = t.findIndex((tile) => tile.id === active.id);
        const newIndex = t.findIndex((tile) => tile.id === over.id);
        return arrayMove(t, oldIndex, newIndex);
      });
    }
  }

  function submit() {
    if (submitted) return;
    setSubmitted(true);
    const userWords = tiles.map((t) => t.word);
    const correct =
      userWords.length === correctWords.length &&
      userWords.every((w, i) => normalizeAnswer(w) === normalizeAnswer(correctWords[i] ?? ''));
    onResult({
      sessionId,
      itemId: item.id,
      correct,
      userAnswer: userWords.join(' '),
      correctAnswer: sentence.norwegian,
      timeTakenSeconds: (Date.now() - startRef.current) / 1000,
      errorTag: correct ? undefined : 'word-order',
      conceptId: item.conceptIds[0] ?? '',
    });
  }

  return (
    <div className="space-y-5">
      <p className="text-[10px] font-bold uppercase tracking-widest text-white/30">
        Sett ordene i riktig rekkefølge
      </p>
      <p className="text-base text-white/50">{sentence.english}</p>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={tiles.map((t) => t.id)} strategy={horizontalListSortingStrategy}>
          <div className="flex min-h-[48px] flex-wrap gap-2 rounded-xl border border-white/12 bg-[rgba(255,255,255,0.02)] p-3">
            {tiles.map((tile) => (
              <WordTile key={tile.id} id={tile.id} word={tile.word} />
            ))}
          </div>
        </SortableContext>
      </DndContext>
      <button
        onClick={submit}
        disabled={submitted}
        className="min-h-[48px] w-full rounded-xl nc-button-primary px-6 py-3 font-bold text-nc-dark transition-all hover:brightness-105 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-30"
      >
        Sjekk rekkefølge
      </button>
    </div>
  );
}
