import type { CEFRLevel } from '@/types/fingerprint';
import type { ErrorTag } from '@/types/taxonomy';
import type { Sentence } from '@/types/content';

// All AI tasks implement these interfaces.
// In Phase 1A, stub implementations power everything.
// In Phase 2, WebLLM implementations replace the stubs transparently.

export interface ExplainParams {
  wrong: string;
  correct: string;
  errorTag: ErrorTag;
  conceptId: string;
  level: CEFRLevel;
}

export interface Explanation {
  text: string;          // Plain English explanation
  source: 'ai' | 'template';
}

export interface GenerateParams {
  conceptId: string;
  scenarioId?: string;
  level: CEFRLevel;
  avoidSentenceIds?: string[];
}

export interface TaggedError {
  tag: ErrorTag;
  wrong: string;
  correct: string;
  briefWhy: string;
}

export interface ReviewParams {
  userText: string;
  prompt: string;
  level: CEFRLevel;
}

export interface WritingFeedback {
  errors: TaggedError[];
  praise: string;
  suggestion: string;
  source: 'ai' | 'template';
}

// The unified AI service interface — one implementation per environment
export interface AIService {
  explainMistake(params: ExplainParams): Promise<Explanation>;
  generateSentence(params: GenerateParams): Promise<Sentence | null>;
  detectErrors(text: string, level: CEFRLevel): Promise<TaggedError[]>;
  reviewWriting(params: ReviewParams): Promise<WritingFeedback>;
  isAvailable(): boolean;
}
