import type { CEFRLevel } from '@/types/fingerprint';
import type { ErrorTag } from '@/types/taxonomy';
import type { ExerciseType, SessionItem } from '@/types/session';
import type { ResolvedContent } from '@/types/content';

// All AI tasks implement these interfaces.
// Phase 1A: StubAIService with template explanations and null generation.
// Phase 2: WebLLMService replaces the stub transparently.

export interface ExplainParams {
  wrong: string;
  correct: string;
  errorTag: ErrorTag;
  conceptId: string;
  level: CEFRLevel;
  errorCount?: number; // how many times this learner has hit this exact tag
}

export interface Explanation {
  text: string;
  source: 'ai' | 'template';
}

export interface GenerateParams {
  conceptId: string;
  exerciseType: ExerciseType;
  level: CEFRLevel;
  purpose: SessionItem['purpose'];
  recentErrors?: ErrorTag[];    // last errors on this concept — what to target
  masteryScore?: number;        // 0-100 — calibrates within-level difficulty
  productionGap?: number;       // positive = struggles producing, negative = struggles recognising
  scenario?: string;            // topic context for variety across sessions
  avoidPhrases?: string[];      // prevent repeating the same surface forms
}

export interface TaggedError {
  tag: ErrorTag;
  wrong: string;
  correct: string;
  briefWhy: string;
  span?: { start: number; end: number };
}

// ── Conversation ──────────────────────────────────────────────────────────────

export interface ConversationMessage {
  role: 'user' | 'tutor';
  content: string;
}

export interface ConversationCorrection {
  original: string;
  corrected: string;
  errorTag: string;
  explanation: string;
}

export interface ConversationTurnResult {
  tutorResponse: string;
  correction?: ConversationCorrection;
  source: 'ai' | 'template';
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

// The unified AI service interface — one implementation per environment.
// WebLLMService degrades gracefully: generateContent returns null and
// explainMistake returns template text until the model is loaded.
export interface AIService {
  init(): Promise<void>;
  isAvailable(): boolean;
  isReady(): boolean;
  explainMistake(params: ExplainParams): Promise<Explanation>;
  generateContent(params: GenerateParams): Promise<ResolvedContent | null>;
  detectErrors(text: string, level: CEFRLevel): Promise<TaggedError[]>;
  reviewWriting(params: ReviewParams): Promise<WritingFeedback>;
  conversationTurn(
    messages: ConversationMessage[],
    level: CEFRLevel,
    topic: string
  ): Promise<ConversationTurnResult>;
}
