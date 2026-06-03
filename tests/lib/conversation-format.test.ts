import { describe, it, expect } from 'vitest';
import { stripTutorScaffolding } from '@/lib/conversation-format';

describe('stripTutorScaffolding', () => {
  it('strips the space-separated non-JSON CORRECTION leak (the live 2026-06-03 bug)', () => {
    // Exact shape Groq produced live: " CORRECTION: None" appended on the same line.
    expect(
      stripTutorScaffolding('Hva gjør du på morgenen? Hvordan starter din dag? CORRECTION: None'),
    ).toBe('Hva gjør du på morgenen? Hvordan starter din dag?');
  });

  it('strips a newline JSON CORRECTION block', () => {
    expect(
      stripTutorScaffolding('Bra svar!\nCORRECTION:{"original":"dem","correct":"de","tag":"pronoun-choice","why":"subject form"}'),
    ).toBe('Bra svar!');
  });

  it('strips CONSTRAINT_MET and CONSTRAINT_MISSED markers', () => {
    expect(stripTutorScaffolding('Flott svar.\nCONSTRAINT_MET')).toBe('Flott svar.');
    expect(stripTutorScaffolding('Prøv igjen.\nCONSTRAINT_MISSED: bruk fortid')).toBe('Prøv igjen.');
  });

  it('is case-insensitive and tolerates missing newline', () => {
    expect(stripTutorScaffolding('Hei på deg! correction: ingen')).toBe('Hei på deg!');
  });

  it('leaves a clean Norwegian response untouched', () => {
    expect(stripTutorScaffolding('Hva liker du å gjøre på fritiden?')).toBe(
      'Hva liker du å gjøre på fritiden?',
    );
  });
});
