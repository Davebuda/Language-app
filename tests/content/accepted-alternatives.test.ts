import { describe, it, expect } from 'vitest';
import { loadContentSentences } from '@/lib/content-loader';
import { checkAnswerWithAlternatives } from '@/lib/answer';
import { checkWordOrder } from '@/lib/word-order';

// End-to-end wiring for the 3a/3c residual fixes: corpus JSON → content-loader →
// grader. Proves the acceptedAnswers / acceptedOrders fields are not just shipped
// but actually consulted by the graders against REAL authored content (closes the
// "field shipped but unused" gap). Alternatives here are linguist-audited.
describe('corpus accepted-alternatives wiring (3a/3c)', () => {
  const { sentences } = loadContentSentences();
  const byNorwegian = (no: string) =>
    Object.values(sentences).find((s) => s.norwegian === no);

  it('accepts an authored acceptedAnswers paraphrase (translate path)', () => {
    const s = byNorwegian('Jeg heter Lars og bor i Bergen.');
    expect(s, 'seed sentence must exist').toBeDefined();
    expect(s!.acceptedAnswers).toContain('Jeg heter Lars og jeg bor i Bergen.');
    // canonical answer still correct
    expect(checkAnswerWithAlternatives(s!.norwegian, s!.norwegian, s!.acceptedAnswers)).toBe(true);
    // authored alternative accepted
    expect(
      checkAnswerWithAlternatives('Jeg heter Lars og jeg bor i Bergen.', s!.norwegian, s!.acceptedAnswers),
    ).toBe(true);
    // a genuinely different answer is still rejected (no false-positive)
    expect(
      checkAnswerWithAlternatives('Jeg heter Per og bor i Oslo.', s!.norwegian, s!.acceptedAnswers),
    ).toBe(false);
  });

  it('accepts an authored acceptedOrders V2 reordering (word-order path)', () => {
    const s = byNorwegian('I dag spiser jeg frokost hjemme.');
    expect(s, 'seed sentence must exist').toBeDefined();
    expect(s!.acceptedOrders).toContain('Jeg spiser frokost hjemme i dag.');
    // canonical order correct
    expect(checkWordOrder(s!.norwegian.split(' '), s!.norwegian, s!.acceptedOrders)).toBe(true);
    // authored valid V2 alternative accepted
    expect(
      checkWordOrder('Jeg spiser frokost hjemme i dag.'.split(' '), s!.norwegian, s!.acceptedOrders),
    ).toBe(true);
    // a scrambled (ungrammatical) order is still rejected
    expect(
      checkWordOrder('frokost jeg spiser hjemme i dag'.split(' '), s!.norwegian, s!.acceptedOrders),
    ).toBe(false);
  });

  it('confirms the two corrected answer keys are grammatical Bokmål', () => {
    // 542ad280: was "holdt igjen toget i likevel" (wrong); 9bde0ff4: was double-definite.
    expect(byNorwegian('De løp til stasjonen, men de holdt igjen toget i likevel.')).toBeUndefined();
    expect(byNorwegian('De løp til stasjonen, men de rakk ikke toget likevel.')).toBeDefined();
    expect(byNorwegian('Kongens palasset ligger i sentrum.')).toBeUndefined();
    expect(byNorwegian('Kongens palass ligger i sentrum.')).toBeDefined();
  });
});
