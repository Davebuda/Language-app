import { describe, it, expect } from 'vitest';
import { getClozeGaps, buildClozeResults } from '@/lib/cloze';
import type { ClozePassage } from '@/types/content';

const PASSAGE: ClozePassage = {
  id: 'cz-1',
  cefrLevel: 'A1',
  primaryConceptId: 'v2-word-order',
  englishGloss: 'I get up early. Then I drink coffee.',
  difficulty: 1,
  segments: [
    { kind: 'text', value: 'Jeg ' },
    { kind: 'gap', answer: 'står', conceptId: 'v2-word-order', errorTag: 'word-order' },
    { kind: 'text', value: ' opp tidlig. Så ' },
    { kind: 'gap', answer: 'drikker', conceptId: 'present-tense-regular', errorTag: 'verb-conjugation' },
    { kind: 'text', value: ' jeg kaffe.' },
  ],
};

describe('getClozeGaps', () => {
  it('returns gap segments in order', () => {
    const gaps = getClozeGaps(PASSAGE);
    expect(gaps.map((g) => g.answer)).toEqual(['står', 'drikker']);
    expect(gaps[1].conceptId).toBe('present-tense-regular');
  });
});

describe('buildClozeResults', () => {
  it('produces one result per gap with the gap concept and error tag', () => {
    const results = buildClozeResults({
      passage: PASSAGE, answers: ['feil', 'drikker'], sessionId: 's1', itemId: 'item1', timeTakenSeconds: 30,
    });
    expect(results).toHaveLength(2);
    expect(results[0]).toMatchObject({ conceptId: 'v2-word-order', correct: false, errorTag: 'word-order' });
    expect(results[1]).toMatchObject({ conceptId: 'present-tense-regular', correct: true });
    expect(results[1].errorTag).toBeUndefined();
  });

  it('grades case/punctuation-insensitively (reuses checkAnswer)', () => {
    const results = buildClozeResults({
      passage: PASSAGE, answers: [' STÅR ', 'Drikker'], sessionId: 's1', itemId: 'item1', timeTakenSeconds: 10,
    });
    expect(results.every((r) => r.correct)).toBe(true);
  });

  it('marks the passage passed (only) when all gaps correct: first result carries passage id', () => {
    const allRight = buildClozeResults({ passage: PASSAGE, answers: ['står', 'drikker'], sessionId: 's1', itemId: 'i', timeTakenSeconds: 5 });
    expect(allRight[0].sentenceId).toBe('cz-1');
    expect(allRight.slice(1).every((r) => r.sentenceId === undefined)).toBe(true);
  });

  it('does NOT mark passed when any gap wrong: no result carries passage id', () => {
    const oneWrong = buildClozeResults({ passage: PASSAGE, answers: ['feil', 'drikker'], sessionId: 's1', itemId: 'i', timeTakenSeconds: 5 });
    expect(oneWrong.some((r) => r.sentenceId === 'cz-1')).toBe(false);
  });
});
