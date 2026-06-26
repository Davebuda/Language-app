import type { AIService } from './types'
import { WebLLMService } from './webllm'
import { ServerAIService } from './server-client'

class HybridAIService implements AIService {
  private webllm = new WebLLMService()
  private server = new ServerAIService()
  private mode: 'webllm' | 'server' | 'none' = 'none'

  async init(): Promise<void> {
    await this.webllm.init()
    if (this.webllm.isAvailable()) {
      this.mode = 'webllm'
      this.setStoreMode('webllm')
      return
    }
    await this.server.init()
    if (this.server.isAvailable()) {
      this.mode = 'server'
      this.setStoreMode('server')
    }
  }

  private setStoreMode(mode: 'webllm' | 'server' | 'none') {
    import('@/stores/ai-status-store')
      .then(({ useAIStatusStore }) => useAIStatusStore.getState().setAIMode(mode))
      .catch(() => {})
  }

  isAvailable(): boolean {
    return this.webllm.isAvailable() || this.server.isAvailable()
  }

  isReady(): boolean {
    return this.webllm.isReady() || this.server.isReady()
  }

  getMode(): 'webllm' | 'server' | 'none' { return this.mode }

  private get active(): AIService {
    if (this.webllm.isReady()) return this.webllm
    return this.server
  }

  explainMistake: AIService['explainMistake'] = (params) => this.active.explainMistake(params)
  generateContent: AIService['generateContent'] = (params) => this.active.generateContent(params)
  detectErrors: AIService['detectErrors'] = (text, level) => this.active.detectErrors(text, level)
  reviewWriting: AIService['reviewWriting'] = (params) => this.active.reviewWriting(params)
  // Conversation NEVER routes through the local 1B WebLLM. The 2026-06-03 live audit
  // caught Kari emitting garbled non-Norwegian ("Hvapondparticles…") that the heuristic
  // validity gate cannot reliably catch (real Norwegian markers + short non-words slip
  // through). The 1B model is too weak for free-form conversation. Route to the server:
  // it returns Groq-8B output when reachable, else a deterministic Norwegian template —
  // both safe, never the 1B. See docs/decisions/2026-06-03-conversation-no-local-1b.md.
  conversationTurn: AIService['conversationTurn'] = (messages, level, topic, suffix, focusConceptId) =>
    this.server.conversationTurn(messages, level, topic, suffix, focusConceptId)
}

export const aiService = new HybridAIService()

export type { AIService } from './types'
