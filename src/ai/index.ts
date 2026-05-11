import type { AIService } from './types';
import { StubAIService } from './stub';

// StubAIService: template-based responses, always available.
// Real model integration is Phase 2 — WebLLMService crashes Turbopack via WASM.
export const aiService: AIService = new StubAIService();

export type { AIService } from './types';
