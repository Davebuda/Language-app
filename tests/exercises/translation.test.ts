import { describe, it, expect } from 'vitest';
import { normalizeAnswer, checkAnswer } from '@/lib/answer';

describe('normalizeAnswer', () => {
  it('trims whitespace', () => {
    expect(normalizeAnswer('  spiser  ')).toBe('spiser');
  });

  it('lowercases', () => {
    expect(normalizeAnswer('Jeg ER HER!')).toBe('jeg er her');
  });

  it('strips punctuation', () => {
    expect(normalizeAnswer('Jeg spiser.')).toBe('jeg spiser');
  });

  it('strips multiple punctuation types', () => {
    expect(normalizeAnswer('Hei, verden!')).toBe('hei verden');
  });

  it('collapses internal whitespace runs', () => {
    expect(normalizeAnswer('jeg  spiser   mat')).toBe('jeg spiser mat');
  });

  it('normalizes curly apostrophes to straight', () => {
    expect(normalizeAnswer('don’t')).toBe(normalizeAnswer("don't"));
  });

  it('normalizes curly quotes to straight', () => {
    expect(normalizeAnswer('“hei”')).toBe(normalizeAnswer('"hei"'));
  });
});

describe('checkAnswer — formatting tolerance (3a residual, safe class only)', () => {
  it('accepts extra internal spaces', () => {
    expect(checkAnswer('I  speak   Norwegian', 'I speak Norwegian')).toBe(true);
  });

  it('accepts curly vs straight apostrophe', () => {
    expect(checkAnswer('I don’t know', "I don't know")).toBe(true);
  });

  it('still rejects a genuine paraphrase (must not false-positive)', () => {
    // Semantic alternatives are NOT accepted by normalization — that is the
    // per-sentence accepted-answers design decision, deliberately out of scope here.
    expect(checkAnswer('I do not know', "I don't know")).toBe(false);
  });
});

describe('checkAnswer', () => {
  it('returns true for matching answers ignoring case and punctuation', () => {
    expect(checkAnswer('Jeg spiser.', 'jeg spiser')).toBe(true);
  });

  it('returns false for wrong answers', () => {
    expect(checkAnswer('jeg bor', 'Jeg er')).toBe(false);
  });

  it('returns true for exact match', () => {
    expect(checkAnswer('jeg spiser mat', 'jeg spiser mat')).toBe(true);
  });

  it('handles trailing period on user answer', () => {
    expect(checkAnswer('Jeg er her.', 'jeg er her')).toBe(true);
  });
});
