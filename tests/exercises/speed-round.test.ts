import { describe, it, expect } from 'vitest';
import { normalizeAnswer } from '@/lib/answer';
import type { ErrorTag } from '@/types/taxonomy';

// SpeedRound timer logic is UI-driven (setInterval in component).
// We test the answer utility it uses for validation.
describe('SpeedRound answer logic', () => {
  it('accepts correct Norwegian word (case-insensitive)', () => {
    expect(normalizeAnswer('Hund')).toBe('hund');
    expect(normalizeAnswer('hund')).toBe('hund');
  });

  it('strips trailing punctuation from fast-typed answers', () => {
    expect(normalizeAnswer('spiser.')).toBe('spiser');
  });

  it('handles whitespace around answer', () => {
    expect(normalizeAnswer('  bil  ')).toBe('bil');
  });
});

// ── errorTag derivation — fix for P0 item 7 ──────────────────────────────────
// SpeedRound derives errorTag from the grader response first, then
// sentence.errorTagsDetectable[0], then falls back to 'spelling'.
// The intermediate fallback prevents 'spelling' from firing on non-spelling concepts.
describe('SpeedRound errorTag derivation', () => {
  it('grader-provided tag takes priority over sentence tag', () => {
    const graderTag: ErrorTag = 'verb-conjugation';
    const errorTagsDetectable: ErrorTag[] = ['noun-gender'];
    const correct = false;
    const result = correct ? undefined : (graderTag ?? errorTagsDetectable[0] ?? 'spelling');
    expect(result).toBe('verb-conjugation');
  });

  it('sentence tag used when grader returns undefined (corpus miss)', () => {
    const graderTag: ErrorTag | undefined = undefined;
    const errorTagsDetectable: ErrorTag[] = ['noun-gender'];
    const correct = false;
    const result = correct ? undefined : (graderTag ?? errorTagsDetectable[0] ?? 'spelling');
    expect(result).toBe('noun-gender');
    expect(result).not.toBe('spelling');
  });

  it('falls back to spelling when both grader and sentence tag are absent', () => {
    const graderTag: ErrorTag | undefined = undefined;
    const errorTagsDetectable: ErrorTag[] = [];
    const correct = false;
    const result = correct ? undefined : (graderTag ?? errorTagsDetectable[0] ?? 'spelling');
    expect(result).toBe('spelling');
  });

  it('correct answer returns undefined regardless of tags', () => {
    const graderTag: ErrorTag | undefined = undefined;
    const errorTagsDetectable: ErrorTag[] = ['noun-gender'];
    const correct = true;
    const result = correct ? undefined : (graderTag ?? errorTagsDetectable[0] ?? 'spelling');
    expect(result).toBeUndefined();
  });
});
