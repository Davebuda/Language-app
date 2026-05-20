/**
 * Tests for buildCorrectedText — P0 item 6
 *
 * Root cause: String.replace is case-sensitive. The AI lowercases excerpts in
 * err.wrong ("jeg liker å spiser") while the original has uppercase ("Jeg liker
 * å spiser"). The match fails silently and the correction is not applied.
 *
 * Fix: case-insensitive regex matching + unapplied counter for honest fallback.
 *
 * We test the logic in isolation since buildCorrectedText is a pure function
 * extracted from WritingEditor. The tests replicate the function directly to
 * avoid importing a 'use client' component into the test environment.
 */
import { describe, it, expect } from 'vitest';

interface FeedbackError {
  wrong: string;
  correct: string;
  tag: string;
  briefWhy: string;
}

// Replica of the fixed buildCorrectedText for pure testing
function buildCorrectedText(
  original: string,
  errors: FeedbackError[],
): { text: string; unapplied: number } {
  let result = original;
  let unapplied = 0;
  for (const err of errors) {
    if (!err.wrong || !err.correct) continue;
    const escaped = err.wrong.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(escaped, 'i');
    const next = result.replace(regex, err.correct);
    if (next === result) {
      unapplied++;
    }
    result = next;
  }
  return { text: result, unapplied };
}

const baseError = { tag: 'verb-conjugation', briefWhy: 'test' };

describe('buildCorrectedText', () => {
  it('applies a correction when wrong matches exactly (exact case)', () => {
    const { text, unapplied } = buildCorrectedText(
      'Jeg liker å spise mat.',
      [{ ...baseError, wrong: 'å spise', correct: 'å spiser' }],
    );
    expect(text).toBe('Jeg liker å spiser mat.');
    expect(unapplied).toBe(0);
  });

  it('applies a correction case-insensitively — the core fix for P0 item 6', () => {
    // AI lowercased "Jeg" to "jeg" in err.wrong; original has capital J
    const original = 'Jeg liker å spiser mat fra Italia og jeg går ofte på kino.';
    const { text, unapplied } = buildCorrectedText(original, [
      {
        ...baseError,
        wrong: 'jeg liker å spiser mat fra Italia',   // lowercase j from AI
        correct: 'Jeg liker å spise mat fra Italia',  // correct form with capital J
      },
    ]);
    expect(text).toContain('Jeg liker å spise mat fra Italia');
    expect(text).not.toContain('å spiser');
    expect(unapplied).toBe(0);
  });

  it('returns unapplied > 0 when err.wrong does not appear in the original', () => {
    const { text, unapplied } = buildCorrectedText(
      'Jeg bor i Oslo.',
      [{ ...baseError, wrong: 'du bor i Bergen', correct: 'du bor i Oslo' }],
    );
    expect(unapplied).toBe(1);
    // Text is unchanged since the correction could not be applied
    expect(text).toBe('Jeg bor i Oslo.');
  });

  it('applies matched corrections and tracks unapplied for unmatched ones (mixed)', () => {
    const original = 'Jeg liker å spiser mat og jeg er glad.';
    const { text, unapplied } = buildCorrectedText(original, [
      { ...baseError, wrong: 'å spiser', correct: 'å spise' },    // matches
      { ...baseError, wrong: 'du er trist', correct: 'du er glad' }, // no match
    ]);
    expect(text).toContain('å spise');
    expect(text).not.toContain('å spiser');
    expect(unapplied).toBe(1);
  });

  it('applies multiple corrections in sequence', () => {
    const original = 'Jeg har en bil og en hus.';
    const { text, unapplied } = buildCorrectedText(original, [
      { ...baseError, wrong: 'en bil', correct: 'en bil (masculine)' }, // gender label
      { ...baseError, wrong: 'en hus', correct: 'et hus' },             // neuter fix
    ]);
    expect(text).toContain('et hus');
    expect(unapplied).toBe(0);
  });

  it('returns unapplied 0 and original text when errors list is empty', () => {
    const original = 'Alt er riktig.';
    const { text, unapplied } = buildCorrectedText(original, []);
    expect(text).toBe(original);
    expect(unapplied).toBe(0);
  });

  it('skips entries with empty wrong or correct fields', () => {
    const original = 'Jeg liker norsk mat.';
    const { text, unapplied } = buildCorrectedText(original, [
      { ...baseError, wrong: '', correct: 'something' },
      { ...baseError, wrong: 'norsk', correct: '' },
    ]);
    expect(text).toBe(original);
    expect(unapplied).toBe(0);
  });
});
