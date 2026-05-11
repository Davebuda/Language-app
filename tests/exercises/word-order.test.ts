import { describe, it, expect } from 'vitest';
import { normalizeAnswer } from '@/lib/answer';

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
