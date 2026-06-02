import { describe, it, expect } from 'vitest';
import { getClozeGaps, buildClozeResults } from '@/lib/cloze';
import { updateConceptMastery, logError } from '@/engine/fingerprint';
import { createEmptyFingerprint } from '@/types/fingerprint';
import type { MistakeFingerprint } from '@/types/fingerprint';
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

  // ── Rule-8 write trace ──────────────────────────────────────────────────
  // Proves cloze results produce REAL, independent per-gap diagnosis through
  // the actual fingerprint engine — not in theory. Mirrors the per-result loop
  // submitClozeResults runs (useFingerprint.ts recordResult, lines ~282-306):
  // updateConceptMastery for every gap; logError only on wrong gaps.
  // This is the contract that the cloze surface genuinely feeds the engine.
  it('feeds the engine: one passage diagnoses two concepts independently (Rule 8)', () => {
    const results = buildClozeResults({
      passage: PASSAGE, answers: ['feil', 'drikker'], sessionId: 's1', itemId: 'item1', timeTakenSeconds: 20,
    });
    // gap0 (v2-word-order) WRONG, gap1 (present-tense-regular) CORRECT.

    let fp: MistakeFingerprint = createEmptyFingerprint('cloze-trace-user');
    for (const r of results) {
      const existing = fp.conceptMastery[r.conceptId];
      const mastery = updateConceptMastery(existing, r.correct, 3, 1);
      fp = {
        ...fp,
        conceptMastery: { ...fp.conceptMastery, [r.conceptId]: { ...mastery, conceptId: r.conceptId } },
      };
      if (!r.correct && r.errorTag) {
        fp = logError(fp, {
          conceptId: r.conceptId,
          errorTag: r.errorTag,
          exerciseType: 'cloze-passage',
          wrong: r.userAnswer,
          correct: r.correctAnswer,
          sentenceId: r.itemId,
        });
      }
    }

    // Error log: exactly one entry — the wrong gap only, with ITS concept + tag.
    expect(fp.recentErrors).toHaveLength(1);
    expect(fp.recentErrors[0]).toMatchObject({
      conceptId: 'v2-word-order',
      errorTag: 'word-order',
    });

    // Mastery moved independently per gap: wrong gap's last outcome false,
    // correct gap's last outcome true. Both concepts exist in the fingerprint.
    expect(fp.conceptMastery['v2-word-order'].recentOutcomes.at(-1)).toBe(false);
    expect(fp.conceptMastery['present-tense-regular'].recentOutcomes.at(-1)).toBe(true);
  });

  it('accepts an answer listed in acceptedAnswers (not just the primary answer)', () => {
    const passage: ClozePassage = {
      id: 'cz-acc',
      cefrLevel: 'A1',
      primaryConceptId: 'noun-gender',
      englishGloss: 'a/an house',
      difficulty: 1,
      segments: [
        { kind: 'gap', answer: 'et', acceptedAnswers: ['ett'], conceptId: 'noun-gender', errorTag: 'noun-gender' },
        { kind: 'text', value: ' hus' },
      ],
    };
    const results = buildClozeResults({ passage, answers: ['ett'], sessionId: 's', itemId: 'i', timeTakenSeconds: 4 });
    expect(results[0].correct).toBe(true);
    expect(results[0].errorTag).toBeUndefined();
  });
});
