import { checkAnswer } from '@/lib/answer';
import type { ClozePassage, ClozeSegment } from '@/types/content';
import type { ExerciseResult } from '@/types/session';

export type ClozeGap = Extract<ClozeSegment, { kind: 'gap' }>;

export function getClozeGaps(passage: ClozePassage): ClozeGap[] {
  return passage.segments.filter((s): s is ClozeGap => s.kind === 'gap');
}

function gapCorrect(gap: ClozeGap, answer: string): boolean {
  if (checkAnswer(answer, gap.answer)) return true;
  return (gap.acceptedAnswers ?? []).some((a) => checkAnswer(answer, a));
}

/**
 * Grade a typed cloze passage into one ExerciseResult per gap.
 * Per-gap results carry the gap's own conceptId + errorTag (Rule 8 diagnosis).
 * sentenceId is left undefined so a single correct gap never marks the passage
 * passed; only when EVERY gap is correct does the first result carry the
 * passage id, so recordResult marks the whole passage passed exactly once.
 */
export function buildClozeResults(params: {
  passage: ClozePassage;
  answers: string[];
  sessionId: string;
  itemId: string;
  timeTakenSeconds: number;
}): ExerciseResult[] {
  const { passage, answers, sessionId, itemId, timeTakenSeconds } = params;
  const gaps = getClozeGaps(passage);
  const perGap = timeTakenSeconds / Math.max(1, gaps.length);

  const results: ExerciseResult[] = gaps.map((gap, i) => {
    const userAnswer = answers[i] ?? '';
    const correct = gapCorrect(gap, userAnswer);
    return {
      sessionId,
      itemId,
      correct,
      userAnswer,
      correctAnswer: gap.answer,
      timeTakenSeconds: perGap,
      errorTag: correct ? undefined : gap.errorTag,
      conceptId: gap.conceptId,
      sentenceId: undefined,
    };
  });

  if (results.length > 0 && results.every((r) => r.correct)) {
    results[0] = { ...results[0], sentenceId: passage.id };
  }
  return results;
}
