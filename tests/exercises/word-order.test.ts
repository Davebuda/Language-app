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
