// Phase 1A stub — implements AIService with template-based responses.
// Replaced by WebLLMService in Phase 2. generateContent always returns null
// so the content resolution layer falls back to the seed corpus.

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

// Personalized template explanations — reference the learner's actual wrong answer
// and error count so the feedback feels specific even without a real model.
const EXPLANATION_TEMPLATES: Partial<Record<string, (p: ExplainParams) => string>> = {
  'word-order': (p) =>
    `You wrote "${p.wrong}". Norwegian uses the V2 rule — the finite verb must be in position 2. When a sentence starts with an adverb or time expression, subject and verb invert. Correct: "${p.correct}".`,
  'negation-placement': (p) =>
    `You wrote "${p.wrong}". "Ikke" follows the finite verb in main clauses: "${p.correct}". In subordinate clauses (after "at", "når", etc.) it goes before the verb.`,
  'noun-gender': (p) =>
    `You wrote "${p.wrong}". Norwegian nouns have three genders (en/ei/et) that govern articles and adjective endings. Correct: "${p.correct}".`,
  'article-use': (p) =>
    `You wrote "${p.wrong}". The definite article is a suffix: -en (en-words), -a or -en (ei-words), -et (et-words). Correct: "${p.correct}".`,
  'verb-conjugation': (p) =>
    `You wrote "${p.wrong}". Norwegian present tense adds -r to the verb stem — same for all persons (jeg/du/han all use the same form). Correct: "${p.correct}".`,
  'verb-tense': (p) =>
    `You wrote "${p.wrong}". Check the tense: present adds -r, past tense follows -et/-te/-de patterns depending on the verb class. Correct: "${p.correct}".`,
  'modal-verb': (p) =>
    `You wrote "${p.wrong}". Modals (kan, vil, skal, må) take a bare infinitive — no "å". Correct: "${p.correct}".`,
  'adjective-agreement': (p) =>
    `You wrote "${p.wrong}". Adjectives agree with noun gender: stor (en/ei), stort (et), store (definite/plural). Correct: "${p.correct}".`,
  'pronoun-choice': (p) =>
    `You wrote "${p.wrong}". Check your pronoun: jeg/I, du/you, han/he, hun/she, det or den/it, vi/we, dere/you all, de/they. Correct: "${p.correct}".`,
  preposition: (p) =>
    `You wrote "${p.wrong}". Norwegian prepositions don't map 1-to-1 to English: i (in/at enclosed places), på (on/at surfaces and some places), til (direction). Correct: "${p.correct}".`,
  'compound-word': (p) =>
    `You wrote "${p.wrong}". Norwegian combines words into compounds written as one word — the last part carries the main meaning. Correct: "${p.correct}".`,
  spelling: (p) =>
    `You wrote "${p.wrong}". Check the spelling, especially double consonants and the letters æ, ø, å. Correct: "${p.correct}".`,
};

function buildTemplateExplanation(params: ExplainParams): string {
  const fn = EXPLANATION_TEMPLATES[params.errorTag];
  const base = fn
    ? fn(params)
    : `You wrote "${params.wrong}". The correct answer is "${params.correct}". Review this concept and try again.`;

  const countNote =
    params.errorCount && params.errorCount > 2
      ? ` You've hit this ${params.errorCount} times — prioritise this pattern.`
      : '';

  return base + countNote;
}

export class StubAIService implements AIService {
  async init(): Promise<void> {
    // No-op — stub is always ready
  }

  isAvailable(): boolean {
    return true;
  }

  isReady(): boolean {
    // Stub is "ready" in the sense that it will respond, but it never generates content
    return false;
  }

  async explainMistake(params: ExplainParams): Promise<Explanation> {
    return { text: buildTemplateExplanation(params), source: 'template' };
  }

  async generateContent(_params: GenerateParams): Promise<ResolvedContent | null> {
    // Always returns null — content resolution falls back to seed corpus
    return null;
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
