import { describe, it, expect } from 'vitest';
import { normalizeAnswer } from '@/lib/answer';

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
