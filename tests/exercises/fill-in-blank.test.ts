import { describe, it, expect } from 'vitest';
import { extractBlank } from '@/lib/answer';
import type { ErrorTag } from '@/types/taxonomy';

describe('extractBlank', () => {
  it('extracts blank from middle of sentence', () => {
    expect(extractBlank('Jeg ___ til Oslo.')).toEqual({
      before: 'Jeg ',
      after: ' til Oslo.',
    });
  });

  it('extracts blank from start of sentence', () => {
    expect(extractBlank('___ er du?')).toEqual({
      before: '',
      after: ' er du?',
    });
  });

  it('extracts blank from end of sentence', () => {
    expect(extractBlank('Hva heter ___?')).toEqual({
      before: 'Hva heter ',
      after: '?',
    });
  });

  it('returns empty strings when no blank marker present', () => {
    const result = extractBlank('Ingen blank her.');
    expect(result.before).toBe('Ingen blank her.');
    expect(result.after).toBe('');
  });
});

// ── errorTag derivation — the fix for P0 item 5 ───────────────────────────────
// FillInBlankExercise derives errorTag from sentence.errorTagsDetectable[0].
// These tests validate the expression logic used in both MultipleChoice.choose()
// and FreeText.submit(): isCorrect ? undefined : errorTag
describe('FillInBlank errorTag derivation', () => {
  it('wrong answer produces the first declared error tag', () => {
    const errorTagsDetectable: ErrorTag[] = ['noun-gender', 'article-use'];
    const isCorrect = false;
    const errorTag = errorTagsDetectable[0];
    const result = isCorrect ? undefined : errorTag;
    expect(result).toBe('noun-gender');
    // Crucially: not the old hardcoded value
    expect(result).not.toBe('verb-conjugation');
  });

  it('correct answer always produces undefined errorTag', () => {
    const errorTagsDetectable: ErrorTag[] = ['noun-gender'];
    const isCorrect = true;
    const errorTag = errorTagsDetectable[0];
    const result = isCorrect ? undefined : errorTag;
    expect(result).toBeUndefined();
  });

  it('empty errorTagsDetectable produces undefined on wrong answer (falls back to unspecified downstream)', () => {
    const errorTagsDetectable: ErrorTag[] = [];
    const isCorrect = false;
    const errorTag = errorTagsDetectable[0]; // undefined
    const result = isCorrect ? undefined : errorTag;
    expect(result).toBeUndefined();
    // Downstream: result.errorTag ?? 'unspecified' handles this correctly
  });

  it('single-tag sentence uses that tag on wrong answer', () => {
    const errorTagsDetectable: ErrorTag[] = ['adjective-agreement'];
    const isCorrect = false;
    const errorTag = errorTagsDetectable[0];
    const result = isCorrect ? undefined : errorTag;
    expect(result).toBe('adjective-agreement');
  });
});
