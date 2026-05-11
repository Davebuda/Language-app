// AI service singleton.
// WebLLMService is always instantiated — it handles SSR gracefully by
// checking for browser/WebGPU availability inside init().
// Call aiService.init() at app mount to begin background model loading.

import type { AIService } from './types';
import { WebLLMService } from './webllm';

export const aiService: AIService = new WebLLMService();

export type { AIService } from './types';
