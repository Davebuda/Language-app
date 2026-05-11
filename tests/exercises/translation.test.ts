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
