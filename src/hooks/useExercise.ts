'use client';

import { useCallback } from 'react';
import { checkAnswer } from '@/lib/answer';
import type { SessionItem, ExerciseResult } from '@/types/session';
import type { ErrorTag } from '@/types/taxonomy';

interface CreateResultParams {
  item: SessionItem;
  sessionId: string;
  userAnswer: string;
  correctAnswer: string;
  timeTakenSeconds: number;
  errorTag?: ErrorTag;
}

export function useExercise() {
  const validateAnswer = useCallback(
    (userAnswer: string, correctAnswer: string): { correct: boolean } => ({
      correct: checkAnswer(userAnswer, correctAnswer),
    }),
    []
  );

  const createResult = useCallback(
    (params: CreateResultParams): ExerciseResult => {
      const correct = checkAnswer(params.userAnswer, params.correctAnswer);
      return {
        sessionId: params.sessionId,
        itemId: params.item.id,
        correct,
        userAnswer: params.userAnswer,
        correctAnswer: params.correctAnswer,
        timeTakenSeconds: params.timeTakenSeconds,
        errorTag: correct ? undefined : params.errorTag,
        conceptId: params.item.conceptIds[0] ?? '',
      };
    },
    []
  );

  return { validateAnswer, createResult };
}
