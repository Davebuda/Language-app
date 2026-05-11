import type { AIService } from './types';
import { WebLLMService } from './webllm';

// WebLLMService: uses on-device Llama-3.2-3B via WebGPU when available.
// Falls back gracefully to template responses when WebGPU is absent or the
// model hasn't loaded yet — no degradation to the user experience.
export const aiService: AIService = new WebLLMService();

export type { AIService } from './types';
