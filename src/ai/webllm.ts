import type {
  AIService, ExplainParams, Explanation, GenerateParams,
  TaggedError, ReviewParams, WritingFeedback,
  ConversationMessage, ConversationTurnResult,
} from './types'
import type { ResolvedContent } from '@/types/content'
import type { CEFRLevel } from '@/types/fingerprint'
import {
  buildGenerationPrompt, buildExplanationPrompt,
  buildConversationPrompt, buildWritingFeedbackPrompt,
  buildErrorDetectionPrompt,
} from './prompts'
import { validateGenerated, validateNorwegianOutput } from './validate'

const MODEL_ID = 'Llama-3.2-1B-Instruct-q4f16_1-MLC'
const MAX_RETRIES = 2

type LoadState = 'idle' | 'loading' | 'ready' | 'unavailable'

// Minimal interface for what we use from the engine
interface ChatEngine {
  chat: {
    completions: {
      create(opts: {
        messages: Array<{ role: string; content: string }>
        response_format?: { type: 'json_object' | 'text' }
        max_tokens?: number
        temperature?: number
      }): Promise<{ choices: Array<{ message: { content: string | null } }> }>
    }
  }
}

function difficultyTier(masteryScore?: number): 1 | 2 | 3 {
  if (!masteryScore || masteryScore < 40) return 1
  if (masteryScore < 70) return 2
  return 3
}

// Heuristic: flag suspiciously long words that may be fabricated Norwegian compounds.
// Threshold 18 chars catches true fabrications while allowing real long words
// (e.g. "barnehageplassen" = 16, "togstasjonen" = 12).
function likelySyntheticCompound(text: string): boolean {
  return text.split(/\s+/).some(w => w.replace(/[.,!?;:«»"']/g, '').length > 18)
}

function templateExplanation(params: ExplainParams): string {
  const byTag: Partial<Record<string, string>> = {
    'word-order': `You wrote "${params.wrong}". Norwegian uses the V2 rule — verb must be in position 2. Correct: "${params.correct}".`,
    'negation-placement': `You wrote "${params.wrong}". "Ikke" follows the finite verb in main clauses. Correct: "${params.correct}".`,
    'noun-gender': `You wrote "${params.wrong}". Norwegian nouns have three genders (en/ei/et). Correct: "${params.correct}".`,
    'verb-conjugation': `You wrote "${params.wrong}". Norwegian present tense adds -r to the stem. Correct: "${params.correct}".`,
    'modal-verb': `You wrote "${params.wrong}". Modals (kan, vil, skal, må) take a bare infinitive — no "å". Correct: "${params.correct}".`,
  }
  const base = byTag[params.errorTag] ?? `You wrote "${params.wrong}". The correct answer is "${params.correct}".`
  const countNote = params.errorCount && params.errorCount > 2 ? ` You've hit this ${params.errorCount} times.` : ''
  return base + countNote
}

export class WebLLMService implements AIService {
  private engine: ChatEngine | null = null
  private state: LoadState = 'idle'
  private loadPromise: Promise<void> | null = null
  // Consecutive empty-response failures from complete()/completeChat().
  // Two failures means the model is functionally broken — set unavailable.
  private consecutiveGenerationFailures = 0
  private static readonly GENERATION_FAILURE_THRESHOLD = 2

  async init(): Promise<void> {
    // Allow re-init from unavailable so a future UI retry affordance only needs
    // to call init() without touching the service internals.
    if (this.state === 'ready') return
    if (this.loadPromise) return this.loadPromise
    this.state = 'loading'
    this.loadPromise = this._load()
    return this.loadPromise
  }

  // Gate: skip AI load on devices that can't handle in-browser LLM.
  // The 1B model needs ~2GB VRAM; safe on desktop and high-end mobile.
  // Coarse-pointer heuristic catches most phones; deviceMemory < 4 catches
  // low-RAM tablets. Template fallbacks cover all gated-out devices.
  private isCapableDevice(): boolean {
    if (typeof window === 'undefined') return false
    if (!('gpu' in navigator)) return false
    const coarsePointer = window.matchMedia?.('(pointer: coarse)').matches ?? false
    const deviceMemory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory
    const lowMemory = deviceMemory != null && deviceMemory < 4
    return !coarsePointer && !lowMemory
  }

  private async _load(): Promise<void> {
    // Reset health counter on each (re-)load attempt.
    this.consecutiveGenerationFailures = 0
    if (!this.isCapableDevice()) {
      this.state = 'unavailable'
      this._updateStore('unavailable')
      return
    }
    try {
      const [{ CreateWebWorkerMLCEngine }, { useAIStatusStore }] = await Promise.all([
        import('@mlc-ai/web-llm'),
        import('@/stores/ai-status-store'),
      ])
      useAIStatusStore.getState().setState('loading')

      // Web Worker isolates WASM from Turbopack — this fixes the crash
      const worker = new Worker(
        new URL('../workers/webllm.worker', import.meta.url),
        { type: 'module' }
      )

      this.engine = (await CreateWebWorkerMLCEngine(worker, MODEL_ID, {
        initProgressCallback: (report: { progress: number }) => {
          const pct = Math.round(report.progress * 100)
          useAIStatusStore.getState().setLoadingPct(pct)
        },
      })) as unknown as ChatEngine

      this.state = 'ready'
      useAIStatusStore.getState().setState('ready')
    } catch (err) {
      console.warn('[WebLLM] Load failed:', err)
      this.state = 'unavailable'
      this._updateStore('unavailable')
    }
  }

  private _updateStore(state: 'unavailable' | 'ready') {
    import('@/stores/ai-status-store')
      .then(({ useAIStatusStore }) => useAIStatusStore.getState().setState(state))
      .catch(() => {})
  }

  isAvailable(): boolean { return this.state !== 'unavailable' }
  isReady(): boolean { return this.state === 'ready' && this.engine !== null }

  // Race every engine call against a 20 s timeout.
  // WebLLM's BindingError fires inside WASM and can silently hang the Promise
  // without ever rejecting — the timeout ensures callers always get a result.
  private withTimeout<T>(promise: Promise<T>, ms = 20_000): Promise<T> {
    return Promise.race([
      promise,
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('WebLLM timeout')), ms)
      ),
    ])
  }

  private _recordGenerationFailure(): void {
    this.consecutiveGenerationFailures++
    if (this.consecutiveGenerationFailures >= WebLLMService.GENERATION_FAILURE_THRESHOLD) {
      console.warn('[WebLLM] Generation consistently failing — marking unavailable')
      this.state = 'unavailable'
      this._updateStore('unavailable')
    }
  }

  private _recordGenerationSuccess(): void {
    this.consecutiveGenerationFailures = 0
  }

  private async complete(system: string, user: string, _json: boolean, maxTokens = 400): Promise<string> {
    if (!this.engine) throw new Error('engine not ready')
    // response_format: json_object triggers a BindingError in some WebLLM builds.
    // Omit it and rely on prompt-level JSON instructions instead.
    const res = await this.withTimeout(
      this.engine.chat.completions.create({
        messages: [{ role: 'system', content: system }, { role: 'user', content: user }],
        max_tokens: maxTokens,
        temperature: 0.7,
      })
    )
    const content = res.choices[0]?.message?.content
    if (!content) {
      this._recordGenerationFailure()
      throw new Error('[WebLLM] empty response from engine')
    }
    this._recordGenerationSuccess()
    return content
  }

  private async completeChat(
    system: string,
    messages: Array<{ role: string; content: string }>,
    maxTokens = 300,
  ): Promise<string> {
    if (!this.engine) throw new Error('engine not ready')
    const res = await this.withTimeout(
      this.engine.chat.completions.create({
        messages: [{ role: 'system', content: system }, ...messages] as Parameters<typeof this.engine.chat.completions.create>[0]['messages'],
        max_tokens: maxTokens,
        temperature: 0.85,
      })
    )
    const content = res.choices[0]?.message?.content
    if (!content) {
      this._recordGenerationFailure()
      throw new Error('[WebLLM] empty response from engine')
    }
    this._recordGenerationSuccess()
    return content
  }

  async generateContent(params: GenerateParams): Promise<ResolvedContent | null> {
    if (!this.isReady()) return null
    const { system, user } = buildGenerationPrompt(params)
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        // On retry after a compound-word hit, append a simpler-vocabulary note
        const userPrompt = attempt > 0
          ? `${user}\n\nIMPORTANT: Use only short, common Norwegian words (under 15 characters each). No compound words.`
          : user
        const raw = await this.complete(system, userPrompt, true)
        const parsed: unknown = JSON.parse(raw)
        const result = validateGenerated(parsed, params)
        if (!result.valid) continue
        const { content } = result
        // Heuristic guard: reject and retry if the Norwegian text contains
        // a word long enough to be a plausible fabricated compound.
        if (likelySyntheticCompound(content.norwegian)) {
          console.warn('[WebLLM] Suspected fabricated compound in:', content.norwegian)
          continue
        }
        return {
          id: crypto.randomUUID(),
          norwegian: content.norwegian,
          english: content.english,
          notes: content.notes,
          conceptIds: [params.conceptId],
          vocabularyClusters: [],
          errorTagsDetectable: params.recentErrors ?? [],
          cefrLevel: params.level,
          difficulty: difficultyTier(params.masteryScore),
          exerciseTypes: [params.exerciseType],
          audioUrl: undefined,
          scenarioId: content.scenarioId,
          source: 'generated',
          distractors: content.distractors,
        }
      } catch (err) {
        console.warn(`[WebLLM] generateContent attempt ${attempt + 1}:`, err)
      }
    }
    return null
  }

  async explainMistake(params: ExplainParams): Promise<Explanation> {
    if (!this.isReady()) return { text: templateExplanation(params), source: 'template' }
    try {
      const { system, user } = buildExplanationPrompt(params)
      const text = await this.complete(system, user, false, 200)
      const trimmed = text.trim()
      // P0.5-06: validate Norwegian validity before shipping AI prose to the
      // learner. Repair-card explanations are often partly English (rule
      // description) and partly Norwegian (examples); skip Norwegian gate here
      // but still drop fabricated compounds and very long words.
      if (trimmed.split(/\s+/).some((w) => w.length > 22)) {
        console.warn('[WebLLM.explainMistake] suspected fabricated word; falling back to template')
        return { text: templateExplanation(params), source: 'template' }
      }
      return { text: trimmed, source: 'ai' }
    } catch {
      return { text: templateExplanation(params), source: 'template' }
    }
  }

  async detectErrors(text: string, level: CEFRLevel): Promise<TaggedError[]> {
    if (!this.isReady()) return []
    try {
      const { system, user } = buildErrorDetectionPrompt(text, level)
      const raw = await this.complete(system, user, true, 300)
      const parsed = JSON.parse(raw) as { errors?: Array<{ wrong: string; correct: string; tag: string; why: string }> }
      return (parsed.errors ?? []).map((e) => ({
        tag: e.tag as TaggedError['tag'],
        wrong: e.wrong,
        correct: e.correct,
        briefWhy: e.why,
      }))
    } catch {
      return []
    }
  }

  async reviewWriting(params: ReviewParams): Promise<WritingFeedback> {
    if (!this.isReady()) {
      return { errors: [], praise: 'Bra innsats! Fortsett å skrive på norsk.', suggestion: 'Fokuser på verbalplasseringen — V2-regelen gjelder i helsetninger.', source: 'template' }
    }
    try {
      const { system, user } = buildWritingFeedbackPrompt(params.userText, params.level)
      const raw = await this.complete(system, user, true, 500)
      const parsed = JSON.parse(raw) as {
        errors?: Array<{ wrong: string; correct: string; tag: string; why: string; start?: number; end?: number }>
        praise?: string
        suggestion?: string
      }
      // P0.5-06: validate praise + suggestion (both shown to learner) and drop
      // any individual error whose correct field is not coherent Norwegian.
      // The third walkthrough captured fabricated words like "døvreslekkende"
      // appearing in praise, and corrected versions that flipped negation
      // meaning. The gate filters those before they reach the journal UI.
      const safePraise = parsed.praise && validateNorwegianOutput(parsed.praise, { minWords: 3 }).valid
        ? parsed.praise
        : 'Bra innsats! Fortsett å skrive på norsk.'
      const safeSuggestion = parsed.suggestion && validateNorwegianOutput(parsed.suggestion, { minWords: 3 }).valid
        ? parsed.suggestion
        : 'Fokuser på verbalplasseringen — V2-regelen gjelder i helsetninger.'
      const safeErrors = (parsed.errors ?? []).filter((e) => {
        // The correct field must be coherent Norwegian (it's what the rettet versjon uses).
        const v = validateNorwegianOutput(e.correct, { minWords: 2 })
        if (!v.valid) {
          console.warn(`[WebLLM.reviewWriting] dropping error with invalid correction (${v.reason}): ${e.correct}`)
        }
        return v.valid
      })
      return {
        errors: safeErrors.map((e) => ({
          tag: e.tag as TaggedError['tag'],
          wrong: e.wrong,
          correct: e.correct,
          briefWhy: e.why,
          span: e.start != null && e.end != null ? { start: e.start, end: e.end } : undefined,
        })),
        praise: safePraise,
        suggestion: safeSuggestion,
        source: 'ai',
      }
    } catch {
      return { errors: [], praise: 'Bra forsøk!', suggestion: 'Fokuser på verbplasseringen.', source: 'template' }
    }
  }

  async conversationTurn(
    messages: ConversationMessage[],
    level: CEFRLevel,
    topic: string,
    constraintEvalSuffix?: string,
  ): Promise<ConversationTurnResult> {
    const fallbackResponse = (msgs: ConversationMessage[]): string =>
      msgs.length === 0
        ? `Hei! La oss snakke om ${topic}. Hva tenker du på?`
        : 'Bra! Kan du fortelle mer?'

    if (!this.isReady()) {
      return { tutorResponse: fallbackResponse(messages), source: 'template' }
    }
    try {
      const { system, messages: chatMessages } = buildConversationPrompt(
        messages.map((m) => ({ role: m.role === 'tutor' ? 'assistant' : 'user', content: m.content })),
        level,
        topic,
        constraintEvalSuffix,
      )
      const raw = await this.completeChat(system, chatMessages)

      const correctionMatch = raw.match(/CORRECTION:(\{.*?\})/s)
      let correction: ConversationTurnResult['correction']
      if (correctionMatch) {
        try {
          const c = JSON.parse(correctionMatch[1]) as { original: string; correct: string; tag: string; why: string }
          correction = { original: c.original, corrected: c.correct, errorTag: c.tag, explanation: c.why }
        } catch { /* ignore */ }
      }

      // Parse constraint check result if present
      let constraintMet: boolean | undefined
      let constraintFeedback: string | undefined
      const constraintMetMatch = raw.match(/\nCONSTRAINT_MET/)
      const constraintMissedMatch = raw.match(/\nCONSTRAINT_MISSED: (.+)/)
      if (constraintMetMatch) constraintMet = true
      else if (constraintMissedMatch) {
        constraintMet = false
        constraintFeedback = constraintMissedMatch[1]?.trim()
      }

      const tutorResponse = raw
        .replace(/\nCORRECTION:\{.*?\}/s, '')
        .replace(/\nCONSTRAINT_MET/, '')
        .replace(/\nCONSTRAINT_MISSED:.*/, '')
        .trim()

      // P0.5-06: validate Norwegian validity. Kari's responses MUST be
      // imitable Norwegian — fall back to template if the model produced
      // gibberish, English drift, or fabricated compounds.
      const validity = validateNorwegianOutput(tutorResponse, { minWords: 3 })
      if (!validity.valid) {
        console.warn(`[WebLLM.conversationTurn] dropping invalid Norwegian (${validity.reason}): ${tutorResponse.slice(0, 80)}`)
        return { tutorResponse: fallbackResponse(messages), source: 'template' }
      }

      return { tutorResponse, correction, constraintMet, constraintFeedback, source: 'ai' }
    } catch {
      return { tutorResponse: fallbackResponse(messages), source: 'template' }
    }
  }
}
