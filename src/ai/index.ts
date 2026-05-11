import { WebLLMService } from './webllm'

// WebLLM runs in a Web Worker — isolated from Turbopack/SSR.
// Degrades gracefully to template responses until the model loads.
// Model (~2GB) downloads once and is cached in IndexedDB by WebLLM.
export const aiService = new WebLLMService()

export type { AIService } from './types'
