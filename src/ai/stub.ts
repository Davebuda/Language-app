// Phase 1A stub: implements AIService with template-based responses.
// No model required. Replaced by WebLLM implementation in Phase 2.

import type {
  AIService,
  ExplainParams,
  Explanation,
  GenerateParams,
  TaggedError,
  ReviewParams,
  WritingFeedback,
} from './types';
import type { Sentence } from '@/types/content';
import type { CEFRLevel } from '@/types/fingerprint';
import { buildRepairPlan } from '@/engine/repair-loop';
import type { ErrorLogEntry } from '@/types/fingerprint';

export class StubAIService implements AIService {
  isAvailable(): boolean {
    return true; // Stub is always available
  }

  async explainMistake(params: ExplainParams): Promise<Explanation> {
    // Reuse the template from the repair loop
    const mockEntry: ErrorLogEntry = {
      id: 'stub',
      conceptId: params.conceptId,
      errorTag: params.errorTag,
      exerciseType: 'fill-in-blank',
      wrong: params.wrong,
      correct: params.correct,
      timestamp: new Date().toISOString(),
    };
    const plan = buildRepairPlan(mockEntry);
    return { text: plan.explanation, source: 'template' };
  }

  async generateSentence(_params: GenerateParams): Promise<Sentence | null> {
    // Stub returns null — caller should fall back to pre-authored content pool
    return null;
  }

  async detectErrors(_text: string, _level: CEFRLevel): Promise<TaggedError[]> {
    // Stub: no detection. Phase 2 will run real detection.
    return [];
  }

  async reviewWriting(_params: ReviewParams): Promise<WritingFeedback> {
    return {
      errors: [],
      praise: 'Good attempt! Keep writing in Norwegian.',
      suggestion:
        'Focus on getting the word order right — verb second in main clauses.',
      source: 'template',
    };
  }
}

// Singleton for use across the app
export const aiService: AIService = new StubAIService();
