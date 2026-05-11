import type {
  AIService,
  ExplainParams,
  Explanation,
  GenerateParams,
  TaggedError,
  ReviewParams,
  WritingFeedback,
} from './types';
import type { ResolvedContent } from '@/types/content';
import type { CEFRLevel } from '@/types/fingerprint';
import { buildGenerationPrompt, buildExplanationPrompt } from './prompts';
import { validateGenerated } from './validate';

// Primary model: 3B params, ~2 GB VRAM, good multilingual instruction following.
// Falls back gracefully to template responses until the model is loaded.
const MODEL_ID = 'Llama-3.2-3B-Instruct-q4f16_1-MLC';
const MAX_RETRIES = 2;

type LoadState = 'idle' | 'loading' | 'ready' | 'unavailable';

// Typed subset of the WebLLM engine API we use
interface MLCEngine {
  chat: {
    completions: {
      create(opts: {
        messages: Array<{ role: string; content: string }>;
        response_format?: { type: 'json_object' | 'text' };
        max_tokens?: number;
        temperature?: number;
      }): Promise<{
        choices: Array<{ message: { content: string | null } }>;
      }>;
    };
  };
}

function difficultyTier(masteryScore?: number): 1 | 2 | 3 {
  if (!masteryScore || masteryScore < 40) return 1;
  if (masteryScore < 70) return 2;
  return 3;
}

// Template explanation used when model is not ready — personalized by referencing
// the learner's actual wrong/correct answers and error count.
function templateExplanation(params: ExplainParams): string {
  const countNote =
    params.errorCount && params.errorCount > 2
      ? ` You've hit this ${params.errorCount} times — make this a focus point.`
      : '';

  const byTag: Partial<Record<string, string>> = {
    'word-order':
      `You wrote "${params.wrong}". Norwegian uses the V2 rule — the finite verb must sit in position 2 of the main clause. Correct: "${params.correct}".`,
    'negation-placement':
      `You wrote "${params.wrong}". "Ikke" follows the finite verb in main clauses: "${params.correct}". In subordinate clauses it comes before the verb.`,
    'noun-gender':
      `You wrote "${params.wrong}". Norwegian nouns have three genders (en/ei/et) that govern articles and adjective endings. Correct: "${params.correct}".`,
    'article-use':
      `You wrote "${params.wrong}". The definite article is a suffix in Norwegian: -en (en-words), -a or -en (ei-words), -et (et-words). Correct: "${params.correct}".`,
    'verb-conjugation':
      `You wrote "${params.wrong}". Norwegian verbs take the same form for all persons — present tense adds -r to the stem. Correct: "${params.correct}".`,
    'adjective-agreement':
      `You wrote "${params.wrong}". Adjectives must agree with noun gender: stor (en/ei), stort (et), store (definite or plural). Correct: "${params.correct}".`,
    'modal-verb':
      `You wrote "${params.wrong}". Modal verbs (kan, vil, skal, må) take a bare infinitive — no "å". Correct: "${params.correct}".`,
    preposition:
      `You wrote "${params.wrong}". Norwegian prepositions don't map 1-to-1 to English: i (in/at enclosed places), på (on/at open places), til (direction). Correct: "${params.correct}".`,
  };

  const base =
    byTag[params.errorTag] ??
    `You wrote "${params.wrong}". The correct answer is "${params.correct}". Review this concept and try again.`;

  return base + countNote;
}

export class WebLLMService implements AIService {
  private engine: MLCEngine | null = null;
  private state: LoadState = 'idle';
  private loadPromise: Promise<void> | null = null;
  readonly onProgress?: (pct: number) => void;

  constructor(onProgress?: (pct: number) => void) {
    this.onProgress = onProgress;
  }

  async init(): Promise<void> {
    if (this.state === 'ready' || this.state === 'unavailable') return;
    if (this.loadPromise) return this.loadPromise;

    this.state = 'loading';
    this.loadPromise = this._load();
    return this.loadPromise;
  }

  private async _load(): Promise<void> {
    if (typeof window === 'undefined' || !('gpu' in navigator)) {
      this.state = 'unavailable';
      // Notify store asynchronously — store may not be imported in SSR
      import('@/stores/ai-status-store').then(({ useAIStatusStore }) => {
        useAIStatusStore.getState().setState('unavailable');
      }).catch(() => {});
      return;
    }
    try {
      const [{ CreateMLCEngine }, { useAIStatusStore }] = await Promise.all([
        import('@mlc-ai/web-llm'),
        import('@/stores/ai-status-store'),
      ]);
      useAIStatusStore.getState().setState('loading');
      this.engine = (await CreateMLCEngine(MODEL_ID, {
        initProgressCallback: (report: { progress: number }) => {
          const pct = Math.round(report.progress * 100);
          this.onProgress?.(pct);
          useAIStatusStore.getState().setLoadingPct(pct);
        },
      })) as unknown as MLCEngine;
      this.state = 'ready';
      useAIStatusStore.getState().setState('ready');
    } catch (err) {
      console.warn('[WebLLM] Model load failed:', err);
      this.state = 'unavailable';
      import('@/stores/ai-status-store').then(({ useAIStatusStore }) => {
        useAIStatusStore.getState().setState('unavailable');
      }).catch(() => {});
    }
  }

  // isAvailable: the service could eventually produce output (not permanently failed).
  // isReady: the model is loaded and can produce output RIGHT NOW.
  // Callers that want to show a loading indicator should check !isReady() && isAvailable().
  isAvailable(): boolean {
    return this.state !== 'unavailable';
  }

  isReady(): boolean {
    return this.state === 'ready' && this.engine !== null;
  }

  private async complete(
    system: string,
    user: string,
    json: boolean,
  ): Promise<string> {
    if (!this.engine) throw new Error('engine not ready');
    const res = await this.engine.chat.completions.create({
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      ...(json ? { response_format: { type: 'json_object' } } : {}),
      max_tokens: 400,
      temperature: 0.7,
    });
    return res.choices[0]?.message?.content ?? '';
  }

  async generateContent(params: GenerateParams): Promise<ResolvedContent | null> {
    if (!this.isReady()) return null;

    const { system, user } = buildGenerationPrompt(params);

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        const raw = await this.complete(system, user, true);
        const parsed: unknown = JSON.parse(raw);
        const result = validateGenerated(parsed, params);

        if (!result.valid) {
          console.warn(`[WebLLM] validation failed (attempt ${attempt + 1}): ${result.error}`);
          continue;
        }

        const { content } = result;
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
        };
      } catch (err) {
        console.warn(`[WebLLM] generation error (attempt ${attempt + 1}):`, err);
      }
    }

    return null;
  }

  async explainMistake(params: ExplainParams): Promise<Explanation> {
    if (!this.isReady()) {
      return { text: templateExplanation(params), source: 'template' };
    }
    try {
      const { system, user } = buildExplanationPrompt(params);
      const text = await this.complete(system, user, false);
      return { text: text.trim(), source: 'ai' };
    } catch {
      return { text: templateExplanation(params), source: 'template' };
    }
  }

  async detectErrors(_text: string, _level: CEFRLevel): Promise<TaggedError[]> {
    return [];
  }

  async reviewWriting(_params: ReviewParams): Promise<WritingFeedback> {
    return {
      errors: [],
      praise: 'Good attempt! Keep writing in Norwegian.',
      suggestion: 'Focus on getting the word order right — verb second in main clauses.',
      source: 'template',
    };
  }
}
