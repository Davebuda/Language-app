// Phase 2: use StubAIService — template-based responses, no WASM.
// WebLLMService (real on-device AI) is wired in Phase 3.
import type { AIService } from './types';
import { StubAIService } from './stub';

export const aiService: AIService = new StubAIService();

export type { AIService } from './types';
