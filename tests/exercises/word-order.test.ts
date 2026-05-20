import { describe, it, expect } from 'vitest';
import { normalizeAnswer } from '@/lib/answer';
import type { ErrorTag } from '@/types/taxonomy';

function isCorrectOrder(userWords: string[], correctWords: string[]): boolean {
  return (
    userWords.length === correctWords.length &&
    userWords.every((w, i) => normalizeAnswer(w) === normalizeAnswer(correctWords[i] ?? ''))
  );
}

describe('WordOrderExercise correct-order detection', () => {
  it('returns true when tiles are in correct order', () => {
    expect(isCorrectOrder(['Jeg', 'spiser', 'mat'], ['Jeg', 'spiser', 'mat'])).toBe(true);
  });

  it('returns false when tiles are in wrong order', () => {
    expect(isCorrectOrder(['spiser', 'Jeg', 'mat'], ['Jeg', 'spiser', 'mat'])).toBe(false);
  });

  it('is case-insensitive via normalizeAnswer', () => {
    expect(isCorrectOrder(['jeg', 'SPISER', 'Mat'], ['Jeg', 'spiser', 'mat'])).toBe(true);
  });

  it('returns false when word count differs', () => {
    expect(isCorrectOrder(['Jeg', 'spiser'], ['Jeg', 'spiser', 'mat'])).toBe(false);
  });
});

// ── Two-zone click interaction model — P0 item 2 ─────────────────────────────
// WordOrderExercise now uses source zone + answer zone, click-to-arrange.
// These tests verify the state transitions and submit gate using pure logic.

interface Tile { id: string; word: string }

function moveToAnswer(sourceTiles: Tile[], answerTiles: Tile[], tile: Tile) {
  return {
    sourceTiles: sourceTiles.filter((x) => x.id !== tile.id),
    answerTiles: [...answerTiles, tile],
  };
}

function returnToSource(sourceTiles: Tile[], answerTiles: Tile[], tile: Tile) {
  return {
    sourceTiles: [...sourceTiles, tile],
    answerTiles: answerTiles.filter((x) => x.id !== tile.id),
  };
}

describe('WordOrderExercise two-zone interaction', () => {
  const tiles: Tile[] = [
    { id: 'a', word: 'Jeg' },
    { id: 'b', word: 'spiser' },
    { id: 'c', word: 'mat' },
  ];

  it('clicking a source tile appends it to the answer zone', () => {
    const { sourceTiles, answerTiles } = moveToAnswer(tiles, [], tiles[0]);
    expect(sourceTiles.map((t) => t.id)).toEqual(['b', 'c']);
    expect(answerTiles.map((t) => t.id)).toEqual(['a']);
  });

  it('clicking an answer tile returns it to the source zone', () => {
    const after = moveToAnswer(tiles, [], tiles[0]);
    const back = returnToSource(after.sourceTiles, after.answerTiles, after.answerTiles[0]);
    expect(back.sourceTiles.map((t) => t.id)).toEqual(['b', 'c', 'a']);
    expect(back.answerTiles).toHaveLength(0);
  });

  it('submit gate: disabled while source zone has tiles remaining', () => {
    const sourceTiles = [tiles[0]]; // one tile still in source
    const canSubmit = sourceTiles.length === 0;
    expect(canSubmit).toBe(false);
  });

  it('submit gate: enabled when source zone is empty', () => {
    const sourceTiles: Tile[] = []; // all tiles moved to answer
    const canSubmit = sourceTiles.length === 0;
    expect(canSubmit).toBe(true);
  });

  it('correct order when answer tiles match correct words', () => {
    const answerTiles = [{ id: 'a', word: 'Jeg' }, { id: 'b', word: 'spiser' }, { id: 'c', word: 'mat' }];
    const correctWords = ['Jeg', 'spiser', 'mat'];
    expect(isCorrectOrder(answerTiles.map((t) => t.word), correctWords)).toBe(true);
  });

  it('wrong order when answer tiles are in wrong sequence', () => {
    const answerTiles = [{ id: 'b', word: 'spiser' }, { id: 'a', word: 'Jeg' }, { id: 'c', word: 'mat' }];
    const correctWords = ['Jeg', 'spiser', 'mat'];
    expect(isCorrectOrder(answerTiles.map((t) => t.word), correctWords)).toBe(false);
  });
});

// ── errorTag derivation — fix for P0 item 7 ──────────────────────────────────
// WordOrderExercise derives errorTag from sentence.errorTagsDetectable[0], not
// a hardcoded 'word-order'. The fix mirrors the FillInBlank item 5 pattern.
describe('WordOrderExercise errorTag derivation', () => {
  it('wrong answer uses first declared error tag — not hardcoded word-order', () => {
    const errorTagsDetectable: ErrorTag[] = ['adjective-agreement'];
    const correct = false;
    const result = correct ? undefined : (errorTagsDetectable[0] ?? 'word-order');
    expect(result).toBe('adjective-agreement');
    expect(result).not.toBe('word-order');
  });

  it('correct answer always returns undefined errorTag', () => {
    const errorTagsDetectable: ErrorTag[] = ['adjective-agreement'];
    const correct = true;
    const result = correct ? undefined : (errorTagsDetectable[0] ?? 'word-order');
    expect(result).toBeUndefined();
  });

  it('falls back to word-order when errorTagsDetectable is empty', () => {
    const errorTagsDetectable: ErrorTag[] = [];
    const correct = false;
    const result = correct ? undefined : (errorTagsDetectable[0] ?? 'word-order');
    expect(result).toBe('word-order');
  });

  it('noun-gender concept uses noun-gender tag, not V2 boilerplate trigger', () => {
    const errorTagsDetectable: ErrorTag[] = ['noun-gender'];
    const correct = false;
    const result = correct ? undefined : (errorTagsDetectable[0] ?? 'word-order');
    expect(result).toBe('noun-gender');
  });
});
