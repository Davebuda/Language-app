import { describe, it, expect } from 'vitest';
import { extractBlank } from '@/lib/answer';

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
