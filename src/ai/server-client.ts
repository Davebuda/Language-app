import type {
  AIService, ExplainParams, Explanation, GenerateParams,
  TaggedError, ReviewParams, WritingFeedback,
  ConversationMessage, ConversationTurnResult,
} from './types'
import type { ResolvedContent } from '@/types/content'
import type { CEFRLevel } from '@/types/fingerprint'

async function callServerAI<T>(action: string, params: Record<string, unknown>): Promise<T | null> {
  try {
    const res = await fetch('/api/ai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, params }),
    })
    if (!res.ok) return null
    return await res.json() as T
  } catch {
    return null
  }
}

export class ServerAIService implements AIService {
  private available = false

  async init(): Promise<void> {
    try {
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'ping' }),
      })
      this.available = res.ok
      if (this.available) {
        const { useAIStatusStore } = await import('@/stores/ai-status-store')
        useAIStatusStore.getState().setState('ready')
      }
    } catch {
      this.available = false
    }
  }

  isAvailable(): boolean { return this.available }
  isReady(): boolean { return this.available }

  async explainMistake(params: ExplainParams): Promise<Explanation> {
    const result = await callServerAI<Explanation>('explain', params as unknown as Record<string, unknown>)
    return result ?? { text: `You wrote "${params.wrong}". The correct answer is "${params.correct}".`, source: 'template' }
  }

  async generateContent(params: GenerateParams): Promise<ResolvedContent | null> {
    // callServerAI returns null on a non-ok response, a thrown fetch, or a null
    // body (the route returns NextResponse.json(null) when generation fails the
    // validation gate). Null → caller's honest "Repetisjon" fallback fires.
    return callServerAI<ResolvedContent>('generate', params as unknown as Record<string, unknown>)
  }

  async detectErrors(text: string, level: CEFRLevel): Promise<TaggedError[]> {
    const result = await callServerAI<{ errors: TaggedError[] }>('detect', { text, level })
    return result?.errors ?? []
  }

  async reviewWriting(params: ReviewParams): Promise<WritingFeedback> {
    const result = await callServerAI<WritingFeedback>('review', {
      userText: params.userText,
      level: params.level,
    })
    return result ?? {
      errors: [],
      praise: 'Bra innsats! Fortsett å skrive på norsk.',
      suggestion: 'Fokuser på verbalplasseringen — V2-regelen gjelder i helsetninger.',
      source: 'template',
    }
  }

  async conversationTurn(
    messages: ConversationMessage[],
    level: CEFRLevel,
    topic: string,
    constraintEvalSuffix?: string,
  ): Promise<ConversationTurnResult> {
    const result = await callServerAI<ConversationTurnResult>('conversation', {
      messages, level, topic, constraintEvalSuffix,
    })
    return result ?? {
      tutorResponse: messages.length === 0
        ? `Hei! La oss snakke om ${topic}. Hva tenker du på?`
        : 'Bra! Kan du fortelle mer?',
      source: 'template',
    }
  }
}
