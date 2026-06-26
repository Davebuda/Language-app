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

  // 2026-06-26 conversation calibration: the model sometimes improvises a trailing
  // tutor note in brackets even when told not to (seen in the bake-off:
  // "[merk: ingen feil]", "[merk: \"feil\" → \"rett\"]"). These must not leak into
  // Kari's chat bubble.
  it('strips an improvised [merk: …] bracket note', () => {
    expect(
      stripTutorScaffolding('Det er godt for deg. Drikker du kaffe hjemme?\n[merk: "et kaffe" → "en kaffe"]'),
    ).toBe('Det er godt for deg. Drikker du kaffe hjemme?');
  });

  it('strips a "[merk: ingen feil]" no-error aside', () => {
    expect(stripTutorScaffolding('Jeg drikker kaffe om morgenen. [merk: ingen feil]')).toBe(
      'Jeg drikker kaffe om morgenen.',
    );
  });

  it('does not strip ordinary parentheses or non-tutor brackets', () => {
    // Only the known tutor-note keywords are stripped; real content survives.
    expect(stripTutorScaffolding('Jeg liker te (og kaffe). Hva med deg?')).toBe(
      'Jeg liker te (og kaffe). Hva med deg?',
    );
  });
});
